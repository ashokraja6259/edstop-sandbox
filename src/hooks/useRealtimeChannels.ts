// FILE: src/hooks/useRealtimeChannels.ts

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabaseClient'; // ✅ correct import
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

/* ───────────────────────── TYPES ───────────────────────── */

export interface LiveTransaction {
  id: string;
  user_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
  date: string;
  status: 'completed' | 'pending' | 'expired';
}

export interface LiveOrder {
  id: string;
  serviceName: string;
  status:
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'out-for-delivery'
    | 'delivered'
    | 'cancelled';
  estimatedTime?: string;
  orderNumber: string;
  icon: 'ShoppingBagIcon' | 'ShoppingCartIcon';
}

export interface RealtimeData {
  walletBalance: number | null;
  cashbackEarned: number;
  activeOrders: LiveOrder[];
  recentTransactions: LiveTransaction[];
  isLoading: boolean;
  isLive: boolean;
}

interface OrderRow {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  estimated_delivery_time?: string;
}

interface TransactionRow {
  id: string;
  user_id: string;
  transaction_type: 'credit' | 'debit' | 'refund';
  amount: number;
  description?: string;
  status: string;
  created_at: string;
}

interface WalletRow {
  id: string;
  balance: number;
}

/* ───────────────────────── HELPERS ───────────────────────── */

const ACTIVE_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
];

const mapOrderStatus = (dbStatus: string): LiveOrder['status'] => {
  const map: Record<string, LiveOrder['status']> = {
    pending: 'pending',
    confirmed: 'confirmed',
    preparing: 'preparing',
    ready: 'preparing',
    out_for_delivery: 'out-for-delivery',
    delivered: 'delivered',
    cancelled: 'cancelled',
  };
  return map[dbStatus] ?? 'pending';
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(
    d.getMonth() + 1
  ).padStart(2, '0')}/${d.getFullYear()}`;
};

/* ───────────────────────── HOOK ───────────────────────── */

export function useRealtimeChannels(
  userId: string | undefined
): RealtimeData {
  const supabase = createClient(); // ✅ create instance properly
  const toast = useToast();

  const channelsRef = useRef<RealtimeChannel[]>([]);
  const prevWalletBalanceRef = useRef<Record<string, number>>({});
  const prevOrderStatusRef = useRef<Record<string, string>>({});

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [cashbackEarned, setCashbackEarned] = useState(0);
  const [activeOrders, setActiveOrders] = useState<LiveOrder[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<
    LiveTransaction[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  /* ───────── INITIAL FETCH ───────── */

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);

      const { data: wallet } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', userId)
        .single();

      const { data: orders } = await supabase
        .from('orders')
        .select(
          'id, order_number, order_type, status, estimated_delivery_time'
        )
        .eq('user_id', userId)
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: transactions } = await supabase
        .from('transactions')
        .select(
          'id, user_id, transaction_type, amount, description, status, created_at'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (wallet) {
        const bal = Number(wallet.balance);
        setWalletBalance(bal);
        prevWalletBalanceRef.current[wallet.id] = bal;
      }

      if (orders) {
        const mapped: LiveOrder[] = orders.map((o: OrderRow) => ({
          id: o.id,
          serviceName:
            o.order_type === 'food'
              ? 'Food Delivery'
              : 'Dark Store Shopping',
          status: mapOrderStatus(o.status),
          estimatedTime: o.estimated_delivery_time
            ? `${Math.max(
                0,
                Math.round(
                  (new Date(o.estimated_delivery_time).getTime() -
                    Date.now()) /
                    60000
                )
              )} mins`
            : undefined,
          orderNumber: o.order_number,
          icon:
            o.order_type === 'food'
              ? 'ShoppingBagIcon'
              : 'ShoppingCartIcon',
        }));

        setActiveOrders(mapped);

        orders.forEach(o => {
          prevOrderStatusRef.current[o.id] = o.status;
        });
      }

      if (transactions) {
        const mapped: LiveTransaction[] = transactions.map((t: TransactionRow) => ({
          id: t.id,
          user_id: t.user_id,
          type: t.transaction_type === 'debit' ? 'debit' : 'credit',
          amount: Number(t.amount),
          description: t.description || 'Transaction',
          created_at: t.created_at,
          date: formatDate(t.created_at),
          status:
            t.status === 'completed' || t.status === 'pending'
              ? t.status
              : 'completed',
        }));

        setRecentTransactions(mapped);

        const cashbackTotal = mapped
          .filter(t => t.type === 'credit')
          .reduce((sum, t) => sum + t.amount, 0);

        setCashbackEarned(Math.round(cashbackTotal * 0.05 * 100) / 100);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [userId, supabase]);

  /* ───────── REALTIME ───────── */

  useEffect(() => {
    if (!userId) return;

    const ordersChannel = supabase
      .channel(`orders-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          const order = payload.new as OrderRow;

          if (payload.eventType === 'INSERT') {
            toast.success(
              '📦 Order Placed',
              `Order #${order.order_number} received`
            );
          }

          if (payload.eventType === 'UPDATE') {
            const prevStatus = prevOrderStatusRef.current[order.id];
            if (prevStatus === order.status) return;

            prevOrderStatusRef.current[order.id] = order.status;

            if (!ACTIVE_STATUSES.includes(order.status)) {
              setActiveOrders(prev =>
                prev.filter(o => o.id !== order.id)
              );
            }

            toast.info(
              'Order Update',
              `Order #${order.order_number} → ${order.status}`
            );
          }
        }
      )
      .subscribe(status => {
        setIsLive(status === 'SUBSCRIBED');
      });

    const walletChannel = supabase
      .channel(`wallet-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          const wallet = payload.new as WalletRow;
          const newBalance = Number(wallet.balance);
          const prev = prevWalletBalanceRef.current[wallet.id];

          setWalletBalance(newBalance);

          if (prev !== undefined) {
            const diff = newBalance - prev;
            if (diff > 0) {
              toast.success(
                '💰 Wallet Credited',
                `₹${diff.toFixed(0)} added`
              );
            }
            if (diff < 0) {
              toast.info(
                '💸 Wallet Debited',
                `₹${Math.abs(diff).toFixed(0)} deducted`
              );
            }
          }

          prevWalletBalanceRef.current[wallet.id] = newBalance;
        }
      )
      .subscribe();

    channelsRef.current = [ordersChannel, walletChannel];

    return () => {
      channelsRef.current.forEach(ch =>
        supabase.removeChannel(ch)
      );
      channelsRef.current = [];
    };
  }, [userId, supabase, toast]);

  return {
    walletBalance,
    cashbackEarned,
    activeOrders,
    recentTransactions,
    isLoading,
    isLive,
  };
}

export default useRealtimeChannels;