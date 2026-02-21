import type { IUserDoc } from '../domains/auth/models/User.js';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDoc;
      /** Credits were debited; used for rollback on failure */
      creditsConsumed?: boolean;
      /** Amount of credits debited (for refund) */
      creditsAmount?: number;
      /** Callback to release per-user generation slot (must be called in finally) */
      releaseUserSlot?: () => void;
    }
  }
}

export {};
