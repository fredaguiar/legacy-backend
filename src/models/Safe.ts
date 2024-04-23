import mongoose, { Types } from 'mongoose';
import { itemSchema, TItem } from './Item';
import dbConnection from '../dbConnection';

export type TSafe = {
  name: string;
  items: Array<TItem>;
  _id?: Types.ObjectId;
};

export type TUploadFilesResult = {
  url: string;
  filename: string;
  type: string;
};

const safeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  items: [itemSchema],
});

safeSchema.pre('save', async function (next, err) {
  next();
});

export const Safe = dbConnection.model<TSafe>('safe', safeSchema);
export { safeSchema };
