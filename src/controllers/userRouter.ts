import express, { NextFunction, Request, Response } from 'express';
import { Document } from 'mongoose';
import Agenda from 'agenda';
import User from '../models/User';
import { SEND_NOTIFICATION } from '../agenda/agendaNotification';

export const confirmLifeCheck = async (userId: string) => {
  const user = await User.findById<Document & TUser>(userId).exec();
  if (!user) {
    throw Error(`User not found. userID: ${userId}`);
  }

  user.lifeCheck.noAnswerCounter = 0;
  await user.save();
};

const userRouter = (_storage: AWS.S3, agenda: Agenda) => {
  const router = express.Router();

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

  // router.post('/updateLifeCheck', async (req: Request, res: Response, next: NextFunction) => {
  //   await configNotification(agenda);
  //   return res.json({});
  // });

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

      // Cancel any existing job for this user
      await agenda.cancel({ name: SEND_NOTIFICATION, 'data.lifeCheckInfo.userId': userId });

      // schedule notification
      if (user.lifeCheck.active) {
        const {
          lifeCheck: { shareWeekdays, shareTime },
        } = user;

        const notificationData: ILifeCheck = {
          lifeCheckInfo: { userId },
        };
        const [hours, minutes] = shareTime
          ? shareTime.split(':').map((v: string) => parseInt(v))
          : ['10', '00'];
        const weekday = shareWeekdays
          ?.map((day: string) => day.substring(0, 3).toUpperCase())
          .join(',');
        const cron = `${minutes} ${hours} * * ${weekday}`;

        await agenda.start();
        await agenda.every(cron, SEND_NOTIFICATION, notificationData);
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

      await confirmLifeCheck(userId);

      return res.send(true);
    } catch (error) {
      next(error);
    }
  });

  return router;
};

export default userRouter;
