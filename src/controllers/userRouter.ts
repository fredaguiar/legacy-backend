import express, { NextFunction, Request, Response } from 'express';
import mongoose, { Document } from 'mongoose';
import User from '../models/User';

const userRouter = (bucket: mongoose.mongo.GridFSBucket) => {
  const router = express.Router();

  router.post('/updateUser', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const { lifeCheck, fieldToUpdate } = req.body;
      console.log('updateUser', lifeCheck, fieldToUpdate);

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      if (fieldToUpdate === 'lifeCheck' || fieldToUpdate === 'all') {
        user.lifeCheck = lifeCheck;
      }

      await user.save();

      return res.json({ fieldToUpdate, lifeCheck: user.lifeCheck });
    } catch (error) {
      next(error);
    }
  });

  router.get('/getStorageInfo', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      console.log('getStorageInfo', userId);

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }

      const files = await bucket.find({ 'metadata.userId': userId }).toArray();
      const storageUsedInBytes = files.reduce((prev, curr) => prev + curr.length, 0);

      const result: StorageInfo = {
        storageUsedInBytes,
        storageFileCount: files.length,
        storageQuotaInMB: user.storageQuotaInMB || 0,
      };

      console.log('getStorageInfo result', result);

      return res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
};

export default userRouter;
