import { Request, Response, NextFunction } from 'express';
import logger from '../logger';
import { verifyToken } from '../utils/JwtUtil';

const authorization = async (req: Request, res: Response, next: NextFunction) => {
  let userId = null;
  // TODO: needs to implement CSFR token
  try {
    if (req.headers.authorization) {
      const authToken = req.headers.authorization.substring(7).trim();
      const decoded = authToken ? verifyToken(authToken) : null;
      userId = decoded?.id;
      // @ts-ignore
      req.context = { userId };
      next();
    } else {
      res.status(401).json({ message: 'User not logged in' });
    }
  } catch (err: any) {
    res.status(401).json({ message: 'Invalid user session' });
  }
};
export default authorization;
