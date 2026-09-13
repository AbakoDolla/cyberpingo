/** Identity attached to the request by `requireAuth`. */
export interface AuthenticatedUser {
  id: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
