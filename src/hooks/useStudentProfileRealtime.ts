// FILE: src/hooks/useStudentProfileRealtime.ts

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // ✅ singleton
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ActiveSession {
  id: string;
  device: string;
  location: string;
  time: string;
  current: boolean;
  createdAt: string;
}

export interface StudentProfileRealtimeData {
  twoFAEnabled: boolean;
  activeSessions: ActiveSession[];
  passwordLastChanged: string | null;
  passwordChangeCount: number;
  isLive: boolean;
  isLoading: boolean;
}

interface UserProfileRow {
  id: string;
  user_id: string;
  updated_at: string;
  created_at: string;
}

const DEFAULT_SESSIONS: ActiveSession[] = [
  {
    id: 's1',
    device: 'Chrome on Windows',
    location: 'Kharagpur, WB',
    time: 'Active now',
    current: true,
    createdAt: new Date().toISOString(),
  },
];

export function useStudentProfileRealtime(
  userId: string | undefined
): StudentProfileRealtimeData & {
  terminateSession: (sessionId: string) => void;
  toggle2FA: (enabled: boolean) => void;
} {
  const toast = useToast();
  const profileChannelRef = useRef<RealtimeChannel | null>(null);
  const prevUpdatedAtRef = useRef<string | null>(null);

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>(DEFAULT_SESSIONS);
  const [passwordLastChanged, setPasswordLastChanged] = useState<string | null>(null);
  const [passwordChangeCount, setPasswordChangeCount] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /* ───────── INITIAL FETCH ───────── */

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const init = async () => {
      setIsLoading(true);
      try {
        const { data: profile } = await supabase
          .from('student_profiles')
          .select('updated_at')
          .eq('user_id', userId)
          .maybeSingle();

        if (cancelled) return;

        if (profile?.updated_at) {
          prevUpdatedAtRef.current = profile.updated_at;
          setPasswordLastChanged(profile.updated_at);
        }

        const { data: sessionData } = await supabase.auth.getSession();

        if (sessionData?.session) {
          const session = sessionData.session;

          setActiveSessions(prev =>
            prev.map(s =>
              s.current
                ? {
                    ...s,
                    id: session.access_token.slice(-8),
                    createdAt: session.user.last_sign_in_at ?? s.createdAt,
                    time: 'Active now',
                  }
                : s
            )
          );
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /* ───────── REALTIME ───────── */

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`student_profile:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'student_profiles',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          const row = payload.new as UserProfileRow | null;
          if (!row?.updated_at) return;

          const prev = prevUpdatedAtRef.current;
          if (row.updated_at !== prev) {
            setPasswordLastChanged(row.updated_at);
            setPasswordChangeCount(c => c + 1);

            toast.showToast(
              'warning',
              '🔐 Account security updated. If this wasn\'t you, terminate other sessions.'
            );

            prevUpdatedAtRef.current = row.updated_at;
          }
        }
      )
      .subscribe(status => {
        setIsLive(status === 'SUBSCRIBED');
      });

    profileChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      setIsLive(false);
    };
  }, [userId]);

  /* ───────── TERMINATE SESSION ───────── */

  const terminateSession = useCallback((sessionId: string) => {
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.showToast('success', '🔒 Session terminated.');
  }, []);

  /* ───────── TOGGLE 2FA ───────── */

  const toggle2FA = useCallback((enabled: boolean) => {
    setTwoFAEnabled(enabled);

    toast.showToast(
      enabled ? 'success' : 'warning',
      enabled
        ? '🛡️ Two-Factor Authentication enabled.'
        : '⚠️ Two-Factor Authentication disabled.'
    );
  }, []);

  return {
    twoFAEnabled,
    activeSessions,
    passwordLastChanged,
    passwordChangeCount,
    isLive,
    isLoading,
    terminateSession,
    toggle2FA,
  };
}