import express, { NextFunction, Request, Response } from 'express';
import { Document } from 'mongoose';
import Expo, { ExpoPushMessage, ExpoPushToken } from 'expo-server-sdk';
import Agenda, { Job, JobAttributesData } from 'agenda';
import User from '../models/User';

const SEND_NOTIFICATION = 'SEND_NOTIFICATION';

const userRouter = (_storage: AWS.S3, agenda: Agenda) => {
  const router = express.Router();

  interface ILifeCheck extends JobAttributesData {
    lifeCheckInfo: { userId: string; firstName: string; lastName: string };
  }

  // optionally providing an access token if you have enabled push security
  const expo = new Expo({
    // accessToken: process.env.EXPO_ACCESS_TOKEN,
    useFcmV1: true, // this can be set to true in order to use the FCM v1 API
  });

  agenda.define(SEND_NOTIFICATION, async (job: Job<ILifeCheck>) => {
    const info = job.attrs.data;

    const pushToken = process.env.EXPO_PUSH_TOKEN as ExpoPushToken;
    if (!Expo.isExpoPushToken(process.env.EXPO_PUSH_TOKEN)) {
      console.log(`Push token ${process.env.EXPO_PUSH_TOKEN} is not a valid Expo push token`);
    }

    const message: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      body: 'This is a test notification',
    };

    let ticket = await expo.sendPushNotificationsAsync([message]);
    if (ticket[0]?.status !== 'ok') {
      console.log(`Push token ticket error: ${ticket[0]?.status}`);
    }
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
        lifeCheck: { shareTime, shareWeekdays, shareCount, shareCountType, shareCountNotAnswered },
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
          shareWeekdays,
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

  router.post('/updateLifeCheck', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }

      let lifeCheck = {};
      if (req.body.lifeCheck.shareCount) {
        //update life check frequency
        const {
          lifeCheck: {
            active,
            shareCount,
            shareCountType,
            shareWeekdays,
            shareTime,
            shareCountNotAnswered,
          },
        } = req.body;
        lifeCheck = {
          ...user.lifeCheck,
          shareCount,
          shareCountType,
          shareWeekdays,
          shareTime,
          shareCountNotAnswered,
        };
      } else {
        lifeCheck = { ...user.lifeCheck, active: req.body.lifeCheck.active };
      }
      user.lifeCheck = lifeCheck;

      await user.save();

      // schedule notification
      if (user.lifeCheck.active) {
        const {
          firstName,
          lastName,
          lifeCheck: { shareWeekdays, shareTime },
        } = user;

        const notificationData = { lifeCheckInfo: { userId, firstName, lastName } };
        const [hours, minutes] = shareTime
          ? shareTime.split(':').map((v: string) => parseInt(v))
          : ['10', '00'];
        const weekday = shareWeekdays
          ?.map((day: string) => day.substring(0, 3).toUpperCase())
          .join(',');
        const cron = `${minutes} ${hours} * * ${weekday}`;

        // console.log('SEND NOTES cron:', cron);
        // console.log('SEND  notificationData:', notificationData);
        await agenda.start();
        await agenda.every(cron, SEND_NOTIFICATION, notificationData);
      } else {
        // remove from agenda
        // agenda.cancel({ name: SEND_NOTIFICATION });
      }

      return res.json({ lifeCheck });
    } catch (error) {
      next(error);
    }
  });

  router.post('/confirmLifeCheck', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      user.lifeCheck.noAnswerCounter = 0;
      await user.save();

      return res.send(true);
    } catch (error) {
      next(error);
    }
  });

  return router;
};

export default userRouter;
