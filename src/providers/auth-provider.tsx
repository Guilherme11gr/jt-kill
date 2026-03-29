'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import type { AuthViewer } from '@/shared/types/auth.types';
import { destroyQueryClient, markOrgSwitchPending } from '@/lib/query';

const CURRENT_ORG_COOKIE = 'jt-current-org';

export interface OrgMembership {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  isDefault: boolean;
}

export type Viewer = AuthViewer;
export type UserProfile = Viewer;

export interface AuthState {
  viewer: Viewer | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSwitchingOrg: boolean;
  logout: () => Promise<void>;
  refreshViewer: () => Promise<void>;
  switchOrg: (orgId: string, returnUrl?: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [isViewerLoading, setIsViewerLoading] = useState(true);
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const fetchViewer = useCallback(async (): Promise<Viewer | null> => {
    try {
      const response = await fetch('/api/users/me', {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (response.status === 401 || response.status === 403) {
        return null;
      }

      if (response.ok) {
        const data = await response.json();
        return data.data as Viewer;
      }
    } catch (error) {
      console.error('Error fetching viewer:', error);
    }

    return null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncViewer = async () => {
      setIsViewerLoading(true);
      const nextViewer = await fetchViewer();

      if (!cancelled) {
        setViewer(nextViewer);
        setIsViewerLoading(false);
      }
    };

    void syncViewer();

    return () => {
      cancelled = true;
    };
  }, [fetchViewer]);

  useEffect(() => {
    if (!viewer?.forcePasswordReset) {
      return;
    }

    if (pathname === '/reset-password/required') {
      return;
    }

    if (pathname === '/login' || pathname === '/signup') {
      return;
    }

    router.replace('/reset-password/required');
  }, [pathname, router, viewer?.forcePasswordReset]);

  const logout = useCallback(async () => {
    destroyQueryClient();
    document.cookie = `${CURRENT_ORG_COOKIE}=; Max-Age=0; Path=/`;
    await authClient.signOut();
    setViewer(null);
    router.push('/login');
    router.refresh();
  }, [router]);

  const refreshViewer = useCallback(async () => {
    const nextViewer = await fetchViewer();
    setViewer(nextViewer);
  }, [fetchViewer]);

  const switchOrg = useCallback(async (orgId: string, returnUrl?: string) => {
    if (viewer?.currentOrgId === orgId) {
      return;
    }

    setIsSwitchingOrg(true);

    try {
      markOrgSwitchPending();
      destroyQueryClient();

      const response = await fetch('/api/org/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Erro ao trocar de organização');
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      let verified = false;
      let verifyAttempts = 0;
      const maxAttempts = 3;

      while (verifyAttempts < maxAttempts && !verified) {
        const nextViewer = await fetchViewer();
        if (!nextViewer) {
          throw new Error('Falha ao verificar troca de organização');
        }

        if (nextViewer.currentOrgId === orgId) {
          setViewer(nextViewer);
          verified = true;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 200));
          verifyAttempts++;
        }
      }

      const target = returnUrl || '/dashboard';
      const separator = target.includes('?') ? '&' : '?';
      window.location.href = `${target}${separator}_t=${Date.now()}`;
    } catch (error) {
      console.error('[switchOrg] Error:', error);
      setIsSwitchingOrg(false);
      throw error;
    }
  }, [fetchViewer, viewer?.currentOrgId]);

  const value = useMemo<AuthState>(() => ({
    viewer,
    isLoading: isViewerLoading,
    isAuthenticated: Boolean(viewer),
    isSwitchingOrg,
    logout,
    refreshViewer,
    switchOrg,
  }), [
    isSwitchingOrg,
    isViewerLoading,
    logout,
    refreshViewer,
    switchOrg,
    viewer,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }

  return context;
}
