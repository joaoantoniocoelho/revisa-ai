import bcrypt from 'bcryptjs';
import { UserModel, type IUserDoc } from '../models/User.js';
import { DEFAULT_CREDITS_FOR_NEW_USER } from '../config/credits.js';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export class UserRepository {
  async create(data: CreateUserInput): Promise<IUserDoc> {
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await UserModel.create({
      ...data,
      password: hashed,
      credits: DEFAULT_CREDITS_FOR_NEW_USER,
    });
    return user as unknown as IUserDoc;
  }

  async findByEmail(email: string): Promise<IUserDoc | null> {
    const doc = await UserModel.findOne({ email }).select('+password').exec();
    return doc ?? null;
  }

  async findById(id: string): Promise<IUserDoc | null> {
    const doc = await UserModel.findById(id).exec();
    return doc ?? null;
  }

  async update(
    id: string,
    updateData: { name?: string }
  ): Promise<IUserDoc | null> {
    const doc = await UserModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).exec();
    return doc ?? null;
  }

  async tryDebitCredits(
    userId: string,
    amount: number
  ): Promise<{ success: boolean }> {
    if (amount <= 0) return { success: true };
    const updated = await UserModel.findOneAndUpdate(
      { _id: userId, credits: { $gte: amount } },
      { $inc: { credits: -amount } },
      { new: true }
    ).exec();
    return { success: !!updated };
  }

  /** Refund credits (rollback on failure). */
  async refundCredits(userId: string, amount: number): Promise<void> {
    if (amount <= 0) return;
    await UserModel.findByIdAndUpdate(userId, {
      $inc: { credits: amount },
    }).exec();
  }

  async getCredits(userId: string): Promise<number> {
    const doc = await UserModel.findById(userId).select('credits').lean().exec();
    if (!doc) return 0;
    const credits = (doc as { credits?: number }).credits;
    return typeof credits === 'number' ? credits : 0;
  }
}
