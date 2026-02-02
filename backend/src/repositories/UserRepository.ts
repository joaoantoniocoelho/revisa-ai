import bcrypt from 'bcryptjs';
import { UserModel, type IUserDoc } from '../models/User.js';
import type { PlanType } from '../types/index.js';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  planType?: PlanType;
}

export class UserRepository {
  async create(data: CreateUserInput): Promise<IUserDoc> {
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await UserModel.create({ ...data, password: hashed });
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

  private getCurrentMonth(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  /**
   * Atomic monthly reset: resets the counter when the month changes.
   * Single findOneAndUpdate operation.
   */
  async ensureMonthlyResetAndGet(userId: string): Promise<IUserDoc | null> {
    const currentMonth = this.getCurrentMonth();
    const now = new Date();
    const updated = await UserModel.findOneAndUpdate(
      { _id: userId, pdfUsageMonth: { $ne: currentMonth } },
      {
        $set: {
          pdfUsageMonth: currentMonth,
          monthlyPdfCount: 0,
          lastPdfResetDate: now,
        },
      },
      { new: true }
    ).exec();
    if (updated) return updated as unknown as IUserDoc;
    const user = await UserModel.findById(userId).exec();
    return user ? (user as unknown as IUserDoc) : null;
  }

  async tryConsumePdfQuota(
    userId: string,
    planLimit: number
  ): Promise<{ consumed: boolean; newCount?: number }> {
    const currentMonth = this.getCurrentMonth();
    await UserModel.findOneAndUpdate(
      { _id: userId, pdfUsageMonth: { $ne: currentMonth } },
      {
        $set: {
          pdfUsageMonth: currentMonth,
          monthlyPdfCount: 0,
          lastPdfResetDate: new Date(),
        },
      }
    ).exec();
    const updated = await UserModel.findOneAndUpdate(
      { _id: userId, monthlyPdfCount: { $lt: planLimit } },
      { $inc: { monthlyPdfCount: 1 } },
      { new: true }
    )
      .select('monthlyPdfCount')
      .exec();
    if (!updated) return { consumed: false };
    return { consumed: true, newCount: updated.monthlyPdfCount };
  }

  async releasePdfQuota(userId: string): Promise<void> {
    await UserModel.findOneAndUpdate(
      { _id: userId, monthlyPdfCount: { $gt: 0 } },
      { $inc: { monthlyPdfCount: -1 } }
    ).exec();
  }
}
