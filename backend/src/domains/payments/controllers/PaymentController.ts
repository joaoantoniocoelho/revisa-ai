import type { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/PaymentService.js';
import { CREDIT_PACKAGES, type PackageId } from '../../../shared/config/creditPackages.js';

export class PaymentController {
  private readonly paymentService = new PaymentService();

  getPackages = (_req: Request, res: Response): void => {
    res.json({ packages: Object.values(CREDIT_PACKAGES) });
  };

  createSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { packageId } = req.body;
      if (!packageId || !(packageId in CREDIT_PACKAGES)) {
        res.status(400).json({
          error: 'Invalid packageId',
          validOptions: Object.keys(CREDIT_PACKAGES),
        });
        return;
      }

      const result = await this.paymentService.createCheckoutSession(
        user._id.toString(),
        packageId as PackageId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params;
      const result = await this.paymentService.getPaymentStatus(
        sessionId,
        user._id.toString()
      );

      if (!result) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const signature = req.headers['stripe-signature'];
      if (!signature || typeof signature !== 'string') {
        res.status(400).json({ error: 'Missing Stripe-Signature header' });
        return;
      }

      await this.paymentService.handleWebhook(req.body as Buffer, signature);
      res.json({ received: true });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid Stripe webhook signature') {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };
}
