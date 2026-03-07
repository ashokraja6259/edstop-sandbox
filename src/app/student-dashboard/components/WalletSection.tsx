// FILE: src/app/student-dashboard/components/WalletSection.tsx

'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import Link from 'next/link';
import PaymentErrorModal, { type PaymentMethod, type SavedCartItem } from '@/components/ui/PaymentErrorModal';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'expired';
}

interface WalletSectionProps {
  balance: number;
  cashbackEarned: number;
  recentTransactions: Transaction[];
  isLoading?: boolean;
}

const WalletSection = ({ balance, cashbackEarned, recentTransactions, isLoading = false }: WalletSectionProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showRechargeError, setShowRechargeError] = useState(false);
  const [rechargeRetryCount, setRechargeRetryCount] = useState(0);
  const [rechargeErrorCode, setRechargeErrorCode] = useState('PAYMENT_FAILED');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-purple-500/20">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded-lg w-1/3"></div>
          <div className="h-24 bg-white/10 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl overflow-hidden border border-purple-500/20">
        <div className="relative p-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(79,70,229,0.2) 100%)' }}>
          <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 bg-white/15 rounded-lg w-32"></div>
              <div className="h-8 bg-white/15 rounded-xl w-20"></div>
            </div>
            <div className="h-10 bg-white/15 rounded-lg w-28"></div>
            <div className="h-4 bg-white/10 rounded w-20"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 border-b border-white/10">
          <div className="animate-pulse h-10 bg-white/5 rounded-xl"></div>
          <div className="animate-pulse h-10 bg-white/5 rounded-xl"></div>
        </div>
        <div className="p-4 space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center gap-3 p-3">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex-shrink-0"></div>
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-white/10 rounded w-3/4"></div>
                <div className="h-2.5 bg-white/5 rounded w-1/2"></div>
              </div>
              <div className="h-4 bg-white/10 rounded w-12"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleRecharge = () => {
    // Simulate a failed recharge attempt to demonstrate the modal
    setRechargeErrorCode('PAYMENT_FAILED');
    setShowRechargeError(true);
  };

  const handleRechargeRetry = (method: PaymentMethod) => {
    setRechargeRetryCount((c) => c + 1);
    setShowRechargeError(false);
    // In real integration: trigger Razorpay/UPI with selected method
    console.info('Retrying recharge with:', method);
  };

  const handleCartRecover = (_cart: SavedCartItem[]) => {
    // No cart for wallet recharge
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-purple-500/20">
      {/* Wallet header with gradient */}
      <div className="relative p-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(79,70,229,0.2) 100%)' }}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <Icon name="WalletIcon" size={16} variant="solid" className="text-white" />
              </div>
              <h2 className="font-bold text-lg text-white">EdCoins Wallet</h2>
            </div>
            <button
              onClick={handleRecharge}
              className="flex items-center gap-1.5 px-3 py-1.5 gradient-primary text-white rounded-xl text-xs font-bold shadow-glow-purple hover-lift transition-smooth press-scale"
            >
              <Icon name="PlusIcon" size={14} variant="solid" />
              Recharge
            </button>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-white/60 mb-1">Available Balance</p>
              <p className="text-4xl font-bold text-white">₹{balance.toFixed(0)}</p>
              <p className="text-xs text-white/50 mt-1">₹{(balance % 1).toFixed(2).slice(1)} paise</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <Icon name="StarIcon" size={14} variant="solid" className="text-emerald-400" />
                <div>
                  <p className="text-xs text-emerald-300 font-bold">+₹{cashbackEarned}</p>
                  <p className="text-xs text-emerald-400/70">cashback</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 p-4 border-b border-white/10">
        <Link
          href="/wallet"
          className="flex items-center justify-center gap-2 py-2.5 glass rounded-xl border border-white/10 hover:bg-white/10 transition-smooth press-scale"
        >
          <Icon name="ArrowUpIcon" size={14} className="text-purple-400" />
          <span className="text-xs text-white/80 font-semibold">Send</span>
        </Link>
        <button
          onClick={handleRecharge}
          className="flex items-center justify-center gap-2 py-2.5 glass rounded-xl border border-white/10 hover:bg-white/10 transition-smooth press-scale"
        >
          <Icon name="ArrowDownIcon" size={14} className="text-emerald-400" />
          <span className="text-xs text-white/80 font-semibold">Add Money</span>
        </button>
      </div>

      {/* Transactions */}
      <div className="p-4">
        <button
          onClick={() => setShowTransactions(!showTransactions)}
          className="flex items-center justify-between w-full text-left rounded-xl p-2 hover:bg-white/5 transition-smooth"
        >
          <span className="text-sm font-bold text-white/80">Recent Transactions</span>
          <Icon
            name={showTransactions ? 'ChevronUpIcon' : 'ChevronDownIcon'}
            size={18}
            className="text-white/40"
          />
        </button>

        {showTransactions && (
          <div className="mt-3 space-y-2">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4">No recent transactions</p>
            ) : (
              recentTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-3 glass rounded-xl border border-white/5 hover:border-white/10 transition-smooth"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${
                      txn.type === 'credit' ?'bg-emerald-500/20 border border-emerald-500/30' :'bg-red-500/20 border border-red-500/30'
                    }`}>
                      <Icon
                        name={txn.type === 'credit' ? 'ArrowDownIcon' : 'ArrowUpIcon'}
                        size={14}
                        variant="solid"
                        className={txn.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-white/80 font-medium">{txn.description}</p>
                      <p className="text-xs text-white/40">{txn.date}</p>
                    </div>
                  </div>
                  <p className={`font-bold text-sm ${
                    txn.type === 'credit' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {txn.type === 'credit' ? '+' : '-'}₹{txn.amount.toFixed(0)}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Recharge error modal */}
      <PaymentErrorModal
        isOpen={showRechargeError}
        onClose={() => setShowRechargeError(false)}
        errorCode={rechargeErrorCode}
        failedMethod="razorpay"
        orderTotal={500}
        walletBalance={balance}
        savedCart={[]}
        onRetry={handleRechargeRetry}
        onRecoverCart={handleCartRecover}
        retryCount={rechargeRetryCount}
        maxRetries={3}
      />
    </div>
  );
};

export default WalletSection;