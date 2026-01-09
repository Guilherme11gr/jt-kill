'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  id: string;
  orgId: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, 'logout' | 'refreshProfile'>>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Fetch user profile from API
  const fetchProfile = useCallback(async () => {
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
          // Check if we already have the profile to avoid double fetch on initial load if event fires early
          // But SIGNED_IN usually means we need to fetch
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
          // Update session but keep profile if we have it
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

  const value = useMemo(() => ({
    ...state,
    logout,
    refreshProfile
  }), [state, logout, refreshProfile]);

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
