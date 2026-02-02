import { Router } from 'express';
import { ExportController } from '../controllers/ExportController.js';
import { createAuthenticate } from '../middlewares/auth.js';
import { createCheckPlanLimits } from '../middlewares/checkLimits.js';

export function createExportRouter(): Router {
  const exportController = new ExportController();
  const authenticate = createAuthenticate();
  const checkPlanLimits = createCheckPlanLimits();
  const router = Router();

  router.get(
    '/deck/:deckId',
    authenticate,
    checkPlanLimits,
    exportController.exportDeck
  );

  return router;
}
