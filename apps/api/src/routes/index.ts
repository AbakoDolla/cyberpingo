import { Router } from 'express';

import { healthRouter } from '../modules/health/health.routes';

/**
 * Root router for API version 1.
 *
 * Feature routers (auth, users, courses, lessons, challenges, progress,
 * gamification) are mounted here as each module is implemented. The planned
 * contract lives in `docs/API.md`.
 */
export const v1Router: Router = Router();

v1Router.use('/health', healthRouter);
