import mongoose from 'mongoose';
import { PaymentModel, type IPaymentDoc, type IPixData, type PaymentStatus } from '../models/Payment.js';
import { UserModel } from '../../auth/models/User.js';

export type CreatePaymentInput = Omit<IPaymentDoc, '_id' | 'createdAt' | 'updatedAt'>;

const TERMINAL: ReadonlySet<PaymentStatus> = new Set(['approved', 'canceled', 'rejected']);

export class PaymentRepository {
  async create(data: CreatePaymentInput): Promise<IPaymentDoc> {
    const payment = await PaymentModel.create(data);
    return payment;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<IPaymentDoc | null> {
    return (await PaymentModel.findOne({ idempotencyKey })) ?? null;
  }

  async findByGatewayAndExternalId(
    gateway: 'mercadopago',
    externalId: string
  ): Promise<IPaymentDoc | null> {
    return (await PaymentModel.findOne({ gateway, externalReference: externalId })) ?? null;
  }

  async linkGatewayPayment(id: string, externalReference: string, pixData: IPixData): Promise<void> {
    await PaymentModel.updateOne(
      { _id: id },
      {
        $set: {
          externalReference,
          pixData,
          status: 'pending',
        },
        $unset: { gatewayError: '' },
      }
    );
  }

  async markGatewayError(id: string, errorMessage: string): Promise<void> {
    await PaymentModel.updateOne(
      { _id: id, status: { $nin: [...TERMINAL] } },
      { $set: { status: 'gateway_error', gatewayError: errorMessage } }
    );
  }

  async updateStatus(
    gateway: 'mercadopago',
    externalReference: string,
    status: PaymentStatus
  ): Promise<void> {
  
    await PaymentModel.updateOne(
      {
        gateway,
        externalReference,
        status: { $nin: ['approved', 'rejected', 'canceled'] },
      },
      {
        $set: { status },
        ...(status === 'approved' ? { paidAt: new Date() } : {}),
      }
    );
  }

  async applyCredits(gateway: 'mercadopago', externalReference: string): Promise<IPaymentDoc | null> {
    const session = await mongoose.startSession();
    let result: IPaymentDoc | null = null;

    await session.withTransaction(async () => {
      const payment = await PaymentModel.findOne(
        { gateway, externalReference },
        null,
        { session }
      );

      if (!payment || payment.creditsApplied) return;

      await UserModel.findByIdAndUpdate(
        payment.userId,
        { $inc: { credits: payment.creditsToAdd } },
        { session }
      );

      result = await PaymentModel.findByIdAndUpdate(
        payment._id,
        { $set: { creditsApplied: true, creditedAt: new Date() } },
        { new: true, session }
      );
    });

    await session.endSession();
    return result;
  }
}