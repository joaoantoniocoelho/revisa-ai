import pdf from 'pdf-parse';
import { generateFlashcards } from '../gemini/client.js';
import { GEMINI_MODEL, DENSITY_CONFIG } from '../gemini/config.js';
import { chunkText } from '../utils/chunking.js';
import { detectLanguage } from '../utils/language.js';
import { dedupeCards, validateCards, validatePdfText } from '../utils/validation.js';
import deckRepository from '../repositories/deckRepository.js';
import userRepository from '../repositories/userRepository.js';

class DeckService {
  async generateFromPdf(userId, pdfFile, density) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      throw new Error('GEMINI_API_KEY não configurada no servidor');
    }

    // Extrai texto do PDF
    const data = await pdf(pdfFile.buffer);
    const text = data.text;

    // Valida texto extraído
    const validation = validatePdfText(text);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Detecta idioma
    const language = detectLanguage(text);

    // Ajusta tamanho do chunk dinamicamente baseado no tamanho do texto
    // PDFs grandes: chunks maiores = menos chamadas à API
    // PDFs pequenos: chunks menores = melhor qualidade
    const textLength = text.length;
    let chunkSize = 10000; // padrão
    let maxConcurrent = 3; // padrão
    
    if (textLength > 100000) {
      // PDF muito grande (>100k chars): chunks maiores e mais paralelismo
      chunkSize = 15000;
      maxConcurrent = 5;
    } else if (textLength > 50000) {
      // PDF grande (>50k chars): chunks médios
      chunkSize = 12000;
      maxConcurrent = 4;
    }
    
    // Divide em chunks
    const chunks = chunkText(text, chunkSize);
    const targetCount = DENSITY_CONFIG[density];
    
    // Calcula quantos cards gerar por chunk
    // Para PDFs grandes com muitos chunks, garante mínimo de cards por chunk
    // Para PDFs pequenos, distribui o targetCount
    let cardsPerChunk;
    if (chunks.length > 10) {
      // Muitos chunks: mínimo de 8-10 cards por chunk para garantir cobertura
      cardsPerChunk = Math.max(8, Math.ceil(targetCount * 1.5 / chunks.length));
    } else {
      // Poucos chunks: distribui normalmente
      cardsPerChunk = Math.max(5, Math.ceil(targetCount / Math.max(1, chunks.length)));
    }
    
    console.log(`📄 PDF: ${(textLength / 1000).toFixed(1)}k caracteres | ${chunks.length} chunks (${chunkSize} chars/chunk)`);
    console.log(`🎯 Meta: ${targetCount} cards | ${cardsPerChunk} cards/chunk | Paralelismo: ${maxConcurrent}`);

    // Processa chunks em paralelo
    const MAX_CONCURRENT = maxConcurrent;
    const allCards = [];
    
    for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
      const chunkBatch = chunks.slice(i, i + MAX_CONCURRENT);
      const batchPromises = chunkBatch.map(async (chunk, index) => {
        try {
          const chunkNum = i + index + 1;
          console.log(`[${chunkNum}/${chunks.length}] Gerando flashcards...`);
          const cards = await generateFlashcards(chunk, density, apiKey, language, cardsPerChunk);
          console.log(`[${chunkNum}/${chunks.length}] ✓ ${cards.length} cards gerados`);
          return cards;
        } catch (error) {
          console.error(`[${i + index + 1}/${chunks.length}] ✗ Erro:`, error.message);
          return []; // Retorna array vazio em caso de erro
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      allCards.push(...batchResults.flat());
    }
    
    console.log(`Total de ${allCards.length} cards gerados de ${chunks.length} chunks`);

    if (allCards.length === 0) {
      throw new Error('Failed to generate any flashcards. Check your API key.');
    }

    // Valida e deduplica cards
    const validatedCards = validateCards(allCards);
    const uniqueCards = dedupeCards(validatedCards);
    
    // Limita ao número esperado pela densidade
    const maxCards = Math.ceil(DENSITY_CONFIG[density] * 1.2);
    const limitedCards = uniqueCards.slice(0, maxCards);

    // Salva deck no banco
    const deck = await deckRepository.create({
      userId,
      name: pdfFile.originalname.replace('.pdf', ''),
      pdfFileName: pdfFile.originalname,
      cards: limitedCards,
      density,
      metadata: {
        chunks: chunks.length,
        model: GEMINI_MODEL,
        language: language,
        totalGenerated: allCards.length,
        afterDeduplication: uniqueCards.length,
        finalCount: limitedCards.length,
      },
    });

    // Incrementa contador de PDFs do usuário
    const user = await userRepository.findById(userId);
    await user.incrementPdfCount();

    return {
      deck,
      cards: limitedCards,
      meta: {
        chunks: chunks.length,
        model: GEMINI_MODEL,
        language: language,
        totalGenerated: allCards.length,
        afterDeduplication: uniqueCards.length,
        finalCount: limitedCards.length,
        densityTarget: DENSITY_CONFIG[density],
      },
    };
  }

  async getUserDecks(userId, limit = 50, skip = 0) {
    const decks = await deckRepository.findByUserId(userId, limit, skip);
    const total = await deckRepository.countByUserId(userId);
    
    return {
      decks,
      total,
      limit,
      skip,
    };
  }

  async getDeckById(deckId, userId) {
    const deck = await deckRepository.findByIdAndUserId(deckId, userId);
    
    if (!deck) {
      throw new Error('Deck não encontrado');
    }
    
    return deck;
  }

  async deleteDeck(deckId, userId) {
    const deck = await deckRepository.delete(deckId, userId);
    
    if (!deck) {
      throw new Error('Deck não encontrado');
    }
    
    return deck;
  }

  async updateDeckName(deckId, userId, newName) {
    // Valida nome
    if (!newName || newName.trim().length === 0) {
      throw new Error('Nome do deck não pode ser vazio');
    }

    if (newName.trim().length > 200) {
      throw new Error('Nome do deck não pode ter mais de 200 caracteres');
    }

    const deck = await deckRepository.updateName(deckId, userId, newName.trim());
    
    if (!deck) {
      throw new Error('Deck não encontrado');
    }
    
    return deck;
  }
}

export default new DeckService();
