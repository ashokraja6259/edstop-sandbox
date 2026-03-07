// FILE: src/app/404-not-found-error-page/page.tsx

'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabaseClient';

export default function NotFoundErrorPage() {
  const { user } = useAuth();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Focus heading on mount for screen reader announcement
  useEffect(() => {
    headingRef?.current?.focus();

    // Log 404 error event to Supabase
    const logErrorEvent = async () => {
      try {
        const supabase = createClient();
        await supabase?.from('error_logs')?.insert({
          error_type: '404',
          route: typeof window !== 'undefined' ? window.location?.href : pathname || '/unknown',
          user_id: user?.id ?? null,
          referrer: typeof document !== 'undefined' ? document.referrer || null : null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          occurred_at: new Date()?.toISOString(),
        });
      } catch {
        // Silently fail — error logging should never break the UI
      }
    };

    logErrorEvent();
  }, []);

  const dashboardHref = user ? '/student-dashboard' : '/login';
  const dashboardLabel = user ? 'Return to Dashboard' : 'Go to Login';

  const popularDestinations = user
    ? [
        { label: 'Student Dashboard', href: '/student-dashboard' },
        { label: 'Food Ordering', href: '/food-ordering-interface' },
        { label: 'Dark Store', href: '/dark-store-shopping' },
        { label: 'AI Companion', href: '/ai-companion-interface' },
        { label: 'Wallet', href: '/wallet' },
      ]
    : [
        { label: 'Login', href: '/login' },
        { label: 'Home', href: '/' },
      ];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0A0A1A] via-[#12122A] to-[#1A1A35] px-4 py-12"
      role="main"
      aria-labelledby="error-heading"
    >
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-purple-600 text-white px-4 py-2 rounded-lg z-50 focus:outline-none focus:ring-2 focus:ring-purple-400"
      >
        Skip to main content
      </a>
      {/* ARIA live region for dynamic announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="page-announcer">
        404 - Page Not Found
      </div>
      <div id="main-content" className="max-w-lg w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center" aria-hidden="true">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <span className="text-white font-bold text-2xl">E</span>
          </div>
        </div>

        {/* Error Illustration */}
        <div aria-hidden="true" className="relative">
          <div className="text-[8rem] font-black leading-none bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-purple-600/10 blur-2xl" />
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
            Page Not Found
          </h1>
          <p className="text-[#8888AA] text-base leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            It may have been deleted or the URL might be incorrect.
          </p>
        </div>

        {/* Primary Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center" role="group" aria-label="Navigation options">
          <Link
            href={dashboardHref}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-[#0A0A1A] transition-all duration-200 min-h-[48px] shadow-lg shadow-purple-500/25"
            aria-label={`${dashboardLabel} - Navigate to your main page`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {dashboardLabel}
          </Link>

          <a
            href="mailto:support@edstop.in"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-purple-500/40 text-purple-300 font-semibold rounded-xl hover:bg-purple-600/10 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-[#0A0A1A] transition-all duration-200 min-h-[48px]"
            aria-label="Contact support via email at support@edstop.in"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Support
          </a>
        </div>

        {/* Popular Destinations */}
        <nav aria-label="Popular destinations" className="pt-4">
          <p className="text-[#8888AA] text-sm mb-3 font-medium">Or explore these pages:</p>
          <ul className="flex flex-wrap gap-2 justify-center" role="list">
            {popularDestinations?.map((dest) => (
              <li key={dest?.href}>
                <Link
                  href={dest?.href}
                  className="px-4 py-2 rounded-lg bg-[#1A1A35] border border-purple-500/20 text-[#C8C8E8] text-sm hover:bg-purple-600/15 hover:border-purple-500/40 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1 focus:ring-offset-[#0A0A1A] transition-all duration-150 min-h-[40px] inline-flex items-center"
                >
                  {dest?.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Back button */}
        <button
          onClick={() => router?.back()}
          className="text-sm text-[#8888AA] hover:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-md px-2 py-1 transition-colors duration-150"
          aria-label="Go back to the previous page"
        >
          ← Go back to previous page
        </button>
      </div>
    </div>
  );
}
