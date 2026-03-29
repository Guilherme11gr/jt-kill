import { describe, expect, it } from 'vitest';
import { mapAuthSession } from '@/lib/auth/session';

describe('mapAuthSession', () => {
  it('keeps server metadata but drops the raw session token', () => {
    const result = mapAuthSession({
      user: {
        id: 'user-1',
        email: 'dev@fluxo.dev',
        name: 'Dev User',
        image: null,
        emailVerified: true,
        forcePasswordReset: true,
        userMetadata: { display_name: 'Dev User' },
        appMetadata: { plan: 'pro' },
      },
      session: {
        id: 'session-1',
        token: 'super-secret-token',
        expiresAt: '2026-03-30T00:00:00.000Z',
      },
    });

    expect(result).toEqual({
      user: {
        id: 'user-1',
        email: 'dev@fluxo.dev',
        name: 'Dev User',
        image: null,
        emailVerified: true,
        forcePasswordReset: true,
        user_metadata: { display_name: 'Dev User' },
        app_metadata: { plan: 'pro' },
      },
      session: {
        id: 'session-1',
        expiresAt: '2026-03-30T00:00:00.000Z',
      },
    });

    expect(result?.session).not.toHaveProperty('token');
  });
});
