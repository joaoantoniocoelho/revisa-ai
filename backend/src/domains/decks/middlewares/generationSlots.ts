import type { Request, Response, NextFunction } from 'express';

/** Users with an active generation (1 per user) */
const activeUsers = new Set<string>();

export function createCheckGenerationSlots() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?._id?.toString();
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (activeUsers.has(userId)) {
      res.status(409).json({
        error: 'Generation already in progress',
        message:
          'You already have a PDF generation in progress. Wait for it to complete before starting a new one.',
      });
      return;
    }

    activeUsers.add(userId);
    req.releaseUserSlot = () => activeUsers.delete(userId);
    next();
  };
}
