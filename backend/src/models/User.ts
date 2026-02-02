import mongoose, { type Model } from 'mongoose';
import type { PlanType } from '../types/index.js';

export interface IUserDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  planType: PlanType;
  monthlyPdfCount: number;
  lastPdfResetDate: Date;
  /** Current quota month (YYYY-MM); used for atomic reset */
  pdfUsageMonth?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new mongoose.Schema<IUserDoc>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    planType: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free',
    },
    monthlyPdfCount: { type: Number, default: 0 },
    lastPdfResetDate: { type: Date, default: Date.now },
    pdfUsageMonth: { type: String, default: '0000-00' },
  },
  { timestamps: true }
);

export const UserModel: Model<IUserDoc> =
  mongoose.models.User ?? mongoose.model<IUserDoc>('User', userSchema);
