// FILE: src/hooks/useDeliveryTracking.ts

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

/* ================= TYPES ================= */

export type DeliveryStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface RiderLocation {
  lat: number;
  lng: number;
  lastUpdated: string;
}

export interface DeliveryUpdate {
  orderId: string;
  orderNumber: string;
  status: DeliveryStatus;
  estimatedDeliveryTime: string | null;
  etaMinutes: number | null;
  riderName: string | null;
  riderPhone: string | null;
  riderLocation: RiderLocation | null;
  restaurantName: string | null;
  updatedAt: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  status: DeliveryStatus;
  estimated_delivery_time: string | null;
  rider_id: string | null;
  restaurant_name: string | null;
  updated_at: string;
}

/* ================= STATUS CONFIG ================= */

export const DELIVERY_STATUS_CONFIG = {
  pending: {
    label: 'Order Placed',
    icon: '📋',
    description: 'Waiting for restaurant confirmation',
    toastType: 'info',
    step: 0,
  },
  confirmed: {
    label: 'Order Confirmed',
    icon: '✅',
    description: 'Restaurant accepted your order',
    toastType: 'success',
    step: 1,
  },
  preparing: {
    label: 'Preparing',
    icon: '👨‍🍳',
    description: 'Your food is being prepared',
    toastType: 'info',
    step: 2,
  },
  ready: {
    label: 'Ready for Pickup',
    icon: '📦',
    description: 'Order packed, rider picking up',
    toastType: 'info',
    step: 3,
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    icon: '🛵',
    description: 'Rider is on the way to you',
    toastType: 'info',
    step: 4,
  },
  delivered: {
    label: 'Delivered',
    icon: '🎉',
    description: 'Enjoy your meal!',
    toastType: 'success',
    step: 5,
  },
  cancelled: {
    label: 'Cancelled',
    icon: '❌',
    description: 'Order has been cancelled',
    toastType: 'error',
    step: -1,
  },
} as const;

export const DARK_STORE_STEPS: DeliveryStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
];

/* ================= HELPERS ================= */

const calcEta = (estimatedDeliveryTime: string | null): number | null => {
  if (!estimatedDeliveryTime) return null;

  const diff = Math.round(
    (new Date(estimatedDeliveryTime).getTime() - Date.now()) / 60000
  );

  return Math.max(0, diff);
};

/* ================= HOOK ================= */

export function useDeliveryTracking(
  orderId: string | null,
  userId: string | undefined
) {

  /* stable supabase */

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const toast = useToast();

  const channelRef = useRef<RealtimeChannel | null>(null);
  const prevStatusRef = useRef<DeliveryStatus | null>(null);

  const [delivery, setDelivery] = useState<DeliveryUpdate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ================= INITIAL FETCH ================= */

  useEffect(() => {

    if (!orderId || !userId) {
      setDelivery(null);
      return;
    }

    let cancelled = false;

    const fetchOrder = async () => {

      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, order_number, status, estimated_delivery_time, rider_id, restaurant_name, updated_at'
        )
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (cancelled) return;

      if (error || !data) {
        setError('Could not load order details.');
        setIsLoading(false);
        return;
      }

      const row = data as OrderRow;

      prevStatusRef.current = row.status;

      setDelivery({
        orderId: row.id,
        orderNumber: row.order_number,
        status: row.status,
        estimatedDeliveryTime: row.estimated_delivery_time,
        etaMinutes: calcEta(row.estimated_delivery_time),
        riderName: null,
        riderPhone: null,
        riderLocation: null,
        restaurantName: row.restaurant_name,
        updatedAt: row.updated_at,
      });

      setIsLoading(false);

    };

    fetchOrder();

    return () => {
      cancelled = true;
    };

  }, [orderId, userId, supabase]);

  /* ================= REALTIME ================= */

  useEffect(() => {

    if (!orderId || !userId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`delivery-order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        payload => {

          const row = payload.new as OrderRow;

          const prevStatus = prevStatusRef.current;
          prevStatusRef.current = row.status;

          setDelivery(prev => ({
            ...(prev ?? {
              orderId: row.id,
              orderNumber: row.order_number,
              riderName: null,
              riderPhone: null,
              restaurantName: row.restaurant_name,
              riderLocation: null,
            }),
            status: row.status,
            estimatedDeliveryTime: row.estimated_delivery_time,
            etaMinutes: calcEta(row.estimated_delivery_time),
            updatedAt: row.updated_at,
          }));

          if (prevStatus !== row.status) {

            const config = DELIVERY_STATUS_CONFIG[row.status];

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

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };

  }, [orderId, userId, supabase, toast]);

  /* ================= ETA REFRESH ================= */

  useEffect(() => {

    if (!delivery?.estimatedDeliveryTime) return;

    const interval = setInterval(() => {

      setDelivery(prev =>
        prev
          ? {
              ...prev,
              etaMinutes: calcEta(prev.estimatedDeliveryTime),
            }
          : prev
      );

    }, 30000);

    return () => clearInterval(interval);

  }, [delivery?.estimatedDeliveryTime]);

  return {
    delivery,
    isLoading,
    error,
    statusConfig: DELIVERY_STATUS_CONFIG,
    steps: DARK_STORE_STEPS,
  };

}

export default useDeliveryTracking;