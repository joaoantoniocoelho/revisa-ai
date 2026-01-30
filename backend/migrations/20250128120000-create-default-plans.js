/**
 * Migration: cria os planos padrão (free e paid) se a coleção estiver vazia.
 * Idempotente: não insere se já existir algum plano.
 */

const DEFAULT_PLANS = [
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
    createdAt: new Date(),
    updatedAt: new Date(),
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
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default {
  async up(db) {
    const count = await db.collection('plans').countDocuments();
    if (count > 0) {
      console.log('Plans collection already has documents, skipping seed.');
      return;
    }
    await db.collection('plans').insertMany(DEFAULT_PLANS);
    console.log('Default plans (free, paid) created.');
  },

  async down(db) {
    await db.collection('plans').deleteMany({
      name: { $in: ['free', 'paid'] },
    });
    console.log('Default plans removed.');
  },
};
