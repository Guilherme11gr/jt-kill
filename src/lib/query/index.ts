/**
 * React Query - Barrel Export
 * 
 * Central export point for all query-related utilities.
 * 
 * @example
 * import { queryKeys, CACHE_TIMES, QueryProvider } from '@/lib/query';
 */

// Cache configuration
export { CACHE_TIMES, getCacheConfig, type CacheTier } from './cache-config';

// Query client
export { getQueryClient } from './query-client';

// Provider component
export { QueryProvider } from './query-provider';

// Query keys
export { queryKeys, type QueryKeys } from './query-keys';

// Re-export common hooks for convenience
export {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';

// Hooks
export * from './hooks';
