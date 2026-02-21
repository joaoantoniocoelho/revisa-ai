import mongoose, { type Model, type Types } from 'mongoose';
import type { FlashcardEntity } from '../../../shared/types/index.js';
import type { DeckMetadata } from '../../../shared/types/index.js';
import type { Density } from '../../../shared/types/index.js';

interface IFlashcardSchema {
  front: string;
  back: string;
  tags?: string[];
}

export interface IDeckDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  pdfFileName: string;
  cards: FlashcardEntity[];
  density: Density;
  metadata?: DeckMetadata;
  createdAt?: Date;
  updatedAt?: Date;
}

const flashcardSchema = new mongoose.Schema<IFlashcardSchema>(
  {
    front: { type: String, required: true },
    back: { type: String, required: true },
    tags: [{ type: String, trim: true }],
  },
  { _id: false }
);

const deckSchema = new mongoose.Schema<IDeckDoc>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    pdfFileName: { type: String, required: true },
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
  },
  { timestamps: true }
);

deckSchema.index({ userId: 1, createdAt: -1 });

export const DeckModel: Model<IDeckDoc> =
  mongoose.models.Deck ?? mongoose.model<IDeckDoc>('Deck', deckSchema);
