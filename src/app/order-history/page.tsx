// FILE: src/app/order-history/page.tsx

'use client';

import { supabase } from '@/lib/supabaseClient'; // ✅ singleton
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { useOrderHistoryRealtime } from '@/hooks/useOrderHistoryRealtime';

/* ================= TYPES ================= */

type OrderStatus =
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'pending'
  | 'preparing'
  | 'out-for-delivery';

type OrderType = 'food' | 'dark-store';

type PaymentMethod = 'EdCoins' | 'Razorpay' | 'UPI' | 'COD';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  available?: boolean;
}

interface Order {
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
  cashbackEarned?: number;
  walletRedeemed?: number;
  riderName?: string;
  riderPhone?: string;
  rating?: number;
  cancellationReason?: string;
  refundAmount?: number;
}

/* ================= MOCK DATA ================= */

const mockOrders: Order[] = [];

/* ================= COMPONENT ================= */

export default function OrderHistoryPage() {
  const router = useRouter();
  const toast = useToast();
  const { liveOrders, isLive, isLoading, hasLiveData } = useOrderHistoryRealtime();

  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  /* ================= HYDRATION ================= */

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  /* ================= ANALYTICS FETCH ================= */

  useEffect(() => {
    const fetchAnalytics = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from('user_order_analytics')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) setAnalytics(data);
    };

    fetchAnalytics();
  }, []);

  /* ================= LIVE DATA ================= */

  useEffect(() => {
    if (hasLiveData && liveOrders.length > 0) {
      setOrders(liveOrders as unknown as Order[]);
    }
  }, [liveOrders, hasLiveData]);

  /* ================= DERIVED ANALYTICS ================= */

  const totalCashback = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.cashbackEarned ?? 0), 0);
  }, [orders]);

  const cashbackComparisonData = useMemo(() => {
    return [
      {
        name: 'Total Spent',
        amount: analytics?.total_spent ?? orders.reduce((s, o) => s + o.total, 0),
      },
      {
        name: 'Cashback Earned',
        amount: totalCashback,
      },
    ];
  }, [analytics, orders, totalCashback]);

  const weeklySpendData = useMemo(() => {
    const map: Record<string, number> = {};

    orders.forEach((o) => {
      const date = o.date.split('/').reverse().join('-');
      map[date] = (map[date] ?? 0) + o.total;
    });

    return Object.entries(map)
      .slice(-7)
      .map(([date, total]) => ({
        date,
        total,
      }));
  }, [orders]);

  const insights = useMemo(() => {
    const list: string[] = [];

    if ((analytics?.total_spent ?? 0) > 2000) {
      list.push('You are a power user! 💪');
    }

    if (totalCashback > 100) {
      list.push('You have earned over ₹100 cashback 🪙');
    }

    if ((analytics?.food_orders ?? 0) > (analytics?.store_orders ?? 0)) {
      list.push('You prefer Food orders 🍔');
    }

    return list;
  }, [analytics, totalCashback]);

  if (!isHydrated) return null;

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 max-w-4xl">

        {/* Cashback vs Spend */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 mb-6">
          <h2 className="text-white font-semibold mb-4">🪙 Cashback vs Spend</h2>

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={cashbackComparisonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis type="number" stroke="#ffffff50" />
                <YAxis type="category" dataKey="name" stroke="#ffffff50" />
                <Tooltip />
                <Bar dataKey="amount" fill="#22c55e" radius={[6, 6, 6, 6]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Spend */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 mb-6">
          <h2 className="text-white font-semibold mb-4">📅 Last 7 Days Spend</h2>

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={weeklySpendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="date" stroke="#ffffff50" />
                <YAxis stroke="#ffffff50" />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights */}
        <div className="glass-card rounded-2xl p-5 border border-purple-500/20 mb-6">
          <h2 className="text-white font-semibold mb-4">🧠 Smart Insights</h2>

          {insights.length === 0 ? (
            <p className="text-white/40 text-sm">
              Start ordering to unlock insights.
            </p>
          ) : (
            insights.map((i, idx) => (
              <div
                key={idx}
                className="px-4 py-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-sm text-purple-200 mb-2"
              >
                {i}
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 text-center">
          <p className="text-2xl font-bold text-emerald-400">
            ₹{totalCashback.toFixed(2)}
          </p>
          <p className="text-xs text-white/50 mt-1">Total Cashback Earned</p>
        </div>

      </main>
    </div>
  );
}