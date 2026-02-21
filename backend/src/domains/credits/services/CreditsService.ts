import type { IUserDoc } from '../../auth/models/User.js';
import { UserRepository } from '../../auth/repositories/UserRepository.js';
import { getCreditsForGeneration } from '../../../shared/config/credits.js';
import type { Density } from '../../../shared/types/index.js';

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
    return this.userRepository.tryDebitCredits(userId, amount);
  }

  /** Refund credits on rollback. */
  async refundCredits(userId: string, amount: number): Promise<void> {
    await this.userRepository.refundCredits(userId, amount);
  }
}
