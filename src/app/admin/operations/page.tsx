// FILE: src/app/admin/operations/page.tsx

import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function setRestaurantOpen(formData: FormData) {
  'use server';

  await requireRole('admin');

  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  const isOpen = String(formData.get('is_open')) === 'true';

  if (id) {
    await supabase
      .from('restaurants')
      .update({ is_open: isOpen, updated_at: new Date().toISOString() })
      .eq('id', id);
  }

  revalidatePath('/admin/operations');
}

async function setMenuItemAvailable(formData: FormData) {
  'use server';

  await requireRole('admin');

  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  const isAvailable = String(formData.get('is_available')) === 'true';

  if (id) {
    await supabase
      .from('menu_items')
      .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
      .eq('id', id);
  }

  revalidatePath('/admin/operations');
}

async function setOrderStatus(formData: FormData) {
  'use server';

  await requireRole('admin');

  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  const status = String(formData.get('status') || '');

  if (id && status) {
    await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
  }

  revalidatePath('/admin/operations');
}

export default async function AdminOperationsPage() {
  await requireRole('admin');

  const supabase = await createClient();

  const [{ data: restaurants }, { data: orders }, { data: menuItems }] =
    await Promise.all([
      supabase
        .from('restaurants')
        .select('id, name, is_open, is_active, is_available, created_at')
        .order('created_at', { ascending: false }),

      supabase
        .from('orders')
        .select(
          'id, order_number, order_type, status, final_amount, total_amount, payment_method, restaurant_name, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(50),

      supabase
        .from('menu_items')
        .select('id, restaurant_id, name, price, category, is_available, stock_level')
        .order('name', { ascending: true })
        .limit(100),
    ]);

  const restaurantRows = restaurants ?? [];
  const orderRows = orders ?? [];
  const menuRows = menuItems ?? [];

  const activeOrders = orderRows.filter((o) =>
    ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(
      String(o.status)
    )
  );

  const darkStoreOrders = orderRows.filter((o) =>
    ['store', 'dark-store', 'dark_store'].includes(String(o.order_type))
  );

  return (
    <main className="min-h-screen bg-background text-white px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/50">Admin</p>
            <h1 className="text-3xl font-bold">Operations Control Center</h1>
            <p className="mt-2 text-sm text-white/60">
              Restaurants, order queue, menu availability, dark store and reports.
            </p>
          </div>

          <Link
            href="/admin/dashboard"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
          >
            Back
          </Link>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <Stat title="Restaurants" value={restaurantRows.length} />
          <Stat title="Open Outlets" value={restaurantRows.filter((r) => r.is_open).length} />
          <Stat title="Active Orders" value={activeOrders.length} />
          <Stat title="Dark Store" value={darkStoreOrders.length} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel title="Restaurants">
            {restaurantRows.map((r) => (
              <div key={r.id} className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{r.name}</h3>
                    <p className="text-xs text-white/40">
                      {r.is_active ? 'Active' : 'Inactive'} · {r.is_available ? 'Visible' : 'Hidden'}
                    </p>
                  </div>

                  <form action={setRestaurantOpen}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="is_open" value={r.is_open ? 'false' : 'true'} />
                    <button className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10">
                      {r.is_open ? 'Close' : 'Open'}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </Panel>

          <Panel title="Order Control Room">
            {orderRows.map((o) => (
              <div key={o.id} className="mb-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">#{o.order_number}</h3>
                    <p className="text-sm text-white/50">{o.restaurant_name || o.order_type}</p>
                    <p className="text-xs text-white/40">
                      ₹{Number(o.final_amount || o.total_amount || 0).toFixed(2)} ·{' '}
                      {o.payment_method || 'COD'}
                    </p>
                  </div>

                  <form action={setOrderStatus} className="flex gap-2">
                    <input type="hidden" name="id" value={o.id} />
                    <select
                      name="status"
                      defaultValue={String(o.status)}
                      className="rounded-xl bg-black border border-white/10 px-3 py-2 text-sm"
                    >
                    <option value="pending">pending</option>
<option value="confirmed">confirmed</option>
<option value="preparing">preparing</option>
<option value="ready">ready</option>
<option value="out_for_delivery">out_for_delivery</option>
<option value="delivered">delivered</option>
<option value="cancelled">cancelled</option>
                    </select>
                    <button className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/10">
                      Save
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </Panel>

          <Panel title="Menu Availability">
            {menuRows.map((item) => (
              <div key={item.id} className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-xs text-white/40">
                      {item.category || 'Menu'} · ₹{Number(item.price || 0).toFixed(2)} · Stock{' '}
                      {item.stock_level ?? 0}
                    </p>
                  </div>

                  <form action={setMenuItemAvailable}>
                    <input type="hidden" name="id" value={item.id} />
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
          </Panel>

          <Panel title="Reports & Complaints">
            <Placeholder title="Complaints" text="Add support tickets table in next migration." />
            <Placeholder title="Marketplace Reports" text="Add marketplace moderation queue." />
            <Placeholder title="Lost & Found Reports" text="Add lost/found report queue." />
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-white/50">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
      <h3 className="font-semibold text-yellow-100">{title}</h3>
      <p className="mt-1 text-sm text-yellow-100/70">{text}</p>
    </div>
  );
}