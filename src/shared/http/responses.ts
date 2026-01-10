import { NextResponse } from 'next/server';
import type { ApiResponse, ApiError, ListResponse } from '@/shared/types';
import { cacheHeaders, privateCacheHeaders } from './cache';

/**
 * Success response with data
 */
export function jsonSuccess<T>(
  data: T,
  options?: {
    status?: number;
    cache?: 'none' | 'brief' | 'short' | 'medium' | 'long';
    private?: boolean;
    orgId?: string; // For debugging multi-tenant issues
  }
): NextResponse<ApiResponse<T>> {
  const { status = 200, cache = 'none', private: isPrivate = false, orgId } = options ?? {};

  const headers = isPrivate
    ? privateCacheHeaders()
    : cacheHeaders(cache);
  
  // Add debug header in development
  if (process.env.NODE_ENV === 'development' && orgId) {
    headers['X-Debug-Org-Id'] = orgId;
  }

  return NextResponse.json({ data }, { status, headers });
}

/**
 * List response with pagination
 */
export function jsonList<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  options?: {
    cache?: 'none' | 'short' | 'medium';
    private?: boolean;
  }
): NextResponse<ApiResponse<ListResponse<T>>> {
  const { cache = 'none', private: isPrivate = false } = options ?? {};

  const headers = isPrivate
    ? privateCacheHeaders()
    : cacheHeaders(cache);

  const response: ListResponse<T> = {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };

  return NextResponse.json({ data: response }, { headers });
}

/**
 * Error response
 */
export function jsonError(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, unknown>
): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code, message, details } },
    { status }
  );
}

/**
 * Not found response
 */
export function jsonNotFound(resource: string): NextResponse<ApiError> {
  return jsonError('NOT_FOUND', `${resource} não encontrado`, 404);
}

/**
 * Unauthorized response
 */
export function jsonUnauthorized(
  message = 'Não autenticado'
): NextResponse<ApiError> {
  return jsonError('UNAUTHORIZED', message, 401);
}

/**
 * Forbidden response
 */
export function jsonForbidden(
  message = 'Sem permissão'
): NextResponse<ApiError> {
  return jsonError('FORBIDDEN', message, 403);
}

/**
 * Validation error response
 */
export function jsonValidationError(
  details: Record<string, string[]>
): NextResponse<ApiError> {
  return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, details);
}

/**
 * Rate limit exceeded response
 */
export function jsonRateLimited(
  resetAt: Date
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: {
        code: 'RATE_LIMITED',
        message: 'Muitas requisições. Tente novamente mais tarde.',
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((resetAt.getTime() - Date.now()) / 1000).toString(),
        'X-RateLimit-Reset': resetAt.toISOString(),
      },
    }
  );
}

