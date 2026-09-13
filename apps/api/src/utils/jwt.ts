import jwt from 'jsonwebtoken';

import { env } from '../config/env';

export interface TokenPayload {
  sub: string;
  username: string;
}

type TokenKind = 'access' | 'refresh';

const secretFor = (kind: TokenKind): string =>
  kind === 'access' ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET;

const expiresInFor = (kind: TokenKind): string =>
  kind === 'access' ? env.JWT_ACCESS_EXPIRES_IN : env.JWT_REFRESH_EXPIRES_IN;

/** Signs a short-lived access token or a long-lived refresh token. */
export const signToken = (kind: TokenKind, payload: TokenPayload): string =>
  jwt.sign(payload, secretFor(kind), {
    expiresIn: expiresInFor(kind),
  } as jwt.SignOptions);

/** Verifies a token and returns its payload, or throws if invalid/expired. */
export const verifyToken = (kind: TokenKind, token: string): TokenPayload => {
  const decoded = jwt.verify(token, secretFor(kind));

  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new jwt.JsonWebTokenError('Malformed token payload');
  }

  return { sub: decoded.sub, username: String(decoded['username'] ?? '') };
};
