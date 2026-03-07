// FILE: src/components/ui/PaymentErrorModal.tsx

'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

export type PaymentMethod = 'razorpay' | 'wallet' | 'cod' | 'upi';

export interface SavedCartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variantName?: string;
}

export interface PaymentErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorCode?: string;
  errorMessage?: string;
  failedMethod: PaymentMethod;
  orderTotal: number;
  walletBalance: number;
  savedCart: SavedCartItem[];
  onRetry: (method: PaymentMethod) => void;
  onRecoverCart: (cart: SavedCartItem[]) => void;
  retryCount?: number;
  maxRetries?: number;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  razorpay: 'Razorpay (UPI/Card)',
  wallet: 'EdCoins Wallet',
  cod: 'Cash on Delivery',
  upi: 'UPI Direct',
};

const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  razorpay: 'CreditCardIcon',
  wallet: 'WalletIcon',
  cod: 'BanknotesIcon',
  upi: 'QrCodeIcon',
};

const ERROR_MESSAGES: Record<string, { title: string; description: string; suggestion: string }> = {
  PAYMENT_FAILED: {
    title: 'Payment Failed',
    description: 'Your payment could not be processed. Please try again or use a different method.',
    suggestion: 'Check your card/UPI details and try again.',
  },
  INSUFFICIENT_BALANCE: {
    title: 'Insufficient Wallet Balance',
    description: 'Your EdCoins wallet does not have enough balance to complete this transaction.',
    suggestion: 'Recharge your wallet or choose another payment method.',
  },
  NETWORK_ERROR: {
    title: 'Network Error',
    description: 'Payment failed due to a network issue. Your cart has been saved.',
    suggestion: 'Check your internet connection and retry.',
  },
  TIMEOUT: {
    title: 'Payment Timed Out',
    description: 'The payment request timed out. No amount was deducted.',
    suggestion: 'Please retry or choose a faster payment method.',
  },
  DECLINED: {
    title: 'Payment Declined',
    description: 'Your bank declined this transaction. No amount was deducted.',
    suggestion: 'Contact your bank or use a different card/UPI.',
  },
  DEFAULT: {
    title: 'Payment Unsuccessful',
    description: 'Something went wrong while processing your payment.',
    suggestion: 'Please try again or select an alternative payment method.',
  },
};

const PaymentErrorModal = ({
  isOpen,
  onClose,
  errorCode = 'DEFAULT',
  errorMessage,
  failedMethod,
  orderTotal,
  walletBalance,
  savedCart,
  onRetry,
  onRecoverCart,
  retryCount = 0,
  maxRetries = 3,
}: PaymentErrorModalProps) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(failedMethod);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showCartPreview, setShowCartPreview] = useState(false);
  const [cartRecovered, setCartRecovered] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);

  const errorInfo = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.DEFAULT;
  const canRetry = retryCount < maxRetries;
  const isWalletInsufficient = walletBalance < orderTotal;

  // Available alternative methods (exclude failed method if not wallet issue)
  const alternativeMethods: PaymentMethod[] = (['razorpay', 'wallet', 'cod', 'upi'] as PaymentMethod[]).filter(
    (m) => {
      if (m === failedMethod && errorCode !== 'NETWORK_ERROR') return false;
      if (m === 'wallet' && isWalletInsufficient) return false;
      if (m === 'cod' && orderTotal > 800) return false;
      return true;
    }
  );

  useEffect(() => {
    if (!isOpen) {
      setIsRetrying(false);
      setCartRecovered(false);
      setRetryCountdown(0);
      setShowCartPreview(false);
    } else {
      // Auto-select best alternative
      if (alternativeMethods.length > 0 && !alternativeMethods.includes(selectedMethod)) {
        setSelectedMethod(alternativeMethods[0]);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (retryCountdown > 0) {
      const timer = setTimeout(() => setRetryCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [retryCountdown]);

  const handleRetry = async () => {
    if (!canRetry || isRetrying) return;
    setIsRetrying(true);
    setRetryCountdown(0);
    try {
      await onRetry(selectedMethod);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRecoverCart = () => {
    onRecoverCart(savedCart);
    setCartRecovered(true);
  };

  const cartTotal = savedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-error-title"
    >
      <div className="w-full max-w-md glass-strong border border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/10 animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="relative p-5 border-b border-white/10 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(220,38,38,0.1) 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-16 -mt-16 pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                <Icon name="ExclamationTriangleIcon" size={22} className="text-red-400" />
              </div>
              <div>
                <h2 id="payment-error-title" className="font-heading font-bold text-lg text-white">
                  {errorInfo.title}
                </h2>
                <p className="font-caption text-xs text-white/50 mt-0.5">
                  via {PAYMENT_METHOD_LABELS[failedMethod]}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all press-scale focus-ring flex-shrink-0"
              aria-label="Close payment error modal"
            >
              <Icon name="XMarkIcon" size={18} className="text-white/60" />
            </button>
          </div>

          {/* Retry counter */}
          {retryCount > 0 && (
            <div className="flex items-center gap-2 mt-3 relative z-10">
              <div className="flex gap-1">
                {Array.from({ length: maxRetries }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i < retryCount ? 'bg-red-400' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
              <span className="font-caption text-xs text-white/50">
                Attempt {retryCount}/{maxRetries}
              </span>
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* Error description */}
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="font-caption text-sm text-white/80 leading-relaxed">
              {errorMessage || errorInfo.description}
            </p>
            <p className="font-caption text-xs text-red-300/70 mt-1.5">
              💡 {errorInfo.suggestion}
            </p>
          </div>

          {/* Saved cart recovery */}
          {savedCart.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="ShoppingCartIcon" size={16} className="text-amber-400" />
                  <span className="font-heading font-semibold text-sm text-white/90">
                    Cart Saved
                  </span>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-caption text-xs rounded-full">
                    {savedCart.length} item{savedCart.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => setShowCartPreview(!showCartPreview)}
                  className="font-caption text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  {showCartPreview ? 'Hide' : 'View'}
                </button>
              </div>

              {showCartPreview && (
                <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                  {savedCart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span className="text-white/70">
                        {item.quantity}× {item.name}
                        {item.variantName && (
                          <span className="text-white/40"> ({item.variantName})</span>
                        )}
                      </span>
                      <span className="text-white/60 font-data">₹{(item.price * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="font-caption text-xs text-white/50">Cart Total</span>
                    <span className="font-data text-sm font-bold text-amber-300">₹{cartTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {!cartRecovered ? (
                <button
                  onClick={handleRecoverCart}
                  className="mt-3 w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-heading font-semibold text-xs rounded-xl transition-all press-scale"
                >
                  <Icon name="ArrowPathIcon" size={14} className="inline mr-1.5" />
                  Restore Cart & Continue
                </button>
              ) : (
                <div className="mt-3 flex items-center gap-2 py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <Icon name="CheckCircleIcon" size={14} className="text-emerald-400" />
                  <span className="font-caption text-xs text-emerald-300">Cart restored successfully</span>
                </div>
              )}
            </div>
          )}

          {/* Alternative payment methods */}
          <div>
            <h3 className="font-heading font-semibold text-sm text-white/80 mb-2.5">
              Select Payment Method
            </h3>

            {alternativeMethods.length === 0 ? (
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
                <p className="font-caption text-xs text-white/40">No alternative methods available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alternativeMethods.map((method) => {
                  const isFailed = method === failedMethod;
                  const isSelected = selectedMethod === method;
                  return (
                    <label
                      key={method}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-primary/20 border-primary/40' :'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <input
                        type="radio"
                        name="alt-payment"
                        value={method}
                        checked={isSelected}
                        onChange={() => setSelectedMethod(method)}
                        className="w-4 h-4 text-primary accent-primary"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <Icon
                          name={PAYMENT_METHOD_ICONS[method] as any}
                          size={18}
                          className={isSelected ? 'text-primary' : 'text-white/50'}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-medium text-sm text-white/90">
                              {PAYMENT_METHOD_LABELS[method]}
                            </span>
                            {isFailed && (
                              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-300 font-caption text-xs rounded">
                                Failed
                              </span>
                            )}
                            {method === 'wallet' && (
                              <span className="font-data text-xs text-emerald-400">₹{walletBalance.toFixed(0)}</span>
                            )}
                          </div>
                          {method === 'cod' && (
                            <p className="font-caption text-xs text-white/40">Pay ₹{orderTotal.toFixed(2)} on delivery</p>
                          )}
                          {method === 'wallet' && (
                            <p className="font-caption text-xs text-white/40">Available: ₹{walletBalance.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Order total */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="font-caption text-sm text-white/60">Order Total</span>
            <span className="font-data font-bold text-base text-white">₹{orderTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 glass border border-white/10 text-white/70 font-heading font-semibold text-sm rounded-xl hover:bg-white/10 transition-all press-scale"
          >
            Cancel
          </button>

          {canRetry ? (
            <button
              onClick={handleRetry}
              disabled={isRetrying || retryCountdown > 0 || alternativeMethods.length === 0}
              className="flex-2 flex-grow-[2] py-3 gradient-primary text-white font-heading font-bold text-sm rounded-xl shadow-glow-purple hover:shadow-purple-500/50 transition-all press-scale disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRetrying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : retryCountdown > 0 ? (
                `Retry in ${retryCountdown}s`
              ) : (
                <>
                  <Icon name="ArrowPathIcon" size={16} />
                  Retry Payment
                </>
              )}
            </button>
          ) : (
            <div className="flex-grow-[2] py-3 bg-white/5 border border-white/10 text-white/40 font-heading font-semibold text-sm rounded-xl flex items-center justify-center gap-2">
              <Icon name="ExclamationCircleIcon" size={16} />
              Max retries reached
            </div>
          )}
        </div>

        {!canRetry && (
          <div className="px-5 pb-5">
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
              <p className="font-caption text-xs text-white/50">
                Need help?{' '}
                <a href="mailto:support@edstop.in" className="text-primary hover:underline">
                  Contact Support
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentErrorModal;
