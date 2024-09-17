import jwt from 'jsonwebtoken';
import fs from 'fs';
import { Types } from 'mongoose';

const TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1hr
const PRIVATE_KEY = fs.readFileSync('keys/rsa.ppk', 'utf-8');
const PUBLIC_KEY = fs.readFileSync('keys/rsa.pub', 'utf-8');

export const generateToken = (data: object, expiresIn = TOKEN_EXPIRES_MS): string => {
  return jwt.sign(data, PRIVATE_KEY, {
    expiresIn: expiresIn,
    algorithm: 'RS256',
  });
};

export const verifyToken = (token: string): jwt.JwtPayload => {
  const decoded: jwt.JwtPayload = jwt.verify(token, PUBLIC_KEY, {
    algorithms: ['RS256'],
  }) as jwt.JwtPayload;
  return decoded;
};
