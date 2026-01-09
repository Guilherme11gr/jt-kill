/**
 * Global Cache Configuration
 * 
 * 5 cache tiers for different data freshness requirements.
 * All times are in milliseconds.
 * 
 * - staleTime: How long data is considered fresh (no refetch on mount)
 * - gcTime: How long unused data stays in cache (garbage collection)
 */

// Base time units (milliseconds)
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/**
 * Cache Tiers
 * 
 * REALTIME  - Live data that needs constant updates (poker votes, notifications)
 * FRESH     - Frequently changing data (tasks, comments)
 * STANDARD  - Regular data (projects, epics, features)
 * STABLE    - Rarely changing data (user profile, org settings)
 * STATIC    - Almost never changes (enums, static config)
 */
export const CACHE_TIMES = {
  /** Live data - always refetch on focus/mount */
  REALTIME: {
    staleTime: 0,
    gcTime: 1 * MINUTE,
  },

  /** Frequently changing - 5s fresh, 5min cache
   * Reduced to 5s to feel "snappy" on navigation but avoid instant refetches during quick interactions.
   */
  FRESH: {
    staleTime: 5 * SECOND,
    gcTime: 5 * MINUTE,
  },

  /** Regular data - 30s fresh, 10min cache
   * Reduced from 2min to 30s to keep project/feature lists reasonably up to date.
   */
  STANDARD: {
    staleTime: 30 * SECOND,
    gcTime: 10 * MINUTE,
  },

  /** Rarely changing - 10min fresh, 30min cache */
  STABLE: {
    staleTime: 10 * MINUTE,
    gcTime: 30 * MINUTE,
  },

  /** Almost static - 1hr fresh, 24hr cache */
  STATIC: {
    staleTime: 1 * HOUR,
    gcTime: 24 * HOUR,
  },
} as const;

/** Type for cache tier keys */
export type CacheTier = keyof typeof CACHE_TIMES;

/**
 * Get cache config for a specific tier
 * @example
 * useQuery({ ...getCacheConfig('FRESH'), queryKey: [...] })
 */
export function getCacheConfig(tier: CacheTier) {
  return CACHE_TIMES[tier];
}
