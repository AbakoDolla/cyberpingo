import type { Request, Response, NextFunction } from 'express';

import { verifyToken } from '../utils/jwt';
import { HttpError } from '../utils/http-error';

/**
 * Guards protected endpoints. It only verifies the access token and attaches
 * the authenticated identity; authorization rules belong to the services.
 */
export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    next(HttpError.unauthorized('Missing bearer token'));
    return;
  }

  try {
    const payload = verifyToken('access', header.slice('Bearer '.length));
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch {
    // The underlying JWT error is deliberately not exposed to the client.
    next(HttpError.unauthorized('Invalid or expired token'));
  }
};
