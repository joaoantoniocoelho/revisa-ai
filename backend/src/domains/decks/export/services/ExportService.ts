import type { Types } from 'mongoose';
import type { FlashcardEntity } from '../../../../shared/types/index.js';
import { DeckRepository } from '../../repositories/DeckRepository.js';
import { logger } from '../../../../shared/logger.js';

export interface ExportResult {
  buffer: Buffer;
  filename: string;
}

export class ExportService {
  private readonly deckRepository = new DeckRepository();

  async exportDeck(deckId: string, userId: Types.ObjectId): Promise<ExportResult> {
    return this.exportDeckById(deckId, userId);
  }

  private async exportToAnki(
    cards: FlashcardEntity[],
    deckName: string
  ): Promise<ExportResult> {
    if (!cards?.length) {
      throw new Error('Cards array is required and must not be empty');
    }
    const mod = await import('anki-apkg-export');
    const AnkiExport = (mod.default ?? mod) as unknown as new (name: string) => {
      addCard(front: string, back: string, options?: { tags?: string }): void;
      save(): Promise<Buffer>;
    };
    const apkg = new AnkiExport(deckName);

    for (const card of cards) {
      if (!card.front || !card.back) continue;
      const front = this.cleanText(card.front);
      const back = this.cleanText(card.back);
      const tags =
        card.tags && card.tags.length > 0 ? card.tags.join(' ') : '';
      apkg.addCard(front, back, { tags });
    }

    const zip = (await apkg.save()) as Buffer;
    return {
      buffer: zip,
      filename: this.sanitizeFilename(deckName),
    };
  }

  private async exportDeckById(
    deckId: string,
    userId: Types.ObjectId
  ): Promise<ExportResult> {
    logger.info({ event: 'deck_export_started', userId: userId.toString(), deckId }, 'deck_export_started');
    const deck = await this.deckRepository.findByIdAndUserId(deckId, userId);
    if (!deck) {
      throw new Error(
        'Deck not found or you do not have permission to access it'
      );
    }
    const result = await this.exportToAnki(deck.cards, deck.name);
    logger.info({ event: 'deck_export_completed', userId: userId.toString(), deckId, cardCount: deck.cards.length }, 'deck_export_completed');
    return result;
  }

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-z0-9_\-]/gi, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);
  }
}
