/** Flashcard generation density level */
export type Density = 'low' | 'medium' | 'high';

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
