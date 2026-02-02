import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { DeckController } from '../controllers/DeckController.js';
import { UserLimitsService } from '../services/UserLimitsService.js';
import { createAuthenticate } from '../middlewares/auth.js';
import {
  createCheckPdfLimit,
  createCheckDensityAccess,
} from '../middlewares/checkLimits.js';

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
  const authenticate = createAuthenticate();
  const checkPdfLimit = createCheckPdfLimit();
  const checkDensityAccess = createCheckDensityAccess();
  const router = Router();

  router.post(
    '/generate',
    authenticate,
    checkPdfLimit,
    upload.single('pdf'),
    checkDensityAccess,
    deckController.generate
  );
  router.get('/', authenticate, deckController.getDecks);
  router.get('/:deckId', authenticate, deckController.getDeck);
  router.patch('/:deckId', authenticate, deckController.updateDeck);
  router.delete('/:deckId', authenticate, deckController.deleteDeck);

  const limitsService = new UserLimitsService();
  router.use(
    async (
      error: unknown,
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      if (req.pdfQuotaConsumed && req.user?._id) {
        try {
          await limitsService.releasePdfQuota(req.user._id.toString());
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
      next(error);
    }
  );

  return router;
}
