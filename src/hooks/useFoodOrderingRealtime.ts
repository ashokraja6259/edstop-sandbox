// FILE: src/hooks/useFoodOrderingRealtime.ts

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

/* ================= TYPES ================= */

export interface LiveMenuPrice {
  externalId: string;
  restaurantSlug: string;
  price: number;
  originalPrice: number;
  isAvailable: boolean;
  stockLevel: number;
}

export interface LiveRestaurantStatus {
  slug: string;
  isAvailable: boolean;
  rating: number;
  deliveryTime: string;
  minimumOrder: number;
}

export interface LiveOrderConfirmation {
  orderId: string;
  orderNumber: string;
  status: string;
  estimatedDeliveryTime?: string;
  restaurantName?: string;
}

export interface FoodOrderingRealtimeResult {
  menuPrices: Record<string, LiveMenuPrice>;
  restaurantStatuses: Record<string, LiveRestaurantStatus>;
  orderConfirmation: LiveOrderConfirmation | null;
  isLive: boolean;
  clearOrderConfirmation: () => void;
}

/* ================= DB TYPES ================= */

interface DBMenuItem {
  restaurant_id: string;
  external_id: string;
  price: number;
  original_price: number;
  is_available: boolean;
  stock_level: number;
}

interface DBRestaurant {
  id: string;
  slug: string;
  is_available: boolean;
  rating: number;
  delivery_time: string;
  minimum_order: number;
}

interface DBOrder {
  id: string;
  order_number: string;
  status: string;
  order_type: 'food' | 'dark-store';
  estimated_delivery_time?: string;
  restaurant_name?: string;
  user_id: string;
}

/* ================= HOOK ================= */

export function useFoodOrderingRealtime(
  userId: string | undefined
): FoodOrderingRealtimeResult {

  /* ----- stable clients ----- */

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const toast = useToast();

  /* ----- refs ----- */

  const menuChannelRef = useRef<RealtimeChannel | null>(null);
  const restaurantChannelRef = useRef<RealtimeChannel | null>(null);
  const orderChannelRef = useRef<RealtimeChannel | null>(null);
  const restaurantIdToSlugRef = useRef<Record<string, string>>({});

  /* ----- state ----- */

  const [menuPrices, setMenuPrices] = useState<Record<string, LiveMenuPrice>>({});
  const [restaurantStatuses, setRestaurantStatuses] = useState<Record<string, LiveRestaurantStatus>>({});
  const [orderConfirmation, setOrderConfirmation] = useState<LiveOrderConfirmation | null>(null);
  const [isLive, setIsLive] = useState(false);

  /* ================= INITIAL DATA ================= */

  const fetchInitialData = useCallback(async () => {

    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('id, slug, is_available, rating, delivery_time, minimum_order');

    if (restaurants) {

      const statusMap: Record<string, LiveRestaurantStatus> = {};
      const idMap: Record<string, string> = {};

      restaurants.forEach((r: DBRestaurant) => {

        statusMap[r.slug] = {
          slug: r.slug,
          isAvailable: r.is_available,
          rating: Number(r.rating),
          deliveryTime: r.delivery_time,
          minimumOrder: Number(r.minimum_order),
        };

        idMap[r.id] = r.slug;

      });

      setRestaurantStatuses(statusMap);
      restaurantIdToSlugRef.current = idMap;

    }

    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('restaurant_id, external_id, price, original_price, is_available, stock_level');

    if (menuItems) {

      const priceMap: Record<string, LiveMenuPrice> = {};

      menuItems.forEach((item: DBMenuItem) => {

        const slug = restaurantIdToSlugRef.current[item.restaurant_id] || '';
        const key = `${slug}:${item.external_id}`;

        priceMap[key] = {
          externalId: item.external_id,
          restaurantSlug: slug,
          price: Number(item.price),
          originalPrice: Number(item.original_price),
          isAvailable: item.is_available,
          stockLevel: item.stock_level,
        };

      });

      setMenuPrices(priceMap);

    }

  }, [supabase]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  /* ================= MENU REALTIME ================= */

  useEffect(() => {

    const channel = supabase
      .channel('food-menu-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'menu_items' },
        payload => {

          const item = payload.new as DBMenuItem;

          const slug = restaurantIdToSlugRef.current[item.restaurant_id] || '';
          const key = `${slug}:${item.external_id}`;

          setMenuPrices(prev => ({
            ...prev,
            [key]: {
              externalId: item.external_id,
              restaurantSlug: slug,
              price: Number(item.price),
              originalPrice: Number(item.original_price),
              isAvailable: item.is_available,
              stockLevel: item.stock_level,
            },
          }));

        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsLive(true);
      });

    menuChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      menuChannelRef.current = null;
      setIsLive(false);
    };

  }, []);

  /* ================= RESTAURANT REALTIME ================= */

  useEffect(() => {

    const channel = supabase
      .channel('food-restaurant-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'restaurants' },
        payload => {

          const restaurant = payload.new as DBRestaurant;

          restaurantIdToSlugRef.current[restaurant.id] = restaurant.slug;

          setRestaurantStatuses(prev => ({
            ...prev,
            [restaurant.slug]: {
              slug: restaurant.slug,
              isAvailable: restaurant.is_available,
              rating: Number(restaurant.rating),
              deliveryTime: restaurant.delivery_time,
              minimumOrder: Number(restaurant.minimum_order),
            },
          }));

        }
      )
      .subscribe();

    restaurantChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      restaurantChannelRef.current = null;
    };

  }, []);

  /* ================= ORDER REALTIME ================= */

  useEffect(() => {

    if (!userId) return;

    const channel = supabase
      .channel(`food-order-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        payload => {

          const order = payload.new as DBOrder;

          if (!order || order.order_type !== 'food') return;

          setOrderConfirmation({
            orderId: order.id,
            orderNumber: order.order_number,
            status: order.status,
            estimatedDeliveryTime: order.estimated_delivery_time,
            restaurantName: order.restaurant_name,
          });

          toast.info(
            'Order Update',
            `Order #${order.order_number} → ${order.status}`
          );

        }
      )
      .subscribe();

    orderChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      orderChannelRef.current = null;
    };

  }, [userId, toast]);

  /* ================= HELPERS ================= */

  const clearOrderConfirmation = useCallback(() => {
    setOrderConfirmation(null);
  }, []);

  /* ================= RETURN ================= */

  return {
    menuPrices,
    restaurantStatuses,
    orderConfirmation,
    isLive,
    clearOrderConfirmation,
  };

}