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
    const user = new UserModel(data);
    return (await user.save()) as IUserDoc;
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
}
