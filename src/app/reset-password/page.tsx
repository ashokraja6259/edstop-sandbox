'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      setSuccess('Password updated successfully. Redirecting to login...');
      setTimeout(() => {
        router.replace('/login');
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
        <p className="text-sm text-gray-600 mt-1">Set a new password for your EdStop account.</p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-4 text-sm text-green-600">{success}</p>}

        <form onSubmit={handleReset} className="mt-4 space-y-3">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
