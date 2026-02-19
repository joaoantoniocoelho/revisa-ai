import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type express from 'express';
import { beforeEach, beforeAll, afterAll, describe, expect, it } from 'vitest';

let mongoServer: MongoMemoryServer;
let app: express.Express;
let resetRateLimitStoresForTests: () => Promise<void>;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'integration-test-secret';
  process.env.FRONTEND_URLS = 'http://localhost:3000';
  process.env.BACKEND_URL = 'http://localhost:3001';
  process.env.AUTH_COOKIE_SAMESITE = 'lax';
  process.env.TRUST_PROXY = '1';

  const appMod = await import('../../src/app.ts');
  const rateLimitMod = await import('../../src/middlewares/rateLimit.ts');
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

describe('API integration', () => {
  it('GET /health returns 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body?.status).toBe('ok');
  });

  it('POST /api/auth/signup creates user and returns auth cookie', async () => {
    const payload = {
      name: 'Test User',
      email: 'test@example.com',
      password: '123456',
    };
    const response = await request(app).post('/api/auth/signup').send(payload);

    expect(response.status).toBe(201);
    expect(response.body?.user?.email).toBe(payload.email);
    expect(response.body?.user?.credits).toBe(10);

    const setCookie = response.headers['set-cookie'];
    expect(Array.isArray(setCookie)).toBe(true);
    expect((setCookie ?? []).join(';')).toContain('FAILtoken=');
  });

  it('POST /api/auth/login returns auth cookie', async () => {
    const payload = {
      name: 'Login User',
      email: 'login@example.com',
      password: '123456',
    };

    const signup = await request(app).post('/api/auth/signup').send(payload);
    expect(signup.status).toBe(201);

    const login = await request(app).post('/api/auth/login').send({
      email: payload.email,
      password: payload.password,
    });

    expect(login.status).toBe(200);
    const setCookie = login.headers['set-cookie'];
    expect(Array.isArray(setCookie)).toBe(true);
    expect((setCookie ?? []).join(';')).toContain('token=');
  });

  it('GET /api/auth/profile without cookie returns 401', async () => {
    const response = await request(app).get('/api/auth/profile');
    expect(response.status).toBe(401);
    expect(typeof response.body?.error).toBe('string');
  });

  it('GET /api/auth/profile with cookie returns 200 and correct user', async () => {
    const payload = {
      name: 'Profile User',
      email: 'profile@example.com',
      password: '123456',
    };

    const signup = await request(app).post('/api/auth/signup').send(payload);
    expect(signup.status).toBe(201);
    const cookie = signup.headers['set-cookie'];
    expect(Array.isArray(cookie)).toBe(true);

    const profile = await request(app)
      .get('/api/auth/profile')
      .set('Cookie', cookie ?? []);

    expect(profile.status).toBe(200);
    expect(profile.body?.user?.email).toBe(payload.email);
    expect(profile.body?.user?._id).toBeDefined();
  });

  it('POST /api/auth/signup rate-limits by IP after burst', async () => {
    let lastStatus = 0;

    for (let i = 0; i < 6; i += 1) {
      const response = await request(app)
        .post('/api/auth/signup')
        .set('X-Forwarded-For', '1.2.3.4')
        .send({
          name: `User ${i}`,
          email: `burst-${i}@example.com`,
          password: '123456',
        });
      lastStatus = response.status;
    }

    expect(lastStatus).toBe(429);

    const blocked = await request(app)
      .post('/api/auth/signup')
      .set('X-Forwarded-For', '1.2.3.4')
      .send({
        name: 'Blocked User',
        email: 'blocked@example.com',
        password: '123456',
      });
    expect(blocked.status).toBe(429);
    expect(blocked.body?.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(typeof blocked.body?.retryAfterSeconds).toBe('number');
    expect(blocked.headers['retry-after']).toBeDefined();
  });
});
