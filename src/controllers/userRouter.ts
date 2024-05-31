import express, { NextFunction, Request, Response } from 'express';
import mongoose, { Document } from 'mongoose';
import User from '../models/User';

const userRouter = (bucket: mongoose.mongo.GridFSBucket) => {
  const router = express.Router();

  router.post('/updateUserProfile', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const { fieldsToUpdate } = req.body;
      console.log('updateUserProfile', fieldsToUpdate);

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }

      fieldsToUpdate.forEach((field: string) => {
        // @ts-ignore
        user[field] = req.body[field];
      });

      await user.save();

      return res.json({ fieldsToUpdate, lifeCheck: user.lifeCheck });
    } catch (error) {
      next(error);
    }
  });

  router.get('/getUserProfile', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      console.log('getUserProfile', userId);

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }

      const { firstName, lastName, language, country, email } = user;
      const { phoneCountry, phone, emailVerified, mobileVerified, lifeCheck } = user;
      const { shareTime, shareWeekday, shareCount, shareCountType, shareCountNotAnswered } = user;

      const profile: TUserProfile = {
        firstName,
        lastName,
        language,
        country,
        email,
        phoneCountry,
        phone,
        emailVerified,
        mobileVerified,
        lifeCheck,
        shareTime,
        shareWeekday,
        shareCount,
        shareCountType,
        shareCountNotAnswered,
      };

      console.log('getUserProfile profile', profile);

      return res.json(profile);
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
