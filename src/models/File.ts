import mongoose, { Types } from 'mongoose';

const fileSchema = new mongoose.Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true }, // TODO: useless
  safeId: { type: Types.ObjectId, ref: 'Safe', required: true }, // TODO: useless
  fileName: { type: String, required: true },
  mimetype: { type: String, required: true },
  length: { type: Number, required: true },
  username: { type: String, required: false },
  password: { type: String, required: false },
  notes: { type: String, required: false },
  content: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
});

fileSchema.index({
  userId: 'text',
  safeId: 'text',
  fileName: 'text',
  username: 'text',
  notes: 'text',
  content: 'text',
});

export const File = mongoose.model<TFile>('file', fileSchema);
export { fileSchema };
