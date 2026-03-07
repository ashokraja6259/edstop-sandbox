// FILE: src/hooks/useAICompanionRealtime.ts

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface AIUsageData {
  questionsUsed: number;
  questionsLimit: number;
  isPremium: boolean;
  lastResetAt: string | null;
  isLoading: boolean;
  isLive: boolean;
}

interface AIUsageRow {
  id: string;
  user_id: string;
  questions_used: number;
  questions_limit: number;
  is_premium: boolean;
  last_reset_at: string;
  updated_at: string;
}

export function useAICompanionRealtime(
  userId: string | undefined,
  defaultQuestionsUsed = 3,
  defaultIsPremium = false
): AIUsageData {
  const supabase = createClient(); // ✅ correct client usage
  const toast = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const prevDataRef = useRef({
    questionsUsed: defaultQuestionsUsed,
    isPremium: defaultIsPremium,
    lastResetAt: null as string | null,
  });

  const [questionsUsed, setQuestionsUsed] = useState(defaultQuestionsUsed);
  const [questionsLimit, setQuestionsLimit] = useState(defaultIsPremium ? 50 : 5);
  const [isPremium, setIsPremium] = useState(defaultIsPremium);
  const [lastResetAt, setLastResetAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  /* ───────── INITIAL FETCH ───────── */

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchInitialData = async () => {
      setIsLoading(true);

      const { data } = await supabase
        .from('ai_usage')
        .select('questions_used, questions_limit, is_premium, last_reset_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        setQuestionsUsed(data.questions_used);
        setQuestionsLimit(data.questions_limit);
        setIsPremium(data.is_premium);
        setLastResetAt(data.last_reset_at);

        prevDataRef.current = {
          questionsUsed: data.questions_used,
          isPremium: data.is_premium,
          lastResetAt: data.last_reset_at,
        };
      }

      setIsLoading(false);
    };

    fetchInitialData();
    return () => { cancelled = true; };
  }, [userId, supabase]);

  /* ───────── CLEANUP ───────── */

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsLive(false);
  }, [supabase]);

  /* ───────── REALTIME SUBSCRIPTION ───────── */

  useEffect(() => {
    if (!userId) return;

    cleanup();

    const channel = supabase
      .channel(`ai-usage-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_usage',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          const row = (payload.new ?? payload.old) as AIUsageRow | null;
          if (!row) return;

          setQuestionsUsed(row.questions_used);
          setQuestionsLimit(row.questions_limit);
          setIsPremium(row.is_premium);
          setLastResetAt(row.last_reset_at);
        }
      )
      .subscribe(status => {
        setIsLive(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return cleanup;
  }, [userId, cleanup, supabase]);

  return {
    questionsUsed,
    questionsLimit,
    isPremium,
    lastResetAt,
    isLoading,
    isLive,
  };
}