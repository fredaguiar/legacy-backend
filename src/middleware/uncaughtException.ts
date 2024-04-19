import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

const uncaughtException = (err: any, req: Request, res: Response) => {
  logger.error({ message: err.stack });
  return res.status(500).json({ message: 'Unexpected server failure' });
};
export default uncaughtException;
