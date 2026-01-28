import mongoose from 'mongoose';

const flashcardSchema = new mongoose.Schema({
  front: {
    type: String,
    required: true,
  },
  back: {
    type: String,
    required: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
}, { _id: false });

const deckSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  pdfFileName: {
    type: String,
    required: true,
  },
  cards: [flashcardSchema],
  density: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true,
  },
  metadata: {
    chunks: Number,
    model: String,
    language: String,
    totalGenerated: Number,
    afterDeduplication: Number,
    finalCount: Number,
  },
}, {
  timestamps: true,
});

// Índice composto para buscar decks por usuário ordenados por data
deckSchema.index({ userId: 1, createdAt: -1 });

const Deck = mongoose.model('Deck', deckSchema);

export default Deck;
