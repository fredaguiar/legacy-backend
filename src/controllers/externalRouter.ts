import express, { NextFunction, Request, Response } from 'express';
import { confirmLifeCheck } from './userRouter';
import { emailChecked } from '../agenda/messageBody';

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
          '<font color="#ff0048" size="16px">An unexcpected error has occured! Try again later.</font>';
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.write(emailChecked({ message }));
      return res.end();
    },
  );

  return router;
};

export default externalRouter;
