import { ZodError } from 'zod';

import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../shared/errors/app-error.js';

export function errorHandlerMiddleware(error, req, res, _next) {
  const normalizedError =
    error instanceof AppError
      ? error
      : error instanceof ZodError
        ? AppError.badRequest('Request validation failed', { issues: error.flatten() })
        : new AppError({ message: 'An unexpected error occurred' });

  logger.error(
    {
      err: error,
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
    },
    'Request processing failed',
  );

  res.status(normalizedError.statusCode).json({
    status: 'error',
    code: normalizedError.code,
    message: normalizedError.message,
    details: normalizedError.details,
    requestId: req.id,
    ...(env.NODE_ENV !== 'production' && error instanceof Error ? { stack: error.stack } : {}),
  });
}
