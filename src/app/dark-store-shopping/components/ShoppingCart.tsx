// FILE: src/app/dark-store-shopping/components/ShoppingCart.tsx

'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import { supabase } from '@/lib/supabaseClient'; // ✅ singleton

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
  onCheckout: (promoCode?: string, promoDiscount?: number) => void;
  isOpen: boolean;
  onClose: () => void;
  isCheckingOut?: boolean;
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
}: ShoppingCartProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({});
  const [checkoutError, setCheckoutError] = useState('');

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
    description: string;
  } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const cashback = subtotal * 0.05;
  const deliveryFee = subtotal >= 99 ? 0 : 10;
  const promoDiscount = appliedPromo?.discount ?? 0;
  const total = subtotal + deliveryFee - promoDiscount;
  const maxWalletRedemption = total * 0.3;
  const meetsMinimum = subtotal >= 99;

  /* ================= PROMO ================= */

  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code) {
      setPromoError('Please enter a promo code.');
      return;
    }

    setIsValidatingPromo(true);
    setPromoError('');

    try {
      const { data, error } = await supabase.rpc('validate_promo_code', {
        p_code: code,
        p_order_amount: subtotal + deliveryFee,
        p_order_type: 'store',
      });

      if (error) throw error;

      if (data?.valid) {
        setAppliedPromo({
          code: code.toUpperCase(),
          discount: data.discount,
          description: data.description,
        });
        setPromoInput('');
        setPromoError('');
      } else {
        setPromoError(data?.error ?? 'Invalid promo code.');
      }
    } catch {
      setPromoError('Failed to validate promo code. Please try again.');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError('');
    setPromoInput('');
  };

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
    onCheckout(appliedPromo?.code, appliedPromo?.discount);
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
              {appliedPromo && (
                <div>Promo: -₹{promoDiscount.toFixed(2)}</div>
              )}
              <div className="font-bold text-lg">
                Total: ₹{total.toFixed(2)}
              </div>

              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full bg-purple-600 text-white py-3 rounded"
              >
                {isCheckingOut ? 'Processing...' : 'Proceed to Checkout'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ShoppingCart;