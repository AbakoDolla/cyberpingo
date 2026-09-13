import { createApp } from './app';
import { API_PREFIX } from './config/constants';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`CyberPingo API listening on http://localhost:${env.PORT}${API_PREFIX}`);
});

const shutdown = (signal: string): void => {
  logger.info(`Received ${signal}, shutting down`);
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
