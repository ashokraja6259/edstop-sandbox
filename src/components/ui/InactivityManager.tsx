// FILE: src/components/ui/InactivityManager.tsx

'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useInactivity } from '@/hooks/useInactivity';
import InactivityWarningModal from '@/components/ui/InactivityWarningModal';

export default function InactivityManager() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const handleAutoLogout = useCallback(async () => {
    try {
      await signOut();
    } catch {
      // ignore signOut errors during auto-logout
    }
    toast?.warning('You were logged out due to 30 minutes of inactivity.');
    router?.push('/login');
  }, [signOut, router, toast]);

  const { showWarning, countdown, extendSession } = useInactivity({
    onLogout: handleAutoLogout,
    enabled: !!user,
  });

  const handleLogoutNow = useCallback(async () => {
    try {
      await signOut();
    } catch {
      // ignore
    }
    router?.push('/login');
  }, [signOut, router]);

  if (!showWarning) return null;

  return (
    <InactivityWarningModal
      countdown={countdown}
      onExtendSession={extendSession}
      onLogoutNow={handleLogoutNow}
    />
  );
}
