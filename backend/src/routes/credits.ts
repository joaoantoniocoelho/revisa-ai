import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import {
  CREDITS_PER_PAGE_BASE,
  DENSITY_CREDIT_MULTIPLIER,
  getCreditsForGeneration,
  MIN_CREDITS_PER_GENERATION,
} from '../config/credits.js';
import { MAX_PDF_PAGES, MAX_PDF_SIZE_MB } from '../config/pdf.js';
import type { Density } from '../types/index.js';

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

  function normalizeDensity(raw: unknown): Density {
    const val = String(raw ?? 'medium').toLowerCase().trim();
    if (val === 'low' || val === 'medium' || val === 'high') return val;
    return 'medium';
  }

  /** Public endpoint: returns pricing config for frontend display */
  router.get('/config', (_req, res) => {
    res.json({
      creditsPerPageBase: CREDITS_PER_PAGE_BASE,
      densityMultipliers: DENSITY_CREDIT_MULTIPLIER,
      minCreditsPerGeneration: MIN_CREDITS_PER_GENERATION,
      maxPdfPages: MAX_PDF_PAGES,
    });
  });

  /** Public endpoint: estimate credits for a given PDF + density (without debit). */
  router.post('/estimate', upload.single('pdf'), async (req, res) => {
    const file = req.file;
    if (!file?.buffer) {
      res.status(400).json({ error: 'PDF file is required' });
      return;
    }

    try {
      const density = normalizeDensity(req.body?.density);
      const pdf = await PDFDocument.load(file.buffer);
      const numPages = pdf.getPageCount() || 1;
      if (numPages > MAX_PDF_PAGES) {
        res.status(400).json({
          error: `PDF must have at most ${MAX_PDF_PAGES} pages`,
        });
        return;
      }
      const creditsRequired = getCreditsForGeneration(numPages, density);
      res.json({
        density,
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
