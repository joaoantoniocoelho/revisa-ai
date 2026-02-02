import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_CONFIG } from './config.js';
import { buildFlashcardPrompt } from './prompt.js';
import type { Density, FlashcardEntity } from '../types/index.js';

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
  console.log(`Recovered ${cards.length} cards from partial JSON`);
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

export async function generateFlashcards(
  text: string,
  density: Density,
  apiKey: string,
  cardsPerChunk: number | null = null,
  retryCount = 0
): Promise<FlashcardEntity[]> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_CONFIG.model,
      generationConfig: {
        ...GEMINI_CONFIG.generationConfig,
        responseMimeType: 'application/json',
      },
    });
    const prompt = buildFlashcardPrompt(text, density, cardsPerChunk);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let responseText = response.text();
    responseText = cleanJsonResponse(responseText);

    let parsed: { cards?: PartialCard[] };
    try {
      parsed = JSON.parse(responseText) as { cards?: PartialCard[] };
    } catch {
      console.error('Response text:', responseText.substring(0, 500));
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]) as { cards?: PartialCard[] };
        } catch {
          console.log('Attempting to recover partial cards...');
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

    return cleanedCards;
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    if (err?.message?.includes('recover') && retryCount < 2) {
      console.log(`Retry ${retryCount + 1}/2 to recover cards...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return generateFlashcards(text, density, apiKey, cardsPerChunk, retryCount + 1);
    }
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
