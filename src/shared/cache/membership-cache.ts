/**
 * In-memory LRU cache for org memberships
 * Reduces DB queries per request
 * TTL: 5 minutes
 * Max entries: 500 users
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface OrgMembershipData {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  isDefault: boolean;
}

class MembershipCache {
  private cache = new Map<string, CacheEntry<OrgMembershipData[]>>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ENTRIES = 500;

  /**
   * Get cached memberships for user
   */
  get(userId: string): OrgMembershipData[] | null {
    const entry = this.cache.get(userId);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(userId);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached memberships for user
   */
  set(userId: string, memberships: OrgMembershipData[]): void {
    // Evict oldest entry if cache is full (simple LRU)
    if (this.cache.size >= this.MAX_ENTRIES) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(userId, {
      data: memberships,
      expiresAt: Date.now() + this.TTL_MS,
    });
  }

  /**
   * Invalidate user's cache (e.g., after role change)
   */
  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  /**
   * Clear entire cache (useful for tests)
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats (for monitoring)
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_ENTRIES,
      ttlMs: this.TTL_MS,
    };
  }
}

// Singleton instance
export const membershipCache = new MembershipCache();
