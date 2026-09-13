import { PrismaClient } from '@prisma/client';

import { env } from '../config/env';

/**
 * A single PrismaClient instance is reused across the process. In development
 * the instance is cached on `globalThis` so that hot reloads do not exhaust the
 * PostgreSQL connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction ? ['error'] : ['warn', 'error'],
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}
