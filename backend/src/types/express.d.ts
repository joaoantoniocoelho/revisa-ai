import type { IUserDoc } from '../models/User.js';
import type { UserLimitsResult } from '../services/UserLimitsService.js';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDoc;
      userLimits?: UserLimitsResult;
    }
  }
}

export {};
