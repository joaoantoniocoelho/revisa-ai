import type { Types } from 'mongoose';
import type { FlashcardEntity } from '../../../../shared/types/index.js';
import { DeckRepository } from '../../repositories/DeckRepository.js';

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
    const { default: mod } = await import('anki-apkg-export');
    const AnkiExport = (mod as unknown as {
      default: new (name: string) => {
        addCard(front: string, back: string, options?: { tags?: string }): void;
        save(): Promise<Buffer>;
      };
    }).default;
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
    const deck = await this.deckRepository.findByIdAndUserId(deckId, userId);
    if (!deck) {
      throw new Error(
        'Deck not found or you do not have permission to access it'
      );
    }
    return this.exportToAnki(deck.cards, deck.name);
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
