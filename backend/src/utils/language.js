/**
 * Detecta o idioma do texto (simples heurística)
 */
export function detectLanguage(text) {
  const sample = text.slice(0, 1000).toLowerCase();
  
  // Palavras comuns em português
  const ptWords = ["que", "não", "como", "para", "uma", "dos", "pela", "são", "está", "português"];
  const ptCount = ptWords.filter(word => sample.includes(word)).length;
  
  // Palavras comuns em espanhol
  const esWords = ["que", "por", "como", "para", "una", "del", "los", "las", "está", "español"];
  const esCount = esWords.filter(word => sample.includes(word)).length;
  
  // Palavras comuns em inglês
  const enWords = ["the", "and", "for", "are", "but", "not", "you", "with", "this", "from"];
  const enCount = enWords.filter(word => sample.includes(word)).length;
  
  // Caracteres específicos do português
  const hasPortugueseChars = /[àáâãçéêíóôõú]/i.test(sample);
  
  if (hasPortugueseChars || ptCount > esCount && ptCount > enCount) {
    return "pt-BR";
  }
  
  if (esCount > enCount) {
    return "es";
  }
  
  return "en";
}
