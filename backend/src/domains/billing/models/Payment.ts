import mongoose, { type Model } from 'mongoose';

export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'canceled'
  | 'rejected'
  | 'gateway_error';

export interface IPixData {
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
}

export interface IPaymentDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  packageCode: string;
  amountCents: number;
  creditsToAdd: number;
  gateway: 'mercadopago';
  externalReference?: string;
  idempotencyKey: string;
  status: PaymentStatus;
  creditsApplied: boolean;
  gatewayError?: string;
  pixData?: IPixData;
  paidAt?: Date;
  creditedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const paymentSchema = new mongoose.Schema<IPaymentDoc>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'userId is required'],
      ref: 'User',
    },
    packageCode: {
      type: String,
      required: [true, 'packageCode is required'],
      trim: true,
    },
    amountCents: {
      type: Number,
      required: [true, 'amountCents is required'],
      min: [1, 'amountCents must be at least 1'],
    },
    creditsToAdd: {
      type: Number,
      required: [true, 'creditsToAdd is required'],
      min: [1, 'creditsToAdd must be at least 1'],
    },
    gateway: {
      type: String,
      required: true,
      enum: ['mercadopago'],
      default: 'mercadopago',
    },

    externalReference: {
      type: String,
      required: false,
      trim: true,
    },

    idempotencyKey: {
      type: String,
      required: [true, 'idempotencyKey is required'],
      trim: true,
    },

    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'canceled', 'rejected', 'gateway_error'] satisfies PaymentStatus[],
      default: 'pending',
    },

    creditsApplied: {
      type: Boolean,
      required: true,
      default: false,
    },

    gatewayError: {
      type: String,
      required: false,
    },

    pixData: {
      type: {
        qrCode: { type: String, required: true },
        qrCodeBase64: { type: String, required: false },
        ticketUrl: { type: String, required: false },
      },
      required: false,
      _id: false,
    },

    paidAt: { type: Date, required: false },
    creditedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

paymentSchema.index({ gateway: 1, externalReference: 1 }, { unique: true, sparse: true });

paymentSchema.index({ idempotencyKey: 1 }, { unique: true });

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, creditsApplied: 1 });

export const PaymentModel: Model<IPaymentDoc> =
  mongoose.models.Payment ?? mongoose.model<IPaymentDoc>('Payment', paymentSchema);