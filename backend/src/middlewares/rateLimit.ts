import type { Request } from 'express';
import { rateLimit } from 'express-rate-limit';

interface CreateInMemoryRateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: Request) => string | null;
  message: string;
}

function getRetryAfterSeconds(req: Request, fallbackWindowMs: number): number {
  const withRate = req as Request & {
    rateLimit?: { resetTime?: Date | number };
  };
  const resetTime = withRate.rateLimit?.resetTime;
  if (!resetTime) return Math.max(1, Math.ceil(fallbackWindowMs / 1000));
  const resetMs =
    typeof resetTime === 'number' ? resetTime : resetTime.getTime();
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

function getClientIp(req: Request): string {
  return String(req.ip || req.socket.remoteAddress || '127.0.0.1')
    .trim()
    .toLowerCase();
}

export function ipKey(req: Request): string {
  return `ip:${getClientIp(req)}`;
}

export function userKey(req: Request): string | null {
  const userId = req.user?._id?.toString();
  return userId ? `user:${userId}` : null;
}

export function emailKeyFromBody(req: Request): string | null {
  const raw = (req.body as { email?: unknown } | undefined)?.email;
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (!email) return null;
  return `email:${email}`;
}

export function createInMemoryRateLimiter(
  options: CreateInMemoryRateLimiterOptions
) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !options.keyGenerator(req),
    keyGenerator: (req) => options.keyGenerator(req) ?? ipKey(req),
    handler: (req, res) => {
      const retryAfterSeconds = getRetryAfterSeconds(req, options.windowMs);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message,
        retryAfterSeconds,
      });
    },
  });
}
