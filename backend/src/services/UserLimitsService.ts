import type { IUserDoc } from '../models/User.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { PlanService } from './PlanService.js';
import type { Density } from '../types/index.js';

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

export class UserLimitsService {
  private readonly userRepository = new UserRepository();
  private readonly planService = new PlanService();

  async getUserLimits(user: IUserDoc): Promise<UserLimitsResult> {
    const freshUser =
      (await this.userRepository.ensureMonthlyResetAndGet(
        user._id.toString()
      )) ?? user;
    const plan = await this.planService.getPlanByName(user.planType);
    if (!plan) {
      throw new Error('Plan not found');
    }
    const pdfLimit = plan.limits.pdfsPerMonth;
    const pdfUsed = freshUser.monthlyPdfCount;
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

  /** Consumes 1 PDF from the user's quota. Returns false if limit reached. */
  async tryConsumePdfQuota(user: IUserDoc): Promise<{ consumed: boolean }> {
    const plan = await this.planService.getPlanByName(user.planType);
    if (!plan) return { consumed: false };
    const result = await this.userRepository.tryConsumePdfQuota(
      user._id.toString(),
      plan.limits.pdfsPerMonth
    );
    return { consumed: result.consumed };
  }

  /** Reverts quota consumption (rollback on failure). */
  async releasePdfQuota(userId: string): Promise<void> {
    await this.userRepository.releasePdfQuota(userId);
  }

  async isDensityAllowed(user: IUserDoc, density: string): Promise<boolean> {
    const plan = await this.planService.getPlanByName(user.planType);
    if (!plan) return false;
    const normalized = density ? String(density).toLowerCase().trim() : '';
    return plan.limits.allowedDensities.includes(normalized as Density);
  }

  async getAllowedDensities(user: IUserDoc): Promise<string[]> {
    const plan = await this.planService.getPlanByName(user.planType);
    if (!plan) return ['low'];
    return plan.limits.allowedDensities;
  }
}
