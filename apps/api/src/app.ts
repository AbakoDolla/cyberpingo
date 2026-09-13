import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { API_PREFIX } from './config/constants';
import { env } from './config/env';
import { errorHandler } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/not-found.middleware';
import { apiRateLimiter } from './middlewares/rate-limit.middleware';
import { v1Router } from './routes';

/**
 * Builds the Express application.
 *
 * Kept separate from `server.ts` so that tests can mount the app without
 * opening a TCP port.
 */
export const createApp = (): Express => {
  const app = express();

  // Security headers first, then CORS, then body parsing.
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  }

  app.use(API_PREFIX, apiRateLimiter, v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
