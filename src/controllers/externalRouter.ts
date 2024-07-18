import express, { NextFunction, Request, Response } from 'express';
import { Document } from 'mongoose';
import Agenda from 'agenda';
import User from '../models/User';
import { scheduleNotificationToClients, SEND_NOTIFICATION } from '../agenda/agendaNotification';
import { confirmLifeCheck } from './userRouter';

const externalRouter = () => {
  const router = express.Router();

  router.get(
    '/confirmLifeCheckByEmail/',
    async (req: Request, res: Response, next: NextFunction) => {
      // @ts-ignore
      const userId = req.context.userId;

      try {
        await confirmLifeCheck(userId);

        return res.send(true);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};

export default externalRouter;
