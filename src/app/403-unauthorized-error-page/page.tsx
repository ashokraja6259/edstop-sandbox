// FILE: src/app/403-unauthorized-error-page/page.tsx

'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { createClient } from '../../lib/supabaseClient';

type RestrictionType = 'insufficient_permissions' | 'suspended' | 'unauthenticated';

export default function UnauthorizedErrorPage() {
  const { user } = useAuth();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [requestSent, setRequestSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);

  // Determine restriction type based on auth state
  const restrictionType: RestrictionType = !user
    ? 'unauthenticated' :'insufficient_permissions';

  // Focus heading on mount for screen reader announcement
  useEffect(() => {
    headingRef.current?.focus();

    // Log 403 error event to Supabase
    const logErrorEvent = async () => {
      try {
       
        await supabase.from('error_logs').insert({
          error_type: '403',
          route: typeof window !== 'undefined' ? window.location.href : pathname || '/unknown',
          user_id: user?.id ?? null,
          referrer: typeof document !== 'undefined' ? document.referrer || null : null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          occurred_at: new Date().toISOString(),
        });
      } catch {
        // Silently fail — error logging should never break the UI
      }
    };

    logErrorEvent();
  }, []);

  const handleRequestAccess = async () => {
    setRequestLoading(true);
    // Simulate support ticket creation
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setRequestLoading(false);
    setRequestSent(true);
  };

  const config = {
    insufficient_permissions: {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: 'Access Restricted',
      message: "You don't have permission to access this resource. This area requires elevated privileges.",
      primaryAction: (
        <button
          onClick={handleRequestAccess}
          disabled={requestLoading || requestSent}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-400 hover:to-orange-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0A0A1A] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 min-h-[48px] shadow-lg shadow-amber-500/25"
          aria-label={requestSent ? 'Access request already submitted' : 'Request access to this resource'}
          aria-busy={requestLoading}
        >
          {requestLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting...
            </>
          ) : requestSent ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Request Submitted
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Request Access
            </>
          )}
        </button>
      ),
    },
    suspended: {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      title: 'Account Suspended',
      message: 'Your account has been temporarily suspended. Please contact support to resolve this issue and restore access.',
      primaryAction: null,
    },
    unauthenticated: {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      title: 'Sign In Required',
      message: 'Please log in to access this resource. This page is only available to authenticated users.',
      primaryAction: (
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-[#0A0A1A] transition-all duration-200 min-h-[48px] shadow-lg shadow-purple-500/25"
          aria-label="Sign in to your EdStop account"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Sign In
        </Link>
      ),
    },
  };

  const current = config[restrictionType];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0A0A1A] via-[#12122A] to-[#1A1A35] px-4 py-12"
      role="main"
      aria-labelledby="error-heading"
    >
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-purple-600 text-white px-4 py-2 rounded-lg z-50 focus:outline-none focus:ring-2 focus:ring-purple-400"
      >
        Skip to main content
      </a>

      {/* ARIA live region for dynamic state changes */}
      <div
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {requestSent ? 'Access request submitted successfully. Our team will review your request.' : '403 - Access Restricted'}
      </div>

      <div id="main-content" className="max-w-lg w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center" aria-hidden="true">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <span className="text-white font-bold text-2xl">E</span>
          </div>
        </div>

        {/* Error Illustration */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-[#1A1A35] border border-purple-500/20 flex items-center justify-center shadow-xl">
            {current.icon}
          </div>
          <div aria-hidden="true" className="text-5xl font-black bg-gradient-to-r from-red-400 via-orange-400 to-amber-400 bg-clip-text text-transparent select-none">
            403
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-3">
          <h1
            id="error-heading"
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-bold text-white focus:outline-none"
          >
            {current.title}
          </h1>
          <p className="text-[#8888AA] text-base leading-relaxed">
            {current.message}
          </p>
        </div>

        {/* Request sent confirmation */}
        {requestSent && (
          <div
            role="alert"
            className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm"
          >
            ✓ Your access request has been submitted. Our team will review it within 24 hours.
          </div>
        )}

        {/* Primary Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center" role="group" aria-label="Action options">
          {current.primaryAction}

          {user ? (
            <Link
              href="/student-dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-purple-500/40 text-purple-300 font-semibold rounded-xl hover:bg-purple-600/10 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-[#0A0A1A] transition-all duration-200 min-h-[48px]"
              aria-label="Return to your student dashboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Return to Dashboard
            </Link>
          ) : null}

          <a
            href="mailto:support@edstop.in"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-purple-500/40 text-purple-300 font-semibold rounded-xl hover:bg-purple-600/10 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-[#0A0A1A] transition-all duration-200 min-h-[48px]"
            aria-label="Contact EdStop support via email"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Support
          </a>
        </div>

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="text-sm text-[#8888AA] hover:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-md px-2 py-1 transition-colors duration-150"
          aria-label="Go back to the previous page"
        >
          ← Go back to previous page
        </button>
      </div>
    </div>
  );
}
