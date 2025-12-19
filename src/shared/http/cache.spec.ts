import { describe, it, expect } from 'vitest';
import { cacheHeaders, privateCacheHeaders } from './cache';

describe('Cache Helpers', () => {
  describe('cacheHeaders', () => {
    it('should return correct headers for "none"', () => {
      expect(cacheHeaders('none')).toEqual({
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      });
    });

    it('should return correct headers for "short"', () => {
      expect(cacheHeaders('short')).toEqual({
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
      });
    });

    it('should return correct headers for "medium"', () => {
      expect(cacheHeaders('medium')).toEqual({
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      });
    });

    it('should return correct headers for "long"', () => {
      expect(cacheHeaders('long')).toEqual({
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300',
      });
    });

    it('should return correct headers for "immutable"', () => {
      expect(cacheHeaders('immutable')).toEqual({
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
    });
  });

  describe('privateCacheHeaders', () => {
    it('should return default private cache headers', () => {
      expect(privateCacheHeaders()).toEqual({
        'Cache-Control': 'private, max-age=60',
      });
    });

    it('should return private cache headers with custom maxAge', () => {
      expect(privateCacheHeaders(120)).toEqual({
        'Cache-Control': 'private, max-age=120',
      });
    });
  });
});
