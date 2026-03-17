// FILE: src/hooks/useOrderHistoryRealtime.ts

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // ✅ singleton
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

/* ───────────────────────── TYPES ───────────────────────── */

export type OrderStatus =
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'pending'
  | 'preparing'
  | 'out-for-delivery';

export type OrderType = 'food' | 'dark-store';
export type PaymentMethod = 'EdCoins' | 'Razorpay' | 'UPI' | 'COD';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  available?: boolean;
}

export interface LiveOrder {
  id: string;
  orderNumber: string;
  type: OrderType;
  restaurantOrStore: string;
  date: string;
  time: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  deliveryAddress: string;
  estimatedDeliveryTime?: string;
}

interface DBOrder {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  total_amount: number;
  final_amount: number;
  delivery_fee?: number;
  discount_amount?: number;
  payment_method?: string;
  delivery_address?: string;
  estimated_delivery_time?: string;
  restaurant_name?: string;
  items?: OrderItem[];
  created_at: string;
  user_id?: string;
}

/* ───────────────────────── HELPERS ───────────────────────── */

const STATUS_MAP: Record<string, OrderStatus> = {
  pending: 'pending',
  confirmed: 'pending',
  preparing: 'preparing',
  ready: 'preparing',
  out_for_delivery: 'out-for-delivery',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

const PAYMENT_MAP: Record<string, PaymentMethod> = {
  edcoins: 'EdCoins',
  razorpay: 'Razorpay',
  upi: 'UPI',
  cod: 'COD',
};

function mapOrder(row: DBOrder): LiveOrder {
  const createdAt = new Date(row.created_at);

  const date = `${String(createdAt.getDate()).padStart(2, '0')}/${String(
    createdAt.getMonth() + 1
  ).padStart(2, '0')}/${createdAt.getFullYear()}`;

  const time = createdAt.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const status = STATUS_MAP[row.status?.toLowerCase()] || 'pending';
  const payment =
    PAYMENT_MAP[row.payment_method?.toLowerCase() || ''] || 'UPI';

  const items: OrderItem[] = Array.isArray(row.items)
    ? row.items.map((i: OrderItem) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      }))
    : [];

  const subtotal =
    items.reduce((sum: number, item: OrderItem) => sum + item.price * item.quantity, 0) ||
    Number(row.total_amount) ||
    0;

  return {
    id: row.id,
    orderNumber: row.order_number,
    type: row.order_type === 'store' ? 'dark-store' : 'food',
    restaurantOrStore:
      row.restaurant_name ||
      (row.order_type === 'store'
        ? 'EdStop Dark Store'
        : 'Restaurant'),
    date,
    time,
    items,
    subtotal,
    deliveryFee: Number(row.delivery_fee) || 0,
    discount: Number(row.discount_amount) || 0,
    total: Number(row.final_amount) || subtotal,
    paymentMethod: payment,
    status,
    deliveryAddress: row.delivery_address || '',
    estimatedDeliveryTime: row.estimated_delivery_time,
  };
}

/* ───────────────────────── HOOK ───────────────────────── */

export interface OrderHistoryRealtimeResult {
  liveOrders: LiveOrder[];
  isLive: boolean;
  isLoading: boolean;
  hasLiveData: boolean;
}

export function useOrderHistoryRealtime(): OrderHistoryRealtimeResult {
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLiveData, setHasLiveData] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const toast = useToast();

  /* ───────── FETCH INITIAL ORDERS ───────── */

  const fetchOrders = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setLiveOrders(data.map(mapOrder));
      setHasLiveData(true);
    }

    setIsLoading(false);
  }, []);

  /* ───────── SETUP REALTIME ───────── */

  const setupChannel = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`order-history-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        payload => {
          const updated = mapOrder(payload.new as DBOrder);

          if (payload.eventType === 'INSERT') {
            setLiveOrders(prev => [updated, ...prev]);
            toast.success(
              'New Order Placed',
              `Order ${updated.orderNumber} placed`
            );
          }

          if (payload.eventType === 'UPDATE') {
            setLiveOrders(prev =>
              prev.map(o =>
                o.id === updated.id ? updated : o
              )
            );

            if (updated.status === 'delivered') {
              toast.success(
                'Order Delivered',
                `Order ${updated.orderNumber} delivered`
              );
            }

            if (updated.status === 'cancelled') {
              toast.error(
                'Order Cancelled',
                `Order ${updated.orderNumber} cancelled`
              );
            }
          }

          setHasLiveData(true);
        }
      )
      .subscribe(status => {
        setIsLive(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
  }, [toast]);

  /* ───────── INIT ───────── */

  useEffect(() => {
    fetchOrders();
    setupChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsLive(false);
    };
  }, [fetchOrders, setupChannel]);

  return { liveOrders, isLive, isLoading, hasLiveData };
}