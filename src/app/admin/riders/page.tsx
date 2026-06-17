// FILE: src/app/admin/riders/page.tsx

import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const RIDER_ADMIN_ROLES = ['student', 'rider'] as const;

async function updateRiderRole(formData: FormData) {
  'use server';

  await requireRole('admin');

  const supabase = await createClient();

  const userId = String(formData.get('user_id') || '');
  const role = String(formData.get('role') || '');

  if (!userId || !RIDER_ADMIN_ROLES.includes(role as 'student' | 'rider')) {
    console.error('Rider role update skipped: invalid input');
    return;
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Rider role update failed:', error);
    return;
  }

  revalidatePath('/admin/riders');
  revalidatePath('/rider-dashboard');
}

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string | null;
};

type OrderRow = {
  id: string;
  rider_id: string | null;
  status: string;
  final_amount: number | null;
  total_amount: number | null;
  created_at: string | null;
  actual_delivery_time: string | null;
};

export default async function AdminRidersPage() {
  await requireRole('admin');

  const supabase = await createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [{ data: users }, { data: orders }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, email, full_name, phone, role, created_at')
      .order('created_at', { ascending: false })
      .returns<UserProfile[]>(),

    supabase
      .from('orders')
      .select(
        'id, rider_id, status, final_amount, total_amount, created_at, actual_delivery_time'
      )
      .not('rider_id', 'is', null)
      .order('created_at', { ascending: false })
      .returns<OrderRow[]>(),
  ]);

  const userRows = users ?? [];
  const orderRows = orders ?? [];

  const riderRows = userRows.filter((user) => user.role === 'rider');
  const studentRows = userRows.filter((user) => user.role === 'student');
  const manageableUsers = userRows.filter((user) =>
    ['student', 'rider'].includes(user.role)
  );

  const inTransitOrders = orderRows.filter(
    (order) => order.status === 'out_for_delivery'
  );

  const deliveredOrders = orderRows.filter(
    (order) => order.status === 'delivered'
  );

  const deliveredToday = deliveredOrders.filter((order) => {
    const date = order.actual_delivery_time || order.created_at;
    if (!date) return false;
    return new Date(date) >= todayStart;
  });

  const riderStats = riderRows.map((rider) => {
    const riderOrders = orderRows.filter((order) => order.rider_id === rider.id);
    const riderDelivered = riderOrders.filter(
      (order) => order.status === 'delivered'
    );
    const riderActive = riderOrders.filter(
      (order) => order.status === 'out_for_delivery'
    );
    const earnings = riderDelivered.length * 50;

    return {
      rider,
      deliveries: riderDelivered.length,
      activeDeliveries: riderActive.length,
      earnings,
    };
  });

  const topRider = [...riderStats].sort(
    (a, b) => b.deliveries - a.deliveries
  )[0];

  return (
    <main className="min-h-screen bg-background text-white px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-white/50">Admin</p>
            <h1 className="text-3xl font-bold">Rider Management</h1>
            <p className="mt-2 text-sm text-white/60">
              Promote riders, monitor active deliveries, and track delivery performance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/dashboard"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/operations"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
            >
              Operations
            </Link>
            <Link
              href="/rider-dashboard"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
            >
              Rider Dashboard
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-5">
          <Stat title="Riders" value={riderRows.length} />
          <Stat title="Students" value={studentRows.length} />
          <Stat title="In Transit" value={inTransitOrders.length} />
          <Stat title="Delivered Today" value={deliveredToday.length} />
          <Stat
            title="Top Rider"
            value={
              topRider
                ? topRider.rider.full_name || topRider.rider.email || 'Rider'
                : 'None'
            }
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Panel title="Rider Performance">
            <div className="space-y-3">
              {riderStats.map((row) => (
                <div
                  key={row.rider.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {row.rider.full_name || 'Unnamed Rider'}
                      </h3>
                      <p className="text-sm text-white/60">
                        {row.rider.email || row.rider.id}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        Phone: {row.rider.phone || 'Not provided'}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <MiniStat title="Active" value={row.activeDeliveries} />
                      <MiniStat title="Done" value={row.deliveries} />
                      <MiniStat title="Earned" value={`₹${row.earnings}`} />
                    </div>
                  </div>
                </div>
              ))}

              {riderStats.length === 0 && (
                <Empty text="No riders yet. Promote a student to rider below." />
              )}
            </div>
          </Panel>

          <Panel title="Users & Rider Roles">
            <div className="space-y-3">
              {manageableUsers.map((user) => (
                <div
                  key={user.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">
                        {user.full_name || 'Unnamed User'}
                      </h3>
                      <p className="truncate text-sm text-white/60">
                        {user.email || user.id}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        Current role: {user.role}
                      </p>
                    </div>

                    <form action={updateRiderRole} className="flex gap-2">
                      <input type="hidden" name="user_id" value={user.id} />

                      <select
                        name="role"
                        defaultValue={user.role}
                        className="rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white"
                      >
                        <option value="student">student</option>
                        <option value="rider">rider</option>
                      </select>

                      <button className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10">
                        Save
                      </button>
                    </form>
                  </div>
                </div>
              ))}

              {manageableUsers.length === 0 && (
                <Empty text="No student/rider users found." />
              )}
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-white/50">{title}</p>
      <p className="mt-2 break-words text-2xl font-bold">{value}</p>
    </div>
  );
}

function MiniStat({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <p className="text-xs text-white/40">{title}</p>
      <p className="text-sm font-bold">{value}</p>
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