// FILE: src/app/login/page.tsx

'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';

type AuthMode = 'email' | 'phone';

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<AuthMode>('email');
  const [isSignUp, setIsSignUp] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

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

  const handleEmailSubmit = async (e: React.FormEvent) => {
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
        await signUp(email, password);
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

  const handleForgotPassword = async () => {
    setError('');
    setSuccess('');

    if (!forgotEmail) {
      setError('Enter your email to reset password.');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(forgotEmail);
      setSuccess('Password reset link sent. Please check your inbox.');
      setShowForgotPassword(false);
      setForgotEmail('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!phone) {
      setError('Please enter your phone number.');
      return;
    }

    try {
      setLoading(true);

      if (!otpSent) {
        await signInWithPhoneOtp(phone);
        setOtpSent(true);
        setSuccess('OTP sent to your phone number.');
        return;
      }

      if (!otp) {
        setError('Please enter the OTP.');
        return;
      }

      await verifyPhoneOtp(phone, otp);
      window.location.assign('/student-dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Phone OTP login failed.');
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
            {authMode === 'phone'
              ? 'Sign in using phone OTP'
              : isSignUp
                ? 'Create your account'
                : 'Sign in to access your account'}
          </p>
        </div>

        <div className="flex rounded-lg border border-gray-200 p-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode('email');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${authMode === 'email' ? 'bg-indigo-600 text-white' : 'text-gray-700'}`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('phone');
              setIsSignUp(false);
              setShowForgotPassword(false);
              setError('');
              setSuccess('');
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${authMode === 'phone' ? 'bg-indigo-600 text-white' : 'text-gray-700'}`}
          >
            Phone OTP
          </button>
        </div>

        {error && (
          <div role="alert" aria-live="assertive" aria-atomic="true" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" id="form-error">
            <span className="sr-only">Error: </span>{error}
          </div>
        )}

        {success && (
          <div role="status" aria-live="polite" aria-atomic="true" className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            <span className="sr-only">Success: </span>{success}
          </div>
        )}

        {authMode === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate aria-describedby="form-description" aria-label={isSignUp ? 'Create account form' : 'Sign in form'}>
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Enter your full name" disabled={loading} autoComplete="name" />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Enter your email" disabled={loading} autoComplete="email" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Enter your password" disabled={loading} autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={6} />
            </div>

            {!isSignUp && (
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(!showForgotPassword);
                  setForgotEmail(email);
                  setError('');
                  setSuccess('');
                }}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Forgot Password?
              </button>
            )}

            {showForgotPassword && (
              <div className="rounded-lg border border-gray-200 p-3 space-y-2">
                <label htmlFor="forgotEmail" className="block text-sm font-medium text-gray-700">Reset Email</label>
                <input id="forgotEmail" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter your account email" disabled={loading} />
                <button type="button" onClick={handleForgotPassword} disabled={loading} className="w-full bg-gray-900 text-white rounded-lg px-4 py-2 text-sm hover:bg-black disabled:opacity-50">
                  Send Reset Link
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loading ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePhoneOtpSubmit} className="space-y-4" noValidate aria-label="Phone OTP sign in form">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="e.g. +919876543210" disabled={loading || otpSent} autoComplete="tel" />
            </div>

            {otpSent && (
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">OTP</label>
                <input id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Enter 6-digit OTP" disabled={loading} />
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Please wait...' : otpSent ? 'Verify OTP & Sign In' : 'Send OTP'}
            </button>

            {otpSent && (
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                  setError('');
                  setSuccess('');
                }}
                className="w-full text-sm text-indigo-600 hover:text-indigo-700"
              >
                Change phone number
              </button>
            )}
          </form>
        )}

        {authMode === 'email' && (
          <div className="text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setShowForgotPassword(false);
                setError('');
                setSuccess('');
              }}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              disabled={loading}
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
