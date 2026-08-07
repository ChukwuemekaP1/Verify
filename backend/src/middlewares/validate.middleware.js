import { ZodError } from 'zod';

import { AppError } from '../shared/errors/app-error.js';

function safeAssign(req, key, value) {
  try {
    Object.defineProperty(req, key, {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } catch (_err) {
    try {
      req[key] = value;
    } catch (_err2) {
      req[`_validated_${key}`] = value;
    }
  }
}

export function validate(schema) {
  return function validationMiddleware(req, _res, next) {
    try {
      const parsed = schema.parse({
        body: req.body ?? {},
        query: req.query ?? {},
        params: req.params ?? {},
      });

      safeAssign(req, 'body', parsed.body);
      safeAssign(req, 'query', parsed.query);
      safeAssign(req, 'params', parsed.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          AppError.badRequest('Request validation failed', {
            issues: error.flatten(),
          }),
        );
        return;
      }

      next(error);
    }
  };
}
