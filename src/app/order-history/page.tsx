'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Icon from '@/components/ui/AppIcon';
import { supabase } from '@/lib/supabase/client';

type OrderType = 'food' | 'dark-store';

interface DisplayOrder {
  id: string;
  orderNumber: string;
  type: OrderType;
  title: string;
  status: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  deliveryAddress?: string;
  itemsText?: string;
}

const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

const formatDateTime = (value: string) => {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusClass = (status: string) => {
  const normalized = status.toLowerCase();

  if (['delivered', 'completed', 'success', 'paid'].includes(normalized)) {
    return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
  }

  if (['cancelled', 'failed', 'refunded'].includes(normalized)) {
    return 'bg-red-500/15 border-red-500/30 text-red-300';
  }

  if (
    [
      'preparing',
      'confirmed',
      'processing',
      'out_for_delivery',
      'out-for-delivery',
      'dispatched',
    ].includes(normalized)
  ) {
    return 'bg-blue-500/15 border-blue-500/30 text-blue-300';
  }

  return 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300';
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

const stringifyItems = (items: unknown) => {
  if (!Array.isArray(items)) return '';

  return items
    .map((item) => {
      const row = asRecord(item);
      const name = asString(row.name, asString(row.item_name, asString(row.product_name, 'Item')));
      const quantity = asNumber(row.quantity, 1);
      return `${name} × ${quantity}`;
    })
    .join(', ');
};

const mapOrder = (rawOrder: Record<string, unknown>): DisplayOrder => {
  const id = asString(rawOrder.id, Math.random().toString(36).slice(2));
  const orderTypeValue = asString(rawOrder.order_type, 'food').toLowerCase();
  const type: OrderType = orderTypeValue === 'store' || orderTypeValue === 'dark-store'
    ? 'dark-store'
    : 'food';

  const title =
    type === 'dark-store'
      ? 'Dark Store Order'
      : asString(rawOrder.restaurant_name, 'Food Order');

  return {
    id,
    orderNumber: asString(rawOrder.order_number, id.slice(0, 8).toUpperCase()),
    type,
    title,
    status: asString(rawOrder.status, 'pending'),
    total: asNumber(rawOrder.final_amount, asNumber(rawOrder.total_amount, 0)),
    paymentMethod: asString(rawOrder.payment_method, 'COD').toUpperCase(),
    createdAt: asString(rawOrder.created_at, ''),
    deliveryAddress: asString(rawOrder.delivery_address, ''),
    itemsText: stringifyItems(rawOrder.items),
  };
};

export default function OrderHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user?.id) {
      return;
    }

    let cancelled = false;

    const loadOrders = async () => {
      setIsLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, user_id, order_number, order_type, status, total_amount, final_amount, payment_method, delivery_address, restaurant_name, items, created_at'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        setLoadError(error.message);
        toast.error('Order history failed', error.message);
        setOrders([]);
        setIsLoading(false);
        return;
      }

      const mappedOrders = (data ?? []).map((order) =>
        mapOrder(order as Record<string, unknown>)
      );

      setOrders(mappedOrders);
      setIsLoading(false);
    };

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [authLoading, toast, user]);

  const summary = useMemo(() => {
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    const foodCount = orders.filter((order) => order.type === 'food').length;
    const darkStoreCount = orders.filter((order) => order.type === 'dark-store').length;

    return {
      totalOrders: orders.length,
      totalSpent,
      foodCount,
      darkStoreCount,
    };
  }, [orders]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-white/60">Loading order history...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center px-4">
        <div className="glass-card rounded-2xl border border-white/10 p-6 text-center max-w-md">
          <h1 className="text-xl font-bold text-white">Login required</h1>
          <p className="text-sm text-white/60 mt-2">
            Please login to view your order history.
          </p>
          <Link
            href="/login"
            className="inline-flex mt-5 px-5 py-2.5 rounded-xl gradient-primary text-sm font-semibold text-white"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 glass-strong border-b border-white/10 sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4 max-w-5xl">
          <Link
            href="/student-dashboard"
            className="flex items-center justify-center w-9 h-9 rounded-xl glass hover:bg-white/10 transition-smooth"
          >
            <Icon name="ArrowLeftIcon" size={18} className="text-white/80" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-glow-purple">
              <Icon
                name="ClipboardDocumentListIcon"
                size={20}
                variant="solid"
                className="text-white"
              />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white leading-tight">Order History</h1>
              <p className="text-xs text-white/50">Your food and dark store orders</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-6 max-w-5xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="glass-card rounded-2xl border border-white/10 p-4">
            <p className="text-xs text-white/50">Total Orders</p>
            <p className="text-2xl font-bold text-white mt-1">{summary.totalOrders}</p>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 p-4">
            <p className="text-xs text-white/50">Total Spent</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {formatCurrency(summary.totalSpent)}
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 p-4">
            <p className="text-xs text-white/50">Food Orders</p>
            <p className="text-2xl font-bold text-purple-300 mt-1">{summary.foodCount}</p>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 p-4">
            <p className="text-xs text-white/50">Dark Store</p>
            <p className="text-2xl font-bold text-indigo-300 mt-1">{summary.darkStoreCount}</p>
          </div>
        </div>

        {loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 mb-6">
            <p className="text-sm font-semibold text-red-200">Could not load orders</p>
            <p className="text-xs text-red-100/70 mt-1">{loadError}</p>
          </div>
        )}

        {orders.length === 0 && !loadError ? (
          <div className="glass-card rounded-2xl border border-white/10 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl gradient-primary mx-auto flex items-center justify-center mb-4">
              <Icon name="ClipboardDocumentListIcon" size={28} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">No orders yet</h2>
            <p className="text-sm text-white/60 mt-2">
              Your food and dark store orders will appear here after checkout.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
              <Link
                href="/food-ordering-interface"
                className="px-5 py-2.5 rounded-xl gradient-primary text-sm font-semibold text-white"
              >
                Order Food
              </Link>
              <Link
                href="/dark-store-shopping"
                className="px-5 py-2.5 rounded-xl glass border border-white/10 text-sm text-white/80 hover:bg-white/10"
              >
                Shop Dark Store
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="glass-card rounded-2xl border border-white/10 p-5"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Icon
                        name={order.type === 'food' ? 'ShoppingBagIcon' : 'ShoppingCartIcon'}
                        size={22}
                        className={order.type === 'food' ? 'text-purple-300' : 'text-indigo-300'}
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-white">{order.title}</h2>
                        <span
                          className={`px-2.5 py-1 rounded-full border text-xs font-medium ${getStatusClass(order.status)}`}
                        >
                          {order.status.replaceAll('_', ' ')}
                        </span>
                      </div>

                      <p className="text-xs text-white/45 mt-1">
                        #{order.orderNumber} · {formatDateTime(order.createdAt)}
                      </p>

                      {order.itemsText && (
                        <p className="text-sm text-white/70 mt-3">{order.itemsText}</p>
                      )}

                      {order.deliveryAddress && (
                        <p className="text-xs text-white/45 mt-2">
                          Delivery: {order.deliveryAddress}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="md:text-right">
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(order.total)}
                    </p>
                    <p className="text-xs text-white/45 mt-1">{order.paymentMethod}</p>
                    <p className="text-xs text-white/45 mt-1">
                      {order.type === 'food' ? 'Food' : 'Dark Store'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}