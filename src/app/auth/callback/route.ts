// FILE: src/app/auth/callback/route.ts

import { createClient } from '@/lib/supabase/server';
import { getSafeAuthRedirect } from '@/lib/auth/safe-redirect.mjs';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = getSafeAuthRedirect(requestUrl.searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set('authError', 'callback_failed');
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
