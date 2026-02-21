import fs from 'fs';
import type { Types } from 'mongoose';
import { DeckRepository } from '../repositories/DeckRepository.js';
import type { IDeckDoc } from '../models/Deck.js';
import type { Density, FlashcardEntity } from '../../../shared/types/index.js';
import { generateFlashcards } from '../gemini/client.js';
import { GEMINI_MODEL, DENSITY_CONFIG } from '../gemini/config.js';
import { chunkText } from '../utils/chunking.js';
import {
  dedupeCards,
  validateCards,
  validatePdfText,
} from '../utils/validation.js';

const MAX_TEXT_LENGTH = 500_000;
const MAX_CHUNKS_PER_PDF = 50;

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

export class DeckService {
  private readonly deckRepository = new DeckRepository();

  async generateFromPdf(
    userId: Types.ObjectId,
    pdfFile: { path: string; originalname: string },
    density: Density
  ): Promise<GenerateDeckResult> {
    let buffer: Buffer;
    try {
      buffer = await fs.promises.readFile(pdfFile.path);
    } catch {
      throw new Error('Failed to read PDF file');
    }
    try {
      return await this.generateDeckFromPdf(userId, buffer, pdfFile.originalname, density);
    } finally {
      try {
        await fs.promises.unlink(pdfFile.path);
      } catch {
        /* ignore temp file removal error */
      }
    }
  }

  async getUserDecks(
    userId: Types.ObjectId,
    limit = 50,
    skip = 0
  ): Promise<GetUserDecksResult> {
    const decks = await this.deckRepository.findByUserId(userId, limit, skip);
    const total = await this.deckRepository.countByUserId(userId);
    return { decks, total, limit, skip };
  }

  async getDeckById(deckId: string, userId: Types.ObjectId): Promise<IDeckDoc> {
    const deck = await this.deckRepository.findByIdAndUserId(deckId, userId);
    if (!deck) {
      throw new Error('Deck not found');
    }
    return deck;
  }

  async deleteDeck(deckId: string, userId: Types.ObjectId): Promise<IDeckDoc> {
    const deck = await this.deckRepository.delete(deckId, userId);
    if (!deck) {
      throw new Error('Deck not found');
    }
    return deck;
  }

  async updateDeckName(
    deckId: string,
    userId: Types.ObjectId,
    name: string
  ): Promise<IDeckDoc> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Deck name cannot be empty');
    }
    if (trimmed.length > 200) {
      throw new Error('Deck name cannot exceed 200 characters');
    }
    const deck = await this.deckRepository.updateName(deckId, userId, trimmed);
    if (!deck) {
      throw new Error('Deck not found');
    }
    return deck;
  }

  /**
   * Core generation logic - isolated for future queue/worker migration.
   * Receives buffer only; no file I/O. Caller is responsible for temp file cleanup.
   */
  async generateDeckFromPdf(
    userId: Types.ObjectId,
    buffer: Buffer,
    originalFilename: string,
    density: Density
  ): Promise<GenerateDeckResult> {
    const pdf = await import('pdf-parse');
    const data = await pdf.default(buffer);
    let text = (data.text as string).trim();

    if (text.length > MAX_TEXT_LENGTH) {
      throw new Error(
        `PDF too large. Maximum allowed: ${(MAX_TEXT_LENGTH / 1000).toFixed(0)}k characters of text.`
      );
    }

    const validation = validatePdfText(text);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const textLength = text.length;
    let chunkSize = 10000;
    if (textLength > 100000) chunkSize = 15000;
    else if (textLength > 50000) chunkSize = 12000;
    const maxConcurrent = 3; /* MVP: cap per-PDF parallelism to control cost */

    let chunks = chunkText(text, chunkSize);
    if (chunks.length > MAX_CHUNKS_PER_PDF) {
      chunks = chunks.slice(0, MAX_CHUNKS_PER_PDF);
    }
    const targetCount = DENSITY_CONFIG[density];
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
      `📄 PDF: ${(textLength / 1000).toFixed(1)}k characters | ${chunks.length} chunks (${chunkSize} chars/chunk)`
    );
    console.log(
      `🎯 Target: ${targetCount} cards | ${cardsPerChunk} cards/chunk | Concurrency: ${maxConcurrent}`
    );

    const allCards: FlashcardEntity[] = [];
    for (let i = 0; i < chunks.length; i += maxConcurrent) {
      const chunkBatch = chunks.slice(i, i + maxConcurrent);
      const batchPromises = chunkBatch.map(async (chunk, index) => {
        try {
          const chunkNum = i + index + 1;
          console.log(`[${chunkNum}/${chunks.length}] Generating flashcards...`);
          const cards = await generateFlashcards(chunk, density, cardsPerChunk);
          console.log(`[${chunkNum}/${chunks.length}] ✓ ${cards.length} cards generated`);
          return cards;
        } catch (error) {
          console.error(
            `[${i + index + 1}/${chunks.length}] ✗ Error:`,
            error instanceof Error ? error.message : error
          );
          return [];
        }
      });
      const batchResults = await Promise.all(batchPromises);
      allCards.push(...batchResults.flat());
    }

    console.log(
      `Total of ${allCards.length} cards generated from ${chunks.length} chunks`
    );
    if (allCards.length === 0) {
      throw new Error('Failed to generate any flashcards. Check your API key.');
    }

    const validatedCards = validateCards(allCards);
    const uniqueCards = dedupeCards(validatedCards);
    const maxCards = Math.ceil(DENSITY_CONFIG[density] * 1.2);
    const limitedCards = uniqueCards.slice(0, maxCards);

    const deck = await this.deckRepository.create({
      userId,
      name: originalFilename.replace(/\.pdf$/i, ''),
      pdfFileName: originalFilename,
      cards: limitedCards,
      density,
      metadata: {
        chunks: chunks.length,
        model: GEMINI_MODEL,
        language: 'pt-BR',
        totalGenerated: allCards.length,
        afterDeduplication: uniqueCards.length,
        finalCount: limitedCards.length,
      },
    });

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
        densityTarget: DENSITY_CONFIG[density],
      },
    };
  }
}
