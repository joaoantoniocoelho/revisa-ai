import fs from 'fs';
import type { Request, Response, NextFunction } from 'express';
import { PDFDocument } from 'pdf-lib';
import { CreditsService } from '../../credits/services/CreditsService.js';
import { InsufficientCreditsError } from '../../../shared/errors/InsufficientCreditsError.js';
import type { Density } from '../../../shared/types/index.js';

const creditsService = new CreditsService();
const MAX_PDF_PAGES = 30;

export function createCheckCreditsByPdf() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const file = req.file as { path?: string } | undefined;
    if (!file?.path) {
      res.status(400).json({ error: 'PDF file is required' });
      return;
    }

    try {
      const buffer = await fs.promises.readFile(file.path);
      const doc = await PDFDocument.load(buffer);
      const numPages = doc.getPageCount() || 1;
      if (numPages > MAX_PDF_PAGES) {
        try {
          await fs.promises.unlink(file.path);
        } catch {
          /* ignore temp file cleanup errors */
        }
        res.status(400).json({
          error: `PDF must have at most ${MAX_PDF_PAGES} pages`,
        });
        return;
      }

      const requestedDensity =
        ((req.body as { density?: string } | undefined)?.density ??
          (req.query?.density as string | undefined) ??
          'low')
          .toLowerCase()
          .trim() as Density;

      const creditsRequired = creditsService.getCreditsForGeneration(
        numPages,
        requestedDensity
      );
      const userId = req.user!._id.toString();
      const { success } = await creditsService.tryDebitCredits(userId, creditsRequired);

      if (!success) {
        const creditsAvailable = await creditsService.getCredits(req.user!);
        throw new InsufficientCreditsError(
          `This generation requires ${creditsRequired} credits (${numPages} page${numPages !== 1 ? 's' : ''}, density: ${requestedDensity}). You have ${creditsAvailable} credits.`,
          creditsRequired,
          creditsAvailable
        );
      }

      req.creditsConsumed = true;
      req.creditsAmount = creditsRequired;
      next();
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        next(error);
        return;
      }
      console.error('Check credits by PDF error:', error);
      res.status(500).json({ error: 'Error checking credits' });
    }
  };
}
