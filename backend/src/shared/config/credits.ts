import type { Density } from '../types/index.js';

/** Base credits consumed per PDF page. */
export const CREDITS_PER_PAGE_BASE = 1;

/** Density multipliers used for pricing. */
export const DENSITY_CREDIT_MULTIPLIER: Record<Density, number> = {
  low: 1,
  medium: 1.35,
  high: 1.8,
};

/** Minimum credits charged (e.g. for 1-page PDFs) */
export const MIN_CREDITS_PER_GENERATION = 1;

/** Default credits for new users */
export const DEFAULT_CREDITS_FOR_NEW_USER = 10;

export function getCreditsForGeneration(
  numPages: number,
  density: Density
): number {
  if (numPages <= 0) return MIN_CREDITS_PER_GENERATION;
  const multiplier = DENSITY_CREDIT_MULTIPLIER[density] ?? DENSITY_CREDIT_MULTIPLIER.low;
  const total = Math.ceil(numPages * CREDITS_PER_PAGE_BASE * multiplier);
  return Math.max(MIN_CREDITS_PER_GENERATION, total);
}
