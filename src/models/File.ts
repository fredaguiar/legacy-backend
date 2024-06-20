import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  mimetype: { type: String, required: true },
  length: { type: Number, required: true },
  username: { type: String, required: false },
  password: { type: String, required: false },
  notes: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
});

export const File = mongoose.model<TFile>('file', fileSchema);
export { fileSchema };
