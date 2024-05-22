import mongoose, { Types } from 'mongoose';

export type TSafe = {
  name: string;
  description?: string;
  autoSharing?: boolean;
  _id?: Types.ObjectId;
};

export type TUploadFilesResult = {
  url: string;
  filename: string;
  type: string;
};

export type TPassword = {
  title: string;
  username: string;
  password: string;
  notes: string;
  safeId: string;
};

const safeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: false },
  autoSharing: { type: Boolean, required: true },
  createdAt: { type: Date, default: Date.now },
});

safeSchema.pre('save', async function (next, err) {
  next();
});

export const Safe = mongoose.model<TSafe>('safe', safeSchema);
export { safeSchema };
