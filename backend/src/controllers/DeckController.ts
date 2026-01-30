import type { Request, Response } from 'express';
import type { DeckService } from '../services/DeckService.js';
import type { Density } from '../types/index.js';

export class DeckController {
  constructor(private readonly deckService: DeckService) {}

  generate = async (req: Request, res: Response): Promise<void> => {
    try {
      const pdfFile = req.file;
      const density = (req.body?.density ?? 'medium') as string;
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      if (!pdfFile) {
        res.status(400).json({ error: 'PDF file is required' });
        return;
      }
      if (!['low', 'medium', 'high'].includes(density)) {
        res.status(400).json({ error: 'Invalid density value' });
        return;
      }
      const result = await this.deckService.execute({
        type: 'generateDeck',
        userId: user._id,
        pdfFile: {
          buffer: pdfFile.buffer,
          originalname: pdfFile.originalname,
        },
        density: density as Density,
      });
      if (result && 'deck' in result && 'cards' in result && 'meta' in result) {
        res.json({
          message: 'Flashcards gerados com sucesso',
          deckId: result.deck._id,
          cards: result.cards,
          meta: result.meta,
        });
      }
    } catch (error) {
      console.error('Error in generate:', error);
      res.status(500).json({
        error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  getDecks = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const limit = parseInt(String(req.query.limit), 10) || 50;
      const skip = parseInt(String(req.query.skip), 10) || 0;
      const result = await this.deckService.execute({
        type: 'getUserDecks',
        userId: user._id,
        limit,
        skip,
      });
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
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const deck = await this.deckService.execute({
        type: 'getDeck',
        deckId,
        userId: user._id,
      });
      res.json({ deck });
    } catch (error) {
      console.error('Error in getDeck:', error);
      res.status(404).json({
        error:
          error instanceof Error
            ? error.message
            : 'Deck não encontrado ou sem permissão',
      });
    }
  };

  deleteDeck = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deckId } = req.params;
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      await this.deckService.execute({
        type: 'deleteDeck',
        deckId,
        userId: user._id,
      });
      res.json({ message: 'Deck deletado com sucesso' });
    } catch (error) {
      console.error('Error in deleteDeck:', error);
      res.status(404).json({
        error:
          error instanceof Error
            ? error.message
            : 'Deck não encontrado ou sem permissão',
      });
    }
  };

  updateDeck = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deckId } = req.params;
      const { name } = req.body as { name?: string };
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      if (!name) {
        res.status(400).json({ error: 'Nome é obrigatório' });
        return;
      }
      const deck = await this.deckService.execute({
        type: 'updateDeck',
        deckId,
        userId: user._id,
        name,
      });
      res.json({
        message: 'Deck atualizado com sucesso',
        deck,
      });
    } catch (error) {
      console.error('Error in updateDeck:', error);
      const statusCode =
        error instanceof Error && error.message.includes('não encontrado')
          ? 404
          : 400;
      res.status(statusCode).json({
        error:
          error instanceof Error ? error.message : 'Erro ao atualizar deck',
      });
    }
  };
}
