/** Nível de densidade na geração de flashcards */
export type Density = 'low' | 'medium' | 'high';

/** Tipo de plano do usuário */
export type PlanType = 'free' | 'paid';

/** Flashcard */
export interface FlashcardEntity {
  front: string;
  back: string;
  tags?: string[];
}

/** Metadados do deck */
export interface DeckMetadata {
  chunks: number;
  model: string;
  language: string;
  totalGenerated: number;
  afterDeduplication: number;
  finalCount: number;
}

/** Plano (limites e features) */
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
