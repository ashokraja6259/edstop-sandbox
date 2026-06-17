// FILE: src/app/vendor/dashboard/page.tsx

import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const VENDOR_ORDER_STATUSES = ['confirmed', 'preparing', 'ready'];

async function setOutletOpen(formData: FormData) {
  'use server';

  const { user, role } = await requireRole('vendor');
  const supabase = await createClient();

  const restaurantId = String(formData.get('restaurant_id') || '');
  const isOpen = String(formData.get('is_open')) === 'true';

  if (!restaurantId) return;

  let query = supabase
    .from('restaurants')
    .update({
      is_open: isOpen,
      updated_at: new Date().toISOString(),
    })
    .eq('id', restaurantId);

  if (role !== 'admin') {
    query = query.eq('owner_id', user.id);
  }

  const { error } = await query;

  if (error) {
    console.error('Vendor outlet update failed:', error);
    return;
  }

  revalidatePath('/vendor/dashboard');
}

async function setMenuItemAvailable(formData: FormData) {
  'use server';

  const { user, role } = await requireRole('vendor');
  const supabase = await createClient();

  const itemId = String(formData.get('item_id') || '');
  const restaurantId = String(formData.get('restaurant_id') || '');
  const isAvailable = String(formData.get('is_available')) === 'true';

  if (!itemId || !restaurantId) return;

  if (role !== 'admin') {
    const { data: ownedRestaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!ownedRestaurant) {
      console.error('Vendor menu item update blocked: restaurant not owned');
      return;
    }
  }

  const { error } = await supabase
    .from('menu_items')
    .update({
      is_available: isAvailable,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('restaurant_id', restaurantId);

  if (error) {
    console.error('Vendor menu item update failed:', error);
    return;
  }

  revalidatePath('/vendor/dashboard');
}

async function setVendorOrderStatus(formData: FormData) {
  'use server';

  await requireRole('vendor');
  const supabase = await createClient();

  const orderId = String(formData.get('order_id') || '');
  const status = String(formData.get('status') || '');

  if (!orderId || !VENDOR_ORDER_STATUSES.includes(status)) return;

  const { error } = await supabase.rpc('vendor_update_order_status', {
    p_order_id: orderId,
    p_status: status,
  });

  if (error) {
    console.error('Vendor order status update failed:', error);
    return;
  }

  revalidatePath('/vendor/dashboard');
}

type VendorDashboardPageProps = {
  searchParams?: {
    restaurantId?: string;
  };
};

export default async function VendorDashboardPage({
  searchParams,
}: VendorDashboardPageProps) {
  const { user, role } = await requireRole('vendor');
  const supabase = await createClient();

  const selectedRestaurantId = searchParams?.restaurantId || '';

  const { data: restaurantRows, error: restaurantError } =
    role === 'admin'
      ? await supabase
          .from('restaurants')
          .select(
            'id, name, is_open, is_active, is_available, rating, delivery_time, minimum_order, created_at'
          )
          .order('name', { ascending: true })
      : await supabase
          .from('restaurants')
          .select(
            'id, name, is_open, is_active, is_available, rating, delivery_time, minimum_order, created_at'
          )
          .eq('owner_id', user.id)
          .order('name', { ascending: true });

  if (restaurantError) {
    console.error('Vendor restaurant fetch failed:', restaurantError);
  }

  const restaurant =
    restaurantRows?.find((row) => row.id === selectedRestaurantId) ||
    restaurantRows?.[0] ||
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
            href="/admin/operations"
            className="mt-6 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
          >
            Back to Operations
          </Link>
        </div>
      </main>
    );
  }

  const [{ data: orders }, { data: menuItems }] = await Promise.all([
    supabase
      .from('orders')
      .select(
        'id, order_number, status, final_amount, total_amount, payment_method, items, created_at'
      )
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(25),

    supabase
      .from('menu_items')
      .select('id, restaurant_id, name, price, category, is_available, stock_level')
      .eq('restaurant_id', restaurant.id)
      .order('name', { ascending: true })
      .limit(50),
  ]);

  const orderRows = orders ?? [];
  const menuRows = menuItems ?? [];
  const allRestaurantRows = restaurantRows ?? [];

  const today = new Date().toISOString().slice(0, 10);

  const todayOrders = orderRows.filter((order) =>
    String(order.created_at || '').startsWith(today)
  );

  const todayRevenue = todayOrders.reduce(
    (sum, order) => sum + Number(order.final_amount || order.total_amount || 0),
    0
  );

  const activeOrders = orderRows.filter((order) =>
    ['pending', 'confirmed', 'preparing', 'ready'].includes(String(order.status))
  );

  return (
    <main className="min-h-screen bg-background text-white px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-white/50">
              {role === 'admin'
                ? 'Admin Preview · Vendor Dashboard'
                : 'Vendor Dashboard'}
            </p>
            <h1 className="text-3xl font-bold">{restaurant.name}</h1>
            <p className="mt-2 text-sm text-white/60">
              Manage outlet status, orders, and menu availability.
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
                  {allRestaurantRows.map((row) => (
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

            {role === 'admin' && (
              <Link
                href="/admin/operations"
                className="rounded-xl border border-white/10 px-5 py-2 text-sm hover:bg-white/10"
              >
                Admin Operations
              </Link>
            )}

            <form action={setOutletOpen}>
              <input type="hidden" name="restaurant_id" value={restaurant.id} />
              <input
                type="hidden"
                name="is_open"
                value={restaurant.is_open ? 'false' : 'true'}
              />
              <button className="rounded-xl border border-white/10 px-5 py-2 text-sm hover:bg-white/10">
                {restaurant.is_open ? 'Close Outlet' : 'Open Outlet'}
              </button>
            </form>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Stat title="Outlet" value={restaurant.is_open ? 'Open' : 'Closed'} />
          <Stat title="Today Orders" value={String(todayOrders.length)} />
          <Stat title="Today Revenue" value={`₹${todayRevenue.toFixed(2)}`} />
          <Stat title="Active Orders" value={String(activeOrders.length)} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel title="Recent Orders">
            {orderRows.map((order) => (
              <div
                key={order.id}
                className="mb-3 rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">#{order.order_number}</h3>
                    <p className="text-xs text-white/40">
                      ₹
                      {Number(
                        order.final_amount || order.total_amount || 0
                      ).toFixed(2)}{' '}
                      · {order.payment_method || 'COD'}
                    </p>
                    <p className="mt-1 text-xs text-white/30">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleString('en-IN')
                        : 'Date unavailable'}
                    </p>
                  </div>

                  <form action={setVendorOrderStatus} className="flex gap-2">
                    <input type="hidden" name="order_id" value={order.id} />
                    <select
                      name="status"
                      defaultValue={String(order.status)}
                      className="rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white"
                    >
                      <option value={String(order.status)}>
                        {String(order.status)}
                      </option>
                      {VENDOR_ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/10">
                      Save
                    </button>
                  </form>
                </div>
              </div>
            ))}

            {orderRows.length === 0 && <Empty text="No orders found." />}
          </Panel>

          <Panel title="Menu Availability">
            {menuRows.map((item) => (
              <div
                key={item.id}
                className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-xs text-white/40">
                      {item.category || 'Menu'} · ₹
                      {Number(item.price || 0).toFixed(2)} · Stock{' '}
                      {item.stock_level ?? 0}
                    </p>
                  </div>

                  <form action={setMenuItemAvailable}>
                    <input type="hidden" name="item_id" value={item.id} />
                    <input
                      type="hidden"
                      name="restaurant_id"
                      value={restaurant.id}
                    />
                    <input
                      type="hidden"
                      name="is_available"
                      value={item.is_available ? 'false' : 'true'}
                    />
                    <button className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10">
                      {item.is_available ? 'Disable' : 'Enable'}
                    </button>
                  </form>
                </div>
              </div>
            ))}

            {menuRows.length === 0 && <Empty text="No menu items found." />}
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-white/50">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/50">
      {text}
    </div>
  );
}