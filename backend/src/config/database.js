import mongoose from 'mongoose';

import { env } from './env.js';
import { logger } from './logger.js';

mongoose.set('strictQuery', true);

const readyStateLabels = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export function getDatabaseStatus() {
  return {
    readyState: mongoose.connection.readyState,
    label: readyStateLabels[mongoose.connection.readyState] ?? 'unknown',
    databaseName: mongoose.connection.name || null,
    host: mongoose.connection.host || null,
  };
}

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const connection = await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  logger.info({ database: getDatabaseStatus() }, 'MongoDB connected');
  return connection;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
