// FILE: src/app/login/page.tsx


'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { signIn, signUp, user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      window.location.assign('/student-dashboard');
    }
  }, [authLoading, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (isSignUp && !fullName) {
      setError('Please enter your full name');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);

      if (isSignUp) {
        await signUp(email, password, { fullName });
        setSuccess('Account created! Please check your email to verify your account.');
        setEmail('');
        setPassword('');
        setFullName('');
      } else {
        await signIn(email, password);
        window.location.assign('/student-dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `Failed to ${isSignUp ? 'sign up' : 'sign in'}`;
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  return (
   
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <AppLogo className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to EdStop</h1>
          <p className="mt-2 text-sm text-gray-600" id="form-description">
            {isSignUp ? 'Create your account' : 'Sign in to access your account'}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
            id="form-error"
          >
            <span className="sr-only">Error: </span>{error}
          </div>
        )}

        {success && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm"
          >
            <span className="sr-only">Success: </span>{success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
          aria-describedby="form-description"
          aria-label={isSignUp ? 'Create account form' : 'Sign in form'}
        >
          {isSignUp && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span aria-hidden="true" className="text-red-500">*</span>
                <span className="sr-only">(required)</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your full name"
                disabled={loading}
                autoComplete="name"
                aria-required="true"
                aria-describedby={error && !fullName ? 'form-error' : undefined}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span aria-hidden="true" className="text-red-500">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter your email"
              disabled={loading}
              autoComplete="email"
              aria-required="true"
              aria-describedby={error ? 'form-error' : undefined}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password <span aria-hidden="true" className="text-red-500">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter your password"
              disabled={loading}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              aria-required="true"
              aria-describedby={error ? 'form-error' : undefined}
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-busy={loading}
            aria-label={loading ? (isSignUp ? 'Creating account, please wait' : 'Signing in, please wait') : (isSignUp ? 'Create account' : 'Sign in')}
          >
            {loading ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccess('');
            }}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md px-1"
            disabled={loading}
            aria-label={isSignUp ? 'Switch to sign in form' : 'Switch to create account form'}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
