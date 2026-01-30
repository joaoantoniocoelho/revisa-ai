import mongoose, { type Model } from 'mongoose';
import type { PlanEntity } from '../types/index.js';

const planSchema = new mongoose.Schema<PlanEntity>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ['free', 'paid'],
    },
    displayName: { type: String, required: true },
    limits: {
      pdfsPerMonth: { type: Number, required: true },
      allowedDensities: [{ type: String, enum: ['low', 'medium', 'high'] }],
      maxCardsPerDeck: { type: Number, default: null },
    },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type IPlanDoc = PlanEntity & { _id: mongoose.Types.ObjectId };

export const PlanModel: Model<IPlanDoc> =
  mongoose.models.Plan ?? mongoose.model<IPlanDoc>('Plan', planSchema);
