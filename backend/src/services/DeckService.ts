import type { Types } from 'mongoose';
import type { DeckRepository } from '../repositories/DeckRepository.js';
import type { UserRepository } from '../repositories/UserRepository.js';
import type { IDeckDoc } from '../models/Deck.js';
import type { Density, FlashcardEntity } from '../types/index.js';
import { generateFlashcards } from '../gemini/client.js';
import { GEMINI_MODEL, DENSITY_CONFIG } from '../gemini/config.js';
import { chunkText } from '../utils/chunking.js';
import {
  dedupeCards,
  validateCards,
  validatePdfText,
} from '../utils/validation.js';

export type GenerateDeckCommand = {
  type: 'generateDeck';
  userId: Types.ObjectId;
  pdfFile: { buffer: Buffer; originalname: string };
  density: Density;
};

export type GetUserDecksCommand = {
  type: 'getUserDecks';
  userId: Types.ObjectId;
  limit?: number;
  skip?: number;
};

export type GetDeckCommand = {
  type: 'getDeck';
  deckId: string;
  userId: Types.ObjectId;
};

export type DeleteDeckCommand = {
  type: 'deleteDeck';
  deckId: string;
  userId: Types.ObjectId;
};

export type UpdateDeckCommand = {
  type: 'updateDeck';
  deckId: string;
  userId: Types.ObjectId;
  name: string;
};

export type DeckCommand =
  | GenerateDeckCommand
  | GetUserDecksCommand
  | GetDeckCommand
  | DeleteDeckCommand
  | UpdateDeckCommand;

export interface GenerateDeckResult {
  deck: IDeckDoc;
  cards: FlashcardEntity[];
  meta: {
    chunks: number;
    model: string;
    language: string;
    totalGenerated: number;
    afterDeduplication: number;
    finalCount: number;
    densityTarget: number;
  };
}

export interface GetUserDecksResult {
  decks: IDeckDoc[];
  total: number;
  limit: number;
  skip: number;
}

export type DeckServiceResult =
  | GenerateDeckResult
  | GetUserDecksResult
  | IDeckDoc
  | void;

export class DeckService {
  constructor(
    private readonly deckRepository: DeckRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(cmd: DeckCommand): Promise<DeckServiceResult> {
    switch (cmd.type) {
      case 'generateDeck':
        return this.generateFromPdf(cmd);
      case 'getUserDecks':
        return this.getUserDecks(cmd);
      case 'getDeck':
        return this.getDeckById(cmd);
      case 'deleteDeck':
        return this.deleteDeck(cmd);
      case 'updateDeck':
        return this.updateDeckName(cmd);
    }
  }

  private async generateFromPdf(
    cmd: GenerateDeckCommand
  ): Promise<GenerateDeckResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey?.trim()) {
      throw new Error('GEMINI_API_KEY não configurada no servidor');
    }
    const pdf = await import('pdf-parse');
    const data = await pdf.default(cmd.pdfFile.buffer);
    const text = data.text as string;

    const validation = validatePdfText(text);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const textLength = text.length;
    let chunkSize = 10000;
    let maxConcurrent = 3;
    if (textLength > 100000) {
      chunkSize = 15000;
      maxConcurrent = 5;
    } else if (textLength > 50000) {
      chunkSize = 12000;
      maxConcurrent = 4;
    }

    const chunks = chunkText(text, chunkSize);
    const targetCount = DENSITY_CONFIG[cmd.density];
    let cardsPerChunk: number;
    if (chunks.length > 10) {
      cardsPerChunk = Math.max(8, Math.ceil((targetCount * 1.5) / chunks.length));
    } else {
      cardsPerChunk = Math.max(
        5,
        Math.ceil(targetCount / Math.max(1, chunks.length))
      );
    }

    console.log(
      `📄 PDF: ${(textLength / 1000).toFixed(1)}k caracteres | ${chunks.length} chunks (${chunkSize} chars/chunk)`
    );
    console.log(
      `🎯 Meta: ${targetCount} cards | ${cardsPerChunk} cards/chunk | Paralelismo: ${maxConcurrent}`
    );

    const allCards: FlashcardEntity[] = [];
    for (let i = 0; i < chunks.length; i += maxConcurrent) {
      const chunkBatch = chunks.slice(i, i + maxConcurrent);
      const batchPromises = chunkBatch.map(async (chunk, index) => {
        try {
          const chunkNum = i + index + 1;
          console.log(`[${chunkNum}/${chunks.length}] Gerando flashcards...`);
          const cards = await generateFlashcards(
            chunk,
            cmd.density,
            apiKey,
            cardsPerChunk
          );
          console.log(`[${chunkNum}/${chunks.length}] ✓ ${cards.length} cards gerados`);
          return cards;
        } catch (error) {
          console.error(
            `[${i + index + 1}/${chunks.length}] ✗ Erro:`,
            error instanceof Error ? error.message : error
          );
          return [];
        }
      });
      const batchResults = await Promise.all(batchPromises);
      allCards.push(...batchResults.flat());
    }

    console.log(
      `Total de ${allCards.length} cards gerados de ${chunks.length} chunks`
    );
    if (allCards.length === 0) {
      throw new Error('Failed to generate any flashcards. Check your API key.');
    }

    const validatedCards = validateCards(allCards);
    const uniqueCards = dedupeCards(validatedCards);
    const maxCards = Math.ceil(DENSITY_CONFIG[cmd.density] * 1.2);
    const limitedCards = uniqueCards.slice(0, maxCards);

    const deck = await this.deckRepository.create({
      userId: cmd.userId,
      name: cmd.pdfFile.originalname.replace('.pdf', ''),
      pdfFileName: cmd.pdfFile.originalname,
      cards: limitedCards,
      density: cmd.density,
      metadata: {
        chunks: chunks.length,
        model: GEMINI_MODEL,
        language: 'pt-BR',
        totalGenerated: allCards.length,
        afterDeduplication: uniqueCards.length,
        finalCount: limitedCards.length,
      },
    });

    const user = await this.userRepository.findById(cmd.userId.toString());
    if (user) {
      await user.incrementPdfCount();
    }

    return {
      deck: deck as IDeckDoc,
      cards: limitedCards,
      meta: {
        chunks: chunks.length,
        model: GEMINI_MODEL,
        language: 'pt-BR',
        totalGenerated: allCards.length,
        afterDeduplication: uniqueCards.length,
        finalCount: limitedCards.length,
        densityTarget: DENSITY_CONFIG[cmd.density],
      },
    };
  }

  private async getUserDecks(cmd: GetUserDecksCommand): Promise<GetUserDecksResult> {
    const limit = cmd.limit ?? 50;
    const skip = cmd.skip ?? 0;
    const decks = await this.deckRepository.findByUserId(
      cmd.userId,
      limit,
      skip
    );
    const total = await this.deckRepository.countByUserId(cmd.userId);
    return { decks, total, limit, skip };
  }

  private async getDeckById(cmd: GetDeckCommand): Promise<IDeckDoc> {
    const deck = await this.deckRepository.findByIdAndUserId(
      cmd.deckId,
      cmd.userId
    );
    if (!deck) {
      throw new Error('Deck não encontrado');
    }
    return deck;
  }

  private async deleteDeck(cmd: DeleteDeckCommand): Promise<IDeckDoc> {
    const deck = await this.deckRepository.delete(cmd.deckId, cmd.userId);
    if (!deck) {
      throw new Error('Deck não encontrado');
    }
    return deck;
  }

  private async updateDeckName(cmd: UpdateDeckCommand): Promise<IDeckDoc> {
    const name = cmd.name.trim();
    if (!name) {
      throw new Error('Nome do deck não pode ser vazio');
    }
    if (name.length > 200) {
      throw new Error('Nome do deck não pode ter mais de 200 caracteres');
    }
    const deck = await this.deckRepository.updateName(
      cmd.deckId,
      cmd.userId,
      name
    );
    if (!deck) {
      throw new Error('Deck não encontrado');
    }
    return deck;
  }
}
