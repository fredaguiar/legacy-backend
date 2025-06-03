import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

const activityLog = (req: Request, res: Response, next: NextFunction): void => {
  try {
    next();
  } catch (err: any) {
    res.status(401).json({ message: 'Activity log error' });
  }
};
export default activityLog;
