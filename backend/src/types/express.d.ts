import type { IUserDoc } from '../models/User.js';
import type { UserLimitsResult } from '../services/UserLimitsService.js';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDoc;
      userLimits?: UserLimitsResult;
      /** Indicates that PDF quota was consumed atomically; used for rollback on failure */
      pdfQuotaConsumed?: boolean;
    }
  }
}

export {};
