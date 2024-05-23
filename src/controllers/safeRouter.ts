import express, { NextFunction, Request, Response } from 'express';
import mongoose, { Document, Types } from 'mongoose';
import User, { TUser } from '../models/User';
import { Safe, TSafe } from '../models/Safe';

const safeRouter = (bucket: mongoose.mongo.GridFSBucket) => {
  const router = express.Router();

  const findSafeById = async (user: TUser, safeId: string | undefined) => {
    return user.safes.find((safe) => safe._id?.toString() === safeId);
  };

  router.post('/createSafe', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      console.log('createSafe', userId);

      const user = await User.findById<Document & TUser>(userId);
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      const safe = new Safe({ name: req.body.name.trim(), description: '', autoSharing: false });
      user.safes?.push(safe);
      await user.save();
      return res.json(safe);
    } catch (error) {
      next(error); // Properly forward error to error handling middleware
    }
  });

  router.post('/updateSafe', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const { name, _id, description, autoSharing, fieldToUpdate } = req.body;
      console.log('updateSafe', autoSharing, fieldToUpdate);

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      const safe = (await findSafeById(user, _id)) as TSafe;
      if (fieldToUpdate === 'description' || fieldToUpdate === 'all') {
        safe.description = description;
      }
      if (fieldToUpdate === 'name' || fieldToUpdate === 'all') {
        safe.name = name;
      }
      if (fieldToUpdate === 'autoSharing' || fieldToUpdate === 'all') {
        safe.autoSharing = autoSharing;
      }

      await user.save();
      return res.json(safe);
    } catch (error) {
      next(error);
    }
  });

  router.post('/deleteSafeList', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const { safeIdList } = req.body as { safeIdList: string[] };
      console.log('deleteSafeList', req.body);

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      const updatedList = user.safes.filter((safe) => {
        const currId = safe._id?.toString();
        if (!currId) return false;
        return !(safeIdList as Array<string>).includes(currId);
      });
      user.safes = updatedList;
      await user.save();

      safeIdList.forEach(async (safeId) => {
        const files = await bucket
          .find({ 'metadata.safeId': safeId, 'metadata.userId': userId })
          .toArray();
        files.forEach((file) => {
          bucket.delete(file._id);
        });
      });

      return res.json({ safeIdList });
    } catch (error) {
      next(error);
    }
  });

  router.get('/getSafe/:safeId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const { safeId } = req.params;
      console.log('getSafe', userId);

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      const safe = await findSafeById(user, safeId);

      return res.json(safe);
    } catch (error) {
      next(error); // Properly forward error to error handling middleware
    }
  });

  return router;
};

export default safeRouter;
