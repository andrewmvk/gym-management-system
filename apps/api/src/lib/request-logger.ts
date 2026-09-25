import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import type {} from '@api/types/express';
import { logger } from '@api/lib/logger';

export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = randomUUID();
  const startedAt = performance.now();

  req.requestId = requestId;
  req.log = logger.child({ requestId });
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    req.log.info(
      {
        method: req.method,
        route: req.path,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      },
      'request completed',
    );
  });

  next();
};
