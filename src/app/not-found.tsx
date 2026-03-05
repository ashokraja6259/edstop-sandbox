// FILE: src/app/not-found.tsx

'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
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
                {/* Animated 404 illustration */}
                <div className="flex justify-center mb-8" aria-hidden="true">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl scale-150" />
                        <div className="relative glass-card rounded-3xl p-8 border border-primary/30">
                            <div className="text-[7rem] font-bold leading-none gradient-primary bg-clip-text text-transparent select-none">
                                404
                            </div>
                            <div className="flex justify-center gap-3 mt-2">
                                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error message */}
                <h1
                    id="error-heading"
                    className="text-3xl font-bold text-foreground mb-3"
                >
                    Page Not Found
                </h1>
                <p className="text-muted-foreground text-base mb-8 leading-relaxed">
                    Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    Let&apos;s get you back on track.
                </p>

                {/* Action buttons */}
                <nav aria-label="Error page navigation" className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
                    <button
                        onClick={() => router?.back()}
                        className="inline-flex items-center justify-center gap-2 border border-border bg-surface text-foreground px-6 py-3 rounded-xl font-medium hover:bg-muted transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                        aria-label="Go back to previous page"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Go Back
                    </button>

                    <Link
                        href="/student-dashboard"
                        className="inline-flex items-center justify-center gap-2 gradient-primary text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                        aria-label="Navigate to home page"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Back to Home
                    </Link>
                </nav>

                {/* Contact support */}
                <div className="glass-card rounded-2xl p-5 border border-border">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Need Help?
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        If you believe this is an error, our support team is here to help.
                    </p>
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
                        <Link
                            href="/student-dashboard"
                            className="inline-flex items-center justify-center gap-2 text-sm text-accent hover:text-accent/80 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-lg px-3 py-1.5"
                            aria-label="Visit EdStop help center"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Help Center
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}