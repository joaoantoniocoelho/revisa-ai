import pkg from 'anki-apkg-export';
const AnkiExport = pkg.default || pkg;

class ExportService {
  async exportToAnki(cards, deckName = 'PDF2Anki Import') {
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      throw new Error('Cards array is required and must not be empty');
    }

    // Cria deck Anki
    const apkg = new AnkiExport(deckName);

    // Adiciona cada card ao deck
    for (const card of cards) {
      if (!card.front || !card.back) {
        continue; // Pula cards inválidos
      }

      // Limpa HTML e caracteres especiais
      const front = this.cleanText(card.front);
      const back = this.cleanText(card.back);

      // Adiciona tags se existirem
      const tags = card.tags && card.tags.length > 0 
        ? card.tags.join(' ')
        : '';

      apkg.addCard(front, back, { tags });
    }

    // Gera o arquivo .apkg
    const zip = await apkg.save();

    return {
      buffer: zip,
      filename: this.sanitizeFilename(deckName),
    };
  }

  cleanText(text) {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  sanitizeFilename(name) {
    return name
      .replace(/[^a-z0-9_\-]/gi, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);
  }
}

export default new ExportService();
