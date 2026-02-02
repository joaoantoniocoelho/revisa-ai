import { DENSITY_CONFIG } from './config.js';
import type { Density } from '../types/index.js';

export function buildFlashcardPrompt(
  text: string,
  density: Density,
  cardsPerChunk: number | null = null
): string {
  const targetCount = cardsPerChunk ?? DENSITY_CONFIG[density];

  return `You are an expert at creating flashcards for Anki.

CRITICAL RULES:
1. Generate approximately ${targetCount} flashcards (${targetCount} ± 2 is acceptable)
2. Focus on quality over quantity
3. One concept per card
4. Direct, specific questions (no "Explain..." or "Describe...")
5. Short answers (1-2 sentences max)
6. Generate ALL flashcards in Portuguese (pt-BR).
7. Add 2-4 relevant tags per card

JSON FORMAT (CRITICAL):
- Return ONLY valid JSON
- NO markdown, NO code blocks, NO extra text
- Escape quotes with \\"
- NO line breaks inside strings
- NO trailing commas

STRUCTURE:
{
  "cards": [
    {
      "front": "Specific question here?",
      "back": "Concise answer here.",
      "tags": ["tag1", "tag2"]
    }
  ]
}

CONSTRAINTS:
- front: max 120 characters
- back: max 250 characters  
- tags: 2-4 per card

TEXT TO ANALYZE:
"""
${text}
"""

IMPORTANT: Generate approximately ${targetCount} high-quality flashcards in valid JSON format.`;
}
