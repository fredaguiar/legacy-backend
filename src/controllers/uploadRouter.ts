import express, { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { GridFsStorage } from 'multer-gridfs-storage';
import Grid from 'gridfs-stream';
import multer from 'multer';
import { TUploadFilesResult } from '../models/Safe';

const uploadRouter = (conn: mongoose.Connection) => {
  const gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');

  const storage = new GridFsStorage({
    db: conn.db,
    file: (req, file) => {
      return {
        filename: 'file_' + Date.now(),
        bucketName: 'uploads', // collection name in GridFS
      };
    },
  });

  const upload = multer({ storage: storage });
  const router = express.Router();

  router.post(
    '/uploadFiles',
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        console.log('uploadFiles body', req.body);
        console.log('uploadFiles file', req.file);

        const result: TUploadFilesResult = { url: 'URL', filename: 'FN', type: 'TP' };

        return res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};

export default uploadRouter;
