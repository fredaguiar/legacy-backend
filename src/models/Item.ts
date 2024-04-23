import mongoose, { Types } from 'mongoose';
import dbConnection from '../dbConnection';

export type TItem = {
  name: string;
  safeId: string;
  type: 'photos' | 'videos';
  content: string;
  _id?: Types.ObjectId;
};

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  fileUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

itemSchema.pre('save', async function (next, err) {
  next();
});

export const Item = dbConnection.model<TItem>('item', itemSchema);
export { itemSchema };
