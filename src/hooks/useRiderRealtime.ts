// FILE: src/hooks/useRiderRealtime.ts

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // ✅ singleton
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

/* ───────────────────────────────────────────────────────────── */
/* TYPES */
/* ───────────────────────────────────────────────────────────── */

export interface RiderOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  landmark: string;
  items: { id: string; name: string; quantity: number; price: number }[];
  totalAmount: number;
  paymentMethod: 'COD' | 'ONLINE';
  codAmount?: number;
  status: 'pending-pickup' | 'in-transit' | 'delivered';
  estimatedTime: string;
  specialInstructions?: string;
  restaurantName: string;
  restaurantAddress: string;
  pickupTime?: string;
}

export interface RiderBatchOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress: string;
  landmark: string;
  estimatedTime: string;
  sequence: number;
}

export interface RiderBatchGroup {
  zoneId: string;
  zoneName: string;
  orders: RiderBatchOrder[];
  totalDistance: string;
  estimatedDuration: string;
}

export interface RiderStats {
  dailyDeliveries: number;
  completedOrders: number;
  totalEarnings: number;
  baseIncentive: number;
  bonusIncentive: number;
  targetDeliveries: number;
}

export interface RiderRealtimeData {
  activeOrders: RiderOrder[];
  completedOrders: RiderOrder[];
  batchDeliveries: RiderBatchGroup[];
  riderStats: RiderStats;
  isLoading: boolean;
}

interface DBOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  final_amount: number;
  payment_method?: string;
  delivery_address?: string;
  delivery_instructions?: string;
  estimated_delivery_time?: string;
  restaurant_name?: string;
  items?: any[];
  notes?: string;
  created_at: string;
  rider_id?: string;
}

/* ───────────────────────────────────────────────────────────── */
/* CONSTANTS */
/* ───────────────────────────────────────────────────────────── */

const BASE_PAY_PER_DELIVERY = 50;
const BONUS_THRESHOLD = 15;
const BONUS_AMOUNT = 200;

/* ───────────────────────────────────────────────────────────── */
/* HELPERS */
/* ───────────────────────────────────────────────────────────── */

const isActiveStatus = (status: string) =>
  ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(status);

const mapStatus = (status: string): RiderOrder['status'] => {
  const map: Record<string, RiderOrder['status']> = {
    pending: 'pending-pickup',
    confirmed: 'pending-pickup',
    preparing: 'pending-pickup',
    ready: 'pending-pickup',
    out_for_delivery: 'in-transit',
    delivered: 'delivered',
  };
  return map[status] ?? 'pending-pickup';
};

const formatETA = (estimatedTime?: string) => {
  if (!estimatedTime) return '~20 mins';
  const mins = Math.max(
    0,
    Math.round((new Date(estimatedTime).getTime() - Date.now()) / 60000)
  );
  return mins <= 0 ? 'Now' : `${mins} mins`;
};

const dbToRider = (o: DBOrder): RiderOrder => ({
  orderId: o.id,
  orderNumber: o.order_number,
  customerName: 'Customer',
  customerPhone: '',
  deliveryAddress: o.delivery_address || 'Campus Address',
  landmark: '',
  items: Array.isArray(o.items)
    ? o.items.map((item: any, i: number) => ({
        id: item.id || String(i),
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }))
    : [],
  totalAmount: Number(o.final_amount || o.total_amount),
  paymentMethod: o.payment_method === 'COD' ? 'COD' : 'ONLINE',
  codAmount:
    o.payment_method === 'COD'
      ? Number(o.final_amount || o.total_amount)
      : undefined,
  status: mapStatus(o.status),
  estimatedTime: formatETA(o.estimated_delivery_time),
  specialInstructions: o.delivery_instructions,
  restaurantName: o.restaurant_name || 'Restaurant',
  restaurantAddress: 'IIT KGP Campus',
});

/* ───────────────────────────────────────────────────────────── */
/* HOOK */
/* ───────────────────────────────────────────────────────────── */

export function useRiderRealtime(
  riderId: string | undefined
): RiderRealtimeData {
  const toast = useToast();
  const channelsRef = useRef<RealtimeChannel[]>([]);

  const [activeOrders, setActiveOrders] = useState<RiderOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<RiderOrder[]>([]);
  const [batchDeliveries, setBatchDeliveries] = useState<RiderBatchGroup[]>([]);
  const [riderStats, setRiderStats] = useState<RiderStats>({
    dailyDeliveries: 0,
    completedOrders: 0,
    totalEarnings: 0,
    baseIncentive: 0,
    bonusIncentive: 0,
    targetDeliveries: BONUS_THRESHOLD,
  });
  const [isLoading, setIsLoading] = useState(true);

  /* ───────── INITIAL FETCH ───────── */

  useEffect(() => {
    if (!riderId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);

      const { data: activeData } = await supabase
        .from('orders')
        .select('*')
        .eq('rider_id', riderId)
        .in('status', [
          'pending',
          'confirmed',
          'preparing',
          'ready',
          'out_for_delivery',
        ]);

      const { data: completedData } = await supabase
        .from('orders')
        .select('*')
        .eq('rider_id', riderId)
        .eq('status', 'delivered');

      const mappedActive = (activeData || []).map(dbToRider);
      const mappedCompleted = (completedData || []).map(dbToRider);

      setActiveOrders(mappedActive);
      setCompletedOrders(mappedCompleted);

      const completedCount = mappedCompleted.length;
      const base = completedCount * BASE_PAY_PER_DELIVERY;
      const bonus =
        completedCount >= BONUS_THRESHOLD ? BONUS_AMOUNT : 0;

      setRiderStats({
        dailyDeliveries: completedCount,
        completedOrders: completedCount,
        totalEarnings: base + bonus,
        baseIncentive: base,
        bonusIncentive: bonus,
        targetDeliveries: BONUS_THRESHOLD,
      });

      setIsLoading(false);
    };

    fetchData();
  }, [riderId]);

  /* ───────── REALTIME ───────── */

  useEffect(() => {
    if (!riderId) return;

    const channel = supabase
      .channel(`rider-orders-${riderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `rider_id=eq.${riderId}`,
        },
        (payload) => {
          const order = payload.new as DBOrder;

          if (payload.eventType === 'INSERT' && isActiveStatus(order.status)) {
            setActiveOrders(prev => [dbToRider(order), ...prev]);
            toast.success('🚴 New Order Assigned');
          }

          if (payload.eventType === 'UPDATE') {
            if (order.status === 'delivered') {
              setActiveOrders(prev =>
                prev.filter(o => o.orderId !== order.id)
              );
              setCompletedOrders(prev => [dbToRider(order), ...prev]);
              toast.success('✅ Order Delivered');
            }
          }
        }
      )
      .subscribe();

    channelsRef.current.push(channel);

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [riderId, toast]);

  return {
    activeOrders,
    completedOrders,
    batchDeliveries,
    riderStats,
    isLoading,
  };
}