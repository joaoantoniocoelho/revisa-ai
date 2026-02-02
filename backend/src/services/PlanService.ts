import { PlanRepository } from '../repositories/PlanRepository.js';
import type { IPlanDoc } from '../models/Plan.js';

export class PlanService {
  private readonly planRepository = new PlanRepository();

  async getPlanByName(planName: string): Promise<IPlanDoc | null> {
    return this.planRepository.findOneByNameAndActive(planName);
  }

  async getAllPlans(): Promise<IPlanDoc[]> {
    return this.planRepository.findActive();
  }
}
