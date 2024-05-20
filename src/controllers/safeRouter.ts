import express, { NextFunction, Request, Response } from 'express';
import mongoose, { Document } from 'mongoose';
import User, { TUser } from '../models/User';
import { Safe, TPassword } from '../models/Safe';

const safeRouter = (bucket: mongoose.mongo.GridFSBucket) => {
  const router = express.Router();

  router.post('/createSafe', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      console.log('createSafe', userId);

      const user = await User.findById<Document & TUser>(userId);
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      const safe = new Safe({ name: req.body.name.trim() });
      user.safes?.push(safe);
      await user.save();
      return res.json(safe);
    } catch (error) {
      next(error); // Properly forward error to error handling middleware
    }
  });

  router.get('/getSafe/:safeId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const { safeId } = req.params;
      console.log('createSafe', userId);

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }

      const safe = user.safes.find((safe) => safe._id?.toString() === safeId);

      // // TODO: this could be run in a background call for performance improvements
      // const files = await bucket.find({ 'metadata.userId': user._id }).exe
      // user.storageFileCount = files.length;
      // // curr.length stored in bytes
      // user.storageUsedInBytes = files.reduce((prev, curr) => prev + curr.length, 0);

      console.log('safe> ', safe);

      return res.json(safe);
    } catch (error) {
      next(error); // Properly forward error to error handling middleware
    }
  });

  return router;
};

export default safeRouter;
