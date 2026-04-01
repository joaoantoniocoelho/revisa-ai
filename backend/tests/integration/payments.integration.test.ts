import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type express from 'express';
import { beforeEach, beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { PaymentModel } from '../../src/domains/payments/models/Payment.js';
import { UserModel } from '../../src/domains/auth/models/User.js';
import { CREDIT_PACKAGES } from '../../src/shared/config/creditPackages.js';

// vi.hoisted ensures these are available before vi.mock factory executes
const mockCheckoutCreate = vi.hoisted(() => vi.fn());
const mockConstructEvent = vi.hoisted(() => vi.fn());

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCheckoutCreate } },
    webhooks: { constructEvent: mockConstructEvent },
  })),
}));

let mongoServer: MongoMemoryServer;
let app: express.Express;
let resetRateLimitStoresForTests: () => Promise<void>;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'integration-test-secret';
  process.env.FRONTEND_URLS = 'http://localhost:3000';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.BACKEND_URL = 'http://localhost:3001';
  process.env.AUTH_COOKIE_SAMESITE = 'lax';
  process.env.TRUST_PROXY = '1';
  process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder';

  const appMod = await import('../../src/app.ts');
  const rateLimitMod = await import('../../src/shared/middlewares/rateLimit.ts');
  app = appMod.createApp();
  resetRateLimitStoresForTests = rateLimitMod.resetRateLimitStoresForTests;

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { serverSelectionTimeoutMS: 5000 });
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  mockCheckoutCreate.mockReset();
  mockConstructEvent.mockReset();
  await (resetRateLimitStoresForTests?.() ?? Promise.resolve());
});

async function createAuthUser(email = 'user@example.com') {
  const res = await request(app).post('/api/auth/signup').send({
    name: 'Test User',
    email,
    password: '123456',
  });
  return {
    userId: res.body.user._id as string,
    cookie: res.headers['set-cookie'] as string[],
  };
}

describe('GET /api/payments/packages', () => {
  it('returns all packages without authentication', async () => {
    const res = await request(app).get('/api/payments/packages');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.packages)).toBe(true);
    expect(res.body.packages).toHaveLength(3);
    const ids = res.body.packages.map((p: { id: string }) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['starter', 'pro', 'max']));
  });
});

describe('POST /api/payments/session', () => {
  it('creates a pending Payment doc and returns checkoutUrl for valid package', async () => {
    const { userId, cookie } = await createAuthUser();
    mockCheckoutCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/pay/cs_test_abc123',
      id: 'cs_test_abc123',
    });

    const res = await request(app)
      .post('/api/payments/session')
      .set('Cookie', cookie)
      .send({ packageId: 'starter' });

    expect(res.status).toBe(200);
    expect(res.body.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_abc123');
    expect(res.body.sessionId).toBe('cs_test_abc123');

    const payment = await PaymentModel.findOne({
      stripeCheckoutSessionId: 'cs_test_abc123',
    }).lean();
    expect(payment).not.toBeNull();
    expect(payment!.status).toBe('pending');
    expect(payment!.credits).toBe(CREDIT_PACKAGES.starter.credits);
    expect(payment!.userId.toString()).toBe(userId);
  });

  it('returns 400 for an unrecognised packageId', async () => {
    const { cookie } = await createAuthUser();

    const res = await request(app)
      .post('/api/payments/session')
      .set('Cookie', cookie)
      .send({ packageId: 'nonexistent' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid packageId');
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post('/api/payments/session')
      .send({ packageId: 'starter' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/payments/:sessionId/status', () => {
  it("returns payment status for the authenticated user's own payment", async () => {
    const { userId, cookie } = await createAuthUser();

    await PaymentModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      stripeCheckoutSessionId: 'cs_status_test',
      packageId: 'pro',
      credits: CREDIT_PACKAGES.pro.credits,
      amountBrl: CREDIT_PACKAGES.pro.amountBrl,
      status: 'pending',
    });

    const res = await request(app)
      .get('/api/payments/cs_status_test/status')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
  });

  it('returns 404 for a non-existent sessionId', async () => {
    const { cookie } = await createAuthUser();

    const res = await request(app)
      .get('/api/payments/cs_does_not_exist/status')
      .set('Cookie', cookie);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Payment not found');
  });

  it('returns 404 when the sessionId belongs to another user', async () => {
    const { cookie: cookie1 } = await createAuthUser('user1@example.com');
    const { userId: userId2 } = await createAuthUser('user2@example.com');

    await PaymentModel.create({
      userId: new mongoose.Types.ObjectId(userId2),
      stripeCheckoutSessionId: 'cs_other_user',
      packageId: 'starter',
      credits: CREDIT_PACKAGES.starter.credits,
      amountBrl: CREDIT_PACKAGES.starter.amountBrl,
      status: 'pending',
    });

    const res = await request(app)
      .get('/api/payments/cs_other_user/status')
      .set('Cookie', cookie1);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/payments/webhook', () => {
  function makeWebhookBody(sessionId: string): Buffer {
    return Buffer.from(
      JSON.stringify({
        type: 'checkout.session.completed',
        data: { object: { id: sessionId } },
      })
    );
  }

  it('credits the user and marks payment as credited for a valid completed event', async () => {
    const { userId } = await createAuthUser();
    const sessionId = 'cs_webhook_happy';

    await PaymentModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      stripeCheckoutSessionId: sessionId,
      packageId: 'pro',
      credits: CREDIT_PACKAGES.pro.credits,
      amountBrl: CREDIT_PACKAGES.pro.amountBrl,
      status: 'pending',
    });

    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { id: sessionId } },
    });

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'test-sig')
      .send(makeWebhookBody(sessionId));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    const payment = await PaymentModel.findOne({ stripeCheckoutSessionId: sessionId }).lean();
    expect(payment!.status).toBe('credited');

    const user = await UserModel.findById(userId).lean();
    // DEFAULT_CREDITS_FOR_NEW_USER (10) + pro package credits (30) = 40
    expect(user!.credits).toBe(10 + CREDIT_PACKAGES.pro.credits);
  });

  it('returns 200 with no DB side effects for an unknown event type', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.created',
      data: { object: {} },
    });

    const paymentCountBefore = await PaymentModel.countDocuments();

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'test-sig')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(200);
    expect(await PaymentModel.countDocuments()).toBe(paymentCountBefore);
  });

  it('does not double-credit when the same event is delivered twice', async () => {
    const { userId } = await createAuthUser();
    const sessionId = 'cs_webhook_idempotent';

    await PaymentModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      stripeCheckoutSessionId: sessionId,
      packageId: 'starter',
      credits: CREDIT_PACKAGES.starter.credits,
      amountBrl: CREDIT_PACKAGES.starter.amountBrl,
      status: 'pending',
    });

    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { id: sessionId } },
    });

    const body = Buffer.from(
      JSON.stringify({
        type: 'checkout.session.completed',
        data: { object: { id: sessionId } },
      })
    );

    // First delivery
    await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'test-sig')
      .send(body);

    // Duplicate delivery (Stripe can retry)
    await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'test-sig')
      .send(body);

    const user = await UserModel.findById(userId).lean();
    // Credits added exactly once: 10 (default) + 10 (starter) = 20, NOT 30
    expect(user!.credits).toBe(10 + CREDIT_PACKAGES.starter.credits);
  });

  it('returns 400 for an invalid Stripe signature', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload');
    });

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'bad-sig')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid Stripe webhook signature');
  });

  it('returns 400 when the stripe-signature header is missing', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing Stripe-Signature header');
  });
}); // closes describe('POST /api/payments/webhook')
