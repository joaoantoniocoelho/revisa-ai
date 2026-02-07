import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database.js';
import { createAuthRouter } from './routes/auth.js';
import { createDecksRouter } from './routes/decks.js';
import { createExportRouter } from './routes/export.js';
import { createCreditsRouter } from './routes/credits.js';

const app = express();
const PORT = process.env.PORT ?? 3001;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

connectDB();

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());

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
  console.log(`📡 Accepting requests from: ${FRONTEND_URL}`);
  console.log(
    `🤖 Gemini Model: ${process.env.GEMINI_MODEL ?? 'not configured'}`
  );
  console.log(
    `🗄️  MongoDB: ${process.env.MONGODB_URI ? 'configured' : 'not configured'}`
  );
});
