import { randomUUID } from 'crypto';
import { PackageRepository } from '../repositories/PackageRepository.js';
import { PaymentRepository } from '../repositories/PaymentRepository.js';
import { createPixPayment, type MpPayment } from '../mercadopago/payments.js';
import { PackageNotFoundError, GatewayError } from '../errors.js';
import type { IPackageDoc } from '../models/Package.js';
import type { IPaymentDoc, IPixData } from '../models/Payment.js';
import type mongoose from 'mongoose';

export interface CheckoutInput {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  packageCode: string;
  checkoutId?: string;
}

export interface CheckoutResult {
  checkoutId: string;
  paymentId: mongoose.Types.ObjectId;
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
}

export class BillingService {
  constructor(
    private readonly packageRepository: PackageRepository,
    private readonly paymentRepository: PaymentRepository
  ) {}

  async checkout(input: CheckoutInput): Promise<CheckoutResult> {
    const { userId, userEmail, packageCode, checkoutId } = input;

    const pkg = await this.packageRepository.findByCode(packageCode);
    if (!pkg || !pkg.active) {
      throw new PackageNotFoundError();
    }

    const idempotencyKey = checkoutId ?? randomUUID();

    const { payment, cached } = await this.resolvePayment(userId, pkg, idempotencyKey);

    if (cached) {
      return {
        checkoutId: idempotencyKey,
        paymentId: payment._id,
        qrCode: payment.pixData!.qrCode,
        qrCodeBase64: payment.pixData!.qrCodeBase64,
        ticketUrl: payment.pixData!.ticketUrl,
      };
    }

    const mpPayment = await this.callGateway(payment, pkg, userEmail, idempotencyKey);
    const pixData = await this.linkPayment(payment, mpPayment);

    return {
      checkoutId: idempotencyKey,
      paymentId: payment._id,
      qrCode: pixData.qrCode,
      qrCodeBase64: pixData.qrCodeBase64,
      ticketUrl: pixData.ticketUrl,
    };
  }

  async listPackages() {
    return this.packageRepository.listActive();
  }

  private async resolvePayment(
    userId: mongoose.Types.ObjectId,
    pkg: IPackageDoc,
    idempotencyKey: string
  ): Promise<{ payment: IPaymentDoc; cached: boolean }> {
    const existing = await this.paymentRepository.findByIdempotencyKey(idempotencyKey);

    if (existing?.pixData) {
      return { payment: existing, cached: true };
    }

    const payment =
      existing ??
      (await this.paymentRepository.create({
        userId,
        packageCode: pkg.code,
        amountCents: pkg.priceCents,
        creditsToAdd: pkg.credits,
        gateway: 'mercadopago',
        idempotencyKey,
        status: 'pending',
        creditsApplied: false,
      }));

    return { payment, cached: false };
  }

  private async callGateway(
    payment: IPaymentDoc,
    pkg: IPackageDoc,
    userEmail: string,
    idempotencyKey: string
  ): Promise<MpPayment> {
    let mpPayment: MpPayment;

    try {
      mpPayment = await createPixPayment({
        totalAmountCents: pkg.priceCents,
        externalReference: payment._id.toString(),
        idempotencyKey,
        payerEmail: userEmail,
        description: pkg.name,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MP call failed';
      await this.paymentRepository.markGatewayError(payment._id.toString(), message);
      throw new GatewayError();
    }

    const pixData = mpPayment.point_of_interaction?.transaction_data;
    if (!mpPayment.id || !pixData?.qr_code) {
      await this.paymentRepository.markGatewayError(
        payment._id.toString(),
        'MP returned incomplete payment data'
      );
      throw new GatewayError('Payment gateway returned invalid data. Please try again.');
    }

    return mpPayment;
  }

  private async linkPayment(payment: IPaymentDoc, mpPayment: MpPayment): Promise<IPixData> {
    const txData = mpPayment.point_of_interaction?.transaction_data;

    if (!txData?.qr_code) {
      throw new GatewayError('Payment gateway returned invalid data. Please try again.');
    }

    const pixData: IPixData = {
      qrCode: txData.qr_code,
      qrCodeBase64: txData.qr_code_base64,
      ticketUrl: txData.ticket_url,
    };

    await this.paymentRepository.linkGatewayPayment(
      payment._id.toString(),
      String(mpPayment.id),
      pixData
    );

    return pixData;
  }
}
