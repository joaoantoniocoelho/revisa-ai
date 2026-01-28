import deckService from '../services/deckService.js';

class DeckController {
  async generate(req, res) {
    try {
      const pdfFile = req.file;
      const density = req.body.density || 'medium';
      const userId = req.user._id;

      // Validações
      if (!pdfFile) {
        return res.status(400).json({ error: 'PDF file is required' });
      }

      if (!['low', 'medium', 'high'].includes(density)) {
        return res.status(400).json({ error: 'Invalid density value' });
      }

      const result = await deckService.generateFromPdf(userId, pdfFile, density);

      return res.json({
        message: 'Flashcards gerados com sucesso',
        deckId: result.deck._id,
        cards: result.cards,
        meta: result.meta,
      });

    } catch (error) {
      console.error('Error in generate:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';

      return res.status(500).json({ 
        error: `Server error: ${errorMessage}` 
      });
    }
  }

  async getDecks(req, res) {
    try {
      const userId = req.user._id;
      const limit = parseInt(req.query.limit) || 50;
      const skip = parseInt(req.query.skip) || 0;

      const result = await deckService.getUserDecks(userId, limit, skip);

      return res.json(result);

    } catch (error) {
      console.error('Error in getDecks:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  async getDeck(req, res) {
    try {
      const { deckId } = req.params;
      const userId = req.user._id;

      // getDeckById valida ownership - só retorna se pertencer ao usuário
      const deck = await deckService.getDeckById(deckId, userId);

      return res.json({ deck });

    } catch (error) {
      console.error('Error in getDeck:', error);
      return res.status(404).json({ 
        error: error.message || 'Deck não encontrado ou sem permissão' 
      });
    }
  }

  async deleteDeck(req, res) {
    try {
      const { deckId } = req.params;
      const userId = req.user._id;

      // deleteDeck valida ownership - só deleta se pertencer ao usuário
      await deckService.deleteDeck(deckId, userId);

      return res.json({ message: 'Deck deletado com sucesso' });

    } catch (error) {
      console.error('Error in deleteDeck:', error);
      return res.status(404).json({ 
        error: error.message || 'Deck não encontrado ou sem permissão' 
      });
    }
  }

  async updateDeck(req, res) {
    try {
      const { deckId } = req.params;
      const { name } = req.body;
      const userId = req.user._id;

      if (!name) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      // updateDeckName valida ownership - só atualiza se pertencer ao usuário
      const deck = await deckService.updateDeckName(deckId, userId, name);

      return res.json({ 
        message: 'Deck atualizado com sucesso',
        deck 
      });

    } catch (error) {
      console.error('Error in updateDeck:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 400;
      return res.status(statusCode).json({ 
        error: error.message || 'Erro ao atualizar deck' 
      });
    }
  }
}

export default new DeckController();
