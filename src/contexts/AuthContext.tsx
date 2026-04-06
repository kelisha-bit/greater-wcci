/**
 * Supabase session gate: REST requests need a logged-in user JWT or RLS returns 401.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { membersApi, type Member } from '../services/api';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Member | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      const response = await membersApi.getCurrentUserProfile();
      if (response.success && response.data) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Error fetching profile in AuthProvider:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!cancelled) {
        setSession(s);
        setLoading(false);
        if (s?.user?.email) {
          fetchProfile();
        }
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user?.email) {
        fetchProfile();
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (session?.user?.email) {
      await fetchProfile();
    }
  };

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    profileLoading,
    signOut,
    refreshProfile,
  }), [session, profile, loading, profileLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
