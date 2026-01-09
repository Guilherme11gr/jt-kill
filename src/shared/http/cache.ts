/**
 * @fileoverview Configuração de cache headers para rotas HTTP
 */

type CacheDuration = 'none' | 'brief' | 'short' | 'medium' | 'long' | 'immutable';

const CACHE_CONFIG: Record<CacheDuration, string> = {
  none: 'no-store, no-cache, must-revalidate',
  brief: 'public, max-age=10, s-maxage=10, stale-while-revalidate=30', // 10 sec (tasks, kanban)
  short: 'public, max-age=60, stale-while-revalidate=30', // 1 min
  medium: 'public, max-age=300, stale-while-revalidate=60', // 5 min
  long: 'public, max-age=3600, stale-while-revalidate=300', // 1 hora
  immutable: 'public, max-age=31536000, immutable', // 1 year
};

/**
 * Retorna headers de cache para uma rota
 * @param duration - Duração do cache
 * @returns Headers object
 */
export function cacheHeaders(duration: CacheDuration): HeadersInit {
  return {
    'Cache-Control': CACHE_CONFIG[duration],
  };
}

/**
 * Get cache headers for private data (user-specific).
 * Uses private directive - cached by browser but not CDN.
 */
export function privateCacheHeaders(maxAge: number = 60): HeadersInit {
  return {
    'Cache-Control': `private, max-age=${maxAge}`,
  };
}
