import { randomUUID } from 'node:crypto';

import pinoHttp from 'pino-http';

import { logger } from '../config/logger.js';

export const requestLogger = pinoHttp({
  logger,
  quietReqLogger: true,
  genReqId(req, res) {
    const requestId = req.headers['x-request-id'] || randomUUID();
    res.setHeader('x-request-id', requestId);
    return requestId;
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.originalUrl} completed with ${res.statusCode}`;
  },
  customErrorMessage(req, res) {
    return `${req.method} ${req.originalUrl} failed with ${res.statusCode}`;
  },
});
