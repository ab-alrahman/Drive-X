import { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors';
import { logger } from '../shared/logger';

export const errorMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  const requestMeta = {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
    userRole: req.user?.role
  };

  if (err instanceof ZodError) {
    logger.warn('Validation error', {
      ...requestMeta,
      details: err.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    });
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request payload',
      details: err.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    });
  }

  if (err instanceof AppError) {
    logger.warn('Application error', {
      ...requestMeta,
      code: err.code,
      statusCode: err.statusCode,
      message: err.message,
      details: err.details
    });
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details
    });
  }

  if (err instanceof multer.MulterError || err.message?.includes('uploads are allowed')) {
    logger.warn('Upload error', {
      ...requestMeta,
      code: err.code,
      message: err.message
    });
    return res.status(400).json({
      code: 'UPLOAD_ERROR',
      message: err.code === 'LIMIT_FILE_SIZE' ? 'Image size must not exceed 5MB' : err.message
    });
  }

  logger.error('Unhandled server error', {
    ...requestMeta,
    error: err
  });

  return res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unexpected server error'
  });
};
