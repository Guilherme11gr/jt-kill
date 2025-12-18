/**
 * @fileoverview Configuração de cache headers para rotas HTTP
 */

type CacheDuration = 'none' | 'short' | 'medium' | 'long';

const CACHE_CONFIG: Record<CacheDuration, string> = {
  none: 'no-store, no-cache, must-revalidate',
  short: 'public, max-age=60, stale-while-revalidate=30', // 1 min
  medium: 'public, max-age=300, stale-while-revalidate=60', // 5 min
  long: 'public, max-age=3600, stale-while-revalidate=300', // 1 hora
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
