// FILE: src/contexts/AuthContext.tsx

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { createClient } from '@/lib/supabaseClient';
import type {
  AuthResponse,
  AuthTokenResponsePassword,
  OAuthResponse,
  Session,
  User,
} from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  phone: string | null;
  roll_number: string | null;
  hall: string | null;
  room_number: string | null;
  department: string | null;
  year_of_study: string | null;
  phone_verified: boolean | null;
  campus_email_verified: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  profile: UserProfile | null;
  profileLoading: boolean;
  isProfileComplete: boolean;
  refreshProfile: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthTokenResponsePassword>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<OAuthResponse>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  signInWithPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REQUIRED_PROFILE_FIELDS: Array<keyof UserProfile> = [
  'roll_number',
  'department',
  'year_of_study',
  'hall',
  'room_number',
];

const hasValue = (value: unknown) =>
  typeof value === 'string' ? value.trim().length > 0 : Boolean(value);

const getIsProfileComplete = (profile: UserProfile | null) => {
  if (!profile) return false;
  return REQUIRED_PROFILE_FIELDS.every((field) => hasValue(profile[field]));
};

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
  const [profileLoading, setProfileLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const loadProfile = useCallback(
    async (authUser: User | null) => {
      if (!authUser) {
        setProfile(null);
        setUserRole(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);

      const { data, error } = await supabase
        .from('user_profiles')
        .select(
          `
          id,
          email,
          full_name,
          avatar_url,
          role,
          phone,
          roll_number,
          hall,
          room_number,
          department,
          year_of_study,
          phone_verified,
          campus_email_verified,
          created_at,
          updated_at
        `
        )
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('Failed to load user profile:', error.message);
        setProfile(null);
        setUserRole('student');
      } else {
        setProfile((data as UserProfile | null) ?? null);
        setUserRole(data?.role ?? 'student');
      }

      setProfileLoading(false);
    },
    [supabase]
  );

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(initialSession ?? null);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await loadProfile(initialSession.user);
        } else {
          setProfile(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);

        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setUserRole(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (nextSession?.user) {
        window.setTimeout(() => {
          void loadProfile(nextSession.user);
        }, 0);
      } else {
        setProfile(null);
        setUserRole(null);
        setProfileLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile, supabase.auth]);

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string) => {
      const response = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/student-dashboard`,
          data: {
            full_name: fullName?.trim() ?? '',
          },
        },
      });

      if (response.error) {
        throw response.error;
      }

      return response;
    },
    [supabase]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (response.error) {
        throw response.error;
      }

      return response;
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setUserRole(null);
    setProfileLoading(false);
  }, [supabase]);

  const signInWithGoogle = useCallback(() => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/student-dashboard`,
      },
    });
  }, [supabase]);

  const resetPassword = useCallback(
    async (email: string) => {
      const response = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (response.error) {
        throw response.error;
      }
    },
    [supabase]
  );

  const resendVerificationEmail = useCallback(
    async (email: string) => {
      const response = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/student-dashboard`,
        },
      });

      if (response.error) {
        throw response.error;
      }
    },
    [supabase]
  );

  const signInWithPhoneOtp = useCallback(
    async (phone: string) => {
      const response = await supabase.auth.signInWithOtp({ phone });

      if (response.error) {
        throw response.error;
      }
    },
    [supabase]
  );

  const verifyPhoneOtp = useCallback(
    async (phone: string, token: string) => {
      const response = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });

      if (response.error) {
        throw response.error;
      }
    },
    [supabase]
  );

  const isProfileComplete = useMemo(
    () => getIsProfileComplete(profile),
    [profile]
  );

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      userRole,
      profile,
      profileLoading,
      isProfileComplete,
      refreshProfile,
      signUp,
      signIn,
      signOut,
      signInWithGoogle,
      resetPassword,
      resendVerificationEmail,
      signInWithPhoneOtp,
      verifyPhoneOtp,
    }),
    [
      user,
      session,
      loading,
      userRole,
      profile,
      profileLoading,
      isProfileComplete,
      refreshProfile,
      signUp,
      signIn,
      signOut,
      signInWithGoogle,
      resetPassword,
      resendVerificationEmail,
      signInWithPhoneOtp,
      verifyPhoneOtp,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};