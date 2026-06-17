// FILE: src/app/login/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

type AuthMode = 'email' | 'phone';

const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/30 disabled:cursor-not-allowed disabled:opacity-60';

const smallInputClassName =
  'w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/30 disabled:cursor-not-allowed disabled:opacity-60';

const features = [
  'Food ordering',
  'Dark store essentials',
  'Order history',
  'Wallet balance',
  'Lost & Found live',
  'Buy & Sell marketplace live',
];

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<AuthMode>('email');
  const [isSignUp, setIsSignUp] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    signIn,
    signUp,
    user,
    loading: authLoading,
    resetPassword,
    resendVerificationEmail,
    signInWithPhoneOtp,
    verifyPhoneOtp,
  } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      window.location.assign('/login');
    }
  }, [authLoading, user]);

  const isAllowedLaunchEmail = (value: string) => {
    const normalized = value.trim().toLowerCase();

    return (
      normalized.endsWith('@kgpian.iitkgp.ac.in') ||
      normalized.endsWith('@iitkgp.ac.in') ||
      normalized.endsWith('@gmail.com')
    );
  };

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (isSignUp && !fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (isSignUp && !isAllowedLaunchEmail(normalizedEmail)) {
      setError(
        'Please use your IIT KGP email. For launch testing, Gmail is also allowed.'
      );
      return;
    }

    if (isSignUp && !acceptedTerms) {
      setError('Please accept EdStop Terms and Privacy Policy to continue.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);

      if (isSignUp) {
        await signUp(normalizedEmail, password, fullName);
        setSuccess(
          `Verification email sent to ${normalizedEmail}. Please open the email and confirm your account before signing in.`
        );
        setPassword('');
        setFullName('');
        setAcceptedTerms(false);
      } else {
        await signIn(normalizedEmail, password);
        window.location.assign('/login');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : `Failed to ${isSignUp ? 'sign up' : 'sign in'}`;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccess('');

    const normalizedEmail = forgotEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Enter your email to reset password.');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(normalizedEmail);
      setSuccess('Password reset link sent. Please check your inbox.');
      setShowForgotPassword(false);
      setForgotEmail('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError('');
    setSuccess('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Enter your email address first.');
      return;
    }

    if (!isAllowedLaunchEmail(normalizedEmail)) {
      setError(
        'Please use your IIT KGP email. For launch testing, Gmail is also allowed.'
      );
      return;
    }

    try {
      setLoading(true);
      await resendVerificationEmail(normalizedEmail);
      setSuccess(`Verification email resent to ${normalizedEmail}.`);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to resend verification email.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneOtpSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }

    try {
      setLoading(true);

      if (!otpSent) {
        await signInWithPhoneOtp(phone.trim());
        setOtpSent(true);
        setSuccess('OTP sent to your phone number.');
        return;
      }

      if (!otp.trim()) {
        setError('Please enter the OTP.');
        return;
      }

      await verifyPhoneOtp(phone.trim(), otp.trim());
      window.location.assign('/login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Phone OTP login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/25 via-purple-600/15 to-pink-500/20" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-purple-500/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-8 px-4 py-6 lg:grid-cols-[1fr_440px] lg:items-center lg:py-10">
        <section className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-xl font-black shadow-lg shadow-purple-500/25">
              E
            </div>
            <div>
              <p className="text-xl font-black leading-none">EdStop</p>
              <p className="text-xs text-white/50">Campus Super App</p>
            </div>
          </Link>

          <div className="mt-16 max-w-xl">
            <div className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur">
              Built for faster campus life
            </div>

            <h1 className="text-5xl font-black tracking-tight">
              One account for food, essentials, orders, and student services.
            </h1>

            <p className="mt-6 text-base leading-7 text-white/65">
              Sign in to manage your EdStop profile, place COD orders, access
              dark store essentials, track order history, post Lost & Found
              items, and use the campus Buy & Sell marketplace.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {features.map((feature) => (
                <div
                  key={feature}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white/75"
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-xl sm:p-7">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-xl font-black">
                E
              </div>
              <div>
                <p className="text-lg font-black leading-none">EdStop</p>
                <p className="text-xs text-white/50">Campus Super App</p>
              </div>
            </Link>

            <Link
              href="/"
              className="ml-auto text-sm font-semibold text-white/55 hover:text-white"
            >
              Home
            </Link>
          </div>

          <div>
            <h2 className="text-3xl font-black">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/55">
              {isSignUp
                ? 'Join EdStop and start using campus services.'
                : 'Sign in to continue to your dashboard.'}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('email');
                setError('');
                setSuccess('');
              }}
              className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
                authMode === 'email'
                  ? 'bg-white text-slate-950'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('phone');
                setError('');
                setSuccess('');
              }}
              className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
                authMode === 'phone'
                  ? 'bg-white text-slate-950'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Phone OTP
            </button>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              {success}
            </div>
          )}

          {authMode === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
              {isSignUp && (
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Full name"
                  className={inputClassName}
                  disabled={loading}
                />
              )}

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className={inputClassName}
                disabled={loading}
              />

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className={inputClassName}
                disabled={loading}
              />

              {isSignUp && (
                <label className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-white/65">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10"
                    disabled={loading}
                  />
                  <span>
                    I agree to EdStop{' '}
                    <Link href="/terms" className="font-bold text-purple-300">
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="font-bold text-purple-300">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={loading || authLoading}
                className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
              </button>

              {!isSignUp && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword((value) => !value)}
                    className="font-semibold text-white/55 hover:text-white"
                  >
                    Forgot password?
                  </button>

                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="font-semibold text-purple-300 hover:text-purple-200 disabled:opacity-60"
                  >
                    Resend verification
                  </button>
                </div>
              )}

              {showForgotPassword && (
                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                    placeholder="Reset email"
                    className={smallInputClassName}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="w-full rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-purple-400 disabled:opacity-60"
                  >
                    Send reset link
                  </button>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handlePhoneOtpSubmit} className="mt-6 space-y-4">
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone number with country code"
                className={inputClassName}
                disabled={loading}
              />

              {otpSent && (
                <input
                  type="text"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="Enter OTP"
                  className={inputClassName}
                  disabled={loading}
                />
              )}

              <button
                type="submit"
                disabled={loading || authLoading}
                className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Please wait...' : otpSent ? 'Verify OTP' : 'Send OTP'}
              </button>

              <p className="text-xs leading-5 text-white/45">
                Phone OTP depends on Supabase SMS provider configuration. Use
                email login if OTP is not enabled yet.
              </p>
            </form>
          )}

          {authMode === 'email' && (
            <div className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-white/55">
              {isSignUp ? 'Already have an account?' : 'New to EdStop?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp((value) => !value);
                  setError('');
                  setSuccess('');
                  setShowForgotPassword(false);
                }}
                className="font-black text-purple-300 hover:text-purple-200"
              >
                {isSignUp ? 'Sign in' : 'Create account'}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}