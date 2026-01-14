'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { destroyQueryClient, markOrgSwitchPending } from '@/lib/query';

// Cookie name (must match backend)
const CURRENT_ORG_COOKIE = 'jt-current-org';

export interface OrgMembership {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  isDefault: boolean;
}

export interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  currentOrgId: string;
  currentRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  memberships: OrgMembership[];
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSwitchingOrg: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchOrg: (orgId: string, returnUrl?: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, 'logout' | 'refreshProfile' | 'switchOrg'>>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    isSwitchingOrg: false,
  });

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Fetch user profile from API
  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const response = await fetch(`/api/users/me`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[AuthProvider] Profile fetched:', {
          currentOrgId: data.data?.currentOrgId,
          memberships: data.data?.memberships?.length,
          timestamp: new Date().toISOString(),
        });
        return data.data as UserProfile;
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
    return null;
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const profile = await fetchProfile();
          setState({
            user: session.user,
            profile,
            session,
            isLoading: false,
            isAuthenticated: true,
            isSwitchingOrg: false,
          });
        } else {
          setState({
            user: null,
            profile: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            isSwitchingOrg: false,
          });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED', session: Session | null) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfile();
          setState({
            user: session.user,
            profile,
            session,
            isLoading: false,
            isAuthenticated: true,
            isSwitchingOrg: false,
          });
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            profile: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            isSwitchingOrg: false,
          });
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setState(prev => ({
            ...prev,
            user: session.user,
            session,
            isAuthenticated: true,
          }));
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  // Logout function
  const logout = useCallback(async () => {
    // Destroy React Query cache completely
    destroyQueryClient();
    
    // Clear org cookie (simple clear - will be overwritten by server on next login)
    document.cookie = `${CURRENT_ORG_COOKIE}=; Max-Age=0; Path=/`;
    
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }, [supabase, router]);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (state.user) {
      const profile = await fetchProfile();
      setState(prev => ({ ...prev, profile }));
    }
  }, [state.user, fetchProfile]);

  // Switch organization - Professional implementation
  // Uses hard reload to guarantee clean state (like Trello/Linear)
  const switchOrg = useCallback(async (orgId: string, returnUrl?: string) => {
    // Prevent switching to same org
    if (state.profile?.currentOrgId === orgId) {
      return;
    }

    // Start switching state (shows loading overlay)
    setState(prev => ({ ...prev, isSwitchingOrg: true }));

    try {
      // 1. Mark org switch as pending FIRST (survives page reload/bfcache)
      // This ensures cache is destroyed even if page is restored from bfcache
      markOrgSwitchPending();
      
      // 2. Destroy React Query cache COMPLETELY (not just clear)
      // This sets browserQueryClient = undefined, forcing fresh instance
      destroyQueryClient();

      // 3. Call API to set httpOnly cookie (server-side)
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

      // 4. Wait a bit for cookie to propagate (important for Vercel edge)
      await new Promise(resolve => setTimeout(resolve, 100));

      // 5. Verify cookie was set by making a verification request
      // This ensures the cookie is persisted before reload
      let verifyAttempts = 0;
      const maxAttempts = 3;
      let verified = false;

      while (verifyAttempts < maxAttempts && !verified) {
        const verifyResponse = await fetch('/api/users/me', {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });
        
        if (!verifyResponse.ok) {
          throw new Error('Falha ao verificar troca de organização');
        }

        const profileData = await verifyResponse.json();
        
        if (profileData.data?.currentOrgId === orgId) {
          verified = true;
        } else {
          console.warn(`[switchOrg] Attempt ${verifyAttempts + 1}: Cookie not propagated yet, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 200));
          verifyAttempts++;
        }
      }

      if (!verified) {
        console.error('[switchOrg] Cookie verification failed after max attempts');
        // Still proceed with reload, but log the issue
      }

      // 6. Hard reload with cache bypass
      // Use timestamp to bust any potential cache
      const separator = (returnUrl || '/dashboard').includes('?') ? '&' : '?';
      const targetUrl = `${returnUrl || '/dashboard'}${separator}_t=${Date.now()}`;
      window.location.href = targetUrl;

    } catch (error) {
      console.error('[switchOrg] Error:', error);
      setState(prev => ({ ...prev, isSwitchingOrg: false }));
      throw error;
    }
  }, [state.profile?.currentOrgId]);

  const value = useMemo(() => ({
    ...state,
    logout,
    refreshProfile,
    switchOrg,
  }), [state, logout, refreshProfile, switchOrg]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

