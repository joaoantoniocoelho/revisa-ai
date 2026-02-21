import bcrypt from 'bcryptjs';
import { UserModel, type IUserDoc } from '../models/User.js';
import { DEFAULT_CREDITS_FOR_NEW_USER } from '../../../shared/config/credits.js';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export interface CreateFromGoogleInput {
  name: string;
  email: string;
  googleId: string;
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

  async findByGoogleId(googleId: string): Promise<IUserDoc | null> {
    const doc = await UserModel.findOne({ googleId }).exec();
    return doc ?? null;
  }

  async createFromGoogle(data: CreateFromGoogleInput): Promise<IUserDoc> {
    const user = await UserModel.create({
      name: data.name,
      email: data.email,
      googleId: data.googleId,
      credits: DEFAULT_CREDITS_FOR_NEW_USER,
      emailVerified: true,
    });
    return user as unknown as IUserDoc;
  }

  async updateGoogleId(userId: string, googleId: string): Promise<IUserDoc | null> {
    const doc = await UserModel.findByIdAndUpdate(
      userId,
      { googleId, emailVerified: true },
      { new: true, runValidators: true }
    ).exec();
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

  async findByVerificationToken(token: string): Promise<IUserDoc | null> {
    const doc = await UserModel.findOne({ emailVerificationToken: token })
      .select('+emailVerificationToken +emailVerificationExpires')
      .exec();
    return doc ?? null;
  }

  async setEmailVerifiedAndClearToken(userId: string): Promise<IUserDoc | null> {
    const doc = await UserModel.findByIdAndUpdate(
      userId,
      {
        emailVerified: true,
        $unset: {
          emailVerificationToken: 1,
          emailVerificationExpires: 1,
        },
      },
      { new: true, runValidators: true }
    ).exec();
    return doc ?? null;
  }

  async setVerificationToken(
    userId: string,
    token: string,
    expires: Date
  ): Promise<IUserDoc | null> {
    const doc = await UserModel.findByIdAndUpdate(
      userId,
      { emailVerificationToken: token, emailVerificationExpires: expires },
      { new: true }
    ).exec();
    return doc ?? null;
  }
}
