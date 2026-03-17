// FILE: src/app/wallet/page.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import EmptyState from '@/components/ui/EmptyState';
import ErrorFallback from '@/components/ui/ErrorFallback';
import { useRetry } from '@/hooks/useRetry';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWalletData } from '@/hooks/useWalletData';

export default function WalletPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const { user } = useAuth();
  const { walletBalance, transactions, isLoading } = useWalletData(user?.id);

  const { retry, manualRetry, reset, isRetrying, retryCount, nextRetryIn, maxRetriesReached } = useRetry({
    maxRetries: 3,
    baseDelay: 1000,
    onRetry: async () => {
      setHasError(false);
      setIsOffline(false);
    },
  });

  const toast = useToast();

  useEffect(() => {
    setIsHydrated(true);
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      setIsOffline(false);
      reset();
      setHasError(false);
      toast.success('Back online', 'Connection restored');
    };
    const handleOffline = () => {
      setIsOffline(true);
      setHasError(true);
      retry();
      toast.error('No connection', 'You are currently offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [retry, reset]);



  const balance = Math.max(0, walletBalance);

  const uiTransactions = useMemo(
    () =>
      transactions.map((txn) => ({
        ...txn,
        date: new Date(txn.created_at).toLocaleDateString('en-IN'),
      })),
    [transactions]
  );

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Floating orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-purple-600/10 blur-3xl animate-orb-float" />
        <div className="absolute bottom-40 right-10 w-80 h-80 rounded-full bg-indigo-600/8 blur-3xl animate-orb-float" style={{animationDelay: '3s'}} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 glass-header">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/student-dashboard" className="flex items-center justify-center w-9 h-9 rounded-xl glass-neon hover:bg-primary/20 transition-all press-scale">
            <Icon name="ArrowLeftIcon" size={18} className="text-primary" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/30 animate-glow-pulse">
              <Icon name="WalletIcon" size={20} variant="solid" className="text-white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg text-gradient-purple">My Wallet</h1>
              <p className="font-caption text-xs text-text-secondary">EdCoins Balance</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Network Error */}
        {hasError && (
          <ErrorFallback
            type={isOffline ? 'network' : 'api'}
            onRetry={() => manualRetry(true)}
            isRetrying={isRetrying}
            retryCount={retryCount}
            nextRetryIn={nextRetryIn}
            maxRetriesReached={maxRetriesReached}
            autoRetryEnabled={true}
          />
        )}

        {/* Balance Card */}
        {!hasError && (
          <div className="glass-neon rounded-2xl p-6 border border-primary/30 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-caption text-sm text-text-secondary mb-1">Total Balance</p>
                <p className="font-data text-4xl font-bold text-gradient-purple">₹{balance.toFixed(2)}</p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Icon name="WalletIcon" size={32} variant="solid" className="text-white" />
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-heading font-semibold text-sm rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all press-scale btn-glow">
                + Add Money
              </button>
              <button className="flex-1 py-2.5 glass-neon text-primary font-heading font-semibold text-sm rounded-xl border border-primary/30 hover:bg-primary/10 transition-all press-scale">
                Withdraw
              </button>
            </div>
          </div>
        )}

        {/* Transactions */}
        {!hasError && (
          <div className="glass-neon rounded-2xl p-5 border border-primary/20 animate-slide-up" style={{animationDelay: '0.1s'}}>
            <h2 className="font-heading font-bold text-base text-foreground mb-4">Recent Transactions</h2>
            {isLoading && <p className="text-xs text-text-secondary mb-3">Syncing wallet data…</p>}
            {uiTransactions.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No transactions yet"
                description="Your transaction history will appear here once you start using EdStop services."
                variant="minimal"
              />
            ) : (
              <div className="space-y-3">
                {uiTransactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        txn.type === 'credit' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'
                      }`}>
                        <Icon
                          name={txn.type === 'credit' ? 'ArrowDownLeftIcon' : 'ArrowUpRightIcon'}
                          size={16}
                          className={txn.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}
                        />
                      </div>
                      <div>
                        <p className="font-caption text-sm font-medium text-foreground">{txn.description}</p>
                        <p className="font-caption text-xs text-text-secondary">{txn.date}</p>
                      </div>
                    </div>
                    <span className={`font-data font-bold text-sm ${
                      txn.type === 'credit' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {txn.type === 'credit' ? '+' : '-'}₹{txn.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}