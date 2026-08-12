import { useEffect, type ReactNode } from 'react';
import { useRouter } from '@tanstack/react-router';

import { LoadingScreen } from '@/components/common/loading-screen';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/lib/api/contracts';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  roles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, user, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
      const redirect = currentPath && currentPath !== '/login'
        ? encodeURIComponent(currentPath)
        : undefined;
      const to = redirect ? `${redirectTo}?redirect=${redirect}` : redirectTo;
      router.navigate({ to: to as never });
      return;
    }

    if (roles && roles.length > 0 && user && !hasRole(...roles)) {
      router.navigate({ to: '/unauthorized' as never });
    }
  }, [isLoading, isAuthenticated, user, roles, hasRole, redirectTo, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoadingScreen />;
  }

  if (roles && roles.length > 0 && user && !hasRole(...roles)) {
    return null;
  }

  return <>{children}</>;
}

interface SuperAdminRouteProps {
  children: ReactNode;
}

export function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  return (
    <ProtectedRoute roles={['SUPER_ADMIN']}>
      {children}
    </ProtectedRoute>
  );
}

interface InstitutionAdminRouteProps {
  children: ReactNode;
}

export function InstitutionAdminRoute({ children }: InstitutionAdminRouteProps) {
  return (
    <ProtectedRoute roles={['INSTITUTION_ADMIN']}>
      {children}
    </ProtectedRoute>
  );
}

interface AnyAdminRouteProps {
  children: ReactNode;
}

export function AnyAdminRoute({ children }: AnyAdminRouteProps) {
  return (
    <ProtectedRoute roles={['SUPER_ADMIN', 'INSTITUTION_ADMIN']}>
      {children}
    </ProtectedRoute>
  );
}
