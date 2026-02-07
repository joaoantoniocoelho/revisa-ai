import { Router } from 'express';
import { CREDITS_PER_PAGE, MIN_CREDITS_PER_GENERATION } from '../config/credits.js';

export function createCreditsRouter(): Router {
  const router = Router();

  /** Public endpoint: returns pricing config for frontend display */
  router.get('/config', (_req, res) => {
    res.json({
      creditsPerPage: CREDITS_PER_PAGE,
      minCreditsPerGeneration: MIN_CREDITS_PER_GENERATION,
    });
  });

  return router;
}
