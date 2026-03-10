// FILE: src/app/unauthorized/page.tsx

'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
    const router = useRouter();

    return (
        <main
            className="min-h-screen flex flex-col items-center justify-center bg-background p-4 gradient-mesh"
            role="main"
            aria-labelledby="error-heading"
        >
            {/* Skip link for keyboard users */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
                Skip to main content
            </a>

            <div id="main-content" className="text-center max-w-lg w-full">
                {/* Animated 403 illustration */}
                <div className="flex justify-center mb-8" aria-hidden="true">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-destructive/10 blur-3xl scale-150" />
                        <div className="relative glass-card rounded-3xl p-8 border border-destructive/30">
                            <div className="text-[7rem] font-bold leading-none bg-gradient-to-br from-red-400 to-rose-600 bg-clip-text text-transparent select-none">
                                403
                            </div>
                            {/* Lock icon */}
                            <div className="flex justify-center mt-2">
                                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error message */}
                <h1
                    id="error-heading"
                    className="text-3xl font-bold text-foreground mb-3"
                >
                    Access Denied
                </h1>
                <p className="text-muted-foreground text-base mb-2 leading-relaxed">
                    You don&apos;t have permission to access this page.
                </p>
                <p className="text-muted-foreground text-sm mb-8">
                    Please log in with an authorized account or contact support if you believe this is a mistake.
                </p>

                {/* Action buttons */}
                <nav aria-label="Error page navigation" className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 border border-border bg-surface text-foreground px-6 py-3 rounded-xl font-medium hover:bg-muted transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                        aria-label="Go to login page"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Sign In
                    </Link>

                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 gradient-primary text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                        aria-label="Navigate to home page"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Back to Home
                    </Link>
                </nav>

                {/* What you can do section */}
                <div className="glass-card rounded-2xl p-5 border border-border mb-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        What can you do?
                    </h2>
                    <ul className="text-sm text-muted-foreground space-y-2 text-left" role="list">
                        <li className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Check that you&apos;re logged in with the correct account
                        </li>
                        <li className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Verify your account has the required permissions
                        </li>
                        <li className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Contact support if you need access granted
                        </li>
                    </ul>
                </div>

                {/* Contact support */}
                <div className="glass-card rounded-2xl p-5 border border-border">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Contact Support
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                            href="mailto:support@edstop.in"
                            className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-lg px-3 py-1.5"
                            aria-label="Send email to EdStop support team"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            support@edstop.in
                        </a>
                        <a
                            href="tel:+911800000000"
                            className="inline-flex items-center justify-center gap-2 text-sm text-accent hover:text-accent/80 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-lg px-3 py-1.5"
                            aria-label="Call EdStop support helpline"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            1800-000-0000
                        </a>
                    </div>
                </div>
            </div>
        </main>
    );
}
