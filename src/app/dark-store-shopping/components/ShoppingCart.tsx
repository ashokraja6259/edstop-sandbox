// FILE: src/app/dark-store-shopping/components/ShoppingCart.tsx

'use client';

import { useState } from 'react';
import AppImage from '@/components/ui/AppImage';
import { useIsClient } from '@/hooks/useIsClient';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  alt: string;
}

interface ShoppingCartProps {
  items: CartItem[];
  walletBalance: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: (
    paymentMethod: 'cod' | 'razorpay_test',
    walletAmountPaise: number
  ) => void;
  isOpen: boolean;
  onClose: () => void;
  isCheckingOut?: boolean;
  testCheckoutEnabled?: boolean;
}

const MAX_QUANTITY = 10;

const ShoppingCart = ({
  items,
  walletBalance,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  isOpen,
  onClose,
  isCheckingOut = false,
  testCheckoutEnabled = false,
}: ShoppingCartProps) => {
  const isHydrated = useIsClient();
  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({});
  const [checkoutError, setCheckoutError] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<'cod' | 'razorpay_test'>('cod');
  const [useWallet, setUseWallet] = useState(false);

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const deliveryFee = subtotal >= 99 ? 0 : 10;
  const total = subtotal + deliveryFee;
  const meetsMinimum = subtotal >= 99;

  /* ================= QUANTITY ================= */

  const handleQuantityDecrease = (item: CartItem) => {
    if (item.quantity <= 1) {
      setQuantityErrors(prev => ({
        ...prev,
        [item.id]: 'Minimum quantity is 1. Remove item to delete.',
      }));

      setTimeout(() => {
        setQuantityErrors(prev => {
          const n = { ...prev };
          delete n[item.id];
          return n;
        });
      }, 2500);

      return;
    }

    setQuantityErrors(prev => {
      const n = { ...prev };
      delete n[item.id];
      return n;
    });

    onUpdateQuantity(item.id, item.quantity - 1);
  };

  const handleQuantityIncrease = (item: CartItem) => {
    if (item.quantity >= MAX_QUANTITY) {
      setQuantityErrors(prev => ({
        ...prev,
        [item.id]: `Max ${MAX_QUANTITY} units per item allowed.`,
      }));

      setTimeout(() => {
        setQuantityErrors(prev => {
          const n = { ...prev };
          delete n[item.id];
          return n;
        });
      }, 2500);

      return;
    }

    setQuantityErrors(prev => {
      const n = { ...prev };
      delete n[item.id];
      return n;
    });

    onUpdateQuantity(item.id, item.quantity + 1);
  };

  /* ================= CHECKOUT ================= */

  const handleCheckout = () => {
    if (!meetsMinimum) {
      setCheckoutError(
        `Add ₹${(99 - subtotal).toFixed(
          2
        )} more to meet the ₹99 minimum order requirement.`
      );
      setTimeout(() => setCheckoutError(''), 3000);
      return;
    }

    if (items.length === 0) {
      setCheckoutError(
        'Your cart is empty. Add items before checking out.'
      );
      setTimeout(() => setCheckoutError(''), 3000);
      return;
    }

    setCheckoutError('');
    const walletAmountPaise =
      paymentMethod === 'razorpay_test' && useWallet
        ? Math.min(
            Math.floor(walletBalance * 100),
            Math.max(0, Math.round(total * 100) - 1)
          )
        : 0;
    onCheckout(paymentMethod, walletAmountPaise);
  };

  if (!isHydrated) return null;

  /* ================= UI ================= */

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`
        fixed lg:sticky top-0 right-0 h-screen w-full lg:w-96
        glass-header border-l border-primary/20
        shadow-2xl shadow-black/50 lg:shadow-none
        transition-transform duration-300 z-50 lg:z-0
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}
      >
        <div className="flex flex-col h-full">

          {/* HEADER */}
          <div className="flex items-center justify-between p-6 border-b border-primary/20">
            <h2 className="font-heading font-bold text-lg text-gradient-purple">
              Your Cart
            </h2>
            <button
              onClick={onClose}
              className="lg:hidden"
            >
              ✕
            </button>
          </div>

          {/* ITEMS */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="text-center text-text-secondary">
                Your cart is empty
              </div>
            ) : (
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <AppImage
                      src={item.image}
                      alt={item.alt}
                      className="w-16 h-16 object-cover rounded"
                    />

                    <div className="flex-1">
                      <div className="font-semibold">
                        {item.name}
                      </div>
                      <div>₹{item.price.toFixed(2)}</div>

                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => handleQuantityDecrease(item)}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => handleQuantityIncrease(item)}>+</button>
                      </div>

                      {quantityErrors[item.id] && (
                        <div className="text-red-500 text-xs mt-1">
                          {quantityErrors[item.id]}
                        </div>
                      )}
                    </div>

                    <button onClick={() => onRemoveItem(item.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SUMMARY */}
          {items.length > 0 && (
            <div className="border-t p-6 space-y-4">
              <div>Subtotal: ₹{subtotal.toFixed(2)}</div>
              <div>Delivery: {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</div>
              <div className="font-bold text-lg">
                Total: ₹{total.toFixed(2)}
              </div>
              {checkoutError && (
                <div className="text-red-500 text-sm">{checkoutError}</div>
              )}

              {testCheckoutEnabled && (
                <div className="space-y-2 rounded border border-purple-400/30 p-3">
                  <div className="text-xs font-semibold text-purple-300">
                    Approved Test Mode checkout
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="dark-store-payment"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                    />
                    Cash on delivery
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="dark-store-payment"
                      checked={paymentMethod === 'razorpay_test'}
                      onChange={() => setPaymentMethod('razorpay_test')}
                    />
                    Razorpay Test Mode
                  </label>
                  {paymentMethod === 'razorpay_test' && walletBalance > 0 && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={useWallet}
                        onChange={(event) => setUseWallet(event.target.checked)}
                      />
                      Use up to ₹{walletBalance.toFixed(2)} wallet balance
                    </label>
                  )}
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full bg-purple-600 text-white py-3 rounded"
              >
                {isCheckingOut
                  ? 'Processing...'
                  : paymentMethod === 'razorpay_test'
                    ? 'Pay in Razorpay Test Mode'
                    : 'Proceed to Checkout'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ShoppingCart;
