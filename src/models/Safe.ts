import mongoose, { Types } from 'mongoose';
import { itemSchema, TItem } from './Item';

export type TSafe = {
  name: string;
  items: Array<TItem>;
  _id?: Types.ObjectId;
};

const safeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  items: [itemSchema],
});

safeSchema.pre('save', async function (next, err) {
  next();
});

export const Safe = mongoose.model<TSafe>('safe', safeSchema);
export { safeSchema };
