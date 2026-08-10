import { createServer } from 'node:http';

import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { AuthRepository } from './modules/auth/auth.repository.js';
import { AuthService } from './modules/auth/auth.service.js';
import { runSeed } from './seed.js';

const app = createApp();
const server = createServer(app);

async function runSeeds() {
  try {
    await runSeed();
  } catch (error) {
    logger.warn({ err: error }, 'Failed to run seed');
  }
}

async function startServer() {
  try {
    await connectDatabase();
    await runSeeds();
  } catch (error) {
    logger.warn({ err: error }, 'MongoDB connection failed. Starting API in degraded mode.');
  }

  server.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        apiPrefix: env.API_PREFIX,
        clientOrigin: env.CLIENT_ORIGIN,
        environment: env.NODE_ENV,
      },
      'Backend server started',
    );
  });
}

async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down backend server');

  server.close(async (serverError) => {
    if (serverError) {
      logger.error({ err: serverError }, 'HTTP server shutdown failed');
      process.exit(1);
    }

    await disconnectDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('unhandledRejection', (error) => {
  logger.error({ err: error }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});

void startServer();
