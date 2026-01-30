import type { Types } from 'mongoose';
import type { FlashcardEntity } from '../types/index.js';
import type { DeckRepository } from '../repositories/DeckRepository.js';

export type ExportCardsCommand = {
  type: 'exportCards';
  cards: FlashcardEntity[];
  deckName?: string;
};

export type ExportDeckCommand = {
  type: 'exportDeck';
  deckId: string;
  userId: Types.ObjectId;
};

export type ExportCommand = ExportCardsCommand | ExportDeckCommand;

export interface ExportResult {
  buffer: Buffer;
  filename: string;
}

export class ExportService {
  constructor(private readonly deckRepository: DeckRepository) {}

  async execute(cmd: ExportCommand): Promise<ExportResult> {
    switch (cmd.type) {
      case 'exportCards':
        return this.exportToAnki(cmd.cards, cmd.deckName ?? 'PDF2Anki Import');
      case 'exportDeck':
        return this.exportDeckById(cmd.deckId, cmd.userId);
    }
  }

  private async exportToAnki(
    cards: FlashcardEntity[],
    deckName: string
  ): Promise<ExportResult> {
    if (!cards?.length) {
      throw new Error('Cards array is required and must not be empty');
    }
    const pkg = await import('anki-apkg-export');
    const AnkiExport = pkg.default ?? pkg;
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
        'Deck não encontrado ou você não tem permissão para acessá-lo'
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
