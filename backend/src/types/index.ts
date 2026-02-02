/** Flashcard generation density level */
export type Density = 'low' | 'medium' | 'high';

/** User plan type */
export type PlanType = 'free' | 'paid';

/** Flashcard */
export interface FlashcardEntity {
  front: string;
  back: string;
  tags?: string[];
}

/** Deck metadata */
export interface DeckMetadata {
  chunks: number;
  model: string;
  language: string;
  totalGenerated: number;
  afterDeduplication: number;
  finalCount: number;
}

/** Plan (limits and features) */
export interface PlanEntity {
  name: string;
  displayName: string;
  limits: {
    pdfsPerMonth: number;
    allowedDensities: Density[];
    maxCardsPerDeck: number | null;
  };
  features: string[];
  isActive: boolean;
}
