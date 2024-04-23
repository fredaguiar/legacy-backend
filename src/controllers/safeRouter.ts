import express, { NextFunction, Request, Response } from 'express';
import { Document } from 'mongoose';
import User, { TUser } from '../models/User';
import { Safe, TUploadFilesResult } from '../models/Safe';

const safeRouter = express.Router();

safeRouter.post('/createSafe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, contextUserId }: { name: string; contextUserId: string } = req.body;
    console.log('createSafe', contextUserId);

    const user = await User.findById<Document & TUser>(contextUserId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    const safe = new Safe({ name });
    user.safes?.push(safe);
    await user.save();
    return res.json(safe);
  } catch (error) {
    next(error); // Properly forward error to error handling middleware
  }
});

export default safeRouter;
