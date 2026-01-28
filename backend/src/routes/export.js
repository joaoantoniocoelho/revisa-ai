import express from 'express';
import exportController from '../controllers/exportController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPlanLimits } from '../middlewares/checkLimits.js';

const router = express.Router();

// Rota para exportar cards direto (sem salvar no banco)
// Requer autenticação para rastrear uso e aplicar limites
router.post('/', authenticate, checkPlanLimits, exportController.exportCards);

// Rota para exportar deck salvo
// Valida ownership do deck (feito no controller) + limites do plano
router.get('/deck/:deckId', authenticate, checkPlanLimits, exportController.exportDeck);

export default router;
