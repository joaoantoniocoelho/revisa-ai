import { Router } from 'express';
import multer from 'multer';
import type { DeckController } from '../controllers/DeckController.js';
import type { RequestHandler } from 'express';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('File must be a PDF'));
      return;
    }
    cb(null, true);
  },
});

export function createDecksRouter(
  deckController: DeckController,
  authenticate: RequestHandler,
  checkPdfLimit: RequestHandler,
  checkDensityAccess: RequestHandler
): Router {
  const router = Router();

  router.post(
    '/generate',
    authenticate,
    upload.single('pdf'),
    checkPdfLimit,
    checkDensityAccess,
    deckController.generate
  );
  router.get('/', authenticate, deckController.getDecks);
  router.get('/:deckId', authenticate, deckController.getDeck);
  router.patch('/:deckId', authenticate, deckController.updateDeck);
  router.delete('/:deckId', authenticate, deckController.deleteDeck);

  router.use(
    (
      error: unknown,
      _req: unknown,
      res: { status: (n: number) => { json: (o: object) => void } },
      next: (err?: unknown) => void
    ) => {
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
