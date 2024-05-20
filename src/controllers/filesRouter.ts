import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import mongoose, { Types } from 'mongoose';
import logger from '../logger';

type TFileInfo = {
  id: string;
  filename: string;
  length: number;
  uploadDate: Date;
  mimetype: string;
};
type TFileInfoListResult = {
  fileInfoList: TFileInfo[];
};

type TPassword = {
  title: string;
  username: string;
  password: string;
  notes?: string;
  safeId: string;
  fileId?: string;
};

const filesRouter = (bucket: mongoose.mongo.GridFSBucket) => {
  const router = express.Router();

  const storage = multer.memoryStorage();
  const upload = multer({ storage });

  // Upload
  router.post(
    '/uploadFiles',
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          return res.status(400).send('No file uploaded');
        }

        const options = {
          metadata: {
            // @ts-ignore
            userId: req.context.userId,
            // @ts-ignore
            safeId: req.body.safeId,
            mimetype: req.file.mimetype,
          },
        };
        const writeStream = bucket.openUploadStream(req.file.originalname.trim(), options);

        const readableStream = new Readable();
        readableStream.push(req.file.buffer);
        readableStream.push(null); // Indicates EOF
        readableStream
          .pipe(writeStream)
          .on('error', (error) => {
            logger.error('Failed to upload file');
            logger.error(error.stack);
            return res.status(400).send('Failed to upload file');
          })
          .on('finish', () => {
            logger.info('File uploaded successfully').info(JSON.stringify(req.body));

            // if it is update, then delete old file.
            if (req.body.fileId) {
              bucket.delete(new Types.ObjectId(req.body.fileId as string));
            }

            return res.json({ name: req.file?.originalname, type: req.file?.mimetype });
          });
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
        const { safeId, fileId } = req.params;
        // @ts-ignore
        const userId = req.context.userId;
        const id = new Types.ObjectId(fileId);

        // TODO: check safeId and userID
        const downloadStream = bucket.openDownloadStream(id);

        // res.set('Content-Type', 'application/octet-stream');
        downloadStream.pipe(res).on('error', (error) => {
          res.status(404).send('File not found');
        });
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

      const files = await bucket
        .find({ 'metadata.safeId': safeId, 'metadata.userId': userId })
        .toArray();
      if (files.length === 0) return res.json(result);

      files.forEach((file) => {
        const { filename, _id, metadata, uploadDate, length } = file;
        result.fileInfoList.push({
          filename,
          length,
          mimetype: metadata?.mimetype,
          uploadDate,
          id: _id.toString(),
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

  return router;
};

export default filesRouter;
