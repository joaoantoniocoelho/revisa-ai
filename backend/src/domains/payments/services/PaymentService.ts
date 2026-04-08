import Stripe from 'stripe';
import mongoose from 'mongoose';
import { CREDIT_PACKAGES, type PackageId } from '../../../shared/config/creditPackages.js';
import { PaymentModel } from '../models/Payment.js';
import { UserModel } from '../../auth/models/User.js';
import { logger } from '../../../shared/logger.js';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return secret;
}

function getFrontendUrl(): string {
  return (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  sessionId: string;
}

export class PaymentService {
  async createCheckoutSession(
    userId: string,
    packageId: PackageId
  ): Promise<CheckoutSessionResult> {
    const pkg = CREDIT_PACKAGES[packageId];
    const stripe = getStripe();
    const frontendUrl = getFrontendUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `${pkg.label} — ${pkg.credits} créditos`,
              description: `Adiciona ${pkg.credits} créditos à sua conta no Revisa Aí`,
            },
            unit_amount: pkg.amountBrl,
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/account`,
      client_reference_id: userId,
      metadata: {
        userId,
        packageId,
        credits: pkg.credits.toString(),
      },
    });

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }

    await PaymentModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      stripeCheckoutSessionId: session.id,
      packageId,
      credits: pkg.credits,
      amountBrl: pkg.amountBrl,
      status: 'pending',
    });

    logger.info({ event: 'checkout_session_created', userId, packageId, sessionId: session.id, credits: pkg.credits }, 'checkout_session_created');
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const stripe = getStripe();
    const webhookSecret = getWebhookSecret();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      logger.warn({ event: 'webhook_signature_invalid' }, 'webhook_signature_invalid');
      throw new Error('Invalid Stripe webhook signature');
    }

    const session = event.data.object as Stripe.Checkout.Session;
    logger.info({ event: 'webhook_received', eventType: event.type, sessionId: session.id }, 'webhook_received');

    if (event.type === 'checkout.session.expired') {
      await PaymentModel.findOneAndUpdate(
        { stripeCheckoutSessionId: session.id, status: 'pending' },
        { $set: { status: 'failed' } }
      );
      logger.info({ event: 'checkout_session_expired', sessionId: session.id }, 'checkout_session_expired');
      return;
    }

    if (event.type !== 'checkout.session.completed') return;

    // Atomic idempotency guard — only processes once even under retries
    const payment = await PaymentModel.findOneAndUpdate(
      { stripeCheckoutSessionId: session.id, status: { $ne: 'credited' } },
      { $set: { status: 'credited' } },
      { new: true }
    );

    if (!payment) {
      logger.info({ event: 'payment_already_credited', sessionId: session.id }, 'payment_already_credited');
      return;
    }

    await UserModel.findByIdAndUpdate(payment.userId, {
      $inc: { credits: payment.credits },
    });
    logger.info({ event: 'credits_applied_from_payment', userId: payment.userId.toString(), sessionId: session.id, credits: payment.credits, packageId: payment.packageId }, 'credits_applied_from_payment');
  }

  async getPaymentStatus(
    sessionId: string,
    userId: string
  ): Promise<{ status: string } | null> {
    const payment = await PaymentModel.findOne(
      {
        stripeCheckoutSessionId: sessionId,
        userId: new mongoose.Types.ObjectId(userId),
      },
      { status: 1 }
    ).lean();

    if (!payment) return null;

    return { status: payment.status };
  }
}
