import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  req.requestId = requestId;
  req.log = logger.child({ requestId });

  const startMs = Date.now();
  const userId = req.user?._id?.toString();

  req.log.info(
    { event: 'request_started', method: req.method, route: req.path, userId },
    'request_started'
  );

  res.on('finish', () => {
    const durationMs = Date.now() - startMs;
    const resolvedUserId = req.user?._id?.toString();
    const statusCode = res.statusCode;

    if (statusCode >= 500) {
      req.log!.error(
        {
          event: 'request_failed',
          method: req.method,
          route: req.path,
          statusCode,
          durationMs,
          userId: resolvedUserId,
        },
        'request_failed'
      );
    } else {
      req.log!.info(
        {
          event: 'request_completed',
          method: req.method,
          route: req.path,
          statusCode,
          durationMs,
          userId: resolvedUserId,
        },
        'request_completed'
      );
    }
  });

  next();
}
