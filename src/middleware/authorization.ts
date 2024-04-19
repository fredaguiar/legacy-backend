import { Request, Response, NextFunction } from 'express';
import logger from '../logger';
import { verifyToken } from '../utils/JwtUtil';

const authorization = (req: Request, res: Response, next: NextFunction) => {
  let userId = null;
  try {
    if (req.headers.authorization) {
      const authToken = req.headers.authorization.substring(7).trim();
      const decoded = authToken ? verifyToken(authToken) : null;
      userId = decoded?.id;
      req.body.contextUserId = userId;
      console.log('req.headers.authorization userId', userId);
      return next();
    }
    return res.status(401).json({ message: 'User not logged in' });
  } catch (err: any) {
    return res.status(401).json({ message: 'Invalid user session' });
  }
};
export default authorization;
