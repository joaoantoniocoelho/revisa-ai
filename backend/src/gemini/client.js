import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_CONFIG } from "./config.js";
import { buildFlashcardPrompt } from "./prompt.js";

/**
 * Limpa strings removendo quebras de linha problemáticas e caracteres especiais
 */
function cleanString(str) {
  return str
    .replace(/\n+/g, " ") // Remove quebras de linha
    .replace(/\s+/g, " ") // Remove espaços múltiplos
    .replace(/\\"/g, '"') // Corrige aspas escapadas
    .trim();
}

/**
 * Tenta recuperar cards de JSON parcial/incompleto
 */
function tryParsePartialJson(text) {
  const cards = [];
  
  // Extrai cards individuais com regex
  const cardPattern = /\{\s*"front"\s*:\s*"([^"]+)"\s*,\s*"back"\s*:\s*"([^"]+)"(?:\s*,\s*"tags"\s*:\s*\[((?:"[^"]*"\s*,?\s*)*)\])?\s*\}/g;
  
  let match;
  while ((match = cardPattern.exec(text)) !== null) {
    const front = match[1];
    const back = match[2];
    const tagsStr = match[3] || "";
    
    const tags = [];
    if (tagsStr) {
      const tagMatches = tagsStr.match(/"([^"]+)"/g);
      if (tagMatches) {
        tags.push(...tagMatches.map(t => t.replace(/"/g, "")));
      }
    }
    
    if (front && back) {
      cards.push({ front, back, tags });
    }
  }
  
  if (cards.length === 0) {
    throw new Error("Não foi possível recuperar nenhum flashcard. Tente novamente.");
  }
  
  console.log(`Recuperados ${cards.length} cards de JSON parcial`);
  return { cards };
}

/**
 * Limpa a resposta JSON removendo possíveis textos extras
 */
function cleanJsonResponse(text) {
  // Remove possíveis markdown code blocks
  text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  
  // Remove texto antes do primeiro { e depois do último }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }
  
  // Corrige possíveis problemas comuns
  text = text
    .replace(/,\s*}/g, "}") // Remove vírgulas antes de }
    .replace(/,\s*]/g, "]") // Remove vírgulas antes de ]
    .replace(/\\n/g, " ") // Remove \n
    .replace(/\n/g, " ") // Remove quebras de linha reais
    .trim();
  
  return text;
}

/**
 * Gera flashcards usando a API do Gemini
 */
export async function generateFlashcards(
  text,
  density,
  apiKey,
  language = "en",
  cardsPerChunk = null,
  retryCount = 0
) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_CONFIG.model,
      generationConfig: {
        ...GEMINI_CONFIG.generationConfig,
        responseMimeType: "application/json",
      },
    });

    const prompt = buildFlashcardPrompt(text, density, language, cardsPerChunk);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let responseText = response.text();

    // Limpa e extrai JSON da resposta
    responseText = cleanJsonResponse(responseText);

    // Parse JSON response com tratamento de erro ROBUSTO
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error("Response text:", responseText.substring(0, 500));
      
      // Estratégia 1: Tenta extrair JSON completo
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          // Estratégia 2: Tenta recuperar cards parciais
          console.log("Tentando recuperar cards parciais...");
          parsed = tryParsePartialJson(responseText);
        }
      } else {
        throw new Error("Resposta inválida do Gemini. Tente novamente.");
      }
    }

    if (!parsed.cards || !Array.isArray(parsed.cards)) {
      throw new Error("Formato de resposta inválido do Gemini. Tente novamente.");
    }

    // Filtra e limpa os cards
    const cleanedCards = parsed.cards
      .filter(card => card.front && card.back)
      .map(card => ({
        front: cleanString(card.front),
        back: cleanString(card.back),
        tags: card.tags?.map(tag => cleanString(tag)).filter(Boolean) || [],
      }));

    return cleanedCards;
  } catch (error) {
    // Retry automático para erros de parsing (máx 2 tentativas)
    if (error?.message?.includes("processar a resposta") && retryCount < 2) {
      console.log(`Retry ${retryCount + 1}/2 para recuperar cards...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguarda 1s
      return generateFlashcards(text, density, apiKey, language, retryCount + 1);
    }
    
    // Erro específico de API key inválida
    if (error?.message?.includes("API key not valid") || 
        error?.message?.includes("API_KEY_INVALID") ||
        error?.status === 400) {
      throw new Error("API Key inválida. Verifique se copiou corretamente de https://aistudio.google.com/app/apikey");
    }
    
    // Erro de quota/limite
    if (error?.message?.includes("quota") || 
        error?.message?.includes("RESOURCE_EXHAUSTED") ||
        error?.status === 429) {
      throw new Error("Limite de uso da API atingido. Aguarde alguns minutos ou verifique sua cota no Google AI Studio.");
    }
    
    // Erro de permissão
    if (error?.status === 403) {
      throw new Error("Permissão negada. Verifique se a API key tem acesso ao Gemini API.");
    }
    
    // Outros erros
    if (error instanceof Error) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
    throw new Error("Erro desconhecido ao gerar flashcards");
  }
}
