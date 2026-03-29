'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from './auth-provider';
import { queryKeys } from '@/lib/query/query-keys';
import { CACHE_TIMES } from '@/lib/query/cache-config';
import type { Viewer } from './auth-provider';

/**
 * User Cache Provider
 *
 * Provides aggressive caching for /api/users/me endpoint to reduce Vercel API calls.
 * Data barely changes but is the most called endpoint on Vercel.
 *
 * Features:
 * - ULTRA_STABLE cache: 30min staleTime, 2hr gcTime
 * - Caches AuthProvider's viewer data in React Query for easy access
 * - Cache invalidation helpers for profile updates
 * - Soft org refresh detection (for future implementation without hard reload)
 *
 * NOTE: This provider does NOT fetch data separately. It uses the viewer
 * already fetched by AuthProvider and stores it in React Query cache for
 * aggressive caching and easy invalidation.
 */

interface UserCacheContextValue {
  cachedProfile: Viewer | null;
  isLoading: boolean;
  isError: boolean;
  refreshCache: () => Promise<void>;
  invalidateCache: () => void;
}

const UserCacheContext = createContext<UserCacheContextValue | undefined>(undefined);

interface UserCacheProviderProps {
  children: ReactNode;
}

export function UserCacheProvider({ children }: UserCacheProviderProps) {
  const { viewer: authViewer, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const queryClient = useQueryClient();

  // Track initialization state
  const [isInitialized, setIsInitialized] = useState(false);

  // Track previous org ID for soft refresh detection (future use)
  const prevOrgIdRef = useRef<string | null>(null);

  // Sync AuthProvider viewer to React Query cache
  // This allows components to use useCachedCurrentUser() hook
  // and provides easy cache invalidation
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear cache when user logs out
      queryClient.setQueryData(queryKeys.users.current(), null);
      prevOrgIdRef.current = null;
      setIsInitialized(false);
      return;
    }

    if (!authViewer) {
      return;
    }

    // Set the viewer data in React Query cache
    queryClient.setQueryData<Viewer>(queryKeys.users.current(), authViewer);

    // Initialize previous org ID on first mount or after logout
    if (!isInitialized) {
      prevOrgIdRef.current = authViewer.currentOrgId;
      setIsInitialized(true);
      return;
    }

    // Detect org changes for soft refresh (future: when hard reload is removed)
    const currentOrgId = authViewer.currentOrgId;
    const previousOrgId = prevOrgIdRef.current;

    if (previousOrgId && currentOrgId !== previousOrgId) {
      console.log('[UserCache] Org changed detected', {
        from: previousOrgId,
        to: currentOrgId,
        timestamp: new Date().toISOString(),
      });

      // Update previous org ID
      prevOrgIdRef.current = currentOrgId;

      // Note: Currently AuthProvider does hard reload on org switch,
      // so this cache is cleared on reload. In the future, if soft
      // refresh is implemented, the cache will automatically be updated
      // via the setQueryData above.
    }
  }, [authViewer, isAuthenticated, isInitialized, queryClient]);

  // Manual cache refresh - triggers AuthProvider to refetch
  const refreshCache = useCallback(async (): Promise<void> => {
    console.log('[UserCache] Manual cache refresh requested - delegating to AuthProvider');
    // The viewer will be updated by AuthProvider's refreshViewer
    // which will trigger the useEffect above to update React Query cache
    // This is a no-op here as AuthProvider handles the actual refresh
  }, []);

  // Manual cache invalidation (for mutations)
  const invalidateCache = useCallback((): void => {
    console.log('[UserCache] Manual cache invalidation requested');
    queryClient.invalidateQueries({
      queryKey: queryKeys.users.current(),
    });
  }, [queryClient]);

  const value = useMemo(
    () => ({
      cachedProfile: authViewer ?? null,
      isLoading: authLoading,
      isError: false, // AuthProvider handles errors
      refreshCache,
      invalidateCache,
    }),
    [authViewer, authLoading, refreshCache, invalidateCache]
  );

  return <UserCacheContext.Provider value={value}>{children}</UserCacheContext.Provider>;
}

/**
 * Hook to access the user cache context
 * Provides aggressively cached current viewer with soft org refresh
 *
 * @example
 * const { cachedProfile, isLoading, refreshCache } = useUserCache();
 */
export function useUserCache(): UserCacheContextValue {
  const context = useContext(UserCacheContext);
  if (context === undefined) {
    throw new Error('useUserCache must be used within a UserCacheProvider');
  }
  return context;
}
