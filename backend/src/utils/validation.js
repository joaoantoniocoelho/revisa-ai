/**
 * Remove cards duplicados baseado no campo "front"
 */
export function dedupeCards(cards) {
  const seen = new Set();
  const unique = [];
  
  for (const card of cards) {
    const normalizedFront = card.front.trim().toLowerCase();
    
    if (!seen.has(normalizedFront)) {
      seen.add(normalizedFront);
      unique.push(card);
    }
  }
  
  return unique;
}

/**
 * Valida e limpa flashcards
 */
export function validateCards(cards) {
  return cards
    .filter(card => {
      // Deve ter front e back não vazios
      if (!card.front?.trim() || !card.back?.trim()) {
        return false;
      }
      
      // Front não pode ser muito longo
      if (card.front.length > 150) {
        return false;
      }
      
      // Back não pode ser muito longo
      if (card.back.length > 400) {
        return false;
      }
      
      return true;
    })
    .map(card => ({
      front: card.front.trim(),
      back: card.back.trim(),
      tags: card.tags?.filter(tag => tag.trim()).map(tag => tag.trim()) || [],
    }));
}

/**
 * Valida se o texto extraído do PDF é suficiente
 */
export function validatePdfText(text) {
  const cleanText = text.trim();
  
  if (cleanText.length < 800) {
    return {
      valid: false,
      error: "PDF escaneado ou com texto insuficiente. Mínimo: 800 caracteres.",
    };
  }
  
  // Verifica se não é só caracteres especiais/lixo
  const alphanumericRatio = (cleanText.match(/[a-zA-Z0-9]/g) || []).length / cleanText.length;
  
  if (alphanumericRatio < 0.5) {
    return {
      valid: false,
      error: "PDF contém pouco texto legível. Pode ser um PDF escaneado.",
    };
  }
  
  return { valid: true };
}
