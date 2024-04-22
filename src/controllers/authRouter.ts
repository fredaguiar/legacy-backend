import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import User, { TUser } from '../models/User';
import { generateToken } from '../utils/JwtUtil';
import { generateVerifyCode } from '../utils/VerifyCode';
import { TSafe } from '../models/Safe';

type TCredentials = {
  email: string;
  password: string;
};

const authRouter = express.Router();

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password }: TCredentials = req.body;
  console.log('LOGIN with email, password', email, password);

  const user = await User.findOne<TUser>({ email }).lean();
  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }

  const auth = await bcrypt.compare(password, user.password as string);
  if (!auth) {
    return res.status(400).json({ message: 'Invalid username or password' });
  }

  // To transform data, shoud use lean(), because it converts the query document to json
  delete user.password;
  user.token = generateToken(user._id);
  return res.json(user);
});

authRouter.post('/signup', async (req: Request, res: Response) => {
  const { firstName, lastName, country, language, email, phoneCountry, phone, password }: TUser =
    req.body;
  console.log('signup', email, firstName);
  const existingUser = await User.findOne<TUser>({ email }).exec();
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const newSafe = (name: string): TSafe => {
    return { name, items: [] };
  };

  const verifyCode = generateVerifyCode();
  const safes: TSafe[] = [newSafe('Personal Documents'), newSafe('Friends and family')];
  const newUser = await User.create<TUser>({
    firstName,
    lastName,
    country,
    language,
    email,
    phoneCountry,
    phone,
    password,
    emailVerified: false,
    mobileVerified: false,
    mobileVerifyCode: verifyCode,
    introductionViewed: false,
    safes,
  });
  newUser.token = generateToken(newUser._id);
  delete newUser.password;
  return res.json(newUser);
});

authRouter.get('/test', (req, res) => {
  console.log('Test ROUTER /');
  res.send('RESPONSE Test ROUTER /');
});

export default authRouter;
