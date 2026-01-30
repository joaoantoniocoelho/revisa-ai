import type { PlanRepository } from '../repositories/PlanRepository.js';
import type { IPlanDoc } from '../models/Plan.js';

export type GetPlanByNameCommand = { type: 'getPlanByName'; planName: string };
export type GetAllPlansCommand = { type: 'getAllPlans' };

export type PlanCommand = GetPlanByNameCommand | GetAllPlansCommand;

export type PlanServiceResult = IPlanDoc | IPlanDoc[] | null;

export class PlanService {
  constructor(private readonly planRepository: PlanRepository) {}

  async execute(cmd: PlanCommand): Promise<PlanServiceResult> {
    switch (cmd.type) {
      case 'getPlanByName':
        return this.planRepository.findOneByNameAndActive(cmd.planName);
      case 'getAllPlans':
        return this.planRepository.findActive();
    }
  }
}
