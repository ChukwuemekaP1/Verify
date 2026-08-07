import { AppError } from '../shared/errors/app-error.js';

export function notFoundMiddleware(req, _res, next) {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} was not found`));
}
