import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createAuthRouter } from './domains/auth/routes.js';
import { createDecksRouter } from './domains/decks/routes.js';
import { createExportRouter } from './domains/decks/export/routes.js';
import { createCreditsRouter } from './domains/credits/routes.js';
import { createMaintenanceModeMiddleware } from './shared/middlewares/maintenance.js';
import { createInMemoryRateLimiter, ipKey } from './shared/middlewares/rateLimit.js';

const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function buildAllowedOrigins(): string[] {
  const urlsFromList =
    process.env.FRONTEND_URLS?.split(',')
      .map((u) => normalizeOrigin(u))
      .filter(Boolean) ?? [];
  const single = normalizeOrigin(process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_URL);
  const merged = new Set<string>([single, ...urlsFromList]);
  return [...merged];
}

export function createApp(): express.Express {
  const app = express();
  const ALLOWED_ORIGINS = buildAllowedOrigins();
  const shouldTrustProxy =
    process.env.NODE_ENV === 'test' ||
    process.env.TRUST_PROXY === 'true' ||
    process.env.TRUST_PROXY === '1';
  if (shouldTrustProxy) {
    app.set('trust proxy', 1);
  }
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        const normalized = normalizeOrigin(origin);
        if (ALLOWED_ORIGINS.includes(normalized)) {
          callback(null, true);
          return;
        }
        callback(new Error('CORS origin not allowed'));
      },
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(cookieParser());
  app.use(createMaintenanceModeMiddleware());

  const globalApiLimiter = createInMemoryRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 200,
    keyGenerator: ipKey,
    message: 'Too many requests from this IP. Please try again later.',
  });

  app.use('/api', globalApiLimiter);
  app.use('/api/auth', createAuthRouter());
  app.use('/api/decks', createDecksRouter());
  app.use('/api/export', createExportRouter());
  app.use('/api/credits', createCreditsRouter());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error('Server error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message,
      });
    }
  );

  return app;
}
