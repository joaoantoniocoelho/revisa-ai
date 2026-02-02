import fs from 'fs';
import type { Request, Response, NextFunction } from 'express';
import { UserLimitsService } from '../services/UserLimitsService.js';

const limitsService = new UserLimitsService();

function requireUser(req: Request, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({ error: 'User not authenticated' });
    return false;
  }
  return true;
}

export function createCheckPdfLimit() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!requireUser(req, res)) return;
      const { consumed } = await limitsService.tryConsumePdfQuota(req.user!);
      if (!consumed) {
        res.status(403).json({
          error: 'Monthly PDF limit reached',
          message:
            req.user!.planType === 'free'
              ? 'Upgrade to a paid plan to upload more PDFs'
              : 'You have reached your plan\'s monthly limit',
        });
        return;
      }
      req.pdfQuotaConsumed = true;
      next();
    } catch (error) {
      console.error('Check PDF limit error:', error);
      res.status(500).json({ error: 'Error checking limit' });
    }
  };
}

export function createCheckDensityAccess() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!requireUser(req, res)) return;
      const density = req.body?.density
        ? String(req.body.density).toLowerCase().trim()
        : undefined;
      if (density !== undefined) (req.body as { density?: string }).density = density;

      const allowed = await limitsService.isDensityAllowed(req.user!, density ?? '');
      if (allowed) {
        next();
        return;
      }

      if (req.pdfQuotaConsumed) {
        try {
          await limitsService.releasePdfQuota(req.user!._id.toString());
        } catch {
          /* ignore */
        }
      }
      const file = req.file as { path?: string } | undefined;
      if (file?.path) {
        try {
          await fs.promises.unlink(file.path);
        } catch {
          /* ignore */
        }
      }
      const allowedDensities = await limitsService.getAllowedDensities(req.user!);
      res.status(403).json({
        error: 'Density not allowed for your plan',
        allowedDensities,
        requestedDensity: density,
        planType: req.user!.planType,
        message: 'Upgrade to a paid plan to access all densities',
      });
    } catch (error) {
      console.error('Check density access error:', error);
      res.status(500).json({ error: 'Error checking access' });
    }
  };
}

export function createCheckPlanLimits() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!requireUser(req, res)) return;
      req.userLimits = await limitsService.getUserLimits(req.user!);
      next();
    } catch (error) {
      console.error('Check plan limits error:', error);
      res.status(500).json({ error: 'Error checking plan limits' });
    }
  };
}
