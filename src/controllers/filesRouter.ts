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

const filesRouter = (conn: mongoose.Connection) => {
  const router = express.Router();

  const bucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'uploads',
  });
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
        const writeStream = bucket.openUploadStream(req.file.originalname, options);

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

        // TODO: should check safe

        const downloadStream = bucket.openDownloadStream(id);

        downloadStream.on('file', (file) => {
          // console.log('Download mimetype', file.metadata.mimetype);
          // console.log('Download file.filename', file.filename);
          // res.setHeader('Content-Type', file.metadata.mimetype);
          // res.setHeader('Content-Disposition', 'attachment; filename="' + file.filename + '"');
        });

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

  return router;
};

export default filesRouter;
