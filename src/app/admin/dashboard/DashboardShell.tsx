// FILE: src/app/admin/dashboard/DashboardShell.tsx

import { createClient } from '@/lib/supabase/server';
import DashboardUI from './DashboardUI';

type OrderRow = {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  final_amount: number | null;
  total_amount: number | null;
  payment_method: string | null;
  restaurant_name: string | null;
  created_at: string | null;
};

type RestaurantRow = {
  id: string;
  name: string;
  is_open: boolean | null;
  is_active: boolean | null;
  is_available: boolean | null;
};

type SupportTicketRow = {
  id: string;
  status: string;
  category: string;
  created_at: string | null;
};

type MarketplaceRow = {
  id: string;
  status: string;
};

type LostFoundRow = {
  id: string;
  status: string;
  item_type: string;
};

export default async function DashboardShell({
  range,
}: {
  range: number;
}) {
  const supabase = await createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - Number(range || 30));
  rangeStart.setHours(0, 0, 0, 0);

  const [
    { data: orders, error: ordersError },
    { data: restaurants, error: restaurantsError },
    { data: supportTickets, error: supportError },
    { data: marketplaceItems, error: marketplaceError },
    { data: lostFoundItems, error: lostFoundError },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select(
        'id, order_number, order_type, status, final_amount, total_amount, payment_method, restaurant_name, created_at'
      )
      .gte('created_at', rangeStart.toISOString())
      .order('created_at', { ascending: false })
      .returns<OrderRow[]>(),

    supabase
      .from('restaurants')
      .select('id, name, is_open, is_active, is_available')
      .returns<RestaurantRow[]>(),

    supabase
      .from('support_tickets')
      .select('id, status, category, created_at')
      .returns<SupportTicketRow[]>(),

    supabase
      .from('marketplace_items')
      .select('id, status')
      .returns<MarketplaceRow[]>(),

    supabase
      .from('lost_found_items')
      .select('id, status, item_type')
      .returns<LostFoundRow[]>(),
  ]);

  if (ordersError) console.error('Admin dashboard orders fetch failed:', ordersError);
  if (restaurantsError) console.error('Admin dashboard restaurants fetch failed:', restaurantsError);
  if (supportError) console.error('Admin dashboard support fetch failed:', supportError);
  if (marketplaceError) console.error('Admin dashboard marketplace fetch failed:', marketplaceError);
  if (lostFoundError) console.error('Admin dashboard lost/found fetch failed:', lostFoundError);

  const orderRows = orders ?? [];
  const restaurantRows = restaurants ?? [];
  const supportRows = supportTickets ?? [];
  const marketplaceRows = marketplaceItems ?? [];
  const lostFoundRows = lostFoundItems ?? [];

  const todayOrders = orderRows.filter((order) => {
    if (!order.created_at) return false;
    return new Date(order.created_at) >= todayStart;
  });

  const revenue = orderRows.reduce(
    (sum, order) => sum + Number(order.final_amount || order.total_amount || 0),
    0
  );

  const todayRevenue = todayOrders.reduce(
    (sum, order) => sum + Number(order.final_amount || order.total_amount || 0),
    0
  );

  const deliveredOrders = orderRows.filter((order) => order.status === 'delivered');
  const readyOrders = orderRows.filter((order) => order.status === 'ready');
  const outForDeliveryOrders = orderRows.filter(
    (order) => order.status === 'out_for_delivery'
  );
  const cancelledOrders = orderRows.filter((order) => order.status === 'cancelled');

  const averageOrderValue =
    orderRows.length > 0 ? revenue / orderRows.length : 0;

  const openTickets = supportRows.filter((ticket) =>
    ['open', 'in_progress'].includes(ticket.status)
  );

  const activeMarketplace = marketplaceRows.filter(
    (item) => item.status === 'active'
  );

  const activeLostFound = lostFoundRows.filter(
    (item) => item.status === 'active'
  );

  const openRestaurants = restaurantRows.filter(
    (restaurant) => restaurant.is_open
  );

  const activeRestaurants = restaurantRows.filter(
    (restaurant) => restaurant.is_active !== false && restaurant.is_available !== false
  );

  const orderStatusCounts = [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered',
    'cancelled',
  ].map((status) => ({
    status,
    count: orderRows.filter((order) => order.status === status).length,
  }));

  const restaurantOrderMap = new Map<string, { name: string; orders: number; revenue: number }>();

  orderRows.forEach((order) => {
    const name = order.restaurant_name || 'Unknown Restaurant';
    const current = restaurantOrderMap.get(name) || {
      name,
      orders: 0,
      revenue: 0,
    };

    current.orders += 1;
    current.revenue += Number(order.final_amount || order.total_amount || 0);

    restaurantOrderMap.set(name, current);
  });

  const topRestaurants = Array.from(restaurantOrderMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const recentOrders = orderRows.slice(0, 10);

  return (
    <DashboardUI
      range={range}
      metrics={{
        totalOrders: orderRows.length,
        todayOrders: todayOrders.length,
        revenue,
        todayRevenue,
        averageOrderValue,
        deliveredOrders: deliveredOrders.length,
        readyOrders: readyOrders.length,
        outForDeliveryOrders: outForDeliveryOrders.length,
        cancelledOrders: cancelledOrders.length,
        restaurants: restaurantRows.length,
        openRestaurants: openRestaurants.length,
        activeRestaurants: activeRestaurants.length,
        openTickets: openTickets.length,
        activeMarketplace: activeMarketplace.length,
        activeLostFound: activeLostFound.length,
      }}
      orderStatusCounts={orderStatusCounts}
      topRestaurants={topRestaurants}
      recentOrders={recentOrders}
    />
  );
}