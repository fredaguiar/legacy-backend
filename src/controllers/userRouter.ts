import express, { NextFunction, Request, Response } from 'express';
import mongoose, { Document } from 'mongoose';
import moment from 'moment-timezone';
import Agenda, { Job, JobAttributesData } from 'agenda';
import User from '../models/User';

const userRouter = (_storage: AWS.S3) => {
  const router = express.Router();

  interface ILifeCheck extends JobAttributesData {
    lifeCheckInfo: { userId: string; firstName: string; lastName: string };
  }
  const agenda = new Agenda({
    db: { address: process.env.MONGO_URI as string },
  });
  agenda
    .on('ready', () => console.log('Agenda started!'))
    .on('error', (error) => console.error('Agenda connection error:', error));

  // Define the job outside of the route handler
  agenda.define('SEND NOTES', async (job: Job<ILifeCheck>) => {
    const lifeCheckInfo = job.attrs.data.lifeCheckInfo;
    console.log('SEND NOTES job executed. lifeCheckInfo:', lifeCheckInfo);
    // Add your logic here to send notes or perform necessary actions
  });

  router.post('/updateUserProfile', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const { fieldsToUpdate } = req.body;

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }

      const result: Partial<TUser> = { lifeCheck: {} };
      const fieldsList: TUserFieldsToUpdate[] = fieldsToUpdate;
      fieldsList.forEach((field: TUserFieldsToUpdate) => {
        const nested = field.split('.');
        // check if it is an object such as user.lifeCheck = {}
        if (nested.length === 2) {
          const [obj, prop] = nested;
          // @ts-ignore
          result[obj][prop] = req.body[obj][prop];
          return;
        }
        // @ts-ignore
        result[field] = req.body[field];
      });

      // Merge result into user
      Object.keys(result).forEach((key) => {
        const typedKey = key as keyof TUser;
        if (typeof result[typedKey] === 'object' && result[typedKey] !== null) {
          // @ts-ignore
          user[typedKey] = { ...user[typedKey], ...result[typedKey] };
        } else {
          // @ts-ignore
          user[typedKey] = result[typedKey];
        }
      });

      await user.save();

      console.log('fieldsList >>>>>> ', fieldsList);

      const {
        firstName,
        lastName,
        lifeCheck: { active, shareCount, shareCountType },
      } = user;

      // schedule notification
      if (active) {
        await agenda.start();

        // agenda supports the following units: seconds, minutes, hours, days, weeks, months
        const runAt = moment().add(3, 'seconds').tz('America/Sao_Paulo').toDate();
        await agenda.schedule(runAt, 'SEND NOTES', {
          lifeCheckInfo: { userId: userId, firstName, lastName },
        });
      } else {
        // remove from agenda
      }

      return res.json({ ...fieldsToUpdate, ...result });
    } catch (error) {
      next(error);
    }
  });

  router.get('/getUserProfile', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }

      const { firstName, lastName, language, country, timezone, email } = user;
      const { phoneCountry, phone, emailVerified, mobileVerified } = user;
      const {
        lifeCheck: {
          shareTime,
          shareFrequency,
          shareFrequencyType,
          shareCount,
          shareCountType,
          shareCountNotAnswered,
        },
      } = user;

      const profile: TUserProfile = {
        firstName,
        lastName,
        language,
        country,
        timezone,
        email,
        phoneCountry,
        phone,
        emailVerified,
        mobileVerified,
        lifeCheck: {
          shareTime,
          shareFrequency,
          shareFrequencyType,
          shareCount,
          shareCountType,
          shareCountNotAnswered,
        },
      };

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

      // const files = await bucket.find({ 'metadata.userId': userId }).toArray();
      // const storageUsedInBytes = files.reduce((prev, curr) => prev + curr.length, 0);

      // const result: StorageInfo = {
      //   storageUsedInBytes,
      //   storageFileCount: files.length,
      //   storageQuotaInMB: user.storageQuotaInMB || 0,
      // };
      const result = {};
      console.log('getStorageInfo result', result);

      return res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
};

export default userRouter;
