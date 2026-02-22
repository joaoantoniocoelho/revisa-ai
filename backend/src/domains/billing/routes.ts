import { Router } from 'express';
import { body } from 'express-validator';
import { BillingController } from './controllers/BillingController.js';
import { createAuthenticate } from '../../shared/middlewares/auth.js';

export function createBillingRouter(): Router {
  const router = Router();
  const billingController = new BillingController();
  const authenticate = createAuthenticate();

  router.get('/packages', billingController.listPackages);

  router.post(
    '/checkout',
    authenticate,
    body('packageCode').trim().notEmpty().withMessage('packageCode is required'),
    billingController.checkout
  );

  router.post('/webhooks/mercadopago', billingController.handleWebhook);

  return router;
}
