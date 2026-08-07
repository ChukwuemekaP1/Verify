import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { env } from './config/env.js';
import { configureCloudinary } from './shared/services/cloudinary.service.js';
import { terminateOcrWorker } from './shared/services/ocr.service.js';
import { errorHandlerMiddleware } from './middlewares/error-handler.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { requestLogger } from './middlewares/request-logger.middleware.js';
import { apiRouter } from './routes/index.js';
import { logger } from './config/logger.js';

function resolveAllowedOrigins() {
  return env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
}

export function createApp() {
  const app = express();

  configureCloudinary();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(requestLogger);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: resolveAllowedOrigins(),
      credentials: true,
    }),
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: env.REQUEST_SIZE_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: env.REQUEST_SIZE_LIMIT }));

  app.get('/', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'veriflow-backend',
      version: '1.0.0',
      apiPrefix: env.API_PREFIX,
      features: {
        ocr: true,
        qr: true,
        cloudinary: true,
        auditLogs: true,
        analytics: true,
      },
    });
  });

  app.use(env.API_PREFIX, apiRouter);
  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, cleaning up');
    await terminateOcrWorker();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    logger.info('SIGINT received, cleaning up');
    await terminateOcrWorker();
    process.exit(0);
  });

  return app;
}
