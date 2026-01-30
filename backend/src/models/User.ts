import mongoose, { type HydratedDocument, type Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { PlanType } from '../types/index.js';

export interface IUserDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  planType: PlanType;
  monthlyPdfCount: number;
  lastPdfResetDate: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  incrementPdfCount(): Promise<void>;
  checkAndResetMonthlyCount(): void;
  save(): Promise<HydratedDocument<IUserDoc>>;
  toJSON(): Record<string, unknown>;
}

const userSchema = new mongoose.Schema<IUserDoc>(
  {
    name: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email é obrigatório'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    },
    password: {
      type: String,
      required: [true, 'Senha é obrigatória'],
      minlength: [6, 'Senha deve ter no mínimo 6 caracteres'],
      select: false,
    },
    planType: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free',
    },
    monthlyPdfCount: { type: Number, default: 0 },
    lastPdfResetDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (this: HydratedDocument<IUserDoc>) {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (
  this: HydratedDocument<IUserDoc>,
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incrementPdfCount = async function (
  this: HydratedDocument<IUserDoc>
): Promise<void> {
  this.monthlyPdfCount += 1;
  await this.save();
};

userSchema.methods.checkAndResetMonthlyCount = function (
  this: HydratedDocument<IUserDoc>
): void {
  const now = new Date();
  const lastReset = new Date(this.lastPdfResetDate);
  if (
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear()
  ) {
    this.monthlyPdfCount = 0;
    this.lastPdfResetDate = now;
  }
};

userSchema.methods.toJSON = function (
  this: HydratedDocument<IUserDoc>
): Record<string, unknown> {
  const user = this.toObject() as unknown as Record<string, unknown>;
  delete user.password;
  delete user.__v;
  return user;
};

export const UserModel: Model<IUserDoc> =
  mongoose.models.User ?? mongoose.model<IUserDoc>('User', userSchema);
