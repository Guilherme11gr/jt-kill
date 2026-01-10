'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { clearQueryCache } from '@/lib/query';

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
      const response = await fetch(`/api/users/me`);
      if (response.ok) {
        const data = await response.json();
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
      async (event, session) => {
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
    // Clear React Query cache
    clearQueryCache();
    
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
      // 1. Call API to set httpOnly cookie (server-side)
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

      // 2. Verify cookie was set by making a verification request
      // This ensures the cookie is persisted before reload
      const verifyResponse = await fetch('/api/users/me', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      
      if (!verifyResponse.ok) {
        throw new Error('Falha ao verificar troca de organização');
      }

      const profileData = await verifyResponse.json();
      
      // 3. Double-check the org switched correctly
      if (profileData.data?.currentOrgId !== orgId) {
        console.warn('[switchOrg] Cookie propagation delay detected, waiting...');
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // 4. Hard reload - guarantees clean state
      // Use returnUrl if provided (for deep links), otherwise go to dashboard
      window.location.href = returnUrl || '/dashboard';

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

