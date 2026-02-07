import { Router } from 'express';
import { ExportController } from '../controllers/ExportController.js';
import { createAuthenticate } from '../middlewares/auth.js';

export function createExportRouter(): Router {
  const exportController = new ExportController();
  const authenticate = createAuthenticate();
  const router = Router();

  router.get('/deck/:deckId', authenticate, exportController.exportDeck);

  return router;
}
