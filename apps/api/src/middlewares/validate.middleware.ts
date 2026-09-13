import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { AnyZodObject } from 'zod';

/**
 * Validates `body`, `query` and `params` against a Zod schema before the
 * request reaches a controller. Invalid input never reaches the services.
 */
export const validate =
  (schema: AnyZodObject): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      next(result.error);
      return;
    }

    next();
  };
