import mongoose, { Types } from 'mongoose';

export type TContact = {
  name: string;
  contact: string;
  type: string;
  _id: Types.ObjectId;
};

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true },
  type: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

contactSchema.pre('save', async function (next, err) {
  next();
});

export const Safe = mongoose.model<TContact>('contact', contactSchema);
export { contactSchema };
