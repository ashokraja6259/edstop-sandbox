import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ORDER_COLUMNS =
  'id, order_number, status, total_amount, final_amount, payment_method, delivery_address, delivery_instructions, estimated_delivery_time, restaurant_id, restaurant_name, notes, created_at, rider_id, dispatched_at, actual_delivery_time';

type OrderRow = Record<string, unknown> & {
  id: string;
  restaurant_id: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  item_name: string;
  quantity: number;
  price: number;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string | null }>();

  if (profileError || profile?.role !== 'rider') {
    return NextResponse.json({ error: 'Rider access required' }, { status: 403 });
  }

  const admin = createAdminClient();
  const [availableResult, activeResult, completedResult] = await Promise.all([
    admin
      .from('orders')
      .select(ORDER_COLUMNS)
      .is('rider_id', null)
      .eq('status', 'ready')
      .order('created_at', { ascending: true }),
    admin
      .from('orders')
      .select(ORDER_COLUMNS)
      .eq('rider_id', user.id)
      .eq('status', 'out_for_delivery')
      .order('dispatched_at', { ascending: false }),
    admin
      .from('orders')
      .select(ORDER_COLUMNS)
      .eq('rider_id', user.id)
      .eq('status', 'delivered')
      .order('actual_delivery_time', { ascending: false }),
  ]);

  const queryError =
    availableResult.error || activeResult.error || completedResult.error;

  if (queryError) {
    console.error('Rider order fetch failed:', queryError.message);
    return NextResponse.json({ error: 'Failed to load rider orders' }, { status: 500 });
  }

  const groups = [
    (availableResult.data ?? []) as OrderRow[],
    (activeResult.data ?? []) as OrderRow[],
    (completedResult.data ?? []) as OrderRow[],
  ];
  const orders = groups.flat();
  const orderIds = orders.map((order) => order.id);
  const restaurantIds = Array.from(
    new Set(
      orders
        .map((order) => order.restaurant_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [itemsResult, restaurantsResult] = await Promise.all([
    orderIds.length
      ? admin
          .from('order_items')
          .select('id, order_id, item_name, quantity, price')
          .in('order_id', orderIds)
      : Promise.resolve({ data: [], error: null }),
    restaurantIds.length
      ? admin.from('restaurants').select('id, name').in('id', restaurantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (itemsResult.error || restaurantsResult.error) {
    console.error(
      'Rider order detail fetch failed:',
      itemsResult.error?.message || restaurantsResult.error?.message
    );
    return NextResponse.json({ error: 'Failed to load rider order details' }, { status: 500 });
  }

  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const item of (itemsResult.data ?? []) as OrderItemRow[]) {
    const current = itemsByOrder.get(item.order_id) ?? [];
    current.push(item);
    itemsByOrder.set(item.order_id, current);
  }

  const restaurantNames = new Map(
    (restaurantsResult.data ?? []).map((restaurant) => [restaurant.id, restaurant.name])
  );
  const attachDetails = (order: OrderRow) => ({
    ...order,
    restaurant_name:
      (order.restaurant_id && restaurantNames.get(order.restaurant_id)) ||
      order.restaurant_name,
    items: itemsByOrder.get(order.id) ?? [],
  });

  return NextResponse.json({
    available: groups[0].map(attachDetails),
    active: groups[1].map(attachDetails),
    completed: groups[2].map(attachDetails),
  });
}
