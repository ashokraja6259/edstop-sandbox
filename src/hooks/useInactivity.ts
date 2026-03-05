// FILE: src/hooks/useInactivity.ts

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE = 2 * 60 * 1000;       // Show warning 2 minutes before logout
const COUNTDOWN_SECONDS = 120;               // 2-minute countdown

const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'keypress',
];

export interface UseInactivityOptions {
  onLogout: () => void;
  enabled?: boolean;
}

export interface UseInactivityReturn {
  showWarning: boolean;
  countdown: number;
  extendSession: () => void;
}

export function useInactivity({ onLogout, enabled = true }: UseInactivityOptions): UseInactivityReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isWarningShownRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    warningTimerRef.current = null;
    logoutTimerRef.current = null;
    countdownIntervalRef.current = null;
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_SECONDS);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const scheduleTimers = useCallback(() => {
    clearAllTimers();
    isWarningShownRef.current = false;

    // Show warning 2 minutes before auto-logout
    warningTimerRef.current = setTimeout(() => {
      isWarningShownRef.current = true;
      setShowWarning(true);
      startCountdown();

      // Auto-logout after countdown
      logoutTimerRef.current = setTimeout(() => {
        setShowWarning(false);
        onLogout();
      }, WARNING_BEFORE);
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);
  }, [clearAllTimers, startCountdown, onLogout]);

  const resetActivity = useCallback(() => {
    if (!isWarningShownRef.current) {
      scheduleTimers();
    }
  }, [scheduleTimers]);

  const extendSession = useCallback(() => {
    setShowWarning(false);
    isWarningShownRef.current = false;
    scheduleTimers();
  }, [scheduleTimers]);

  useEffect(() => {
    if (!enabled) return;

    scheduleTimers();

    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, resetActivity, { passive: true });
    });

    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, resetActivity);
      });
    };
  }, [enabled, scheduleTimers, resetActivity, clearAllTimers]);

  return { showWarning, countdown, extendSession };
}
