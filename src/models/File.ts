import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  s3Key: { type: String, required: true },
  mimetype: { type: String, required: true },
  length: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const File = mongoose.model<TFile>('file', fileSchema);
export { fileSchema };
