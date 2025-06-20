import express, { NextFunction, Request, Response } from 'express';
import { Document } from 'mongoose';
import S3 from 'aws-sdk/clients/s3';
import Agenda from 'agenda';
import User from '../models/User';
import { SEND_NOTIFICATION } from '../agenda/agendaNotification';
import { sendConfirmationEmail } from '../messaging/email';
import { sendConfirmationMobile } from '../messaging/sms';
import { generateVerifyCode } from '../utils/VerifyCode';

export const confirmLifeCheck = async (userId: string) => {
  const user = await User.findById<Document & TUser>(userId).exec();
  if (!user) {
    throw Error(`User not found. userID: ${userId}`);
  }

  user.lifeCheck.noAnswerCounter = 0;
  await user.save();
};

const userRouter = (_storage: S3, agenda: Agenda) => {
  const router = express.Router();

  router.post(
    '/updateUserProfile',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // @ts-ignore
        const userId = req.context.userId;
        const { fieldsToUpdate } = req.body;

        const user = await User.findById<Document & TUser>(userId).exec();
        if (!user) {
          res.status(400).json({ message: 'User not found' });
          return;
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

        res.json({ ...fieldsToUpdate, ...result });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/getUserProfile',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // @ts-ignore
        const userId = req.context.userId;

        const user = await User.findById<Document & TUser>(userId).exec();
        if (!user) {
          res.status(400).json({ message: 'User not found' });
          return;
        }

        const { firstName, lastName, language, country, timezone, email } = user;
        const { phoneCountry, phone, emailVerified, mobileVerified } = user;
        const {
          lifeCheck: {
            shareTime,
            shareWeekdays,
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
            shareWeekdays,
            shareCount,
            shareCountType,
            shareCountNotAnswered,
          },
        };

        res.json(profile);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/getStorageInfo',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // @ts-ignore
        const userId = req.context.userId;
        console.log('getStorageInfo', userId);

        const user = await User.findById<Document & TUser>(userId).exec();
        if (!user) {
          res.status(400).json({ message: 'User not found' });
          return;
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

        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  // router.post('/updateLifeCheck', async (req: Request, res: Response, next: NextFunction) => {
  //   await scheduleNotificationToContacts(_storage, agenda);
  //   return res.json({});
  // });

  router.post(
    '/updateLifeCheck',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // @ts-ignore
        const userId = req.context.userId;

        const user = await User.findById<Document & TUser>(userId).exec();
        if (!user) {
          res.status(400).json({ message: 'User not found' });
          return;
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
        user.lifeCheck.notConfiguredYet = false;

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

        res.json({ lifeCheck });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/confirmLifeCheck',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // @ts-ignore
        const userId = req.context.userId;

        await confirmLifeCheck(userId);

        res.send(true);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/confirmMobile',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // @ts-ignore
      const userId = req.context.userId;
      const { code } = req.body;

      try {
        const user = await User.findById<Document & TUser>(userId).exec();
        if (!user) {
          throw Error(`User not found. userID: ${userId}`);
        }
        if (user.mobileVerifyCode !== code) {
          res.status(400).json({ message: 'Invalid code!' });
          return;
        }
        user.mobileVerified = true;
        user.mobileVerifyCode = undefined;
        await user.save();

        delete user.password;
        delete user.mobileVerifyCode;
        delete user.forgotPasswordResetCode;

        res.json(user);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/resendConfirmEmail',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // @ts-ignore
      const userId = req.context.userId;
      const { email } = req.body;

      try {
        const user = await User.findById<Document & TUser>(userId).exec();
        if (!user) {
          throw Error(`User not found. userID: ${userId}`);
        }
        user.email = email;
        await user.save();

        sendConfirmationEmail({ user });

        delete user.password;
        delete user.mobileVerifyCode;
        delete user.forgotPasswordResetCode;

        res.json(user);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/resendConfirmMobile',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // @ts-ignore
      const userId = req.context.userId;

      try {
        const user = await User.findById<Document & TUser>(userId).exec();
        if (!user) {
          throw Error(`User not found. userID: ${userId}`);
        }

        user.mobileVerifyCode = generateVerifyCode();
        await user.save();

        await sendConfirmationMobile({ user });

        res.json(user);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};

export default userRouter;
