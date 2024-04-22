import express, { Request, Response } from 'express';
import { Document } from 'mongoose';
import multer from 'multer';
import User, { TUser } from '../models/User';
import { Safe, TUploadFilesResult } from '../models/Safe';

const safeRouter = express.Router();

safeRouter.post('/createSafe', async (req: Request, res: Response) => {
  const { name, contextUserId }: { name: string; contextUserId: string } = req.body;
  console.log('createSafe', contextUserId);

  const user = await User.findById<Document & TUser>(contextUserId);
  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }
  const safe = new Safe({ name });
  user.safes?.push(safe);
  await user.save();
  return res.json(safe);
});

const upload = multer({ dest: 'uploads/' });

safeRouter.post('/uploadFiles', upload.array('file'), async (req: Request, res: Response) => {
  console.log('uploadFiles body', req.body);
  console.log('uploadFiles file', req.file);

  const result: TUploadFilesResult = { url: 'URL', filename: 'FN', type: 'TP' };

  return res.json(result);
});

export default safeRouter;
