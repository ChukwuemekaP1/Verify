import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { AuthUser, UserRole } from '@/lib/api/contracts';
import { ApiError } from '@/lib/api/http-client';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  role: UserRole | null;
  hasRole: (...roles: UserRole[]) => boolean;
  isSuperAdmin: boolean;
  isInstitutionAdmin: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STALE_TIME = 5 * 60 * 1000;
const RETRY_DELAY = 1000;

const authQueryKey = ['auth', 'me'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const {
    data: meData,
    error,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: authQueryKey,
    queryFn: async () => {
      try {
        const response = await api.auth.me();
        return response.data?.user ?? null;
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) {
          try {
            const refreshResponse = await api.auth.refresh();
            return refreshResponse.data?.user ?? null;
          } catch {
            return null;
          }
        }
        throw err;
      }
    },
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.statusCode === 401) return false;
      return failureCount < 2;
    },
    retryDelay: RETRY_DELAY,
    staleTime: STALE_TIME,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const user = isError ? null : meData ?? null;
  const isAuthenticated = !!user;

  const loginMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      remember,
    }: {
      email: string;
      password: string;
      remember?: boolean;
    }) => {
      const response = await api.auth.login({ email, password, remember });
      return response.data?.user ?? null;
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(authQueryKey, userData);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await api.auth.logout();
      } catch {
        // Continue clearing local state even if the server call fails
      }
    },
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(authQueryKey, null);
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await api.auth.refresh();
      return response.data?.user ?? null;
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(authQueryKey, userData);
    },
    onError: () => {
      queryClient.setQueryData(authQueryKey, null);
    },
  });

  const login = useCallback(
    async (email: string, password: string, remember?: boolean) => {
      await loginMutation.mutateAsync({ email, password, remember });
    },
    [loginMutation],
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const refresh = useCallback(async () => {
    await refreshMutation.mutateAsync();
  }, [refreshMutation]);

  const refetchUser = useCallback(async () => {
    const result = await refetch();
    if (result.isError && result.error instanceof ApiError && result.error.statusCode !== 401) {
      throw result.error;
    }
  }, [refetch]);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(() => {
    const role = user?.role ?? null;
    return {
      user,
      isLoading,
      isAuthenticated,
      error,
      role,
      hasRole,
      isSuperAdmin: role === 'SUPER_ADMIN',
      isInstitutionAdmin: role === 'INSTITUTION_ADMIN',
      login,
      logout,
      refresh,
      refetchUser,
    };
  }, [user, isLoading, isAuthenticated, error, hasRole, login, logout, refresh, refetchUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

export function useRequireRole(...roles: UserRole[]): boolean {
  const { hasRole, isAuthenticated } = useAuth();
  return isAuthenticated && hasRole(...roles);
}

export function withAuth<TProps>(
  Component: React.ComponentType<TProps>,
): React.ComponentType<TProps> {
  return function AuthenticatedComponent(props: TProps) {
    const { isLoading, isAuthenticated } = useAuth();

    useEffect(() => {
      if (!isLoading && !isAuthenticated && typeof window !== 'undefined') {
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.assign(`/login?redirect=${returnTo}`);
      }
    }, [isLoading, isAuthenticated]);

    if (isLoading || !isAuthenticated) {
      return null;
    }

    return <Component {...props} />;
  };
}
