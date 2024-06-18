import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import AWS from 'aws-sdk';
import { Readable, Writable } from 'stream';
import mongoose, { Document, Types } from 'mongoose';
import logger from '../logger';
import User from '../models/User';
import { findSafeById } from '../utils/QueryUtil';

const filesRouter = (bucket: mongoose.mongo.GridFSBucket) => {
  const router = express.Router();

  const storage = multer.memoryStorage();
  const upload = multer({ storage });

  const s3 = new AWS.S3({
    endpoint: process.env.STORAGE_ENDPOINT,
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
  });

  // Upload
  router.post(
    '/uploadFiles',
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          return res.status(400).send('No file uploaded');
        }

        // @ts-ignore
        const userId = req.context.userId;
        // @ts-ignore
        const safeId = req.body.safeId;
        const fileName = req.file.originalname.trim();
        const mimetype = req.file.mimetype;

        // Upload to bucket
        const readableStream = new Readable();
        readableStream.push(req.file.buffer);
        readableStream.push(null); // Indicates EOF
        const params = {
          Bucket: process.env.STORAGE_BUCKET as string,
          Key: `${userId}/${safeId}/${fileName}`,
          Body: readableStream,
          ContentType: mimetype,
          Metadata: { userId, safeId },
        };
        const s3File = await s3.upload(params).promise();

        // save metada on Mongo
        const user = await User.findById<Document & TUser>(userId).exec();
        if (!user) {
          return res.status(400).json({ message: 'User not found' });
        }
        const safe = (await findSafeById(user, safeId)) as TSafe;
        const file: TFile = {
          fileName,
          s3Key: s3File.Key,
          mimetype,
          length: req.file.size,
          uploadDate: new Date(),
        };
        safe.files?.push(file);
        await user.save();

        console.log('File uploaded successfully:', s3File.Location);
      } catch (error) {
        next(error);
      }
    },
  );

  // download
  router.get(
    '/downloadFiles/:safeId/:fileName',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { safeId, fileName } = req.params;
        // @ts-ignore
        const userId = req.context.userId;

        console.log(
          'Download `${userId}/${safeId}/${fileName}`',
          `${userId}/${safeId}/${fileName}`,
        );

        res.set('Content-Type', 'application/octet-stream');
        const params = {
          Bucket: process.env.STORAGE_BUCKET as string,
          Key: `${userId}/${safeId}/${fileName}`,
        };
        s3.getObject(params)
          .createReadStream()
          .on('error', (error) => {
            console.error('Error streaming S3 object:', error.message);
            res.status(500).send('Error downloading file');
          })
          .pipe(res);

        console.log('Downloaded Success');
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
        const { fileName, length, mimetype, uploadDate, _id } = file;
        result.fileInfoList.push({
          fileName,
          length,
          mimetype,
          uploadDate,
          id: _id,
        });
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

      if (!safeId || !fileId || !userId || !title) {
        return res.status(404).send('Missing input information');
      }

      // TODO: check safeId and userID
      bucket.rename(new Types.ObjectId(fileId as string), title.trim());
      return res.send(true);
    } catch (error) {
      next(error);
    }
  });

  const addField = (key: string, val: string | undefined) => {
    return `${key}=${val || ''}\n`;
  };

  // TODO: should replace {{}} in the content to something else
  const MULTILINE_START = '{{';
  const MULTILINE_END = '}}';

  router.post('/savePassword', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const { title, username, password, notes, safeId, fileId }: TPassword = req.body;

      console.log('savePassword', title, username, password, notes, safeId, fileId);
      if (!title || !username || !password || !safeId || !userId) {
        return res.status(404).send('Missing input information');
      }
      const content: string =
        addField('title', title.trim()) +
        addField('username', username.trim()) +
        addField('password', password.trim()) +
        addField('notes', MULTILINE_START + '\n' + notes?.trim() + '\n' + MULTILINE_END);

      const options = {
        metadata: {
          userId,
          safeId: req.body.safeId,
          mimetype: 'text/pass',
        },
      };
      const writeStream = bucket.openUploadStream(`${title.trim()}.txt`, options);

      const readableStream = new Readable();
      readableStream.push(Buffer.from(content));
      readableStream.push(null); // Indicates EOF
      readableStream
        .pipe(writeStream)
        .on('error', (error) => {
          logger.error('Failed to save password file! ' + error.message);
          return res.status(400).send('Failed to save password file');
        })
        .on('finish', () => {
          logger.info('Password file saved successfully').info(JSON.stringify(req.body));
          // if it is update, then delete old file.
          if (fileId) {
            logger.info('Password file updated! ' + title);
            bucket.delete(new Types.ObjectId(fileId));
          }
          return res.send(true);
        });
    } catch (error) {
      next(error); // forward error to error handling middleware
    }
  });

  const parseFields = (content: string, multilineFields: Array<string>) => {
    const lines = content.split('\n') || [];
    const fields: Record<string, string> = {};
    let i = 0;

    while (i < lines.length) {
      const field = lines[i]?.split('=')[0] || '';
      if (!multilineFields.includes(field)) {
        fields[field] = lines[i]?.substring(field.length + 1) || '';
      } else {
        i++;
        while (i < lines.length && lines[i] !== MULTILINE_END) {
          fields[field] = (fields[field] || '') + lines[i] + '\n';
          i++;
        }
      }
      i++;
    }
    return fields;
  };

  router.get(
    '/getPassword/:safeId/:fileId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // @ts-ignore
        const userId = req.context.userId;
        const { safeId, fileId } = req.params;

        if (!safeId || !userId) {
          return res.status(404).send('Missing input information');
        }

        const id = new Types.ObjectId(fileId);
        let content = '';

        // TODO: check safeId and userID
        const downloadStream = bucket.openDownloadStream(id);
        downloadStream
          .on('data', (chunk) => {
            content += chunk.toString();
          })
          .on('error', (error) => {
            res.status(400).send('Error reading file');
          })
          .on('end', () => {
            const fields = parseFields(content, ['notes']);
            console.log('getPassword fields', fields);
            const json: TPassword = {
              title: fields['title'] || '',
              username: fields['username'] || '',
              password: fields['password'] || '',
              notes: fields['notes'] || '',
              safeId,
              fileId,
            };
            return res.json(json);
          });
      } catch (error) {
        next(error); // forward error to error handling middleware
      }
    },
  );

  router.get('/search/:searchValue', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const { searchValue } = req.params;

      if (!searchValue) {
        return res.status(404).send('Missing input information');
      }

      const searchResult = await mongoose.connection.db
        .collection('uploads.files')
        .find({
          $text: { $search: searchValue },
        })
        .toArray();

      return res.json({ searchResult });
    } catch (error) {
      next(error); // forward error to error handling middleware
    }
  });

  return router;
};

export default filesRouter;
