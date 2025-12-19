import { QueryClient, isServer } from '@tanstack/react-query';
import { CACHE_TIMES } from './cache-config';

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
 */
export function getQueryClient(): QueryClient {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is important for SSR hydration
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}
