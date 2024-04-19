import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User, { TUser } from '../models/User';
import { addToken } from '../utils/JwtUtil';

const authRouter = express.Router();

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  console.log('LOGIN with email, password', email, password);

  const user = await User.findOne<TUser>({ email }).exec();
  if (!user) {
    throw new Error('User does not exist');
  }
  if (!user.password) {
    throw new Error('Unexpected Error');
  }
  const auth = await bcrypt.compare(password, user.password);
  if (!auth) {
    throw new Error('Invalid username or password');
  }
  delete user.password;
  addToken(user);
  return res.json(user);
});

authRouter.post('/signup', (req, res) => {
  res.send('This is the homepage request');
});

authRouter.get('/test', (req, res) => {
  console.log('Test ROUTER /');
  res.send('RESPONSE Test ROUTER /');
});

// Importing the router
export default authRouter;
