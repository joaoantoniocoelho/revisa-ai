import type { Request, Response, NextFunction } from 'express';
import type { UserLimitsService } from '../services/UserLimitsService.js';

export function createCheckPdfLimit(userLimitsService: UserLimitsService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const canUpload = await userLimitsService.execute({
        type: 'canUploadPdf',
        user,
      });
      if (!canUpload) {
        const limits = await userLimitsService.execute({
          type: 'getUserLimits',
          user,
        });
        const lim = limits as {
          limits?: { pdfsPerMonth: number };
          usage?: { pdfUsed: number };
        };
        res.status(403).json({
          error: 'Limite mensal de PDFs atingido',
          limit: lim.limits?.pdfsPerMonth,
          used: lim.usage?.pdfUsed,
          planType: user.planType,
          message:
            user.planType === 'free'
              ? 'Faça upgrade para o plano pago para enviar mais PDFs'
              : 'Você atingiu o limite mensal do seu plano',
        });
        return;
      }
      next();
    } catch (error) {
      console.error('Check PDF limit error:', error);
      res.status(500).json({ error: 'Erro ao verificar limite' });
    }
  };
}

export function createCheckDensityAccess(userLimitsService: UserLimitsService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      let density = req.body?.density as string | undefined;
      if (density) {
        density = String(density).toLowerCase().trim();
        (req.body as { density?: string }).density = density;
      }
      const isAllowed = await userLimitsService.execute({
        type: 'isDensityAllowed',
        user,
        density: density ?? '',
      });
      if (!isAllowed) {
        const allowedDensities = await userLimitsService.execute({
          type: 'getAllowedDensities',
          user,
        });
        res.status(403).json({
          error: 'Densidade não permitida para seu plano',
          allowedDensities,
          requestedDensity: density,
          planType: user.planType,
          message: 'Faça upgrade para o plano pago para acessar todas as densidades',
        });
        return;
      }
      next();
    } catch (error) {
      console.error('Check density access error:', error);
      res.status(500).json({ error: 'Erro ao verificar acesso' });
    }
  };
}

export function createRequirePaidPlan() {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      if (user.planType !== 'paid') {
        res.status(403).json({
          error: 'Recurso disponível apenas para plano pago',
          planType: user.planType,
          message: 'Faça upgrade para acessar este recurso',
        });
        return;
      }
      next();
    } catch (error) {
      console.error('Require paid plan error:', error);
      res.status(500).json({ error: 'Erro ao verificar plano' });
    }
  };
}

export function createCheckPlanLimits(userLimitsService: UserLimitsService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const limits = await userLimitsService.execute({
        type: 'getUserLimits',
        user,
      });
      req.userLimits = limits as typeof req.userLimits;
      next();
    } catch (error) {
      console.error('Check plan limits error:', error);
      res.status(500).json({ error: 'Erro ao verificar limites do plano' });
    }
  };
}
