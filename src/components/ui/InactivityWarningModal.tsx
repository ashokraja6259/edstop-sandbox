// FILE: src/components/ui/InactivityWarningModal.tsx

'use client';

import { useEffect, useRef } from 'react';
import Icon from '@/components/ui/AppIcon';

interface InactivityWarningModalProps {
  countdown: number;
  onExtendSession: () => void;
  onLogoutNow: () => void;
}

export default function InactivityWarningModal({
  countdown,
  onExtendSession,
  onLogoutNow,
}: InactivityWarningModalProps) {
  const extendBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    extendBtnRef.current?.focus();
  }, []);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const timeDisplay = minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, '0')}`
    : `${seconds}s`;

  const urgency = countdown <= 30 ? 'high' : countdown <= 60 ? 'medium' : 'low';
  const ringColor =
    urgency === 'high' ? 'text-red-500' :
    urgency === 'medium'? 'text-orange-400' : 'text-yellow-400';
  const progressPercent = (countdown / 120) * 100;
  const progressColor =
    urgency === 'high' ? '#ef4444' :
    urgency === 'medium'? '#f97316' : '#facc15';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inactivity-title"
      aria-describedby="inactivity-desc"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top accent bar */}
        <div
          className="h-1 transition-all duration-1000"
          style={{
            background: `linear-gradient(to right, ${progressColor} ${progressPercent}%, #374151 ${progressPercent}%)`,
          }}
        />

        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
              urgency === 'high' ? 'bg-red-500/20' :
              urgency === 'medium'? 'bg-orange-500/20' : 'bg-yellow-500/20'
            }`}>
              <Icon
                name="ClockIcon"
                className={`w-8 h-8 ${ringColor} ${
                  urgency === 'high' ? 'animate-pulse' : ''
                }`}
              />
            </div>

            <h2
              id="inactivity-title"
              className="text-lg font-bold text-white mb-1"
            >
              Session Expiring Soon
            </h2>
            <p
              id="inactivity-desc"
              className="text-sm text-gray-400"
            >
              You&apos;ve been inactive. To protect your account and prevent lost orders, you&apos;ll be logged out in:
            </p>
          </div>

          {/* Countdown */}
          <div className="flex items-center justify-center mb-6">
            <div className={`text-5xl font-mono font-bold tabular-nums ${ringColor}`}>
              {timeDisplay}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              ref={extendBtnRef}
              onClick={onExtendSession}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <span className="flex items-center justify-center gap-2">
                <Icon name="ArrowPathIcon" className="w-4 h-4" />
                Stay Logged In
              </span>
            </button>

            <button
              onClick={onLogoutNow}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              Logout Now
            </button>
          </div>

          {/* Security note */}
          <p className="text-xs text-gray-600 text-center mt-4">
            <Icon name="ShieldCheckIcon" className="w-3 h-3 inline mr-1" />
            Protecting your account &amp; active orders
          </p>
        </div>
      </div>
    </div>
  );
}
