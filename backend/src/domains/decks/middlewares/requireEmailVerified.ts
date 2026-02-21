import type { Request, Response, NextFunction } from 'express';

/**
 * Use after authenticate. Returns 403 if user has not verified their email.
 */
export function requireEmailVerified(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (req.user.emailVerified !== true) {
    res.status(403).json({
      error: 'Confirme seu email para gerar decks.',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }
  next();
}
