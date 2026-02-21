import mongoose, { type Model } from 'mongoose';

export type PaymentStatus = 'pending' | 'approved' | 'canceled' | 'rejected';

export const PAYMENT_STATUS_ORDER: Record<PaymentStatus, number> = {
  pending: 0,
  approved: 1,
  canceled: 1,
  rejected: 1,
};

export interface IPaymentDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  packageCode: string;
  amountCents: number;
  creditsToAdd: number;
  gateway: 'mercadopago';
  externalReference: string;
  status: PaymentStatus;
  creditsApplied: boolean;
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
      required: [true, 'externalReference is required'],
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'canceled', 'rejected'] satisfies PaymentStatus[],
      default: 'pending',
    },
    creditsApplied: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
      required: false,
    },
    creditedAt: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ gateway: 1, externalReference: 1 }, { unique: true });
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, creditsApplied: 1 });

export const PaymentModel: Model<IPaymentDoc> =
  mongoose.models.Payment ?? mongoose.model<IPaymentDoc>('Payment', paymentSchema);
