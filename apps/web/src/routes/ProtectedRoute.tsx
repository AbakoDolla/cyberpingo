import { Navigate, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';

import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactElement;
}

/**
 * Gate for routes that require an authenticated session.
 *
 * The real session lifecycle (token refresh, hydration) is implemented with the
 * authentication feature; the guard itself belongs to the foundation.
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps): ReactElement => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};
