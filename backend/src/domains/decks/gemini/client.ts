import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_CONFIG } from './config.js';
import { buildFlashcardPrompt } from './prompt.js';
import type { Density, FlashcardEntity } from '../../../shared/types/index.js';
import { logger } from '../../../shared/logger.js';

const LLM_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('LLM request timed out. Please try again.')),
        ms
      )
    ),
  ]);
}

function cleanString(str: string): string {
  return str
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\\"/g, '"')
    .trim();
}

interface PartialCard {
  front?: string;
  back?: string;
  tags?: string[];
}

function tryParsePartialJson(text: string): { cards: PartialCard[] } {
  const cards: PartialCard[] = [];
  const cardPattern =
    /\{\s*"front"\s*:\s*"([^"]+)"\s*,\s*"back"\s*:\s*"([^"]+)"(?:\s*,\s*"tags"\s*:\s*\[((?:"[^"]*"\s*,?\s*)*)\])?\s*\}/g;
  let match: RegExpExecArray | null;
  while ((match = cardPattern.exec(text)) !== null) {
    const front = match[1];
    const back = match[2];
    const tagsStr = match[3] ?? '';
    const tags: string[] = [];
    if (tagsStr) {
      const tagMatches = tagsStr.match(/"([^"]+)"/g);
      if (tagMatches) {
        tags.push(...tagMatches.map((t) => t.replace(/"/g, '')));
      }
    }
    if (front && back) {
      cards.push({ front, back, tags });
    }
  }
  if (cards.length === 0) {
    throw new Error('Could not recover any flashcards. Please try again.');
  }
  logger.info({ event: 'llm_parse_recovered', cardsRecovered: cards.length }, 'llm_parse_recovered');
  return { cards };
}

function cleanJsonResponse(text: string): string {
  let out = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  const firstBrace = out.indexOf('{');
  const lastBrace = out.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    out = out.substring(firstBrace, lastBrace + 1);
  }
  out = out
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/\\n/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
  return out;
}

export interface GenerateFlashcardsResult {
  cards: FlashcardEntity[];
  responseLength: number;
}

export async function generateFlashcards(
  text: string,
  density: Density,
  cardsPerChunk: number | null = null,
  retryCount = 0
): Promise<GenerateFlashcardsResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }

  const model = GEMINI_CONFIG.model;

  logger.info(
    { event: 'llm_request_started', model, chunkLength: text.length, retryCount },
    'llm_request_started'
  );

  const startMs = Date.now();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        ...GEMINI_CONFIG.generationConfig,
        responseMimeType: 'application/json',
      },
    });
    const prompt = buildFlashcardPrompt(text, density, cardsPerChunk);
    const response = await withTimeout(
      (async () => {
        const result = await geminiModel.generateContent(prompt);
        return result.response;
      })(),
      LLM_TIMEOUT_MS
    );
    let responseText = response.text();
    const responseLength = responseText.length;
    responseText = cleanJsonResponse(responseText);

    const durationMs = Date.now() - startMs;
    logger.info(
      { event: 'llm_request_completed', model, responseLength, durationMs },
      'llm_request_completed'
    );

    let parsed: { cards?: PartialCard[] };
    try {
      parsed = JSON.parse(responseText) as { cards?: PartialCard[] };
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]) as { cards?: PartialCard[] };
        } catch {
          logger.warn({ event: 'llm_retry', retryCount, reason: 'parse_failed' }, 'llm_retry');
          parsed = tryParsePartialJson(responseText);
        }
      } else {
        throw new Error('Invalid response from Gemini. Please try again.');
      }
    }

    if (!parsed.cards || !Array.isArray(parsed.cards)) {
      throw new Error('Invalid response format from Gemini. Please try again.');
    }

    const cleanedCards: FlashcardEntity[] = parsed.cards
      .filter((card) => card.front && card.back)
      .map((card) => ({
        front: cleanString(card.front!),
        back: cleanString(card.back!),
        tags: card.tags?.map((tag) => cleanString(String(tag))).filter(Boolean) ?? [],
      }));

    return { cards: cleanedCards, responseLength };
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    if (err?.message?.includes('recover') && retryCount < 2) {
      logger.warn(
        { event: 'llm_retry', retryCount: retryCount + 1, reason: 'recover_attempt' },
        'llm_retry'
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return generateFlashcards(text, density, cardsPerChunk, retryCount + 1);
    }

    const durationMs = Date.now() - startMs;
    logger.error(
      { event: 'llm_request_failed', model, error: err?.message, retryCount, durationMs },
      'llm_request_failed'
    );

    if (
      err?.message?.includes('API key not valid') ||
      err?.message?.includes('API_KEY_INVALID') ||
      err?.status === 400
    ) {
      throw new Error(
        'Invalid API key. Check that you copied it correctly from https://aistudio.google.com/app/apikey'
      );
    }
    if (
      err?.message?.includes('quota') ||
      err?.message?.includes('RESOURCE_EXHAUSTED') ||
      err?.status === 429
    ) {
      throw new Error(
        'API usage limit reached. Wait a few minutes or check your quota at Google AI Studio.'
      );
    }
    if (err?.status === 403) {
      throw new Error('Permission denied. Check that the API key has access to the Gemini API.');
    }
    if (error instanceof Error) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
    throw new Error('Unknown error generating flashcards');
  }
}
