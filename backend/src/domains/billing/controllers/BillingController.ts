import type { Request, Response } from 'express';
import { PackageRepository } from '../repositories/PackageRepository.js';
import { PaymentRepository } from '../repositories/PaymentRepository.js';
import { BillingService } from '../services/BillingService.js';
import { BillingError } from '../errors.js';

const billingService = new BillingService(
  new PackageRepository(),
  new PaymentRepository()
);

export class BillingController {
  checkout = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { packageCode, checkoutId } = req.body as {
      packageCode?: string;
      checkoutId?: string;
    };

    if (!packageCode) {
      res.status(400).json({ error: 'packageCode is required' });
      return;
    }

    try {
      const result = await billingService.checkout({
        userId: user._id,
        userEmail: user.email,
        packageCode,
        checkoutId,
      });

      const statusCode = checkoutId ? 200 : 201;
      res.status(statusCode).json(result);
    } catch (err) {
      if (err instanceof BillingError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      throw err;
    }
  };

  listPackages = async (_req: Request, res: Response): Promise<void> => {
    const packages = await billingService.listPackages();
    res.json({ packages });
  };

  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    throw new Error('Not implemented');
  };
}
