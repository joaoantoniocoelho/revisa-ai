import type { IUserDoc } from '../../auth/models/User.js';
import { UserRepository } from '../../auth/repositories/UserRepository.js';
import { getCreditsForGeneration } from '../../../shared/config/credits.js';
import type { Density } from '../../../shared/types/index.js';
import { logger } from '../../../shared/logger.js';

export class CreditsService {
  private readonly userRepository = new UserRepository();

  getCreditsForGeneration(numPages: number, density: Density): number {
    return getCreditsForGeneration(numPages, density);
  }

  async getCredits(user: IUserDoc): Promise<number> {
    return this.userRepository.getCredits(user._id.toString());
  }

  /** Debit credits before generation. Returns false if insufficient. */
  async tryDebitCredits(
    userId: string,
    amount: number
  ): Promise<{ success: boolean }> {
    const result = await this.userRepository.tryDebitCredits(userId, amount);
    if (result.success) {
      logger.info({ event: 'credits_debited', userId, amount }, 'credits_debited');
    } else {
      logger.warn({ event: 'credits_insufficient', userId, amountRequired: amount }, 'credits_insufficient');
    }
    return result;
  }

  /** Refund credits on rollback. */
  async refundCredits(userId: string, amount: number): Promise<void> {
    await this.userRepository.refundCredits(userId, amount);
    logger.info({ event: 'credits_refunded', userId, amount }, 'credits_refunded');
  }
}
