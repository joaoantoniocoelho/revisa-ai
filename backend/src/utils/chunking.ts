/**
 * Split text into chunks of appropriate size for Gemini.
 */
export function chunkText(text: string, maxChunkSize = 6000): string[] {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (cleanText.length <= maxChunkSize) {
    return [cleanText];
  }
  const chunks: string[] = [];
  const sentences = cleanText.split(/[.!?]\s+/);
  let currentChunk = '';
  for (const sentence of sentences) {
    const potentialChunk = currentChunk ? `${currentChunk}. ${sentence}` : sentence;
    if (potentialChunk.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk + '.');
      currentChunk = sentence;
    } else {
      currentChunk = potentialChunk;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  return chunks.filter((chunk) => chunk.length > 100);
}
