import mongoose from 'mongoose';
import { contactSchema } from './Contact';

const safeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: false },
  autoSharing: { type: Boolean, required: true },
  createdAt: { type: Date, default: Date.now },
  emails: [contactSchema],
  phones: [contactSchema],
});

safeSchema.pre('save', async function (next, err) {
  next();
});

export const Safe = mongoose.model<TSafe>('safe', safeSchema);
export { safeSchema };
