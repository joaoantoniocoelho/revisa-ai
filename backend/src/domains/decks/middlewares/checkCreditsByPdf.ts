import fs from 'fs';
import type { Request, Response, NextFunction } from 'express';
import { PDFDocument } from 'pdf-lib';
import { CreditsService } from '../../credits/services/CreditsService.js';
import { InsufficientCreditsError } from '../../../shared/errors/InsufficientCreditsError.js';
import { logger } from '../../../shared/logger.js';

const creditsService = new CreditsService();
const MAX_PDF_PAGES = 50;

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

      const creditsRequired = creditsService.getCreditsForGeneration(numPages);
      const userId = req.user!._id.toString();
      const { success } = await creditsService.tryDebitCredits(userId, creditsRequired);

      if (!success) {
        const creditsAvailable = await creditsService.getCredits(req.user!);
        throw new InsufficientCreditsError(
          `This generation requires ${creditsRequired} credits (${numPages} page${numPages !== 1 ? 's' : ''}). You have ${creditsAvailable} credits.`,
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
      logger.error({ event: 'check_credits_by_pdf_failed', userId: req.user?._id.toString(), err: error }, 'check_credits_by_pdf_failed');
      res.status(500).json({ error: 'Error checking credits' });
    }
  };
}
