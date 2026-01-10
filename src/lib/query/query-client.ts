import { QueryClient, isServer } from '@tanstack/react-query';
import { CACHE_TIMES } from './cache-config';

// SessionStorage key for org switch detection
const ORG_SWITCH_PENDING_KEY = 'jt-org-switch-pending';

/**
 * Create a new QueryClient with default options
 * 
 * Uses STANDARD cache tier as default for all queries.
 * Individual queries can override with specific tiers.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default to STANDARD tier
        staleTime: CACHE_TIMES.STANDARD.staleTime,
        gcTime: CACHE_TIMES.STANDARD.gcTime,

        // Don't retry on error in development
        retry: process.env.NODE_ENV === 'production' ? 3 : false,

        // Refetch on window focus (good for real-time feel)
        refetchOnWindowFocus: true,

        // Don't refetch on reconnect by default
        refetchOnReconnect: false,
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
      },
    },
  });
}

// Browser: reuse the same QueryClient instance
let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Get QueryClient instance
 * 
 * - Server: Always create new instance (no shared state between requests)
 * - Browser: Reuse singleton instance (shared cache)
 * 
 * IMPORTANT: On org switch, checks for pending flag and destroys old cache
 * to prevent cross-org data leakage.
 */
export function getQueryClient(): QueryClient {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Check if org switch is pending - destroy old client to prevent cross-org leakage
    if (typeof sessionStorage !== 'undefined') {
      const orgSwitchPending = sessionStorage.getItem(ORG_SWITCH_PENDING_KEY);
      if (orgSwitchPending) {
        sessionStorage.removeItem(ORG_SWITCH_PENDING_KEY);
        // Destroy existing client completely
        if (browserQueryClient) {
          browserQueryClient.clear();
          browserQueryClient = undefined;
        }
      }
    }
    
    // Browser: make a new query client if we don't already have one
    // This is important for SSR hydration
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}

/**
 * Destroy the QueryClient completely.
 * 
 * CRITICAL: Call this BEFORE org switch to guarantee no cross-org data leakage.
 * Unlike clearQueryCache(), this destroys the singleton instance entirely,
 * forcing a fresh QueryClient to be created on next getQueryClient() call.
 * 
 * This is more aggressive than clearQueryCache() and handles edge cases like:
 * - Browser back-forward cache (bfcache)
 * - Race conditions during page reload
 * - Stale data appearing briefly before refetch
 * 
 * @example
 * // In switchOrg function
 * destroyQueryClient();
 * window.location.href = '/dashboard';
 */
export function destroyQueryClient(): void {
  if (!isServer && browserQueryClient) {
    browserQueryClient.clear();
    browserQueryClient = undefined;
  }
}

/**
 * Set flag to destroy cache on next page load.
 * 
 * Use this before hard navigation (window.location.href) to ensure
 * the cache is destroyed even if the page is restored from bfcache.
 * 
 * @example
 * // In switchOrg function
 * markOrgSwitchPending();
 * destroyQueryClient();
 * window.location.href = '/dashboard';
 */
export function markOrgSwitchPending(): void {
  if (!isServer && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(ORG_SWITCH_PENDING_KEY, 'true');
  }
}

/**
 * Clear all React Query cache.
 * Call this when switching organizations to prevent stale data.
 * 
 * Uses invalidateQueries + refetchQueries for better UX:
 * - invalidateQueries marks all queries as stale
 * - refetchQueries forces immediate refetch of active queries
 * 
 * @example
 * // In switchOrg function
 * await clearQueryCache();
 */
export async function clearQueryCache(): Promise<void> {
  if (!isServer && browserQueryClient) {
    // 1. Clear all cache completely (removes old org data)
    browserQueryClient.clear();
    
    // 2. Reset query defaults to trigger fresh fetches
    browserQueryClient.resetQueries();
  }
}

/**
 * Invalidate and refetch all active queries.
 * Better for soft refresh - keeps data visible while refetching.
 */
export async function invalidateAndRefetchAll(): Promise<void> {
  if (!isServer && browserQueryClient) {
    await browserQueryClient.invalidateQueries();
    await browserQueryClient.refetchQueries({ type: 'active' });
  }
}
