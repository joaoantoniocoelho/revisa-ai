import type { Request, Response } from 'express';
import { ExportService } from '../services/ExportService.js';

export class ExportController {
  private readonly exportService = new ExportService();

  exportDeck = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deckId } = req.params;
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const result = await this.exportService.exportDeck(deckId, user._id);
      res.setHeader('Content-Type', 'application/apkg');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename}.apkg"`
      );
      res.send(result.buffer);
    } catch (error) {
      req.log?.error({ event: 'deck_export_failed', userId: req.user?._id.toString(), deckId: req.params.deckId, err: error }, 'deck_export_failed');
      res.status(500).json({
        error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };
}
