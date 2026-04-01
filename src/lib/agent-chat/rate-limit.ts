/**
 * Simple in-memory rate limiter for the agent chat.
 * No external dependencies — uses a Map with TTL.
 *
 * Limit: 1 request per user per second (configurable).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 60s
const CLEANUP_INTERVAL = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function scheduleCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
    if (store.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL);
}

export interface RateLimitConfig {
  /** Max requests in the window (default: 1) */
  maxRequests: number;
  /** Window duration in ms (default: 1000) */
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 1,
  windowMs: 1000,
};

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

/**
 * Check if a request should be rate limited.
 * @param key - Unique identifier (e.g. tenantId:userId)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {}
): RateLimitResult {
  const { maxRequests, windowMs } = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // First request or window expired
    store.set(key, { count: 1, resetAt: now + windowMs });
    scheduleCleanup();
    return { allowed: true };
  }

  if (entry.count < maxRequests) {
    entry.count++;
    return { allowed: true };
  }

  return {
    allowed: false,
    retryAfterMs: entry.resetAt - now,
  };
}

/**
 * Reset rate limit for a key (e.g. after successful response).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}
