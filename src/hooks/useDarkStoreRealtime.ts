// FILE: src/hooks/useDarkStoreRealtime.ts

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // ✅ singleton
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

/* ================= TYPES ================= */

export type DarkStoreOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface DarkStoreDelivery {
  orderId: string;
  orderNumber: string;
  status: DarkStoreOrderStatus;
  etaMinutes: number | null;
  estimatedDeliveryTime: string | null;
  updatedAt: string;
}

const DELIVERY_STATUS_CONFIG: Record<
  DarkStoreOrderStatus,
  { label: string; icon: string; description: string; toastType: 'success' | 'info' | 'warning' | 'error'; step: number }
> = {
  pending:          { label: 'Order Placed',     icon: '📋', description: 'Waiting for store confirmation',       toastType: 'info',    step: 0 },
  confirmed:        { label: 'Order Confirmed',  icon: '✅', description: 'Store accepted your order',            toastType: 'success', step: 1 },
  preparing:        { label: 'Packing Items',    icon: '📦', description: 'Your items are being packed',          toastType: 'info',    step: 2 },
  ready:            { label: 'Ready for Pickup', icon: '🏪', description: 'Order packed, rider picking up',       toastType: 'info',    step: 3 },
  out_for_delivery: { label: 'Out for Delivery', icon: '🛵', description: 'Rider is on the way to your hostel',  toastType: 'info',    step: 4 },
  delivered:        { label: 'Delivered!',       icon: '🎉', description: 'Enjoy your items!',                   toastType: 'success', step: 5 },
  cancelled:        { label: 'Cancelled',        icon: '❌', description: 'Your order has been cancelled',       toastType: 'error',   step: -1 },
};

export const DARK_STORE_STEPS: DarkStoreOrderStatus[] = [
  'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered',
];

const calcEta = (estimatedDeliveryTime: string | null): number | null => {
  if (!estimatedDeliveryTime) return null;
  const diff = Math.round(
    (new Date(estimatedDeliveryTime).getTime() - Date.now()) / 60000
  );
  return Math.max(0, diff);
};

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  estimated_delivery_time: string | null;
  items: Array<{ id: string; quantity: number }> | null;
  updated_at: string;
  order_type?: string;
}

/* ================= HOOK ================= */

export function useDarkStoreRealtime(
  userId: string | undefined,
  activeOrderId: string | null,
  mockStockMap: Record<string, number>
) {
  const toast = useToast();

  const channelsRef = useRef<RealtimeChannel[]>([]);
  const prevStatusRef = useRef<string | null>(null);
  const prevStockRef = useRef<Record<string, number>>({});

  const [liveStockMap, setLiveStockMap] = useState<Record<string, number>>({});
  const [activeDelivery, setActiveDelivery] = useState<DarkStoreDelivery | null>(null);
  const [isLoadingDelivery, setIsLoadingDelivery] = useState(false);

  const cleanup = useCallback(() => {
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];
  }, []);

  /* ───────── FETCH ACTIVE ORDER ───────── */

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    setIsLoadingDelivery(true);

    const fetchActiveOrder = async () => {
      try {
        let query = supabase
          .from('orders')
          .select('id, order_number, status, estimated_delivery_time, items, updated_at')
          .eq('user_id', userId)
          .eq('order_type', 'store');

        if (activeOrderId) {
          query = query.eq('order_number', activeOrderId);
        } else {
          query = query
            .not('status', 'in', '("delivered","cancelled")')
            .order('created_at', { ascending: false })
            .limit(1);
        }

        const { data } = await query;

        if (cancelled) return;

        if (data && data.length > 0) {
          const row = data[0] as OrderRow;
          prevStatusRef.current = row.status;

          setActiveDelivery({
            orderId: row.id,
            orderNumber: row.order_number,
            status: row.status as DarkStoreOrderStatus,
            etaMinutes: calcEta(row.estimated_delivery_time),
            estimatedDeliveryTime: row.estimated_delivery_time,
            updatedAt: row.updated_at,
          });
        }
      } catch (err) {
        console.error('Fetch active order failed:', err);
      } finally {
        if (!cancelled) setIsLoadingDelivery(false);
      }
    };

    fetchActiveOrder();
    return () => { cancelled = true; };
  }, [userId, activeOrderId]);

  /* ───────── REALTIME SUBSCRIPTIONS ───────── */

  useEffect(() => {
    if (!userId) return;

    cleanup();

    /* DELIVERY STATUS CHANNEL */
    const deliveryFilter = activeOrderId
      ? `order_number=eq.${activeOrderId}`
      : `user_id=eq.${userId}`;

    const deliveryChannel = supabase
      .channel(`darkstore-delivery-${userId}-${activeOrderId ?? 'latest'}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: deliveryFilter,
        },
        payload => {
          const row = payload.new as OrderRow;

          if (row.order_type !== 'store') return;

          const prevStatus = prevStatusRef.current;
          prevStatusRef.current = row.status;

          setActiveDelivery({
            orderId: row.id,
            orderNumber: row.order_number,
            status: row.status as DarkStoreOrderStatus,
            etaMinutes: calcEta(row.estimated_delivery_time),
            estimatedDeliveryTime: row.estimated_delivery_time,
            updatedAt: row.updated_at,
          });

          if (prevStatus !== row.status) {
            const config = DELIVERY_STATUS_CONFIG[row.status as DarkStoreOrderStatus];
            if (config) {
              const eta = calcEta(row.estimated_delivery_time);
              const etaText =
                eta !== null && row.status === 'out_for_delivery'
                  ? ` ETA: ${eta} min`
                  : '';

              toast[config.toastType](
                `${config.icon} ${config.label}`,
                `Order #${row.order_number} — ${config.description}${etaText}`
              );
            }
          }
        }
      )
      .subscribe();

    channelsRef.current.push(deliveryChannel);

    /* STOCK CHANNEL */
    const stockChannel = supabase
      .channel(`darkstore-stock`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `order_type=eq.store`,
        },
        payload => {
          const row = payload.new as OrderRow;
          if (!row.items || !Array.isArray(row.items)) return;

          setLiveStockMap(prev => {
            const updated = { ...prev };

            row.items!.forEach(item => {
              const currentStock = updated[item.id] ?? mockStockMap[item.id] ?? 0;
              const newStock = Math.max(0, currentStock - item.quantity);
              updated[item.id] = newStock;

              const prevStock = prevStockRef.current[item.id] ?? currentStock;

              if (newStock === 0 && prevStock > 0) {
                toast.error('🚫 Out of Stock', 'A product just went out of stock.');
              } else if (newStock <= 3 && newStock > 0 && prevStock > 3) {
                toast.warning(
                  '⚠️ Low Stock',
                  `Only ${newStock} left — hurry!`
                );
              }

              prevStockRef.current[item.id] = newStock;
            });

            return updated;
          });
        }
      )
      .subscribe();

    channelsRef.current.push(stockChannel);

    return cleanup;
  }, [userId, activeOrderId, mockStockMap, toast, cleanup]);

  /* ───────── ETA REFRESH ───────── */

  useEffect(() => {
    if (!activeDelivery?.estimatedDeliveryTime) return;

    const interval = setInterval(() => {
      setActiveDelivery(prev =>
        prev
          ? { ...prev, etaMinutes: calcEta(prev.estimatedDeliveryTime) }
          : prev
      );
    }, 30000);

    return () => clearInterval(interval);
  }, [activeDelivery?.estimatedDeliveryTime]);

  return {
    liveStockMap,
    activeDelivery,
    isLoadingDelivery,
    statusConfig: DELIVERY_STATUS_CONFIG,
    steps: DARK_STORE_STEPS,
  };
}

export { DELIVERY_STATUS_CONFIG };
export default useDarkStoreRealtime;