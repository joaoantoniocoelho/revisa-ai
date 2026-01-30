import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database.js';
import { generateToken, verifyToken } from './config/jwt.js';
import { UserRepository } from './repositories/UserRepository.js';
import { DeckRepository } from './repositories/DeckRepository.js';
import { PlanRepository } from './repositories/PlanRepository.js';
import { PlanService } from './services/PlanService.js';
import { UserLimitsService } from './services/UserLimitsService.js';
import { AuthService } from './services/AuthService.js';
import { DeckService } from './services/DeckService.js';
import { ExportService } from './services/ExportService.js';
import { AuthController } from './controllers/AuthController.js';
import { DeckController } from './controllers/DeckController.js';
import { ExportController } from './controllers/ExportController.js';
import { createAuthenticate } from './middlewares/auth.js';
import {
  createCheckPdfLimit,
  createCheckDensityAccess,
  createCheckPlanLimits,
} from './middlewares/checkLimits.js';
import { createAuthRouter } from './routes/auth.js';
import { createDecksRouter } from './routes/decks.js';
import { createExportRouter } from './routes/export.js';

const app = express();
const PORT = process.env.PORT ?? 3001;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

// Repositories
const userRepository = new UserRepository();
const deckRepository = new DeckRepository();
const planRepository = new PlanRepository();

// Services (um por caso de uso, cada um com execute())
const planService = new PlanService(planRepository);
const userLimitsService = new UserLimitsService(planService);
const authService = new AuthService(
  userRepository,
  userLimitsService,
  generateToken
);
const deckService = new DeckService(deckRepository, userRepository);
const exportService = new ExportService(deckRepository);

// Controllers
const authController = new AuthController(authService);
const deckController = new DeckController(deckService);
const exportController = new ExportController(exportService);

// Middlewares
const authenticate = createAuthenticate(userRepository, verifyToken);
const checkPdfLimit = createCheckPdfLimit(userLimitsService);
const checkDensityAccess = createCheckDensityAccess(userLimitsService);
const checkPlanLimits = createCheckPlanLimits(userLimitsService);

// Routes
const authRouter = createAuthRouter(authController, authenticate);
const decksRouter = createDecksRouter(
  deckController,
  authenticate,
  checkPdfLimit,
  checkDensityAccess
);
const exportRouter = createExportRouter(
  exportController,
  authenticate,
  checkPlanLimits
);

connectDB();

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/decks', decksRouter);
app.use('/api/export', exportRouter);

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
