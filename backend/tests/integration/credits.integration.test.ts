import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PDFDocument } from 'pdf-lib';
import type express from 'express';
import { beforeEach, beforeAll, afterAll, describe, expect, it } from 'vitest';

let mongoServer: MongoMemoryServer;
let app: express.Express;
let resetRateLimitStoresForTests: () => Promise<void>;

async function makePdfBuffer(numPages: number): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < numPages; i += 1) pdf.addPage();
  return Buffer.from(await pdf.save());
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'integration-test-secret';
  process.env.FRONTEND_URLS = 'http://localhost:3000';
  process.env.BACKEND_URL = 'http://localhost:3001';
  process.env.AUTH_COOKIE_SAMESITE = 'lax';
  process.env.TRUST_PROXY = '1';

  const appMod = await import('../../src/app.ts');
  const rateLimitMod = await import('../../src/shared/middlewares/rateLimit.ts');
  app = appMod.createApp();
  resetRateLimitStoresForTests = rateLimitMod.resetRateLimitStoresForTests;

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    serverSelectionTimeoutMS: 5000,
  });
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
  await (resetRateLimitStoresForTests?.() ?? Promise.resolve());
});

describe('GET /api/credits/config', () => {
  it('returns tiered pricing config with expected shape and values', async () => {
    const res = await request(app).get('/api/credits/config');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      creditTiers: [
        { maxPages: 15, credits: 1 },
        { maxPages: 35, credits: 2 },
        { maxPages: 50, credits: 3 },
      ],
      minCreditsPerGeneration: 1,
      maxPdfPages: 50,
    });
  });

  it('returns creditTiers sorted ascending by maxPages', async () => {
    const res = await request(app).get('/api/credits/config');
    expect(res.status).toBe(200);
    const tiers: Array<{ maxPages: number; credits: number }> = res.body.creditTiers;
    const sorted = [...tiers].sort((a, b) => a.maxPages - b.maxPages);
    expect(tiers).toEqual(sorted);
  });

  it('does not expose legacy density multipliers', async () => {
    const res = await request(app).get('/api/credits/config');
    expect(res.body).not.toHaveProperty('densityMultipliers');
    expect(res.body).not.toHaveProperty('creditsPerPageBase');
  });
});

describe('POST /api/credits/estimate', () => {
  it('returns 400 when no PDF file is attached', async () => {
    const res = await request(app).post('/api/credits/estimate');
    expect(res.status).toBe(400);
    expect(typeof res.body?.error).toBe('string');
  });

  it('returns 400 when uploading a non-PDF file', async () => {
    const res = await request(app)
      .post('/api/credits/estimate')
      .attach('pdf', Buffer.from('not a pdf'), {
        filename: 'fake.txt',
        contentType: 'text/plain',
      });
    expect(res.status).toBe(400);
    expect(typeof res.body?.error).toBe('string');
  });

  it('returns 400 when PDF exceeds MAX_PDF_PAGES (50)', async () => {
    const buffer = await makePdfBuffer(51);
    const res = await request(app)
      .post('/api/credits/estimate')
      .attach('pdf', buffer, { filename: 'big.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body?.error).toMatch(/at most 50 pages/);
  });

  const tierCases: Array<[number, number]> = [
    [1, 1],
    [15, 1],
    [16, 2],
    [35, 2],
    [36, 3],
    [50, 3],
  ];

  for (const [numPages, expectedCredits] of tierCases) {
    it(`returns ${expectedCredits} credit(s) for a ${numPages}-page PDF`, async () => {
      const buffer = await makePdfBuffer(numPages);
      const res = await request(app)
        .post('/api/credits/estimate')
        .attach('pdf', buffer, { filename: 'doc.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ numPages, creditsRequired: expectedCredits });
    });
  }

  it('ignores density sent in body and does not echo it in response', async () => {
    const buffer = await makePdfBuffer(20);
    const res = await request(app)
      .post('/api/credits/estimate')
      .field('density', 'high')
      .attach('pdf', buffer, { filename: 'doc.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ numPages: 20, creditsRequired: 2 });
    expect(res.body).not.toHaveProperty('density');
  });
});
