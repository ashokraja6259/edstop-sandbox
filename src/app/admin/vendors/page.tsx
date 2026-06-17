// FILE: src/app/admin/vendors/page.tsx

import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const USER_ROLES = ['student', 'vendor'] as const;

async function updateUserRole(formData: FormData) {
  'use server';

  await requireRole('admin');

  const supabase = await createClient();

  const userId = String(formData.get('user_id') || '');
  const role = String(formData.get('role') || '');

  if (!userId || !USER_ROLES.includes(role as 'student' | 'vendor')) {
    console.error('Vendor role update skipped: invalid input');
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
    console.error('Vendor role update failed:', error);
    return;
  }

  revalidatePath('/admin/vendors');
}

async function assignRestaurantOwner(formData: FormData) {
  'use server';

  await requireRole('admin');

  const supabase = await createClient();

  const restaurantId = String(formData.get('restaurant_id') || '');
  const ownerId = String(formData.get('owner_id') || '');

  if (!restaurantId || !ownerId) {
    console.error('Restaurant owner assignment skipped: invalid input');
    return;
  }

  const { error: roleError } = await supabase
    .from('user_profiles')
    .update({
      role: 'vendor',
      updated_at: new Date().toISOString(),
    })
    .eq('id', ownerId);

  if (roleError) {
    console.error('Vendor promotion before assignment failed:', roleError);
    return;
  }

  const { error } = await supabase
    .from('restaurants')
    .update({
      owner_id: ownerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', restaurantId);

  if (error) {
    console.error('Restaurant owner assignment failed:', error);
    return;
  }

  revalidatePath('/admin/vendors');
  revalidatePath('/vendor/dashboard');
  revalidatePath('/vendor/menu');
  revalidatePath('/vendor/orders');
}

async function removeRestaurantOwner(formData: FormData) {
  'use server';

  await requireRole('admin');

  const supabase = await createClient();

  const restaurantId = String(formData.get('restaurant_id') || '');

  if (!restaurantId) {
    console.error('Restaurant owner removal skipped: invalid input');
    return;
  }

  const { error } = await supabase
    .from('restaurants')
    .update({
      owner_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', restaurantId);

  if (error) {
    console.error('Restaurant owner removal failed:', error);
    return;
  }

  revalidatePath('/admin/vendors');
  revalidatePath('/vendor/dashboard');
  revalidatePath('/vendor/menu');
  revalidatePath('/vendor/orders');
}

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string | null;
};

type Restaurant = {
  id: string;
  name: string;
  owner_id: string | null;
  is_active: boolean | null;
  is_open: boolean | null;
};

export default async function AdminVendorsPage() {
  await requireRole('admin');

  const supabase = await createClient();

  const [{ data: users }, { data: restaurants }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, email, full_name, phone, role, created_at')
      .order('created_at', { ascending: false })
      .returns<UserProfile[]>(),

    supabase
      .from('restaurants')
      .select('id, name, owner_id, is_active, is_open')
      .order('name', { ascending: true })
      .returns<Restaurant[]>(),
  ]);

  const userRows = users ?? [];
  const restaurantRows = restaurants ?? [];

  const vendorRows = userRows.filter((user) => user.role === 'vendor');
  const studentRows = userRows.filter((user) => user.role === 'student');
  const assignableUsers = userRows.filter((user) =>
    ['student', 'vendor'].includes(user.role)
  );

  const userById = new Map(userRows.map((user) => [user.id, user]));

  const assignedRestaurants = restaurantRows.filter(
    (restaurant) => restaurant.owner_id
  );

  const unassignedRestaurants = restaurantRows.filter(
    (restaurant) => !restaurant.owner_id
  );

  return (
    <main className="min-h-screen bg-background text-white px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-white/50">Admin</p>
            <h1 className="text-3xl font-bold">Vendor Management</h1>
            <p className="mt-2 text-sm text-white/60">
              Promote vendors, assign restaurants, and manage outlet ownership without SQL.
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
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Stat title="Vendors" value={vendorRows.length} />
          <Stat title="Students" value={studentRows.length} />
          <Stat title="Assigned Outlets" value={assignedRestaurants.length} />
          <Stat title="Unassigned Outlets" value={unassignedRestaurants.length} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Panel title="Restaurant Ownership">
            <div className="space-y-3">
              {restaurantRows.map((restaurant) => {
                const owner = restaurant.owner_id
                  ? userById.get(restaurant.owner_id)
                  : null;

                return (
                  <div
                    key={restaurant.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold">{restaurant.name}</h3>
                        <p className="text-xs text-white/40">
                          {restaurant.is_active ? 'Active' : 'Inactive'} ·{' '}
                          {restaurant.is_open ? 'Open' : 'Closed'}
                        </p>
                        <p className="mt-1 text-sm text-white/60">
                          Owner:{' '}
                          {owner
                            ? owner.full_name || owner.email || owner.id
                            : 'Not assigned'}
                        </p>
                      </div>

                      {restaurant.owner_id && (
                        <form action={removeRestaurantOwner}>
                          <input
                            type="hidden"
                            name="restaurant_id"
                            value={restaurant.id}
                          />
                          <button className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-100 hover:bg-red-500/20">
                            Remove Owner
                          </button>
                        </form>
                      )}
                    </div>

                    <form
                      action={assignRestaurantOwner}
                      className="flex flex-col gap-2 sm:flex-row"
                    >
                      <input
                        type="hidden"
                        name="restaurant_id"
                        value={restaurant.id}
                      />

                      <select
                        name="owner_id"
                        defaultValue={restaurant.owner_id || ''}
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white"
                      >
                        <option value="">Select vendor/user</option>
                        {assignableUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {(user.full_name || user.email || user.id) +
                              ` (${user.role})`}
                          </option>
                        ))}
                      </select>

                      <button className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10">
                        Assign
                      </button>
                    </form>
                  </div>
                );
              })}

              {restaurantRows.length === 0 && (
                <Empty text="No restaurants found." />
              )}
            </div>
          </Panel>

          <Panel title="Users & Vendor Roles">
            <div className="space-y-3">
              {userRows.map((user) => (
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

                    {['student', 'vendor'].includes(user.role) ? (
                      <form action={updateUserRole} className="flex gap-2">
                        <input type="hidden" name="user_id" value={user.id} />
                        <select
                          name="role"
                          defaultValue={user.role}
                          className="rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white"
                        >
                          <option value="student">student</option>
                          <option value="vendor">vendor</option>
                        </select>

                        <button className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10">
                          Save
                        </button>
                      </form>
                    ) : (
                      <span className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/50">
                        Protected role
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {userRows.length === 0 && <Empty text="No users found." />}
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
      <p className="mt-2 text-3xl font-bold">{value}</p>
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