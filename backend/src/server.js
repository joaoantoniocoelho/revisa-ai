import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import planService from './services/planService.js';
import authRouter from './routes/auth.js';
import decksRouter from './routes/decks.js';
import exportRouter from './routes/export.js';

// Carrega variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Conecta ao MongoDB e inicializa planos
connectDB().then(() => {
  planService.initializePlans();
});

// Middlewares globais
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

// JSON parser
app.use(express.json());

// Rotas
app.use('/api/auth', authRouter);
app.use('/api/decks', decksRouter);
app.use('/api/export', exportRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📡 Accepting requests from: ${FRONTEND_URL}`);
  console.log(`🤖 Gemini Model: ${process.env.GEMINI_MODEL || 'not configured'}`);
  console.log(`🗄️  MongoDB: ${process.env.MONGODB_URI ? 'configured' : 'not configured'}`);
});
