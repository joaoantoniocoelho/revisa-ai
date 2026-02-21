import mongoose, { type Model } from 'mongoose';

const WEBHOOK_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

export interface IWebhookEventDoc {
  _id: mongoose.Types.ObjectId;
  gateway: 'mercadopago';
  eventId: string;
  eventType: string;
  externalReference: string;
  payload: Record<string, unknown>;
  processed: boolean;
  createdAt?: Date;
}

const webhookEventSchema = new mongoose.Schema<IWebhookEventDoc>(
  {
    gateway: {
      type: String,
      required: true,
      enum: ['mercadopago'],
    },
    eventId: {
      type: String,
      required: [true, 'eventId is required'],
      trim: true,
    },
    eventType: {
      type: String,
      required: [true, 'eventType is required'],
      trim: true,
    },
    externalReference: {
      type: String,
      required: [true, 'externalReference is required'],
      trim: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    processed: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

webhookEventSchema.index({ gateway: 1, eventId: 1 }, { unique: true });
webhookEventSchema.index({ externalReference: 1 });
webhookEventSchema.index({ createdAt: -1 });
webhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: WEBHOOK_TTL_SECONDS });

export const WebhookEventModel: Model<IWebhookEventDoc> =
  mongoose.models.WebhookEvent ??
  mongoose.model<IWebhookEventDoc>('WebhookEvent', webhookEventSchema);
