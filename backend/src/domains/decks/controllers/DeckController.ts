import type { Request, Response, NextFunction } from 'express';
import { DeckService } from '../services/DeckService.js';
import type { Density } from '../../../shared/types/index.js';

export class DeckController {
  private readonly deckService = new DeckService();

  generate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pdfFile = req.file;
      const density = (req.query?.density ?? req.body?.density ?? 'low') as string;
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      if (!pdfFile || !('path' in pdfFile)) {
        res.status(400).json({ error: 'PDF file is required' });
        return;
      }
      if (!['low', 'medium', 'high'].includes(density)) {
        res.status(400).json({ error: 'Invalid density value' });
        return;
      }
      const result = await this.deckService.generateFromPdf(
        user._id,
        { path: pdfFile.path, originalname: pdfFile.originalname },
        density as Density
      );
      if (result && 'deck' in result && 'cards' in result && 'meta' in result) {
        res.json({
          message: 'Flashcards generated successfully',
          deckId: result.deck._id,
          cards: result.cards,
          meta: result.meta,
        });
      }
    } catch (error) {
      next(error);
    } finally {
      req.releaseUserSlot?.();
      req.releaseUserSlot = undefined;
    }
  };

  getDecks = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const limit = parseInt(String(req.query.limit), 10) || 50;
      const skip = parseInt(String(req.query.skip), 10) || 0;
      const result = await this.deckService.getUserDecks(user._id, limit, skip);
      res.json(result);
    } catch (error) {
      console.error('Error in getDecks:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  getDeck = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deckId } = req.params;
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const deck = await this.deckService.getDeckById(deckId, user._id);
      res.json({ deck });
    } catch (error) {
      console.error('Error in getDeck:', error);
      res.status(404).json({
        error:
          error instanceof Error
            ? error.message
            : 'Deck not found or access denied',
      });
    }
  };

  deleteDeck = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deckId } = req.params;
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      await this.deckService.deleteDeck(deckId, user._id);
      res.json({ message: 'Deck deleted successfully' });
    } catch (error) {
      console.error('Error in deleteDeck:', error);
      res.status(404).json({
        error:
          error instanceof Error
            ? error.message
            : 'Deck not found or access denied',
      });
    }
  };

  updateDeck = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deckId } = req.params;
      const { name } = req.body as { name?: string };
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }
      const deck = await this.deckService.updateDeckName(deckId, user._id, name);
      res.json({
        message: 'Deck updated successfully',
        deck,
      });
    } catch (error) {
      console.error('Error in updateDeck:', error);
      const statusCode =
        error instanceof Error && error.message.includes('not found')
          ? 404
          : 400;
      res.status(statusCode).json({
        error:
          error instanceof Error ? error.message : 'Error updating deck',
      });
    }
  };
}
