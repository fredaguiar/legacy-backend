import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcrypt';
import { safeSchema } from './Safe';

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  language: { type: String, required: true },
  country: { type: String, required: true },
  timezone: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  phoneCountry: { type: String, required: true },
  password: { type: String, required: true, minLength: 1 },
  emailVerified: { type: Boolean, required: true, default: false },
  mobileVerified: { type: Boolean, required: true, default: false },
  mobileVerifyCode: { type: Number, required: false },
  introductionViewed: { type: Boolean, default: false, required: true },
  storageQuotaInMB: { type: Number, required: true },
  lifeCheck: {
    active: { type: Boolean, default: false, required: false },
    shareWeekday: { type: String, required: false },
    shareTime: { type: Date, required: false },
    shareCount: { type: Number, required: false },
    shareCountType: { type: String, required: false },
    shareCountNotAnswered: { type: Number, required: false },
  },
  createdAt: { type: Date, default: Date.now },
  safes: [safeSchema],
});

userSchema.pre('save', async function (next, err) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt();
    this.password = bcrypt.hashSync(this.password, salt);
  } catch (err) {}
  next();
});

userSchema.index({
  userId: 1,
  safeId: 1,
  'safes.files.fileName': 'text',
  'safes.files.username': 'text',
  'safes.files.notes': 'text',
});

const User = mongoose.model<TUser>('users', userSchema);

export default User;
