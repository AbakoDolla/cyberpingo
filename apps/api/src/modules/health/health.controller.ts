import type { Request, Response } from 'express';

import { getHealthStatus } from './health.service';

/** Controllers stay thin: they only adapt HTTP to the service layer. */
export const healthCheck = (_req: Request, res: Response): void => {
  res.status(200).json(getHealthStatus());
};
