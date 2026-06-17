// FILE: src/app/vendor/orders/page.tsx

import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const NEXT_STATUS: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
};

const COLUMNS = ['pending', 'confirmed', 'preparing', 'ready'];

async function advanceOrderStatus(formData: FormData) {
  'use server';

  await requireRole('vendor');

  const supabase = await createClient();
  const orderId = String(formData.get('order_id') || '');
  const nextStatus = String(formData.get('next_status') || '');

  if (!orderId || !['confirmed', 'preparing', 'ready'].includes(nextStatus)) {
    return;
  }

  const { data: orderBefore } = await supabase
    .from('orders')
    .select('id, user_id, order_number, restaurant_name')
    .eq('id', orderId)
    .maybeSingle();

  const { error } = await supabase.rpc('vendor_update_order_status', {
    p_order_id: orderId,
    p_status: nextStatus,
  });

  if (error) {
    console.error('Vendor order advance failed:', error);
    return;
  }

  if (orderBefore?.user_id) {
    const statusText = nextStatus.replaceAll('_', ' ');

    await supabase.from('notifications').insert({
      user_id: orderBefore.user_id,
      title: `Order ${statusText}`,
      message: `Your order #${orderBefore.order_number} from ${
        orderBefore.restaurant_name || 'the restaurant'
      } is now ${statusText}.`,
      type: 'order',
      link_url: `/orders/${orderBefore.id}`,
    });
  }

  revalidatePath('/vendor/orders');
  revalidatePath('/vendor/dashboard');
  revalidatePath('/notifications');
}

type VendorOrdersPageProps = {
  searchParams?: {
    restaurantId?: string;
  };
};

type OrderRow = {
  id: string;
  order_number: string | null;
  status: string | null;
  final_amount: number | null;
  total_amount: number | null;
  payment_method: string | null;
  items: unknown;
  created_at: string | null;
};

function itemText(items: unknown) {
  if (!Array.isArray(items)) return 'Items unavailable';

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return 'Item';

      const row = item as Record<string, unknown>;
      const name =
        typeof row.name === 'string'
          ? row.name
          : typeof row.item_name === 'string'
            ? row.item_name
            : 'Item';

      const quantity = Number(row.quantity || 1);

      return `${name} × ${quantity}`;
    })
    .join(', ');
}

export default async function VendorOrdersPage({
  searchParams,
}: VendorOrdersPageProps) {
  const { user, role } = await requireRole('vendor');
  const supabase = await createClient();

  const selectedRestaurantId = searchParams?.restaurantId || '';

  const { data: restaurantRows } =
    role === 'admin'
      ? await supabase
          .from('restaurants')
          .select('id, name, is_open, is_active, is_available')
          .order('name', { ascending: true })
      : await supabase
          .from('restaurants')
          .select('id, name, is_open, is_active, is_available')
          .eq('owner_id', user.id)
          .order('name', { ascending: true });

  const restaurants = restaurantRows ?? [];

  const restaurant =
    restaurants.find((row) => row.id === selectedRestaurantId) ||
    restaurants[0] ||
    null;

  if (!restaurant) {
    return (
      <main className="min-h-screen bg-background text-white px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <h1 className="text-2xl font-bold">No restaurant assigned</h1>
          <p className="mt-2 text-white/60">
            No restaurant is linked to this account yet.
          </p>
          <Link
            href="/vendor/dashboard"
            className="mt-6 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
          >
            Back to Vendor Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { data: orders } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, final_amount, total_amount, payment_method, items, created_at'
    )
    .eq('restaurant_id', restaurant.id)
    .in('status', COLUMNS)
    .order('created_at', { ascending: true })
    .returns<OrderRow[]>();

  const orderRows = orders ?? [];

  return (
    <main className="min-h-screen bg-background text-white px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-white/50">
              {role === 'admin' ? 'Admin Preview · Vendor Orders' : 'Vendor Orders'}
            </p>
            <h1 className="text-3xl font-bold">{restaurant.name}</h1>
            <p className="mt-2 text-sm text-white/60">
              Kitchen queue for pending, confirmed, preparing, and ready orders.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {role === 'admin' && (
              <form>
                <select
                  name="restaurantId"
                  defaultValue={restaurant.id}
                  className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm text-white"
                >
                  {restaurants.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="ml-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                >
                  View Outlet
                </button>
              </form>
            )}

            <Link
              href={`/vendor/dashboard?restaurantId=${restaurant.id}`}
              className="rounded-xl border border-white/10 px-5 py-2 text-sm hover:bg-white/10"
            >
              Dashboard
            </Link>

            <Link
              href={`/vendor/menu?restaurantId=${restaurant.id}`}
              className="rounded-xl border border-white/10 px-5 py-2 text-sm hover:bg-white/10"
            >
              Menu
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          {COLUMNS.map((status) => {
            const count = orderRows.filter((order) => order.status === status).length;

            return <Stat key={status} title={status} value={String(count)} />;
          })}
        </section>

        <section className="grid gap-5 xl:grid-cols-4">
          {COLUMNS.map((status) => {
            const columnOrders = orderRows.filter((order) => order.status === status);

            return (
              <div
                key={status}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold capitalize">
                    {status.replaceAll('_', ' ')}
                  </h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                    {columnOrders.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {columnOrders.map((order) => {
                    const nextStatus = NEXT_STATUS[String(order.status || '')];

                    return (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-white/10 bg-black/25 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">
                              #{order.order_number || order.id.slice(0, 8)}
                            </h3>
                            <p className="mt-1 text-xs text-white/40">
                              {order.created_at
                                ? new Date(order.created_at).toLocaleString('en-IN')
                                : 'Date unavailable'}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-bold">
                              ₹
                              {Number(
                                order.final_amount || order.total_amount || 0
                              ).toFixed(2)}
                            </p>
                            <p className="text-xs text-white/40">
                              {order.payment_method || 'COD'}
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 text-sm text-white/70">
                          {itemText(order.items)}
                        </p>

                        {nextStatus && (
                          <form action={advanceOrderStatus} className="mt-4">
                            <input type="hidden" name="order_id" value={order.id} />
                            <input
                              type="hidden"
                              name="next_status"
                              value={nextStatus}
                            />
                            <button className="w-full rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/10">
                              Move to {nextStatus.replaceAll('_', ' ')}
                            </button>
                          </form>
                        )}

                        {!nextStatus && (
                          <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-center text-xs text-emerald-100">
                            Ready for dispatch
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {columnOrders.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-white/40">
                      No {status.replaceAll('_', ' ')} orders.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm capitalize text-white/50">{title.replaceAll('_', ' ')}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}