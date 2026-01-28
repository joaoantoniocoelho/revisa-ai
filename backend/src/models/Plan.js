import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['free', 'paid'],
  },
  displayName: {
    type: String,
    required: true,
  },
  limits: {
    pdfsPerMonth: {
      type: Number,
      required: true,
    },
    allowedDensities: [{
      type: String,
      enum: ['low', 'medium', 'high'],
    }],
    maxCardsPerDeck: {
      type: Number,
      default: null, // null = unlimited
    },
  },
  features: [{
    type: String,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const Plan = mongoose.model('Plan', planSchema);

export default Plan;
