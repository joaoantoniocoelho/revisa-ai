/**
 * Credits consumed per PDF page.
 * Single source of truth for pricing.
 */
export const CREDITS_PER_PAGE = 1;

/** Minimum credits charged (e.g. for 1-page PDFs) */
export const MIN_CREDITS_PER_GENERATION = 1;

/** Default credits for new users */
export const DEFAULT_CREDITS_FOR_NEW_USER = 2;

export function getCreditsForPages(numPages: number): number {
  if (numPages <= 0) return MIN_CREDITS_PER_GENERATION;
  const total = Math.ceil(numPages * CREDITS_PER_PAGE);
  return Math.max(MIN_CREDITS_PER_GENERATION, total);
}
