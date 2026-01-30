import type { FlashcardEntity } from '../types/index.js';

/**
 * Remove cards duplicados baseado no campo "front"
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
 * Valida e limpa flashcards
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
 * Valida se o texto extraído do PDF é suficiente
 */
export function validatePdfText(text: string): ValidatePdfTextResult {
  const cleanText = text.trim();
  if (cleanText.length < 800) {
    return {
      valid: false,
      error: 'PDF escaneado ou com texto insuficiente. Mínimo: 800 caracteres.',
    };
  }
  const alphanumericRatio = (cleanText.match(/[a-zA-Z0-9]/g) ?? []).length / cleanText.length;
  if (alphanumericRatio < 0.5) {
    return {
      valid: false,
      error: 'PDF contém pouco texto legível. Pode ser um PDF escaneado.',
    };
  }
  return { valid: true };
}
