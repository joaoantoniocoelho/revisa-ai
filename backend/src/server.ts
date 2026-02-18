import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/database.js';
import { createAuthRouter } from './routes/auth.js';
import { createDecksRouter } from './routes/decks.js';
import { createExportRouter } from './routes/export.js';
import { createCreditsRouter } from './routes/credits.js';
import { createMaintenanceModeMiddleware } from './middlewares/maintenance.js';

const app = express();
const PORT = process.env.PORT ?? 3001;
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

const ALLOWED_ORIGINS = buildAllowedOrigins();

await connectDB();
app.set('trust proxy', 1);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (no Origin header), e.g. health checks.
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

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📡 Accepting requests from: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(
    `🤖 Gemini Model: ${process.env.GEMINI_MODEL ?? 'not configured'}`
  );
  console.log(
    `🗄️  MongoDB: ${process.env.MONGODB_URI ? 'configured' : 'not configured'}`
  );
});
