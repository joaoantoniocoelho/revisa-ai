import type { FlashcardEntity } from '../types/index.js';

/**
 * Remove duplicate cards based on the "front" field.
 */
export function dedupeCards(cards: FlashcardEntity[]): FlashcardEntity[] {
  const seen = new Set<string>();
  const unique: FlashcardEntity[] = [];
  for (const card of cards) {
    const normalizedFront = card.front.trim().toLowerCase();
    if (!seen.has(normalizedFront)) {
      seen.add(normalizedFront);
      unique.push(card);
    }
  }
  return unique;
}

/**
 * Validate and clean flashcards.
 */
export function validateCards(
  cards: Array<{ front?: string; back?: string; tags?: string[] }>
): FlashcardEntity[] {
  return cards
    .filter((card) => {
      if (!card.front?.trim() || !card.back?.trim()) return false;
      if (card.front.length > 150) return false;
      if (card.back.length > 400) return false;
      return true;
    })
    .map((card) => ({
      front: card.front!.trim(),
      back: card.back!.trim(),
      tags: card.tags?.filter((tag) => tag.trim()).map((tag) => tag.trim()) ?? [],
    }));
}

export interface ValidatePdfTextResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate that the extracted PDF text is sufficient.
 */
export function validatePdfText(text: string): ValidatePdfTextResult {
  const cleanText = text.trim();
  if (cleanText.length < 800) {
    return {
      valid: false,
      error: 'Scanned PDF or insufficient text. Minimum: 800 characters.',
    };
  }
  const alphanumericRatio = (cleanText.match(/[a-zA-Z0-9]/g) ?? []).length / cleanText.length;
  if (alphanumericRatio < 0.5) {
    return {
      valid: false,
      error: 'PDF contains little readable text. It may be a scanned PDF.',
    };
  }
  return { valid: true };
}
