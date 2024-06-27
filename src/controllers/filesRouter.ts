import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import AWS from 'aws-sdk';
import { Readable } from 'stream';
import mongoose, { Document, Types } from 'mongoose';
import logger from '../logger';
import User from '../models/User';
import { File } from '../models/File';
import { findFileById, findFileIndexById, findSafeById } from '../utils/QueryUtil';
import { bucketFilePath } from '../utils/FileUtil';

const filesRouter = (bucket: AWS.S3) => {
  const router = express.Router();
  const storage = multer.memoryStorage();
  const upload = multer({ storage });

  type TSaveMetadata = {
    file: TFile;
    user: mongoose.Document<any, any, any> & TUser;
    safeId: string;
  };

  const saveFileMetadata = async ({ file, user, safeId }: TSaveMetadata) => {
    const safe = (await findSafeById(user, safeId)) as TSafe;

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
      safe.files[fileIndex] = { ...safe.files[fileIndex], ...file };
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

    await bucket.upload(params).promise();
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

        const file: TFile = {
          _id: fileId,
          fileName,
          mimetype: req.file.mimetype,
          length: req.file.size,
          uploadDate: new Date(),
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

        console.log('downloadFiles fileId:', fileId);

        res.set('Content-Type', 'application/octet-stream');
        const params = {
          Bucket: process.env.STORAGE_BUCKET as string,
          Key: bucketFilePath({ userId, safeId, fileId }),
        };
        bucket
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

      console.log('result.fileInfoList', result.fileInfoList);

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
      // @ts-ignore
      const userId = req.context.userId;
      const { fileName, username, password, notes, safeId, fileId, mimetype } = req.body;

      if (!fileName || !safeId || !userId || !mimetype) {
        return res.status(404).send('Missing input information');
      }
      const user = await User.findById<Document & TUser>(userId).exec();
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

  const newSearchSafesResult = (item: any) => ({
    _id: item.safes._id.toString(),
    name: item.safes.name,
    description: item.safes.description,
    files: [],
  });

  router.get('/search/:searchValue', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const { searchValue } = req.params;

      if (!searchValue) {
        return res.status(404).send('Missing input information');
      }

      // TODO: there might be a better way to do this, with indexes.
      const searchFilesResult = await User.aggregate([
        { $match: { _id: new Types.ObjectId(userId as string) } },
        { $unwind: '$safes' },
        { $unwind: '$safes.files' },
        {
          $match: {
            $or: [
              { 'safes.files.fileName': { $regex: searchValue, $options: 'i' } },
              { 'safes.files.username': { $regex: searchValue, $options: 'i' } },
              { 'safes.files.notes': { $regex: searchValue, $options: 'i' } },
            ],
          },
        },
        {
          $project: {
            _id: 0,
            'safes._id': 1,
            'safes.name': 1,
            'safes.description': 1,
            'safes.files._id': 1,
            'safes.files.fileName': 1,
            'safes.files.username': 1,
            'safes.files.notes': 1,
            'safes.files.mimetype': 1,
            'safes.files.createdAt': 1,
          },
        }, //_id: 0, Exclude the user._id field
      ]);

      // TODO: good to have. merge this search with the previous one
      const searchSafesResult = await User.aggregate([
        { $match: { _id: new Types.ObjectId(userId as string) } },
        { $unwind: '$safes' },
        {
          $match: {
            $or: [
              { 'safes.name': { $regex: searchValue, $options: 'i' } },
              { 'safes.description': { $regex: searchValue, $options: 'i' } },
            ],
          },
        },
        { $project: { _id: 0, 'safes._id': 1, 'safes.name': 1, 'safes.description': 1 } }, //_id: 0, Exclude the user._id field
      ]);

      type TSafeMap = { [k: string]: TSafe };
      const resultMerged: TSafeMap = {};
      searchSafesResult.forEach((item) => {
        const safeId: keyof TSafeMap = item.safes._id.toString();
        resultMerged[safeId] = newSearchSafesResult(item);
      });

      searchFilesResult.forEach((item) => {
        const safeId: keyof TSafeMap = item.safes._id.toString();
        if (!resultMerged[safeId]) {
          resultMerged[safeId] = newSearchSafesResult(item);
        }
        const { fileName, mimetype, username, notes, createdAt } = item.safes.files;
        const file: TFile = { fileName, mimetype, username, notes, uploadDate: createdAt };
        resultMerged[safeId]?.files?.push(file);
      });

      console.log(' Search MAP:', JSON.stringify(resultMerged));
      const safeList: TSafe[] = Object.keys(resultMerged).map((key) => {
        return resultMerged[key] as TSafe;
      });

      return res.json(safeList);
    } catch (error) {
      console.log('error Search results:', error);
      next(error);
    }
  });

  return router;
};

export default filesRouter;
