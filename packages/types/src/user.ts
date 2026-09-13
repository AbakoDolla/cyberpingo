import type { Id, IsoDateString } from './common.js';

/**
 * Public representation of a user.
 * `passwordHash` is intentionally absent: it must never leave the backend.
 */
export interface PublicUser {
  id: Id;
  username: string;
  email: string;
  avatar: string | null;
  xp: number;
  level: number;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthSession {
  user: PublicUser;
  accessToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
}
