import { Router } from 'express';
import type { ExportController } from '../controllers/ExportController.js';
import type { RequestHandler } from 'express';

export function createExportRouter(
  exportController: ExportController,
  authenticate: RequestHandler,
  checkPlanLimits: RequestHandler
): Router {
  const router = Router();

  router.post('/', authenticate, checkPlanLimits, exportController.exportCards);
  router.get(
    '/deck/:deckId',
    authenticate,
    checkPlanLimits,
    exportController.exportDeck
  );

  return router;
}
