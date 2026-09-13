import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { logger } from '../lib/logger';
import { HttpError } from '../utils/http-error';
import { env } from '../config/env';

/**
 * Centralised error handler. It is the single place that converts an internal
 * failure into an API response, so stack traces and driver messages never leak.
 */
export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  // Express identifies error middlewares by their four-argument signature.
  _next: NextFunction,
): void => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.issues,
      },
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  logger.error('Unhandled error', {
    message: error instanceof Error ? error.message : 'unknown error',
    ...(env.isProduction ? {} : { stack: error instanceof Error ? error.stack : undefined }),
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    },
  });
};
