import type { Request, Response, NextFunction } from 'express';
import type { Density } from '../types/index.js';

function requireUser(req: Request, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({ error: 'User not authenticated' });
    return false;
  }
  return true;
}

function getDensityFromRequest(req: Request): string {
  const raw =
    (req.query?.density as string) ??
    (req.body?.density as string) ??
    'low';
  return String(raw).toLowerCase().trim();
}

export function createCheckDensityAccess() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!requireUser(req, res)) return;
      const density = getDensityFromRequest(req);
      (req.body as { density?: string }).density = density;

      const valid: Density[] = ['low', 'medium', 'high'];
      if (!valid.includes(density as Density)) {
        res.status(400).json({
          error: 'Invalid density',
          allowedDensities: valid,
          requestedDensity: density,
        });
        return;
      }
      next();
    } catch (error) {
      console.error('Check density access error:', error);
      res.status(500).json({ error: 'Error checking access' });
    }
  };
}
