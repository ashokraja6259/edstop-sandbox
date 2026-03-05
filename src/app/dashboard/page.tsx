// FILE: src/app/dashboard/page.tsx

'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // If no user after hydration, redirect
  useEffect(() => {
    if (user === null) {
      router.replace('/login');
    }
  }, [user, router]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      router.push('/login');
    } catch (error: any) {
      console.error('Logout error:', error?.message);
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600">Welcome back to EdStop!</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="bg-red-600 text-white rounded-lg px-6 py-2.5 font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loggingOut ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>

          {user && (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-indigo-900 mb-3">
                  Account Information
                </h2>
                <p className="text-sm text-indigo-900">{user.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}