'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabaseClient';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variantName?: string;
  restaurantId: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletBalance: number;
  maxWalletRedemption: number;
  cartItems: CartItem[];
  restaurantId: string;
}

const CheckoutModal = ({
  isOpen,
  onClose,
  walletBalance,
  maxWalletRedemption,
  cartItems,
  restaurantId,
}: CheckoutModalProps) => {

  const supabase = useMemo(() => createClient(), []);

  const [paymentMethod, setPaymentMethod] =
    useState<'razorpay' | 'cod'>('razorpay');

  const [walletAmount, setWalletAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  /* ================= CALCULATIONS ================= */

  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );

  const safeWalletAmount = Math.min(
    Math.max(0, walletAmount),
    walletBalance,
    maxWalletRedemption,
    subtotal
  );

  const remainingAmount = Math.max(0, subtotal - safeWalletAmount);

  /* ================= ORDER CREATION ================= */

  const handleConfirm = async () => {

    if (isProcessing) return;

    try {

      setIsProcessing(true);
      setErrorMessage('');

      if (!cartItems.length) {
        throw new Error('Your cart is empty.');
      }

      if (!restaurantId) {
        throw new Error('Restaurant not selected.');
      }

      /* Prevent mock IDs */

      if (restaurantId.startsWith('r')) {
        throw new Error('Invalid restaurant ID.');
      }

      /* ================= AUTH ================= */

      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('User not authenticated.');
      }

      /* ================= CREATE ORDER ================= */

      const response = await fetch('/api/orders/create', {

        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          cartItems,
          restaurantId,
          paymentMethod,
          walletAmount: safeWalletAmount,
          promoCode: null,
          promoDiscount: 0
        }),

      });

      let data: any;

      try {

        data = await response.json();

      } catch {

        throw new Error('Invalid server response');

      }

      if (!response.ok) {
        throw new Error(data?.error || 'Order creation failed');
      }

      if (!data?.orderId) {
        throw new Error('Order ID missing from response');
      }

      /* ================= SUCCESS ================= */

      onClose();

      window.location.href = `/orders/${data.orderId}`;

    } catch (error: any) {

      console.error('Checkout error:', error);

      setErrorMessage(
        error?.message || 'Something went wrong. Please try again.'
      );

    } finally {

      setIsProcessing(false);

    }

  };

  /* ================= UI ================= */

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">

      <div className="w-full max-w-md bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-xl">

        <h2 className="text-lg font-bold mb-4 text-white">
          Checkout
        </h2>

        <div className="mb-3 text-sm text-slate-400">
          Items: {cartItems.length}
        </div>

        {/* PAYMENT */}

        <div className="mb-4">

          <label className="block mb-2 font-medium text-sm text-white">
            Payment Method
          </label>

          <div className="space-y-2">

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="radio"
                checked={paymentMethod === 'razorpay'}
                onChange={() => setPaymentMethod('razorpay')}
              />
              Razorpay (UPI/Card)
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="radio"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')}
              />
              Cash on Delivery
            </label>

          </div>

        </div>

        {/* WALLET */}

        <div className="mb-4">

          <label className="block mb-2 font-medium text-sm text-white">
            Use Wallet (Balance ₹{walletBalance})
          </label>

          <input
            type="number"
            value={walletAmount}
            min={0}
            max={Math.min(walletBalance, maxWalletRedemption)}
            onChange={(e) =>
              setWalletAmount(
                Math.max(0, Number(e.target.value) || 0)
              )
            }
            className="w-full border border-slate-700 bg-slate-800 p-2 rounded text-sm text-white"
          />

          <p className="text-xs text-slate-400 mt-1">
            Max allowed: ₹{maxWalletRedemption}
          </p>

        </div>

        {/* SUMMARY */}

        <div className="mb-4 border-t border-slate-700 pt-3 space-y-1 text-sm">

          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-slate-400">
            <span>Wallet</span>
            <span>- ₹{safeWalletAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between font-bold text-white text-base">
            <span>To Pay</span>
            <span>₹{remainingAmount.toFixed(2)}</span>
          </div>

        </div>

        {errorMessage && (
          <div className="mb-4 text-red-400 text-sm">
            {errorMessage}
          </div>
        )}

        {/* BUTTON */}

        <button
          onClick={handleConfirm}
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:opacity-90"
        >

          {isProcessing
            ? 'Processing...'
            : `Confirm & Pay ₹${remainingAmount.toFixed(2)}`}

        </button>

      </div>

    </div>

  );

};

export default CheckoutModal;