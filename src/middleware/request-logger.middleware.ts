import crypto from 'crypto';
import { RequestHandler } from 'express';
import { logger } from '../shared/logger';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();
  req.requestId = crypto.randomUUID();

  res.setHeader('X-Request-Id', req.requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const logPayload = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
      userRole: req.user?.role
    };

    if (res.statusCode >= 500) {
      logger.error('Request failed', logPayload);
      return;
    }
    if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', logPayload);
      return;
    }
    logger.info('Request completed', logPayload);
  });

  next();
};
