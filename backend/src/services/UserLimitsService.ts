import type { IUserDoc } from '../models/User.js';
import type { PlanService } from './PlanService.js';
import type { Density } from '../types/index.js';

export type GetUserLimitsCommand = { type: 'getUserLimits'; user: IUserDoc };
export type CanUploadPdfCommand = { type: 'canUploadPdf'; user: IUserDoc };
export type IsDensityAllowedCommand = {
  type: 'isDensityAllowed';
  user: IUserDoc;
  density: string;
};
export type GetAllowedDensitiesCommand = {
  type: 'getAllowedDensities';
  user: IUserDoc;
};

export type UserLimitsCommand =
  | GetUserLimitsCommand
  | CanUploadPdfCommand
  | IsDensityAllowedCommand
  | GetAllowedDensitiesCommand;

export interface UserLimitsResult {
  plan?: { name: string; displayName: string; features: string[] };
  limits?: {
    pdfsPerMonth: number;
    allowedDensities: string[];
    maxCardsPerDeck: number | null;
  };
  usage?: {
    pdfUsed: number;
    pdfRemaining: number;
    canUploadPdf: boolean;
  };
}

export type UserLimitsServiceResult = UserLimitsResult | boolean | string[];

export class UserLimitsService {
  constructor(private readonly planService: PlanService) {}

  async execute(cmd: UserLimitsCommand): Promise<UserLimitsServiceResult> {
    switch (cmd.type) {
      case 'getUserLimits':
        return this.getUserLimits(cmd.user);
      case 'canUploadPdf':
        return this.canUploadPdf(cmd.user);
      case 'isDensityAllowed':
        return this.isDensityAllowed(cmd.user, cmd.density);
      case 'getAllowedDensities':
        return this.getAllowedDensities(cmd.user);
    }
  }

  private async getUserLimits(user: IUserDoc): Promise<UserLimitsResult> {
    user.checkAndResetMonthlyCount();
    await user.save();
    const plan = await this.planService.execute({
      type: 'getPlanByName',
      planName: user.planType,
    });
    if (!plan || Array.isArray(plan)) {
      throw new Error('Plano não encontrado');
    }
    const pdfLimit = plan.limits.pdfsPerMonth;
    const pdfUsed = user.monthlyPdfCount;
    const pdfRemaining = pdfLimit - pdfUsed;
    return {
      plan: {
        name: plan.name,
        displayName: plan.displayName,
        features: plan.features,
      },
      limits: {
        pdfsPerMonth: pdfLimit,
        allowedDensities: plan.limits.allowedDensities,
        maxCardsPerDeck: plan.limits.maxCardsPerDeck,
      },
      usage: {
        pdfUsed,
        pdfRemaining,
        canUploadPdf: pdfUsed < pdfLimit,
      },
    };
  }

  private async canUploadPdf(user: IUserDoc): Promise<boolean> {
    user.checkAndResetMonthlyCount();
    const plan = await this.planService.execute({
      type: 'getPlanByName',
      planName: user.planType,
    });
    if (!plan || Array.isArray(plan)) return false;
    return user.monthlyPdfCount < plan.limits.pdfsPerMonth;
  }

  private async isDensityAllowed(user: IUserDoc, density: string): Promise<boolean> {
    const plan = await this.planService.execute({
      type: 'getPlanByName',
      planName: user.planType,
    });
    if (!plan || Array.isArray(plan)) return false;
    const normalized = density ? String(density).toLowerCase().trim() : '';
    return plan.limits.allowedDensities.includes(normalized as Density);
  }

  private async getAllowedDensities(user: IUserDoc): Promise<string[]> {
    const plan = await this.planService.execute({
      type: 'getPlanByName',
      planName: user.planType,
    });
    if (!plan || Array.isArray(plan)) return ['low'];
    return plan.limits.allowedDensities;
  }
}
