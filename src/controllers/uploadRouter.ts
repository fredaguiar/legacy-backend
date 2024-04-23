import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { TUploadFilesResult } from '../models/Safe';

const uploadRouter = (multerInstance: multer.Multer) => {
  const router = express.Router();

  router.post(
    '/uploadFiles',
    multerInstance.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        console.log('uploadFiles body uploadFiles body uploadFiles body ');

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
