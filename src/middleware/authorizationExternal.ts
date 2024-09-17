import { Request, Response, NextFunction } from 'express';
import logger from '../logger';
import { verifyToken } from '../utils/JwtUtil';

const authorizationExternal = (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: this code should be sent on the header.authorization for security purposes
    const authToken = req.query['id'] as string;
    if (authToken) {
      const decoded = verifyToken(authToken);
      const userId = decoded?.id;
      // @ts-ignore
      req.context = { userId };
      logger.info('authorizationExternal userId', userId);
      return next();
    }
    return res.status(401).json({ message: 'User not logged in' });
  } catch (err: any) {
    return res.status(401).json({ message: 'Invalid user session' });
  }
};
export default authorizationExternal;
