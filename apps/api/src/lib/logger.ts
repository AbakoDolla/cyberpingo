import { env } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const shouldLog = (level: LogLevel): boolean => {
  if (env.isTest) return level === 'error';
  if (env.isProduction) return level !== 'debug';
  return true;
};

/**
 * Minimal structured logger.
 *
 * Never pass secrets, passwords, tokens or raw request bodies to these helpers:
 * everything given here may end up in persistent log storage.
 */
export const logger = {
  debug: (message: string, meta?: Record<string, unknown>): void => {
    if (shouldLog('debug')) console.debug(`[debug] ${message}`, meta ?? '');
  },
  info: (message: string, meta?: Record<string, unknown>): void => {
    if (shouldLog('info')) console.info(`[info] ${message}`, meta ?? '');
  },
  warn: (message: string, meta?: Record<string, unknown>): void => {
    if (shouldLog('warn')) console.warn(`[warn] ${message}`, meta ?? '');
  },
  error: (message: string, meta?: Record<string, unknown>): void => {
    if (shouldLog('error')) console.error(`[error] ${message}`, meta ?? '');
  },
};
