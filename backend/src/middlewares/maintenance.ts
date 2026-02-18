import type { Request, Response, NextFunction } from 'express';

function isMaintenanceModeEnabled(): boolean {
  const raw = (process.env.APP_MAINTENANCE_MODE ?? '').trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

export function createMaintenanceModeMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isMaintenanceModeEnabled()) {
      next();
      return;
    }

    // Keep preflight and health checks available while app is paused.
    if (req.method === 'OPTIONS' || req.path === '/health') {
      next();
      return;
    }

    res.status(503).json({
      error: 'Service temporarily unavailable',
      code: 'MAINTENANCE_MODE',
      message:
        'Revisa Aí está em construção no momento. Login, cadastro e geração estão temporariamente desativados.',
    });
  };
}
