import express, { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import S3 from 'aws-sdk/clients/s3';
import User from '../models/User';
import { generateToken, verifyToken } from '../utils/JwtUtil';
import { generateVerifyCode } from '../utils/VerifyCode';
import Mail from 'nodemailer/lib/mailer';
import { sendConfirmationEmail, sendEmail } from '../messaging/email';
import { sendConfirmationMobile, sendSms } from '../messaging/sms';
import { emailForgotPassword, smsForgotPassword } from '../messaging/messageBody';
import { Document } from 'mongoose';
import logger from '../logger';

const authRouter = (_storage: S3) => {
  const router = express.Router();

  class ClientError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ClientError';
    }
  }

  const createSafe = ({ name }: { name: string }): TSafe => {
    return { name, autoSharing: false, description: '', emails: [], phones: [] };
  };

  router.get('/test', async (req: Request, res: Response, next: NextFunction) => {
    console.log('🚀 ~ router.get ~ TEST');
    res.send('OK');
  });

  type TLogin = { res: Response; next: NextFunction; email: string; password: string };

  const login = async ({ res, next, email, password }: TLogin): Promise<void> => {
    try {
      const user = await User.findOne<TUser>({ email }).lean();
      if (!user) {
        res.status(400).json({ message: 'User not found' });
        return;
      }

      const auth = await bcrypt.compare(password, user.password as string);
      if (!auth) {
        res.status(400).json({ message: 'Invalid username or password' });
        return;
      }

      // To transform data, shoud use lean(), because it converts the query document to json
      delete user.password;
      delete user.mobileVerifyCode;
      delete user.forgotPasswordResetCode;
      delete user.forgotPasswordAttepmts;

      user.token = generateToken({ id: user._id.toString() });

      logger.info(`Login userId: ${user._id.toString()}`);

      res.json(user);
    } catch (error) {
      next(error);
    }
  };

  router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password }: TCredentials = req.body;
    return login({ email, password, res, next });
  });

  router.post('/signup', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let user: TUser | undefined;
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
        res.status(400).json({ message: 'User already exists' });
        return;
      }

      if (!email || !password) {
        res.status(400).json({ message: 'Missing user email or password' });
        return;
      }

      const verifyCode = generateVerifyCode();
      const safes: TSafe[] = [
        createSafe({ name: 'Personal Documents' }),
        createSafe({ name: 'Friends and family' }),
      ];
      user = await User.create<TUser>({
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

      if (!user) {
        res.status(400).json({ message: 'User registration failed' });
        return;
      }

      logger.info(`Signup - UserId: ${user._id.toString()}, Name: ${firstName} ${lastName}`);

      sendConfirmationEmail({ user });
      sendConfirmationMobile({ user });

      login({ email, password, res, next });
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

  router.post(
    '/forgotPassword',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { email, phone, phoneCountry, method }: TForgotPassword = req.body;

      try {
        if (!method) {
          res.status(400).json({ message: 'Email or phone is required' });
          return;
        }
        if (method === 'email' && !email) {
          res.status(400).json({ message: 'Email is required' });
          return;
        }
        if (method === 'sms' && (!phone || !phoneCountry)) {
          res.status(400).json({ message: 'Phone is required' });
          return;
        }

        const resetCode = generateVerifyCode();
        let user;

        if (method === 'email') {
          user = await User.findOne<TUser & Document>({ email }).exec();
          if (!user) {
            res.status(400).json({ message: 'User not found' });
            return;
          }
          // Send Reset code
          // TODO: this token should be only valid for confirmLifeCheckByEmail.
          // TODO: need expiration
          const userId = user._id.toString();
          const mailOptions: Mail.Options = {
            from: 'fatstrategy@gmail.com',
            to: user.email,
            subject: 'Legacy - Reset your password',
            html: emailForgotPassword({ firstName: user.firstName, code: resetCode }),
            priority: 'high',
          };
          sendEmail({ mailOptions, userId });

          logger.info(`Forgot password - sendEmail: ${email}. userId: ${userId}`);
        } else if (method === 'sms') {
          user = await User.findOne<TUser & Document>({ phoneCountry, phone }).exec();
          if (!user) {
            res.status(400).json({ message: 'User not found' });
            return;
          }
          const userId = user._id.toString();
          // Send Reset code
          // TODO: need expiration
          const to = `+${user.phoneCountry.trim()}${user.phone.trim()}`;
          await sendSms({
            userId,
            body: smsForgotPassword({ firstName: user.firstName, resetCode }),
            to,
          });
          logger.info(
            `Forgot password - sendSms phone # ${to}, email: ${email}. userId: ${userId}`,
          );
        }

        if (!user) {
          res.status(400).json({ message: 'Missing information' });
          return;
        }

        user.forgotPasswordResetCode = resetCode;
        await user.save();
      } catch (error) {
        next(error); // forward error to error handling middleware
      }

      res.send(true);
    },
  );

  const forgotPasswordFindUser = async ({
    email,
    phone,
    phoneCountry,
    method,
    code,
  }: TForgotPassword): Promise<TUser & Document> => {
    if (!method) {
      throw new ClientError('Email or phone is required');
    }
    if (method === 'email' && !email) {
      throw new ClientError('Email is required');
    }
    if (method === 'sms' && (!phone || !phoneCountry)) {
      throw new ClientError('Phone is required');
    }

    let user;
    if (method === 'email') {
      user = await User.findOne<TUser & Document>({
        email,
        forgotPasswordResetCode: code,
      }).exec();
    } else if (method === 'sms') {
      user = await User.findOne<TUser & Document>({
        phoneCountry,
        phone,
        forgotPasswordResetCode: code,
      }).exec();
    }

    if (!user) {
      throw new ClientError('Invalid code');
    }

    return user;
  };

  router.post(
    '/forgotPasswordResetCode',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { email, phone, phoneCountry, method, code } = req.body;
        await forgotPasswordFindUser({ email, phone, phoneCountry, method, code });
        const expiresIn = 1 * 60 * 1000; // 1hr

        const token = generateToken({ email, phone, phoneCountry, method, code }, expiresIn);

        res.json({ token });
      } catch (error) {
        if (error instanceof ClientError) {
          res.status(400).json({ message: error.message });
        } else {
          next(error);
        }
      }
    },
  );

  router.post(
    '/forgotPasswordConfirm',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.headers.authorization) {
          res.status(401).json({ message: 'Session error' });
          return;
        }

        const authToken = req.headers.authorization.substring(7).trim();
        const decoded = authToken ? verifyToken(authToken) : null;

        const { email, phone, phoneCountry, method, code } = decoded as any;
        const user = await forgotPasswordFindUser({ email, phone, phoneCountry, method, code });

        user.password = req.body.password;
        user.forgotPasswordResetCode = undefined;
        await user.save();

        res.json(true);
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          res.status(401).json({ message: 'Session expired' });
          return;
        }
        if (error instanceof ClientError) {
          res.status(400).json({ message: error.message });
          return;
        } else {
          next(error); // forward error to error handling middleware
        }
      }
    },
  );

  return router;
};

export default authRouter;
