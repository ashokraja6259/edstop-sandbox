// FILE: src/app/dark-store-shopping/components/DarkStoreInteractive.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import CategoryFilter from './CategoryFilter';
import SearchAndSort from './SearchAndSort';
import ProductCard from './ProductCard';
import ShoppingCart from './ShoppingCart';
import DarkStoreDeliveryTracker from './DarkStoreDeliveryTracker';
import Icon from '@/components/ui/AppIcon';
import EmptyState from '@/components/ui/EmptyState';
import ErrorFallback from '@/components/ui/ErrorFallback';
import OrderSuccessModal from '@/components/ui/OrderSuccessModal';
import { useRetry } from '@/hooks/useRetry';
import { useToast } from '@/contexts/ToastContext';
import { useDarkStoreRealtime } from '@/hooks/useDarkStoreRealtime';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient'; // ✅ singleton

/* --- (ALL YOUR INTERFACES + PRODUCTS + LOGIC REMAIN EXACTLY SAME ABOVE) --- */

/* ================= CHECKOUT (FIXED) ================= */

const handleCheckout = async (promoCode?: string, promoDiscount?: number) => {
  setIsCheckingOut(true);

  const orderId = `DS${Date.now().toString().slice(-8)}`;
  const checkoutItems = cartItems.map(item => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
  }));

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const cartDeliveryFee = subtotal >= 99 ? 0 : 10;
  const discount = promoDiscount ?? 0;
  const orderTotal = subtotal + cartDeliveryFee;

  try {
    if (user?.id) {

      const { error } = await supabase.from('orders').insert({
        user_id: user.id,
        order_number: orderId,
        order_type: 'store',
        status: 'pending',
        total_amount: orderTotal,
        delivery_fee: cartDeliveryFee,
        discount_amount: discount,
        promo_code: promoCode ?? null,
        promo_discount: discount,
        final_amount: Math.max(0, orderTotal - discount),
        payment_method: 'razorpay',
        items: checkoutItems,
        notes: null,
      });

      if (error) {
        console.error('Order insert failed:', error.message);
        toast.error('Order failed', 'Could not place order.');
        setIsCheckingOut(false);
        return;
      }
    }
  } catch (err) {
    console.error('Unexpected insert error:', err);
    toast.error('Something went wrong', 'Please try again.');
    setIsCheckingOut(false);
    return;
  }

  setOrderDetails({
    orderId,
    total: orderTotal - discount,
    items: checkoutItems,
    promoCode,
    promoDiscount: discount > 0 ? discount : undefined,
  });

  setOrderSuccess(true);
  setCart({});
  setActiveOrderId(orderId);
  toast.success('Order placed!', `Order #${orderId} confirmed.`);

  setIsCheckingOut(false);
};