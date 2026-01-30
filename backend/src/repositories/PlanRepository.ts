import { PlanModel, type IPlanDoc } from '../models/Plan.js';
import type { PlanEntity } from '../types/index.js';

export class PlanRepository {
  async countDocuments(): Promise<number> {
    return PlanModel.countDocuments().exec();
  }

  async findOneByNameAndActive(name: string): Promise<IPlanDoc | null> {
    const doc = await PlanModel.findOne({ name, isActive: true }).exec();
    return doc ?? null;
  }

  async findActive(): Promise<IPlanDoc[]> {
    return PlanModel.find({ isActive: true }).exec();
  }

  async insertMany(plans: PlanEntity[]): Promise<IPlanDoc[]> {
    const inserted = await PlanModel.insertMany(plans);
    return inserted as IPlanDoc[];
  }
}
