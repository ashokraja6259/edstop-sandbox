'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variantName?: string;
}

interface CartSummaryProps {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  convenienceFee: number;
  cashback: number;
  total: number;
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity?: (itemId: string, quantity: number) => void;
  onCheckout: () => void;
  minimumOrderMet: boolean;
  minimumOrder: number;
}

const MAX_QUANTITY = 10;

const CartSummary = ({
  items,
  subtotal,
  deliveryFee,
  convenienceFee,
  cashback,
  total,
  onRemoveItem,
  onUpdateQuantity,
  onCheckout,
  minimumOrderMet,
  minimumOrder,
}: CartSummaryProps) => {

  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({});
  const [checkoutError, setCheckoutError] = useState('');

  const handleQuantityDecrease = (item: CartItem) => {

    if (!onUpdateQuantity) return;

    if (item.quantity <= 1) {
      setQuantityErrors(prev => ({
        ...prev,
        [item.id]: 'Minimum 1 unit. Use delete to remove.'
      }));

      setTimeout(() => {
        setQuantityErrors(prev => {
          const copy = { ...prev };
          delete copy[item.id];
          return copy;
        });
      }, 2500);

      return;
    }

    onUpdateQuantity(item.id, item.quantity - 1);
  };

  const handleQuantityIncrease = (item: CartItem) => {

    if (!onUpdateQuantity) return;

    if (item.quantity >= MAX_QUANTITY) {

      setQuantityErrors(prev => ({
        ...prev,
        [item.id]: `Max ${MAX_QUANTITY} units allowed`
      }));

      setTimeout(() => {
        setQuantityErrors(prev => {
          const copy = { ...prev };
          delete copy[item.id];
          return copy;
        });
      }, 2500);

      return;
    }

    onUpdateQuantity(item.id, item.quantity + 1);
  };

  const handleCheckout = () => {

    if (!minimumOrderMet) {

      setCheckoutError(
        `Add ₹${(minimumOrder - subtotal).toFixed(2)} more to reach ₹${minimumOrder} minimum order`
      );

      setTimeout(() => setCheckoutError(''), 3000);

      return;
    }

    onCheckout();

  };

  /* ================= EMPTY CART ================= */

  if (items.length === 0) {

    return (
      <div className="p-6 bg-slate-900 border border-slate-700 rounded-xl text-center">

        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <Icon name="ShoppingCartIcon" size={28} className="text-slate-400" />
        </div>

        <p className="text-white font-semibold">
          Your cart is empty
        </p>

        <p className="text-sm text-slate-400 mt-1">
          Add items to start ordering
        </p>

      </div>
    );

  }

  /* ================= CART ================= */

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg">

      {/* HEADER */}

      <div className="p-4 border-b border-slate-700 bg-slate-800">

        <div className="flex items-center justify-between">

          <h3 className="text-white font-bold text-lg">
            Your Cart
          </h3>

          <span className="text-sm text-slate-400">
            {items.length} item{items.length > 1 ? 's' : ''}
          </span>

        </div>

      </div>

      {/* ITEMS */}

      <div className="p-4 max-h-[300px] overflow-y-auto space-y-4">

        {items.map(item => (

          <div
            key={item.id}
            className="flex items-start justify-between gap-3 border-b border-slate-700 pb-3 last:border-none"
          >

            <div className="flex-1">

              <h4 className="text-white text-sm font-semibold">
                {item.name}
              </h4>

              {item.variantName && (
                <p className="text-xs text-slate-400">
                  {item.variantName}
                </p>
              )}

              <div className="flex items-center gap-2 mt-1">

                <span className="text-purple-400 font-semibold text-sm">
                  ₹{item.price}
                </span>

                {onUpdateQuantity && (

                  <div className="flex items-center gap-2 ml-3">

                    <button
                      onClick={() => handleQuantityDecrease(item)}
                      className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded"
                    >
                      <Icon name="MinusIcon" size={12} />
                    </button>

                    <span className="text-white text-sm font-semibold">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => handleQuantityIncrease(item)}
                      className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded"
                    >
                      <Icon name="PlusIcon" size={12} />
                    </button>

                  </div>

                )}

              </div>

              {quantityErrors[item.id] && (
                <p className="text-xs text-red-400 mt-1">
                  {quantityErrors[item.id]}
                </p>
              )}

            </div>

            <div className="flex flex-col items-end gap-2">

              <span className="text-white font-semibold">
                ₹{(item.price * item.quantity).toFixed(2)}
              </span>

              <button
                onClick={() => onRemoveItem(item.id)}
                className="text-red-400 hover:text-red-300"
              >
                <Icon name="TrashIcon" size={14} />
              </button>

            </div>

          </div>

        ))}

      </div>

      {/* BILL */}

      <div className="p-4 border-t border-slate-700 space-y-2 text-sm">

        <div className="flex justify-between text-slate-400">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-slate-400">
          <span>Delivery Fee</span>
          <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
        </div>

        <div className="flex justify-between text-slate-400">
          <span>Convenience Fee</span>
          <span>₹{convenienceFee}</span>
        </div>

        {cashback > 0 && (

          <div className="flex justify-between text-green-400">
            <span>Cashback</span>
            <span>+₹{cashback}</span>
          </div>

        )}

        <div className="flex justify-between text-white font-bold pt-2 border-t border-slate-700">
          <span>Total</span>
          <span>₹{total.toFixed(2)}</span>
        </div>

        {!minimumOrderMet && (

          <p className="text-xs text-yellow-400 mt-2">
            Add ₹{(minimumOrder - subtotal).toFixed(2)} more to reach minimum order ₹{minimumOrder}
          </p>

        )}

        {checkoutError && (

          <p className="text-xs text-red-400">
            {checkoutError}
          </p>

        )}

        <button
          onClick={handleCheckout}
          className="w-full mt-3 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:opacity-90"
        >
          Proceed to Checkout
        </button>

      </div>

    </div>
  );

};

export default CartSummary;