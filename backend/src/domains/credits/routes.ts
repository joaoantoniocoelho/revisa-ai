import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import {
  CREDIT_TIERS,
  getCreditsForGeneration,
  MIN_CREDITS_PER_GENERATION,
} from '../../shared/config/credits.js';

const MAX_PDF_SIZE_MB = 10;
const MAX_PDF_PAGES = 50;

export function createCreditsRouter(): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PDF_SIZE_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype !== 'application/pdf') {
        cb(new Error('File must be a PDF'));
        return;
      }
      cb(null, true);
    },
  });

  /** Public endpoint: returns pricing config for frontend display */
  router.get('/config', (_req, res) => {
    res.json({
      creditTiers: CREDIT_TIERS,
      minCreditsPerGeneration: MIN_CREDITS_PER_GENERATION,
      maxPdfPages: MAX_PDF_PAGES,
    });
  });

  /** Public endpoint: estimate credits for a given PDF (without debit). */
  router.post('/estimate', upload.single('pdf'), async (req, res) => {
    const file = req.file;
    if (!file?.buffer) {
      res.status(400).json({ error: 'PDF file is required' });
      return;
    }

    try {
      const pdf = await PDFDocument.load(file.buffer);
      const numPages = pdf.getPageCount() || 1;
      if (numPages > MAX_PDF_PAGES) {
        res.status(400).json({
          error: `PDF must have at most ${MAX_PDF_PAGES} pages`,
        });
        return;
      }
      const creditsRequired = getCreditsForGeneration(numPages);
      res.json({
        numPages,
        creditsRequired,
      });
    } catch (error) {
      console.error('Credits estimate error:', error);
      res.status(400).json({ error: 'Invalid PDF file' });
    }
  });

  router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: `PDF must be smaller than ${MAX_PDF_SIZE_MB}MB` });
      return;
    }
    if (error instanceof Error && error.message === 'File must be a PDF') {
      res.status(400).json({ error: 'File must be a PDF' });
      return;
    }
    res.status(500).json({ error: 'Failed to estimate credits' });
  });

  return router;
}
