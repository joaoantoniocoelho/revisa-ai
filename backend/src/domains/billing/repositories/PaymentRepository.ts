import mongoose from "mongoose";
import { PaymentModel, type IPaymentDoc, type PaymentStatus, PAYMENT_STATUS_ORDER } from "../models/Payment.js";
import { UserModel } from "../../auth/models/User.js";

export class PaymentRepository {
    async create(data: IPaymentDoc): Promise<IPaymentDoc> {
        const payment = await PaymentModel.create(data);
        return payment as unknown as IPaymentDoc;
    }

    async findByGatewayAndExternalId(gateway: string, externalId: string): Promise<IPaymentDoc | null> {
        const doc = await PaymentModel.findOne({ gateway, externalReference: externalId });
        return doc ?? null;
    }

    async updateStatus(id: string, status: PaymentStatus): Promise<IPaymentDoc | null> {
        const incomingOrder = PAYMENT_STATUS_ORDER[status];
        const allowedCurrentStatuses = (Object.keys(PAYMENT_STATUS_ORDER) as PaymentStatus[]).filter(
            (s) => PAYMENT_STATUS_ORDER[s] < incomingOrder
        );
        const doc = await PaymentModel.findOneAndUpdate(
            { _id: id, status: { $in: allowedCurrentStatuses } },
            { status },
            { new: true }
        );
        return doc ?? null;
    }

    async applyCredits(gateway: string, externalReference: string): Promise<IPaymentDoc | null> {
        const session = await mongoose.startSession();
        let result: IPaymentDoc | null = null;

        await session.withTransaction(async () => {
            const payment = await PaymentModel.findOne(
                { gateway, externalReference },
                null,
                { session }
            );

            if (!payment || payment.creditsApplied) {
                return;
            }

            await UserModel.findByIdAndUpdate(
                payment.userId,
                { $inc: { credits: payment.creditsToAdd } },
                { session }
            );

            result = await PaymentModel.findByIdAndUpdate(
                payment._id,
                { creditsApplied: true, creditedAt: new Date() },
                { new: true, session }
            );
        });

        await session.endSession();
        return result;
    }
}