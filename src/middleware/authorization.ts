import { Request, Response, NextFunction } from 'express';
import logger from '../logger';
import { verifyToken } from '../utils/JwtUtil';

const authorization = (req: Request, res: Response, next: NextFunction) => {
  console.log('req.headers.authorization', req.headers);
  let userId = null;
  if (req.headers.authorization) {
    const authToken = req.headers.authorization.substring(7).trim();
    try {
      const decoded = authToken ? verifyToken(authToken) : null;
      userId = decoded?.id;
    } catch (err: any) {
      return res.status(401).json({ message: 'User not logged in' });
    }
  }
};
export default authorization;
