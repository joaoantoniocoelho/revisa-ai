import type { Density } from '../types/index.js';

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

export const GEMINI_CONFIG = {
  model: GEMINI_MODEL,
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 16384,
  },
};

export const DENSITY_CONFIG: Record<Density, number> = {
  low: 20,
  medium: 35,
  high: 60,
};
