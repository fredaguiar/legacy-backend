import express, { NextFunction, Request, Response } from 'express';
import { Document } from 'mongoose';
import { confirmLifeCheck } from './userRouter';
import { emailChecked } from '../messaging/messageBody';
import User from '../models/User';

const externalRouter = () => {
  const router = express.Router();

  router.get(
    '/confirmLifeCheckByEmail/',
    async (req: Request, res: Response, _next: NextFunction) => {
      // @ts-ignore
      const userId = req.context.userId;
      let message = '';

      try {
        await confirmLifeCheck(userId);
        message = '<font color="#6a00ff" size="16px", size>Thanks!</font>';
      } catch (error) {
        message =
          '<font color="#ff0048" size="16px">An unexcpected error has occurred! Try again later.</font>';
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.write(emailChecked({ message }));
      return res.end();
    },
  );

  router.get('/confirmEmail/', async (req: Request, res: Response, _next: NextFunction) => {
    // @ts-ignore
    const userId = req.context.userId;
    let message = '';

    try {
      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        throw Error(`User not found. userID: ${userId}`);
      }
      user.emailVerified = true;
      await user.save();

      message = '<font color="#6a00ff" size="16px", size>Email confirmed. Thanks!</font>';
    } catch (error) {
      message =
        '<font color="#ff0048" size="16px">An unexcpected error has occurred! Try again later.</font>';
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(emailChecked({ message }));
    return res.end();
  });

  return router;
};

export default externalRouter;
