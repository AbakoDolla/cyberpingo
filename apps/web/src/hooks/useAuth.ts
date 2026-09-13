import { useAuthStore } from '@/store/auth.store';

/** Convenience hook exposing the authentication slice to components. */
export const useAuth = (): {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  isAuthenticated: boolean;
} => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return { user, isAuthenticated };
};
