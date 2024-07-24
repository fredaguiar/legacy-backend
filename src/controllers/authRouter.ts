import express, { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import S3 from 'aws-sdk/clients/s3';
import User from '../models/User';
import { generateToken } from '../utils/JwtUtil';
import { generateVerifyCode } from '../utils/VerifyCode';

const authRouter = (_storage: S3) => {
  const router = express.Router();

  const createSafe = ({ name }: { name: string }): TSafe => {
    return { name, autoSharing: false, description: '', emails: [], phones: [] };
  };

  router.get('/test', async (req: Request, res: Response, next: NextFunction) => {
    return res.send('OK');
  });

  type TLogin = { res: Response; next: NextFunction; email: string; password: string };

  const login = async ({ res, next, email, password }: TLogin) => {
    try {
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
  };

  router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    const { email, password }: TCredentials = req.body;
    return login({ email, password, res, next });
  });

  router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
    let newUser: TUser | undefined;
    try {
      const {
        firstName,
        lastName,
        country,
        timezone,
        language,
        email,
        phoneCountry,
        phone,
        password,
      }: TUser = req.body;
      const existingUser = await User.findOne<TUser>({ email }).exec();
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      if (!email || !password) {
        return res.status(400).json({ message: 'Missing user email or password' });
      }

      const verifyCode = generateVerifyCode();
      const safes: TSafe[] = [
        createSafe({ name: 'Personal Documents' }),
        createSafe({ name: 'Friends and family' }),
      ];
      newUser = await User.create<TUser>({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        country,
        timezone,
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
        lifeCheck: {
          active: false,
          shareTime: '15:00',
          shareWeekdays: ['wednesday'],
          shareCount: 5,
          shareCountType: 'days',
          shareCountNotAnswered: 3,
          noAnswerCounter: 0,
          notConfiguredYet: true,
        },
        safes,
      });

      return login({ email, password, res, next });
    } catch (error) {
      next(error);
    }
  });

  router.get('/createSearchIndexes', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const SEARCH_INDEX_NAME = 'search_index';
    } catch (error) {
      next(error); // forward error to error handling middleware
    }
  });

  return router;
};

export default authRouter;
