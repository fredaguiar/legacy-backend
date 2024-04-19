import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Document, Types } from 'mongoose';
import User, { TUser } from '../models/User';
import { generateToken } from '../utils/JwtUtil';
import { generateVerifyCode } from '../utils/VerifyCode';
import { Safe, TSafe } from '../models/Safe';

const safeRouter = express.Router();

safeRouter.post('/createSafe', async (req, res) => {
  const { name, contextUserId }: { name: string; contextUserId: string } = req.body;
  console.log('createSafe', contextUserId);

  const user = await User.findById<Document & TUser>(contextUserId);
  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }
  const safe = new Safe({ name });
  user.safes?.push(safe);
  await user.save();
  return safe;
});

export default safeRouter;
