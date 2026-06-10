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
  'Lost & Found coming soon',
  'Buy & Sell coming soon',
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
    signInWithPhoneOtp,
    verifyPhoneOtp,
  } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      window.location.assign('/student-dashboard');
    }
  }, [authLoading, user]);

  const resetMessages = () => {
    setError('');
    setSuccess('');
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
        await signUp(normalizedEmail, password);
        setSuccess('Account created. Please check your email to verify your account.');
        setEmail('');
        setPassword('');
        setFullName('');
        setAcceptedTerms(false);
      } else {
        await signIn(normalizedEmail, password);
        window.location.assign('/student-dashboard');
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
      window.location.assign('/student-dashboard');
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
              dark store essentials, track order history, and unlock upcoming
              student-first campus features.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {features.map((feature) => (
                <div
                  key={feature}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/75 backdrop-blur"
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md lg:max-w-none">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-xl font-black">
                E
              </div>
              <div>
                <p className="text-lg font-black leading-none">EdStop</p>
                <p className="text-xs text-white/50">Campus Super App</p>
              </div>
            </Link>
            <Link href="/" className="text-sm text-white/60 hover:text-white">
              Home
            </Link>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-2xl font-black shadow-lg shadow-purple-500/25">
                E
              </div>

              <h1 className="mt-5 text-2xl font-black">
                {authMode === 'phone'
                  ? 'Sign in with OTP'
                  : isSignUp
                    ? 'Create your EdStop account'
                    : 'Welcome back'}
              </h1>

              <p className="mt-2 text-sm text-white/55" id="form-description">
                {authMode === 'phone'
                  ? 'Use your mobile number to continue.'
                  : isSignUp
                    ? 'Join EdStop and complete your campus profile after signup.'
                    : 'Sign in to access your dashboard.'}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-slate-950/45 p-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('email');
                  resetMessages();
                }}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  authMode === 'email'
                    ? 'bg-white text-slate-950'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                Email
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('phone');
                  setIsSignUp(false);
                  setShowForgotPassword(false);
                  resetMessages();
                }}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  authMode === 'phone'
                    ? 'bg-white text-slate-950'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                Phone OTP
              </button>
            </div>

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                id="form-error"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
              >
                {success}
              </div>
            )}

            {authMode === 'email' ? (
              <form
                onSubmit={handleEmailSubmit}
                className="mt-6 space-y-4"
                noValidate
                aria-describedby="form-description"
                aria-label={isSignUp ? 'Create account form' : 'Sign in form'}
              >
                {isSignUp && (
                  <div>
                    <label htmlFor="fullName" className="mb-1.5 block text-xs font-semibold text-white/60">
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className={inputClassName}
                      placeholder="Enter your full name"
                      disabled={loading}
                      autoComplete="name"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-white/60">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClassName}
                    placeholder="you@example.com"
                    disabled={loading}
                    autoComplete="email"
                  />
                  {isSignUp && (
                    <p className="mt-1.5 text-xs text-white/40">
                      Any email is allowed for launch. Campus verification can be completed later.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-white/60">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={inputClassName}
                    placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                    disabled={loading}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    minLength={6}
                  />
                </div>

                {isSignUp && (
                  <label className="flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-left">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) => setAcceptedTerms(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 accent-purple-500"
                      disabled={loading}
                    />
                    <span className="text-xs leading-5 text-white/60">
                      I agree to EdStop&apos;s{' '}
                      <Link href="/terms" className="text-purple-300 hover:text-purple-200">
                        Terms & Conditions
                      </Link>
                      ,{' '}
                      <Link href="/privacy" className="text-purple-300 hover:text-purple-200">
                        Privacy Policy
                      </Link>
                      , and launch usage guidelines.
                    </span>
                  </label>
                )}

                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(!showForgotPassword);
                      setForgotEmail(email);
                      resetMessages();
                    }}
                    className="text-sm font-semibold text-purple-300 hover:text-purple-200"
                  >
                    Forgot Password?
                  </button>
                )}

                {showForgotPassword && (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 space-y-2">
                    <label htmlFor="forgotEmail" className="block text-xs font-semibold text-white/60">
                      Reset Email
                    </label>
                    <input
                      id="forgotEmail"
                      type="email"
                      value={forgotEmail}
                      onChange={(event) => setForgotEmail(event.target.value)}
                      className={smallInputClassName}
                      placeholder="Enter your account email"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-white/90 disabled:opacity-50"
                    >
                      Send Reset Link
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (isSignUp && !acceptedTerms)}
                  className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-purple-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? isSignUp
                      ? 'Creating Account...'
                      : 'Signing In...'
                    : isSignUp
                      ? 'Create Account'
                      : 'Sign In'}
                </button>
              </form>
            ) : (
              <form
                onSubmit={handlePhoneOtpSubmit}
                className="mt-6 space-y-4"
                noValidate
                aria-label="Phone OTP sign in form"
              >
                <div>
                  <label htmlFor="phone" className="mb-1.5 block text-xs font-semibold text-white/60">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className={inputClassName}
                    placeholder="e.g. +919876543210"
                    disabled={loading || otpSent}
                    autoComplete="tel"
                  />
                  <p className="mt-1.5 text-xs text-white/40">
                    Phone OTP requires Supabase SMS provider configuration.
                  </p>
                </div>

                {otpSent && (
                  <div>
                    <label htmlFor="otp" className="mb-1.5 block text-xs font-semibold text-white/60">
                      OTP
                    </label>
                    <input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value)}
                      className={inputClassName}
                      placeholder="Enter 6-digit OTP"
                      disabled={loading}
                      inputMode="numeric"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-purple-500/20 transition hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? 'Please wait...' : otpSent ? 'Verify OTP & Sign In' : 'Send OTP'}
                </button>

                {otpSent && (
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                      resetMessages();
                    }}
                    className="w-full text-sm font-semibold text-purple-300 hover:text-purple-200"
                  >
                    Change phone number
                  </button>
                )}
              </form>
            )}

            {authMode === 'email' && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setShowForgotPassword(false);
                    setAcceptedTerms(false);
                    resetMessages();
                  }}
                  className="text-sm font-semibold text-purple-300 hover:text-purple-200"
                  disabled={loading}
                >
                  {isSignUp
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Sign Up"}
                </button>
              </div>
            )}

            <div className="mt-6 border-t border-white/10 pt-5 text-center">
              <Link href="/" className="text-xs text-white/45 hover:text-white">
                Back to EdStop landing page
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}