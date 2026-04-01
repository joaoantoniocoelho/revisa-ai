import mongoose, { type Model } from 'mongoose';
import type { PackageId } from '../../../shared/config/creditPackages.js';

export interface IPaymentDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  stripeCheckoutSessionId: string;
  packageId: PackageId;
  credits: number;
  amountBrl: number;
  status: 'pending' | 'credited' | 'failed';
  createdAt?: Date;
  updatedAt?: Date;
}

const paymentSchema = new mongoose.Schema<IPaymentDoc>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    stripeCheckoutSessionId: {
      type: String,
      required: true,
      unique: true,
    },
    packageId: {
      type: String,
      required: true,
      enum: ['starter', 'pro', 'max'],
    },
    credits: {
      type: Number,
      required: true,
    },
    amountBrl: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'credited', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export const PaymentModel: Model<IPaymentDoc> =
  mongoose.models.Payment ?? mongoose.model<IPaymentDoc>('Payment', paymentSchema);
