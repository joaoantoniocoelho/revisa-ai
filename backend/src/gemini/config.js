/**
 * Configuração centralizada do Gemini
 * Para trocar o modelo, altere a variável de ambiente GEMINI_MODEL
 */

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export const GEMINI_CONFIG = {
  model: GEMINI_MODEL,
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 16384, // Aumentado para evitar corte
  },
};

export const DENSITY_CONFIG = {
  low: 20,
  medium: 35,
  high: 60,
};
