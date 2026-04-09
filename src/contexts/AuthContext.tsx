/**
 * Supabase session gate: REST requests need a logged-in user JWT or RLS returns 401.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { membersApi, type Member } from '../services/api';
import { supabaseAuthApi } from '../services/supabaseApi';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Member | null;
  loading: boolean;
  profileLoading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isAdminOrStaff: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Singleton promise to prevent concurrent auth initialization
let authInitPromise: Promise<Session | null> | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [roleFlags, setRoleFlags] = useState({
    isAdmin: false,
    isStaff: false,
    isAdminOrStaff: false,
  });

  const fetchProfile = useCallback(async () => {
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
  }, []);

  /** Fetch role flags from the DB. Fails closed — no elevated access on error. */
  const fetchRoleFlags = useCallback(async (cancelled: { current: boolean }) => {
    try {
      const flags = await supabaseAuthApi.getRoleFlags();
      if (!cancelled.current) {
        setRoleFlags({
          isAdmin: flags.isAdmin,
          isStaff: flags.isStaff,
          isAdminOrStaff: flags.isAdminOrStaff,
        });
      }
    } catch {
      // Fail closed: deny elevated access when role check fails
      if (!cancelled.current) {
        setRoleFlags({ isAdmin: false, isStaff: false, isAdminOrStaff: false });
      }
    }
  }, []);

  useEffect(() => {
    const cancelled = { current: false };

    const initializeAuth = async () => {
      try {
        // Use singleton promise to prevent concurrent auth checks
        if (!authInitPromise) {
          authInitPromise = supabase.auth.getSession().then((res) => {
            authInitPromise = null; // Reset after completion
            return res.data.session;
          }).catch((err: unknown) => {
            authInitPromise = null;
            throw err;
          });
        }

        const s = await authInitPromise;
        if (cancelled.current) return;

        setSession(s);

        if (s?.user?.email) {
          await fetchProfile();
          await fetchRoleFlags(cancelled);
        } else {
          setProfile(null);
          setRoleFlags({ isAdmin: false, isStaff: false, isAdminOrStaff: false });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (!cancelled.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, s: Session | null) => {
      if (cancelled.current) return;

      setSession(s);

      if (s?.user?.email) {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          await fetchProfile();
          await fetchRoleFlags(cancelled);
        }
      } else {
        setProfile(null);
        setRoleFlags({ isAdmin: false, isStaff: false, isAdminOrStaff: false });
      }

      // Ensure loading is false after handling the auth event
      setLoading(false);
    });

    return () => {
      cancelled.current = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchRoleFlags]);

  const signOut = useCallback(async () => {
    try {
      // Clear the local profile and session first for immediate UI responsiveness
      setProfile(null);
      setSession(null);
      
      // Supabase's signOut can occasionally throw a NavigatorLockAcquireTimeoutError
      // especially in development or if multiple tabs are open.
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Sign out encountered an error during Supabase call:', error);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.email) {
      await fetchProfile();
    }
  }, [session, fetchProfile]);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    profileLoading,
    isAdmin: roleFlags.isAdmin,
    isStaff: roleFlags.isStaff,
    isAdminOrStaff: roleFlags.isAdminOrStaff,
    signOut,
    refreshProfile,
  }), [session, profile, loading, profileLoading, roleFlags, signOut, refreshProfile]);

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-stone-200 p-8 text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-rose-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-3">Configuration Missing</h1>
          <p className="text-stone-600 mb-8 leading-relaxed">
            Supabase environment variables are missing. Please ensure your <code className="bg-stone-100 px-1.5 py-0.5 rounded text-rose-600 font-mono text-sm">.env</code> file is properly configured with your Supabase URL and Anon Key.
          </p>
          <div className="space-y-4">
            <div className="text-left bg-stone-50 rounded-lg p-4 text-xs font-mono text-stone-500 overflow-x-auto">
              <div>VITE_SUPABASE_URL=https://your-project.supabase.co</div>
              <div>VITE_SUPABASE_ANON_KEY=your-anon-key</div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      </div>
    );
  }

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
