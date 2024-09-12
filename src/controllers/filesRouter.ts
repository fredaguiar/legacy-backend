import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import S3 from 'aws-sdk/clients/s3';
import { Readable } from 'stream';
import mongoose, { Document } from 'mongoose';
import User from '../models/User';
import { findFileById, findFileIndexById, findSafeById } from '../utils/QueryUtil';
import { bucketFilePath, extractText } from '../utils/FileUtil';

const filesRouter = (storage: S3) => {
  const router = express.Router();
  const memoryStorage = multer.memoryStorage();
  const upload = multer({ storage: memoryStorage });

  type TSaveMetadata = {
    file: TFile;
    user: mongoose.Document<any, any, any> & TUser;
    safeId: string;
  };

  const saveFileMetadata = async ({ file, user, safeId }: TSaveMetadata) => {
    const safe = (await findSafeById(user, safeId)) as Document & TSafe;

    if (!safe.files) {
      throw new Error('Missing all files');
    }

    if (!file._id) {
      // new file
      file._id = new mongoose.Types.ObjectId();
      file.userId = typeof user._id === 'string' ? new mongoose.Types.ObjectId(user._id) : user._id;
      file.safeId = typeof safeId === 'string' ? new mongoose.Types.ObjectId(safeId) : safeId;
      safe.files.push(file);
    } else {
      // update file
      let fileIndex = await findFileIndexById(user, safeId, file._id);
      if (fileIndex === undefined) {
        throw new Error('Missing file');
      }
      const currFile = safe.toObject().files[fileIndex];
      const updatedFile = { ...currFile, ...file };

      safe.files[fileIndex] = updatedFile;
    }
    await user.save();

    return file._id.toString();
  };

  const uploadFileToBucket = async ({ mimetype, filePath, buffer }: TUploadFileToBucket) => {
    // Upload to bucket
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null); // Indicates EOF
    const params = {
      Bucket: process.env.STORAGE_BUCKET as string,
      Key: filePath,
      Body: readableStream,
      ContentType: mimetype,
    };

    await storage.upload(params).promise();
  };

  // Upload
  router.post(
    '/uploadFiles',
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          throw new Error('Unexpected error');
        }
        // @ts-ignore
        const userId = req.context.userId;
        // @ts-ignore
        const safeId = req.body.safeId;
        const fileId = req.body.fileId;
        const fileName = req.file.originalname.trim();

        const user = await User.findById<Document & TUser>(userId).exec();
        if (!user) {
          return res.status(400).json({ message: 'User not found' });
        }

        const content = await extractText(req.file.buffer, req.file.mimetype);
        const file: TFile = {
          _id: fileId,
          fileName,
          mimetype: req.file.mimetype,
          length: req.file.size,
          uploadDate: new Date(),
          content,
        };
        const newFileId = await saveFileMetadata({
          file,
          user,
          safeId,
        });
        await uploadFileToBucket({
          mimetype: req.file.mimetype,
          filePath: bucketFilePath({ userId, safeId, fileId: newFileId }),
          buffer: req.file.buffer,
        });

        const json: TUploadFilesResult = { name: fileName, type: req.file.mimetype };
        return res.json(json);
      } catch (error) {
        next(error);
      }
    },
  );

  // download
  router.get(
    '/downloadFiles/:safeId/:fileId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { safeId, fileId } = req.params as { safeId: string; fileId: string };
        // @ts-ignore
        const userId = req.context.userId;

        res.set('Content-Type', 'application/octet-stream');
        const params = {
          Bucket: process.env.STORAGE_BUCKET as string,
          Key: bucketFilePath({ userId, safeId, fileId }),
        };
        storage
          .getObject(params)
          .createReadStream()
          .on('error', (error) => {
            console.error('Error streaming S3 object:', error.message);
            res.status(500).send('Error downloading file');
          })
          .on('end', () => {
            console.log('Downloaded Success');
          })
          .pipe(res);
      } catch (error: any) {
        console.log('Download error', error.message);
        next(error);
      }
    },
  );

  // file list
  router.get('/fileInfoList/:safeId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { safeId } = req.params;
      // @ts-ignore
      const userId = req.context.userId;
      const result: TFileInfoListResult = { fileInfoList: [] };

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      const safe = (await findSafeById(user, safeId)) as TSafe;

      safe.files?.forEach((file) => {
        result.fileInfoList.push(file);
      });

      return res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/saveTextTitle', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { safeId, fileId, title } = req.body;
      // @ts-ignore
      const userId = req.context.userId;

      console.log('saveTextTitle', safeId, fileId, title);

      if (!safeId || !fileId || !userId || !title) {
        return res.status(404).send('Missing input information');
      }

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      const file = (await findFileById(user, safeId, fileId)) as TFile;
      file.fileName = title;
      await user.save();

      return res.send(true);
    } catch (error) {
      next(error);
    }
  });

  router.post('/saveItem', async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('🚀 ~ router.post ~ userId:', req.body);
      // @ts-ignore
      const userId = req.context.userId;
      const { fileName, username, password, notes, safeId, fileId, mimetype } = req.body;

      if (!fileName || !safeId || !userId || !mimetype) {
        return res.status(404).send('Missing input information');
      }
      const user = await User.findById<Document & TUser>(userId);
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      const file: TFile = {
        _id: fileId || undefined,
        fileName: fileName.trim(),
        uploadDate: new Date(),
        username,
        password,
        notes,
        length: 0,
        mimetype,
      };
      await saveFileMetadata({
        file,
        user,
        safeId,
      });
      return res.send(true);
    } catch (error) {
      next(error); // forward error to error handling middleware
    }
  });

  router.get(
    '/getItem/:safeId/:fileId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // @ts-ignore
        const userId = req.context.userId;
        const { safeId, fileId } = req.params;
        if (!safeId || !userId || !fileId) {
          return res.status(404).send('Missing input information');
        }

        const user = await User.findById<Document & TUser>(userId).lean(); // lean() returns json
        if (!user) {
          return res.status(400).json({ message: 'User not found' });
        }
        const file = (await findFileById(user, safeId, fileId)) as TFile;
        return res.json(file);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post('/renameFile', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const { fileName, safeId, fileId } = req.body;

      if (!fileName || !safeId || !userId) {
        return res.status(404).send('Missing input information');
      }
      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      const file = (await findFileById(user, safeId, fileId)) as TFile;
      file.fileName = fileName;
      await user.save();

      return res.send(true);
    } catch (error) {
      next(error);
    }
  });

  router.post('/deleteFileList', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const { safeId, fileIds } = req.body as TFileDelete;

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      const safe = (await findSafeById(user, safeId)) as TSafe;
      if (!safe) {
        return res.status(400).json({ message: 'Safe not found' });
      }

      const removeFiles: TFile[] = [];
      const updatedList = safe.files?.filter((file) => {
        const currId = file._id?.toString();
        if (!currId) return false;
        const keep = !(fileIds as Array<string>).includes(currId);
        if (!keep) removeFiles.push(file);
        return keep;
      });
      safe.files = updatedList;
      await user.save();

      const deleteParams = {
        Bucket: process.env.STORAGE_BUCKET as string,
        Delete: { Objects: [] as S3.ObjectIdentifier[] },
      };
      removeFiles.forEach(async (file) => {
        if (file.mimetype !== 'text/editor' && file.mimetype !== 'text/pass') {
          deleteParams.Delete.Objects.push({
            Key: bucketFilePath({ userId, safeId, fileId: file._id.toString() }),
          });
        }
      });
      await storage.deleteObjects(deleteParams).promise();

      return res.send(true);
    } catch (error) {
      next(error);
    }
  });

  return router;
};

export default filesRouter;
