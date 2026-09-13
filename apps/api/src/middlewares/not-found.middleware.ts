import type { Request, Response, NextFunction } from 'express';

import { HttpError } from '../utils/http-error';

/** Converts any unmatched route into a normalized 404 error. */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(HttpError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
};
