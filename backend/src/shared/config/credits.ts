/** Tiered pricing: first tier whose maxPages >= numPages wins. */
export const CREDIT_TIERS = [
  { maxPages: 15, credits: 1 },
  { maxPages: 35, credits: 2 },
  { maxPages: 50, credits: 3 },
] as const;

/** Minimum credits charged (e.g. for 1-page PDFs) */
export const MIN_CREDITS_PER_GENERATION = 1;

/** Default credits for new users */
export const DEFAULT_CREDITS_FOR_NEW_USER = 10;

export function getCreditsForGeneration(numPages: number): number {
  if (numPages <= 0) return MIN_CREDITS_PER_GENERATION;
  for (const tier of CREDIT_TIERS) {
    if (tier.maxPages >= numPages) return tier.credits;
  }
  return CREDIT_TIERS[CREDIT_TIERS.length - 1].credits;
}
