import { DeckModel, type IDeckDoc } from '../models/Deck.js';
import type { DeckMetadata } from '../types/index.js';
import type { FlashcardEntity } from '../types/index.js';
import type { Density } from '../types/index.js';
import type { Types } from 'mongoose';

export interface CreateDeckInput {
  userId: Types.ObjectId;
  name: string;
  pdfFileName: string;
  cards: FlashcardEntity[];
  density: Density;
  metadata?: DeckMetadata;
}

export class DeckRepository {
  async create(data: CreateDeckInput): Promise<IDeckDoc> {
    const deck = new DeckModel(data);
    return (await deck.save()) as IDeckDoc;
  }

  async findByUserId(
    userId: Types.ObjectId,
    limit = 50,
    skip = 0
  ): Promise<IDeckDoc[]> {
    const list = await DeckModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .select('-cards')
      .lean()
      .exec();
    return list as IDeckDoc[];
  }

  async findById(deckId: string): Promise<IDeckDoc | null> {
    const doc = await DeckModel.findById(deckId).exec();
    return doc ?? null;
  }

  async findByIdAndUserId(
    deckId: string,
    userId: Types.ObjectId
  ): Promise<IDeckDoc | null> {
    const doc = await DeckModel.findOne({ _id: deckId, userId }).exec();
    return doc ?? null;
  }

  async countByUserId(userId: Types.ObjectId): Promise<number> {
    return DeckModel.countDocuments({ userId }).exec();
  }

  async delete(deckId: string, userId: Types.ObjectId): Promise<IDeckDoc | null> {
    const doc = await DeckModel.findOneAndDelete({ _id: deckId, userId }).exec();
    return doc ?? null;
  }

  async updateName(
    deckId: string,
    userId: Types.ObjectId,
    newName: string
  ): Promise<IDeckDoc | null> {
    const doc = await DeckModel.findOneAndUpdate(
      { _id: deckId, userId },
      { name: newName },
      { new: true, runValidators: true }
    ).exec();
    return doc ?? null;
  }
}
