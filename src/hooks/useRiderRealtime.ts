// FILE: src/hooks/useRiderRealtime.ts

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  status: 'available' | 'pending-pickup' | 'in-transit' | 'delivered';
  estimatedTime: string;
  specialInstructions?: string;
  restaurantName: string;
  restaurantAddress: string;
  pickupTime?: string;
}

export type AvailableRiderOrder = RiderOrder & { status: 'available' };
export type AssignedRiderOrder = RiderOrder & {
  status: 'pending-pickup' | 'in-transit' | 'delivered';
};

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
  availableOrders: AvailableRiderOrder[];
  activeOrders: AssignedRiderOrder[];
  completedOrders: AssignedRiderOrder[];
  batchDeliveries: RiderBatchGroup[];
  riderStats: RiderStats;
  isLoading: boolean;
  refresh: () => Promise<void>;
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
  items?: DBOrderItem[];
  notes?: string;
  created_at: string;
  rider_id?: string | null;
  dispatched_at?: string | null;
  actual_delivery_time?: string | null;
}

interface DBOrderItem {
  id?: string;
  name?: string;
  item_name?: string;
  product_name?: string;
  quantity?: number;
  price?: number;
}

const BASE_PAY_PER_DELIVERY = 50;
const BONUS_THRESHOLD = 15;
const BONUS_AMOUNT = 200;

const isAssignedActiveStatus = (status: string) =>
  ['out_for_delivery'].includes(status);

const isAvailableStatus = (status: string) => status === 'ready';

const mapStatus = (
  status: string,
  riderId?: string | null
): RiderOrder['status'] => {
  if (status === 'ready' && !riderId) return 'available';
  if (status === 'out_for_delivery') return 'in-transit';
  if (status === 'delivered') return 'delivered';

  return 'pending-pickup';
};

const formatETA = (estimatedTime?: string) => {
  if (!estimatedTime) return '~20 mins';

  const mins = Math.max(
    0,
    Math.round((new Date(estimatedTime).getTime() - Date.now()) / 60000)
  );

  return mins <= 0 ? 'Now' : `${mins} mins`;
};

const mapPaymentMethod = (method?: string): RiderOrder['paymentMethod'] => {
  const normalized = String(method || '').toLowerCase();
  return normalized === 'cod' ? 'COD' : 'ONLINE';
};

const dbToRider = (order: DBOrder): RiderOrder => {
  const paymentMethod = mapPaymentMethod(order.payment_method);
  const amount = Number(order.final_amount || order.total_amount || 0);

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    customerName: 'Customer',
    customerPhone: '',
    deliveryAddress: order.delivery_address || 'Campus Address',
    landmark: '',
    items: Array.isArray(order.items)
      ? order.items.map((item, index) => ({
          id: item.id || String(index),
          name:
            item.name ||
            item.item_name ||
            item.product_name ||
            `Item ${index + 1}`,
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
        }))
      : [],
    totalAmount: amount,
    paymentMethod,
    codAmount: paymentMethod === 'COD' ? amount : undefined,
    status: mapStatus(order.status, order.rider_id),
    estimatedTime: formatETA(order.estimated_delivery_time),
    specialInstructions: order.delivery_instructions || order.notes || undefined,
    restaurantName: order.restaurant_name || 'Restaurant',
    restaurantAddress: 'IIT KGP Campus',
    pickupTime: order.dispatched_at
      ? new Date(order.dispatched_at).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : undefined,
  };
};

const isAvailableRiderOrder = (
  order: RiderOrder
): order is AvailableRiderOrder => order.status === 'available';

const isAssignedRiderOrder = (
  order: RiderOrder
): order is AssignedRiderOrder => order.status !== 'available';

const calculateStats = (completedOrders: RiderOrder[]): RiderStats => {
  const completedCount = completedOrders.length;
  const base = completedCount * BASE_PAY_PER_DELIVERY;
  const bonus = completedCount >= BONUS_THRESHOLD ? BONUS_AMOUNT : 0;

  return {
    dailyDeliveries: completedCount,
    completedOrders: completedCount,
    totalEarnings: base + bonus,
    baseIncentive: base,
    bonusIncentive: bonus,
    targetDeliveries: BONUS_THRESHOLD,
  };
};

export function useRiderRealtime(
  riderId: string | undefined
): RiderRealtimeData {
  const toast = useToast();
  const channelsRef = useRef<RealtimeChannel[]>([]);

  const [availableOrders, setAvailableOrders] = useState<AvailableRiderOrder[]>([]);
  const [activeOrders, setActiveOrders] = useState<AssignedRiderOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<AssignedRiderOrder[]>([]);
  const [batchDeliveries] = useState<RiderBatchGroup[]>([]);
  const [riderStats, setRiderStats] = useState<RiderStats>({
    dailyDeliveries: 0,
    completedOrders: 0,
    totalEarnings: 0,
    baseIncentive: 0,
    bonusIncentive: 0,
    targetDeliveries: BONUS_THRESHOLD,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!riderId) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/rider/orders', { cache: 'no-store' });
      const data = (await response.json()) as {
        error?: string;
        available?: DBOrder[];
        active?: DBOrder[];
        completed?: DBOrder[];
      };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load rider orders');
      }

      const mappedAvailable = (data.available ?? [])
        .map(dbToRider)
        .filter(isAvailableRiderOrder);
      const mappedActive = (data.active ?? [])
        .map(dbToRider)
        .filter(isAssignedRiderOrder);
      const mappedCompleted = (data.completed ?? [])
        .map(dbToRider)
        .filter(isAssignedRiderOrder);

      setAvailableOrders(mappedAvailable);
      setActiveOrders(mappedActive);
      setCompletedOrders(mappedCompleted);
      setRiderStats(calculateStats(mappedCompleted));
    } catch (error) {
      console.error('Rider data refresh failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [riderId]);

  useEffect(() => {
    if (!riderId) return;

    const initialFetch = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => window.clearTimeout(initialFetch);
  }, [fetchData, riderId]);

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
        },
        (payload) => {
          const order = payload.new as DBOrder | null;

          if (!order?.id) {
            return;
          }

          const mappedOrder = dbToRider(order);

          setAvailableOrders((previous) => {
            const withoutCurrent = previous.filter(
              (row) => row.orderId !== order.id
            );

            if (isAvailableStatus(order.status) && !order.rider_id) {
              return isAvailableRiderOrder(mappedOrder)
                ? [mappedOrder, ...withoutCurrent]
                : withoutCurrent;
            }

            return withoutCurrent;
          });

          setActiveOrders((previous) => {
            const withoutCurrent = previous.filter(
              (row) => row.orderId !== order.id
            );

            if (
              order.rider_id === riderId &&
              isAssignedActiveStatus(order.status) &&
              isAssignedRiderOrder(mappedOrder)
            ) {
              return [mappedOrder, ...withoutCurrent];
            }

            return withoutCurrent;
          });

          setCompletedOrders((previous) => {
            const withoutCurrent = previous.filter(
              (row) => row.orderId !== order.id
            );

            if (
              order.rider_id === riderId &&
              order.status === 'delivered' &&
              isAssignedRiderOrder(mappedOrder)
            ) {
              const updated = [mappedOrder, ...withoutCurrent];
              setRiderStats(calculateStats(updated));
              return updated;
            }

            const updated = withoutCurrent;
            setRiderStats(calculateStats(updated));
            return updated;
          });

          if (order.status === 'ready' && !order.rider_id) {
            toast.info('New order ready', `Order #${order.order_number} is ready for pickup`);
          }

          if (order.rider_id === riderId && order.status === 'out_for_delivery') {
            toast.success('Order assigned', `Order #${order.order_number} is now yours`);
          }

          if (order.rider_id === riderId && order.status === 'delivered') {
            toast.success('Order delivered', `Order #${order.order_number} marked delivered`);
          }

          void fetchData();
        }
      )
      .subscribe();

    channelsRef.current.push(channel);

    return () => {
      channelsRef.current.forEach((currentChannel) =>
        supabase.removeChannel(currentChannel)
      );
      channelsRef.current = [];
    };
  }, [fetchData, riderId, toast]);

  return {
    availableOrders,
    activeOrders,
    completedOrders,
    batchDeliveries,
    riderStats,
    isLoading: riderId ? isLoading : false,
    refresh: fetchData,
  };
}
