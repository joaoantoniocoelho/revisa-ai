import type { Request, Response } from 'express';
import type { ExportService } from '../services/ExportService.js';
import type { FlashcardEntity } from '../types/index.js';

export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  exportCards = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Autenticação necessária para exportar' });
        return;
      }
      const { cards, deckName } = req.body as {
        cards?: unknown;
        deckName?: string;
      };
      if (!Array.isArray(cards) || cards.length === 0) {
        res.status(400).json({ error: 'Nenhum card para exportar' });
        return;
      }
      const result = await this.exportService.execute({
        type: 'exportCards',
        cards: cards as FlashcardEntity[],
        deckName: deckName ?? 'PDF2Anki Import',
      });
      res.setHeader('Content-Type', 'application/apkg');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename}.apkg"`
      );
      res.send(result.buffer);
    } catch (error) {
      console.error('Export cards error:', error);
      res.status(500).json({
        error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  exportDeck = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deckId } = req.params;
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const result = await this.exportService.execute({
        type: 'exportDeck',
        deckId,
        userId: user._id,
      });
      res.setHeader('Content-Type', 'application/apkg');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename}.apkg"`
      );
      res.send(result.buffer);
    } catch (error) {
      console.error('Export deck error:', error);
      res.status(500).json({
        error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };
}
