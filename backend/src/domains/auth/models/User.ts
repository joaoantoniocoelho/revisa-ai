import mongoose, { type Model } from 'mongoose';
import { DEFAULT_CREDITS_FOR_NEW_USER } from '../../../shared/config/credits.js';

export interface IUserDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  credits: number;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
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
      required: false,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    googleId: {
      type: String,
      required: false,
      sparse: true,
      index: true,
    },
    credits: {
      type: Number,
      default: DEFAULT_CREDITS_FOR_NEW_USER,
      min: 0,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      required: false,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      required: false,
      select: false,
    }
  },
  { timestamps: true }
);

export const UserModel: Model<IUserDoc> =
  mongoose.models.User ?? mongoose.model<IUserDoc>('User', userSchema);
