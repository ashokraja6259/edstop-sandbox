// FILE: src/app/auth/callback/route.ts

import { createClient } from '@/lib/supabase/server';
import { getRecoveryOtpParams } from '@/lib/auth/password-recovery.mjs';
import { getSafeAuthRedirect } from '@/lib/auth/safe-redirect.mjs';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const recoveryOtp = getRecoveryOtpParams(requestUrl.searchParams);
  const next = getSafeAuthRedirect(requestUrl.searchParams.get('next'));

  if (recoveryOtp || code) {
    const supabase = await createClient();
    const { error } = recoveryOtp
      ? await supabase.auth.verifyOtp(recoveryOtp)
      : await supabase.auth.exchangeCodeForSession(code!);

    if (error) {
      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set(
        'authError',
        recoveryOtp ? 'recovery_link_invalid' : 'callback_failed'
      );
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
