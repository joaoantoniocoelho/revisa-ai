import Plan from '../models/Plan.js';

class PlanService {
  async initializePlans() {
    try {
      // Verifica se os planos já existem
      const existingPlans = await Plan.countDocuments();
      if (existingPlans > 0) {
        console.log('Plans already initialized');
        return;
      }

      // Cria os planos padrão
      const plans = [
        {
          name: 'free',
          displayName: 'Gratuito',
          limits: {
            pdfsPerMonth: 2,
            allowedDensities: ['low'],
            maxCardsPerDeck: null,
          },
          features: [
            '2 PDFs por mês',
            'Densidade baixa (~20 cards)',
            'Exportar para Anki',
            'Histórico de decks',
          ],
          isActive: true,
        },
        {
          name: 'paid',
          displayName: 'Pro',
          limits: {
            pdfsPerMonth: 20,
            allowedDensities: ['low', 'medium', 'high'],
            maxCardsPerDeck: null,
          },
          features: [
            '20 PDFs por mês',
            'Todas as densidades',
            'Exportar para Anki',
            'Histórico de decks',
            'Suporte prioritário',
          ],
          isActive: true,
        },
      ];

      await Plan.insertMany(plans);
      console.log('✅ Plans initialized successfully');
    } catch (error) {
      console.error('Error initializing plans:', error);
    }
  }

  async getPlanByName(planName) {
    return await Plan.findOne({ name: planName, isActive: true });
  }

  async getAllPlans() {
    return await Plan.find({ isActive: true });
  }
}

export default new PlanService();
