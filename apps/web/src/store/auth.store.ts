import type { PublicUser } from '@cyberpingo/types';
import { create } from 'zustand';

/**
 * Global authentication state.
 *
 * Only session-level data lives here. Feature data (courses, lessons, ...) is
 * fetched on demand through the services instead of being cached globally.
 */
interface AuthState {
  user: PublicUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setSession: (user: PublicUser, accessToken: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setSession: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
  clearSession: () => set({ user: null, accessToken: null, isAuthenticated: false }),
}));
