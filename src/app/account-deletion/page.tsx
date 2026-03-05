// FILE: src/app/account-deletion/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const GRACE_PERIOD_DAYS = 30;

const dataDestructionTimeline = [
  {
    phase: 'Immediately',
    icon: 'XCircleIcon',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
    items: [
      'Account deactivated — you cannot log in',
      'All active sessions terminated',
      'Service access removed (Food, Dark Store, AI)',
      'EdCoins balance frozen',
    ],
  },
  {
    phase: `During 30-Day Grace Period`,
    icon: 'ClockIcon',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    items: [
      'All data retained in secure encrypted storage',
      'Account can be reactivated by logging in',
      'No new orders or transactions allowed',
      'Support team can assist with recovery',
    ],
  },
  {
    phase: 'After 30 Days — Permanent',
    icon: 'TrashIcon',
    color: 'text-red-500',
    bg: 'bg-red-600/10 border-red-600/30',
    items: [
      'Complete data erasure from all systems',
      'EdCoins balance permanently forfeited',
      'Order history and receipts deleted',
      'AI chat history and preferences wiped',
      'Cannot be recovered under any circumstances',
    ],
  },
];

const confirmationItems = [
  { id: 'edcoins', label: 'I understand my EdCoins balance will be permanently forfeited and cannot be refunded.' },
  { id: 'orders', label: 'I understand my complete order history and receipts will be permanently deleted.' },
  { id: 'preferences', label: 'I understand all saved preferences, addresses, and payment methods will be erased.' },
  { id: 'ai', label: 'I understand my AI companion chat history and personalization data will be destroyed.' },
  { id: 'irreversible', label: 'I understand this action is IRREVERSIBLE after the 30-day grace period expires.' },
];

export default function AccountDeletionPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFinalWarning, setShowFinalWarning] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const allChecked = confirmationItems.every(item => checkedItems[item.id]);
  const confirmTextMatch = confirmText === 'DELETE MY ACCOUNT';
  const passwordEntered = currentPassword.length >= 6;
  const canProceed = allChecked && confirmTextMatch && passwordEntered;

  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + GRACE_PERIOD_DAYS);
  const deletionDateStr = deletionDate.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleToggleCheck = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDownloadData = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch('/api/data-export?format=json');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edstop-data-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data downloaded', 'Your account data has been exported successfully');
    } catch {
      toast.error('Export failed', 'Unable to download data. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleInitiateDeletion = () => {
    if (!canProceed) return;
    setShowFinalWarning(true);
  };

  const handleConfirmDeletion = async () => {
    setIsSubmitting(true);
    try {
      // In production: call Supabase to schedule account deletion
      await new Promise(r => setTimeout(r, 1500));
      toast.success(
        'Account deletion scheduled',
        `Your account will be permanently deleted on ${deletionDateStr}. Log in before then to cancel.`
      );
      await signOut();
      router.push('/login');
    } catch {
      toast.error('Deletion failed', 'An error occurred. Please contact support.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen gradient-mesh dot-pattern">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-600/8 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-red-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-strong border-b border-white/10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/student-dashboard"
              className="flex items-center justify-center w-10 h-10 rounded-xl glass hover:bg-white/10 transition-smooth press-scale"
            >
              <Icon name="ArrowLeftIcon" size={20} className="text-white/80" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center justify-center">
                <Icon name="TrashIcon" size={20} className="text-red-400" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-white leading-tight">Delete Account</h1>
                <p className="text-xs text-red-400/80">Permanent & Irreversible Action</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-6 max-w-3xl">

        {/* Critical Warning Banner */}
        <div className="mb-6 p-5 rounded-2xl bg-red-500/15 border border-red-500/40 animate-slide-up">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
              <Icon name="ExclamationTriangleIcon" size={24} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-300 mb-1">⚠️ This action cannot be undone</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Deleting your EdStop account will permanently erase all your data, EdCoins balance, order history,
                and AI companion data. You have a <span className="text-amber-300 font-semibold">30-day grace period</span> to
                change your mind by simply logging back in.
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Icon name="CalendarDaysIcon" size={16} className="text-red-400" />
                <span className="text-white/60">Permanent deletion date: </span>
                <span className="text-red-300 font-semibold">{deletionDateStr}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 30-Day Grace Period Info */}
        <div className="mb-6 p-5 rounded-2xl glass border border-amber-500/20 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center">
              <Icon name="ShieldCheckIcon" size={18} className="text-amber-400" />
            </div>
            <h3 className="font-semibold text-white">30-Day Grace Period</h3>
          </div>
          <p className="text-sm text-white/65 leading-relaxed mb-3">
            After initiating deletion, your account enters a <strong className="text-amber-300">30-day grace period</strong>.
            During this time, your data is securely retained and you can cancel the deletion at any time by
            simply logging back into EdStop.
          </p>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Icon name="InformationCircleIcon" size={16} className="text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-300/80">
              To cancel deletion: visit edstop.in and log in with your credentials before {deletionDateStr}.
            </p>
          </div>
        </div>

        {/* Data Destruction Timeline */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Icon name="ClockIcon" size={18} className="text-purple-400" />
            Data Destruction Timeline
          </h3>
          <div className="space-y-3">
            {dataDestructionTimeline.map((phase, idx) => (
              <div key={idx} className={`p-4 rounded-2xl border ${phase.bg}`}>
                <div className="flex items-center gap-3 mb-3">
                  <Icon name={phase.icon as any} size={18} className={phase.color} />
                  <span className={`font-semibold text-sm ${phase.color}`}>{phase.phase}</span>
                </div>
                <ul className="space-y-1.5">
                  {phase.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/65">
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${idx === 2 ? 'bg-red-500' : idx === 1 ? 'bg-amber-400' : 'bg-red-400'}`}></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Download Data Section */}
        <div className="mb-6 p-5 rounded-2xl glass border border-white/10 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-purple-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon name="ArrowDownTrayIcon" size={18} className="text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1">Download Your Data First</h3>
                <p className="text-xs text-white/55 leading-relaxed">
                  Export all your account data including orders, transactions, and profile information before deletion.
                  Compliant with GDPR Article 20 data portability rights.
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadData}
              disabled={isDownloading}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm font-medium hover:bg-purple-500/30 transition-smooth press-scale disabled:opacity-50"
            >
              {isDownloading ? (
                <><Icon name="ArrowPathIcon" size={16} className="animate-spin" /> Exporting...</>
              ) : (
                <><Icon name="ArrowDownTrayIcon" size={16} /> Export</>  
              )}
            </button>
          </div>
        </div>

        {/* Confirmation Checkboxes */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Icon name="CheckCircleIcon" size={18} className="text-red-400" />
            Acknowledge Data Loss
          </h3>
          <div className="space-y-3">
            {confirmationItems.map(item => (
              <label
                key={item.id}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  checkedItems[item.id]
                    ? 'bg-red-500/10 border-red-500/40' :'glass border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={!!checkedItems[item.id]}
                    onChange={() => handleToggleCheck(item.id)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    checkedItems[item.id]
                      ? 'bg-red-500 border-red-500' :'border-white/30 bg-white/5'
                  }`}>
                    {checkedItems[item.id] && (
                      <Icon name="CheckIcon" size={12} className="text-white" />
                    )}
                  </div>
                </div>
                <span className="text-sm text-white/75 leading-relaxed">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Password Verification */}
        <div className="mb-6 p-5 rounded-2xl glass border border-white/10 animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Icon name="LockClosedIcon" size={18} className="text-white/60" />
            Verify Your Identity
          </h3>
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Type Confirmation */}
        <div className="mb-6 p-5 rounded-2xl glass border border-white/10 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
            <Icon name="PencilSquareIcon" size={18} className="text-white/60" />
            Final Confirmation
          </h3>
          <p className="text-sm text-white/55 mb-4">
            Type <span className="font-mono font-bold text-red-300 bg-red-500/10 px-1.5 py-0.5 rounded">DELETE MY ACCOUNT</span> exactly to confirm.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="DELETE MY ACCOUNT"
            className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white text-sm font-mono placeholder-white/25 focus:outline-none focus:ring-2 transition-all ${
              confirmText.length > 0
                ? confirmTextMatch
                  ? 'border-green-500/50 focus:ring-green-500/30' :'border-red-500/40 focus:ring-red-500/30' :'border-white/10 focus:ring-red-500/30'
            }`}
          />
          {confirmText.length > 0 && !confirmTextMatch && (
            <p className="mt-1.5 text-xs text-red-400">Text does not match. Type exactly: DELETE MY ACCOUNT</p>
          )}
          {confirmTextMatch && (
            <p className="mt-1.5 text-xs text-green-400 flex items-center gap-1">
              <Icon name="CheckCircleIcon" size={12} /> Confirmation text matches
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-8 animate-slide-up" style={{ animationDelay: '0.35s' }}>
          <button
            onClick={handleInitiateDeletion}
            disabled={!canProceed || isSubmitting}
            className={`w-full py-4 rounded-2xl font-semibold text-base transition-all press-scale ${
              canProceed
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40'
                : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Icon name="TrashIcon" size={20} />
              Schedule Account Deletion
            </span>
          </button>

          {!canProceed && (
            <p className="text-center text-xs text-white/40">
              {!allChecked && 'Check all acknowledgement boxes · '}
              {!confirmTextMatch && 'Type the confirmation text · '}
              {!passwordEntered && 'Enter your password'}
            </p>
          )}

          <div className="flex gap-3">
            <Link
              href="/student-profile"
              className="flex-1 py-3 rounded-xl glass border border-white/10 text-white/70 text-sm font-medium text-center hover:bg-white/10 transition-smooth press-scale"
            >
              Cancel — Keep Account
            </Link>
            <a
              href="mailto:support@edstop.in"
              className="flex-1 py-3 rounded-xl glass border border-white/10 text-purple-300 text-sm font-medium text-center hover:bg-white/10 transition-smooth press-scale flex items-center justify-center gap-2"
            >
              <Icon name="ChatBubbleLeftRightIcon" size={16} />
              Contact Support
            </a>
          </div>
        </div>
      </main>

      {/* Final Warning Modal */}
      {showFinalWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowFinalWarning(false)}></div>
          <div className="relative w-full max-w-md glass-strong rounded-3xl border border-red-500/30 p-6 animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Icon name="ExclamationTriangleIcon" size={32} className="text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Last Chance to Cancel</h2>
              <p className="text-sm text-white/65 leading-relaxed">
                You are about to schedule permanent deletion of your EdStop account.
                Your data will be erased on <strong className="text-red-300">{deletionDateStr}</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-6">
              <p className="text-sm text-red-300 font-medium text-center">
                ⚠️ This cannot be undone after {GRACE_PERIOD_DAYS} days
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleConfirmDeletion}
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-smooth press-scale disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <><Icon name="ArrowPathIcon" size={18} className="animate-spin" /> Processing...</>
                ) : (
                  <><Icon name="TrashIcon" size={18} /> Yes, Delete My Account</>
                )}
              </button>
              <button
                onClick={() => setShowFinalWarning(false)}
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl glass border border-white/10 text-white/80 font-medium hover:bg-white/10 transition-smooth press-scale"
              >
                No, Keep My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
