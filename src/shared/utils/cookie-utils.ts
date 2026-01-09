/**
 * Cookie utilities with secure defaults
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
}

/**
 * Get secure cookie options based on environment
 */
export function getSecureCookieOptions(
  overrides?: Partial<CookieOptions>
): CookieOptions {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION, // Only true in production (HTTPS required)
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
    ...overrides,
  };
}

/**
 * Serialize cookie with options
 */
export function serializeCookie(
  name: string,
  value: string,
  options?: CookieOptions
): string {
  const opts = getSecureCookieOptions(options);
  
  let cookie = `${name}=${value}`;
  
  if (opts.httpOnly) cookie += '; HttpOnly';
  if (opts.secure) cookie += '; Secure';
  if (opts.sameSite) cookie += `; SameSite=${opts.sameSite}`;
  if (opts.maxAge) cookie += `; Max-Age=${opts.maxAge}`;
  if (opts.path) cookie += `; Path=${opts.path}`;
  
  return cookie;
}
