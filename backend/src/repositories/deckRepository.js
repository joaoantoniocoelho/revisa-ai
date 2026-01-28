import Deck from '../models/Deck.js';

class DeckRepository {
  async create(deckData) {
    const deck = new Deck(deckData);
    return await deck.save();
  }

  async findByUserId(userId, limit = 50, skip = 0) {
    return await Deck.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .select('-cards'); // Não retorna os cards na listagem
  }

  async findById(deckId) {
    return await Deck.findById(deckId);
  }

  async findByIdAndUserId(deckId, userId) {
    return await Deck.findOne({ _id: deckId, userId });
  }

  async countByUserId(userId) {
    return await Deck.countDocuments({ userId });
  }

  async delete(deckId, userId) {
    return await Deck.findOneAndDelete({ _id: deckId, userId });
  }

  async updateName(deckId, userId, newName) {
    return await Deck.findOneAndUpdate(
      { _id: deckId, userId },
      { name: newName },
      { new: true, runValidators: true }
    );
  }
}

export default new DeckRepository();
