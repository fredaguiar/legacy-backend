import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

const uncaughtException = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Server failure status');
  logger.error(err.stack);
  if (!res.headersSent) {
    return res.status(500).json({ message: 'Server failure' });
  }
};
export default uncaughtException;
