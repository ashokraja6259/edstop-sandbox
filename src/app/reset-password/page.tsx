// FILE: src/app/reset-password/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const checkResetSession = async () => {
      setCheckingSession(true);
      setError('');

      try {
        const supabase = createClient();

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          setCanReset(false);
          setError(
            'Reset session is missing or expired. Please request a new password reset link from the login page.'
          );
          return;
        }

        setCanReset(true);
      } catch (err: unknown) {
        setCanReset(false);
        setError(
          err instanceof Error
            ? err.message
            : 'Could not verify your reset session. Please request a new password reset link.'
        );
      } finally {
        setCheckingSession(false);
      }
    };

    void checkResetSession();
  }, []);

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!canReset) {
      setError('Please use a valid password reset link.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      await supabase.auth.signOut();

      setSuccess('Password updated successfully. Redirecting to login...');

      setTimeout(() => {
        router.replace('/login');
      }, 1200);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to update password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/25 via-purple-600/15 to-pink-500/20" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-purple-500/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <section className="w-full rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-xl">
          <Link href="/" className="mb-8 inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-xl font-black">
              E
            </div>
            <div>
              <p className="text-lg font-black leading-none">EdStop</p>
              <p className="text-xs text-white/50">Password Recovery</p>
            </div>
          </Link>

          <h1 className="text-3xl font-black">Reset Password</h1>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Set a new password for your EdStop account.
          </p>

          {checkingSession && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
              Verifying reset session...
            </div>
          )}

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

          <form onSubmit={handleReset} className="mt-6 space-y-4">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading || checkingSession || !canReset}
            />

            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading || checkingSession || !canReset}
            />

            <button
              type="submit"
              disabled={loading || checkingSession || !canReset}
              className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-white/55">
            Need a new link?{' '}
            <Link
              href="/login"
              className="font-black text-purple-300 hover:text-purple-200"
            >
              Go to login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}