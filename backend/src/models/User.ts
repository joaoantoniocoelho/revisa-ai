import mongoose, { type Model } from 'mongoose';
import { DEFAULT_CREDITS_FOR_NEW_USER } from '../config/credits.js';

export interface IUserDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  credits: number;
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
    credits: {
      type: Number,
      default: DEFAULT_CREDITS_FOR_NEW_USER,
      min: 0,
    },
  },
  { timestamps: true }
);

export const UserModel: Model<IUserDoc> =
  mongoose.models.User ?? mongoose.model<IUserDoc>('User', userSchema);
