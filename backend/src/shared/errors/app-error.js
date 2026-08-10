export class AppError extends Error {
  constructor({ message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null }) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details = null) {
    return new AppError({ message, statusCode: 400, code: 'BAD_REQUEST', details });
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError({ message, statusCode: 401, code: 'UNAUTHORIZED' });
  }

  static forbidden(message = 'Forbidden') {
    return new AppError({ message, statusCode: 403, code: 'FORBIDDEN' });
  }

  static notFound(message = 'Resource not found') {
    return new AppError({ message, statusCode: 404, code: 'NOT_FOUND' });
  }

  static notImplemented(message = 'This operation has not been implemented yet') {
    return new AppError({ message, statusCode: 501, code: 'NOT_IMPLEMENTED' });
  }
}
