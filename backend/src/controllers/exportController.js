import exportService from '../services/exportService.js';
import deckRepository from '../repositories/deckRepository.js';

class ExportController {
  async exportCards(req, res) {
    try {
      const { cards, deckName = 'PDF2Anki Import' } = req.body;
      const user = req.user;

      // Valida que usuário está autenticado (já validado pelo middleware)
      if (!user) {
        return res.status(401).json({ error: 'Autenticação necessária para exportar' });
      }

      // Valida que há cards para exportar
      if (!cards || !Array.isArray(cards) || cards.length === 0) {
        return res.status(400).json({ error: 'Nenhum card para exportar' });
      }

      // Limites do plano já validados pelo middleware checkPlanLimits
      const result = await exportService.exportToAnki(cards, deckName);

      res.setHeader('Content-Type', 'application/apkg');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}.apkg"`);
      res.send(result.buffer);

    } catch (error) {
      console.error('Export cards error:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';

      return res.status(500).json({ 
        error: `Export failed: ${errorMessage}` 
      });
    }
  }

  async exportDeck(req, res) {
    try {
      const { deckId } = req.params;
      const userId = req.user._id;

      // Busca deck validando ownership (só retorna se pertencer ao usuário)
      const deck = await deckRepository.findByIdAndUserId(deckId, userId);
      
      if (!deck) {
        return res.status(404).json({ 
          error: 'Deck não encontrado ou você não tem permissão para acessá-lo' 
        });
      }

      // Limites do plano já validados pelo middleware checkPlanLimits

      const result = await exportService.exportToAnki(deck.cards, deck.name);

      res.setHeader('Content-Type', 'application/apkg');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}.apkg"`);
      res.send(result.buffer);

    } catch (error) {
      console.error('Export deck error:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';

      return res.status(500).json({ 
        error: `Export failed: ${errorMessage}` 
      });
    }
  }
}

export default new ExportController();
