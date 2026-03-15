// FILE: src/contexts/AuthContext.tsx

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
} from 'react';
import { createClient } from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  signUp: (email: string, password: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<any>;
  resetPassword: (email: string) => Promise<void>;
  signInWithPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const roleFetched = useRef(false);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      setUserRole(data?.role ?? 'student');
      roleFetched.current = true;
    } catch {
      setUserRole('student');
      roleFetched.current = true;
    }
  };

  /* ───────── INITIAL AUTH LOAD (SAFE METHOD) ───────── */

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session ?? null);
        setUser(session?.user ?? null);

        if (session?.user && !roleFetched.current) {
          void fetchUserRole(session.user.id);
        }
      } catch {
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        void fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
        roleFetched.current = false;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* ───────── AUTH METHODS ───────── */

  const signUp = async (email: string, password: string) => {
    const response = await supabase.auth.signUp({ email, password });

    if (response.error) {
      throw response.error;
    }

    return response;
  };

  const signIn = async (email: string, password: string) => {
    const response = await supabase.auth.signInWithPassword({ email, password });

    if (response.error) {
      throw response.error;
    }

    return response;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const resetPassword = async (email: string) => {
    const response = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (response.error) {
      throw response.error;
    }
  };

  const signInWithPhoneOtp = async (phone: string) => {
    const response = await supabase.auth.signInWithOtp({ phone });

    if (response.error) {
      throw response.error;
    }
  };

  const verifyPhoneOtp = async (phone: string, token: string) => {
    const response = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (response.error) {
      throw response.error;
    }
  };

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      userRole,
      signUp,
      signIn,
      signOut,
      signInWithGoogle,
      resetPassword,
      signInWithPhoneOtp,
      verifyPhoneOtp,
    }),
    [user, session, loading, userRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
