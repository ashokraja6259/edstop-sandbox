// FILE: src/hooks/useRetry.ts

'use client';

import { useState, useCallback, useRef } from 'react';

export interface RetryState {
  retryCount: number;
  isRetrying: boolean;
  nextRetryIn: number; // seconds
  maxRetriesReached: boolean;
}

export interface UseRetryOptions {
  maxRetries?: number;
  baseDelay?: number; // ms
  maxDelay?: number; // ms
  onRetry?: (attempt: number) => void | Promise<void>;
}

export function useRetry(options: UseRetryOptions = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry,
  } = options;

  const [retryState, setRetryState] = useState<RetryState>({
    retryCount: 0,
    isRetrying: false,
    nextRetryIn: 0,
    maxRetriesReached: false,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const getDelay = useCallback(
    (attempt: number) => {
      // Exponential backoff: baseDelay * 2^attempt + jitter
      const exponential = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 500;
      return Math.min(exponential + jitter, maxDelay);
    },
    [baseDelay, maxDelay]
  );

  const retry = useCallback(
    async (attempt?: number) => {
      const currentAttempt = attempt ?? retryState.retryCount;

      if (currentAttempt >= maxRetries) {
        setRetryState(prev => ({ ...prev, maxRetriesReached: true, isRetrying: false }));
        return;
      }

      const delay = getDelay(currentAttempt);
      const delaySecs = Math.ceil(delay / 1000);

      setRetryState(prev => ({
        ...prev,
        isRetrying: true,
        nextRetryIn: delaySecs,
        maxRetriesReached: false,
      }));

      // Countdown timer
      let remaining = delaySecs;
      countdownRef.current = setInterval(() => {
        remaining -= 1;
        setRetryState(prev => ({ ...prev, nextRetryIn: remaining }));
        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
        }
      }, 1000);

      timerRef.current = setTimeout(async () => {
        setRetryState(prev => ({
          ...prev,
          retryCount: currentAttempt + 1,
          isRetrying: false,
          nextRetryIn: 0,
        }));
        if (onRetry) {
          await onRetry(currentAttempt + 1);
        }
      }, delay);
    },
    [retryState.retryCount, maxRetries, getDelay, onRetry]
  );

  const manualRetry = useCallback(
    async (resetCount = false) => {
      clearTimers();
      let attempt = resetCount ? 0 : retryState.retryCount;
      setRetryState(prev => ({
        ...prev,
        retryCount: attempt,
        isRetrying: false,
        nextRetryIn: 0,
        maxRetriesReached: false,
      }));
      if (onRetry) {
        await onRetry(attempt);
      }
    },
    [clearTimers, retryState.retryCount, onRetry]
  );

  const reset = useCallback(() => {
    clearTimers();
    setRetryState({
      retryCount: 0,
      isRetrying: false,
      nextRetryIn: 0,
      maxRetriesReached: false,
    });
  }, [clearTimers]);

  return {
    ...retryState,
    retry,
    manualRetry,
    reset,
    canRetry: retryState.retryCount < maxRetries && !retryState.isRetrying,
  };
}

// Utility: wrap any async function with automatic exponential backoff
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; maxDelay?: number } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000 } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 500, maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
