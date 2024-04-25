import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { TUploadFilesResult } from '../models/Safe';
import logger from '../logger';

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
            return res.status(500).send('Failed to upload file');
          })
          .on('finish', () => {
            logger.info('File uploaded successfully').info(JSON.stringify(req.body));
            return res.json({ name: req.file?.originalname, type: 'TP' });
          });
      } catch (error) {
        next(error);
      }
    },
  );

  // download
  router.post(
    '/downloadFiles',
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        return res.json({ name: req.file?.originalname, type: 'TP' });
      } catch (error) {
        next(error);
      }
    },
  );

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
