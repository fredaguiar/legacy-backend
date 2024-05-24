import express, { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from '../models/User';
import { generateToken } from '../utils/JwtUtil';
import { generateVerifyCode } from '../utils/VerifyCode';

type TCredentials = {
  email: string;
  password: string;
};

const authRouter = (bucket: mongoose.mongo.GridFSBucket) => {
  const router = express.Router();

  router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password }: TCredentials = req.body;
      const user = await User.findOne<TUser>({ email }).lean();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }

      const auth = await bcrypt.compare(password, user.password as string);
      if (!auth) {
        return res.status(400).json({ message: 'Invalid username or password' });
      }

      // To transform data, shoud use lean(), because it converts the query document to json
      delete user.password;
      user.token = generateToken(user._id);
      return res.json(user);
    } catch (error) {
      next(error);
    }
  });

  router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        firstName,
        lastName,
        country,
        language,
        email,
        phoneCountry,
        phone,
        password,
      }: TUser = req.body;
      console.log('signup', email, firstName);
      const existingUser = await User.findOne<TUser>({ email }).exec();
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const verifyCode = generateVerifyCode();
      const safes: TSafe[] = [{ name: 'Personal Documents' }, { name: 'Friends and family' }];
      const newUser = await User.create<TUser>({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        country,
        language,
        email: email.trim(),
        phoneCountry: phoneCountry.trim(),
        phone: phone.trim(),
        password: password?.trim(),
        emailVerified: false,
        mobileVerified: false,
        mobileVerifyCode: verifyCode,
        introductionViewed: false,
        storageQuotaInMB: 1024 * 10, // 10 GB
        lifeCheck: false,
        safes,
      });
      newUser.token = generateToken(newUser._id);
      delete newUser.password;
      return res.json(newUser);
    } catch (error) {
      next(error);
    }
  });

  return router;
};

export default authRouter;
