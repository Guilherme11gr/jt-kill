/**
 * Simple in-memory rate limiter
 * 
 * For production, use Redis-based solution (e.g., @upstash/ratelimit)
 * This is a basic implementation for development/single-instance deployments.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60000); // Every minute

export interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check rate limit for a given key (usually IP or user ID)
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { limit: 100, windowMs: 60000 }
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // No entry or expired - create new
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    store.set(key, newEntry);

    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt: new Date(newEntry.resetAt),
    };
  }

  // Entry exists and not expired
  entry.count++;

  return {
    allowed: entry.count <= config.limit,
    remaining: Math.max(0, config.limit - entry.count),
    resetAt: new Date(entry.resetAt),
  };
}

/**
 * Get rate limit key from request
 * Uses X-Forwarded-For header or falls back to a default
 */
export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'anonymous';
  return `ratelimit:${ip}`;
}

// Preset configurations
export const RATE_LIMITS = {
  /** Standard API: 100 requests per minute */
  STANDARD: { limit: 100, windowMs: 60000 },
  /** Strict: 10 requests per minute (for sensitive operations) */
  STRICT: { limit: 10, windowMs: 60000 },
  /** Auth: 5 attempts per minute */
  AUTH: { limit: 5, windowMs: 60000 },
  /** AI endpoints: 20 per minute */
  AI: { limit: 20, windowMs: 60000 },
} as const;
