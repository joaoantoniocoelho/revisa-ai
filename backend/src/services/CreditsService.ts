import type { IUserDoc } from '../models/User.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { getCreditsForPages } from '../config/credits.js';

export class CreditsService {
  private readonly userRepository = new UserRepository();

  getCreditsForPages(numPages: number): number {
    return getCreditsForPages(numPages);
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
