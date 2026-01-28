/**
 * Divide texto em chunks de tamanho apropriado para o Gemini
 */
export function chunkText(text, maxChunkSize = 6000) {
  // Remove múltiplos espaços e quebras de linha
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (cleanText.length <= maxChunkSize) {
    return [cleanText];
  }

  const chunks = [];
  const sentences = cleanText.split(/[.!?]\s+/);
  
  let currentChunk = "";
  
  for (const sentence of sentences) {
    const potentialChunk = currentChunk 
      ? `${currentChunk}. ${sentence}`
      : sentence;
    
    if (potentialChunk.length > maxChunkSize && currentChunk) {
      // Salva chunk atual e começa novo
      chunks.push(currentChunk + ".");
      currentChunk = sentence;
    } else {
      currentChunk = potentialChunk;
    }
  }
  
  // Adiciona último chunk
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks.filter(chunk => chunk.length > 100); // Remove chunks muito pequenos
}
