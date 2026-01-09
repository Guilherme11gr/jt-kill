'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { serializeCookie } from '@/shared/utils/cookie-utils';

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
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, 'logout' | 'refreshProfile' | 'switchOrg'>>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
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
          });
        } else {
          setState({
            user: null,
            profile: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
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
          });
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            profile: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
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
    // Clear org cookie with secure options
    const clearCookie = serializeCookie(CURRENT_ORG_COOKIE, '', { maxAge: 0 });
    document.cookie = clearCookie;
    
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

  // Switch organization
  const switchOrg = useCallback(async (orgId: string) => {
    // Validate orgId is in user's memberships to prevent unauthorized access
    if (!state.profile?.memberships.some(m => m.orgId === orgId)) {
      console.error('Attempted to switch to org user does not belong to:', orgId);
      return;
    }

    // Set cookie with secure options (1 year expiry)
    const secureCookie = serializeCookie(CURRENT_ORG_COOKIE, orgId, {
      maxAge: 60 * 60 * 24 * 365,
    });
    document.cookie = secureCookie;

    // Refresh profile to get new context
    const profile = await fetchProfile();
    setState(prev => ({ ...prev, profile }));

    // Refresh page to reload all data
    router.refresh();
  }, [state.profile, fetchProfile, router]);

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

