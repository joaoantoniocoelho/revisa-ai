import { Router } from 'express';
import express from 'express';
import { PaymentController } from './controllers/PaymentController.js';
import { createAuthenticate } from '../../shared/middlewares/auth.js';
import { createInMemoryRateLimiter, userKey } from '../../shared/middlewares/rateLimit.js';

export function createPaymentsRouter(): Router {
  const router = Router();
  const controller = new PaymentController();
  const authenticate = createAuthenticate();

  const purchaseLimiter = createInMemoryRateLimiter({
    windowMs: 10 * 60 * 1000,
    maxRequests: 5,
    keyGenerator: userKey,
    message: 'Too many purchase attempts. Please try again later.',
  });

  router.get('/packages', controller.getPackages);
  router.post('/session', authenticate, purchaseLimiter, controller.createSession);
  router.get('/:sessionId/status', authenticate, controller.getStatus);

  return router;
}

export function createPaymentsWebhookRouter(): Router {
  const router = Router();
  const controller = new PaymentController();

  router.post('/', express.raw({ type: 'application/json' }), controller.handleWebhook);

  return router;
}
