import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { DeckController } from '../controllers/DeckController.js';
import { CreditsService } from '../services/CreditsService.js';
import { createAuthenticate } from '../middlewares/auth.js';
import { createCheckDensityAccess } from '../middlewares/checkLimits.js';
import { createCheckCreditsByPdf } from '../middlewares/checkCreditsByPdf.js';
import { InsufficientCreditsError } from '../errors/InsufficientCreditsError.js';
import { createCheckGenerationSlots } from '../middlewares/generationSlots.js';

const uploadsDir = path.join(process.cwd(), 'uploads', 'tmp');
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safe = Buffer.from(file.originalname, 'latin1')
        .toString('utf8')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
      cb(null, unique);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('File must be a PDF'));
      return;
    }
    cb(null, true);
  },
});

export function createDecksRouter(): Router {
  const deckController = new DeckController();
  const creditsService = new CreditsService();
  const authenticate = createAuthenticate();
  const checkDensityAccess = createCheckDensityAccess();
  const checkCreditsByPdf = createCheckCreditsByPdf();
  const checkGenerationSlots = createCheckGenerationSlots();
  const router = Router();

  router.post(
    '/generate',
    authenticate,
    checkDensityAccess,
    checkGenerationSlots,
    upload.single('pdf'),
    checkCreditsByPdf,
    deckController.generate
  );
  router.get('/', authenticate, deckController.getDecks);
  router.get('/:deckId', authenticate, deckController.getDeck);
  router.patch('/:deckId', authenticate, deckController.updateDeck);
  router.delete('/:deckId', authenticate, deckController.deleteDeck);

  router.use(
    async (
      error: unknown,
      req: Request,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      req.releaseUserSlot?.();
      if (req.creditsConsumed && req.creditsAmount != null && req.user?._id) {
        try {
          await creditsService.refundCredits(
            req.user._id.toString(),
            req.creditsAmount
          );
        } catch {
          /* ignore */
        }
      }
      const file = req.file as { path?: string } | undefined;
      if (file?.path) {
        try {
          await fs.promises.unlink(file.path);
        } catch {
          /* ignore */
        }
      }
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'PDF must be smaller than 10MB' });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }
      if (error instanceof Error && error.message === 'File must be a PDF') {
        res.status(400).json({ error: 'File must be a PDF' });
        return;
      }
      if (error instanceof InsufficientCreditsError) {
        res.status(402).json({
          error: 'Insufficient credits',
          message: error.message,
          creditsRequired: error.creditsRequired,
          creditsAvailable: error.creditsAvailable,
        });
        return;
      }
      console.error('Deck route error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  );

  return router;
}
