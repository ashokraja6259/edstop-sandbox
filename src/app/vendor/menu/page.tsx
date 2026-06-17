// FILE: src/app/vendor/menu/page.tsx

import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function createMenuItem(formData: FormData) {
  'use server';

  const { user, role } = await requireRole('vendor');
  const supabase = await createClient();

  const restaurantId = String(formData.get('restaurant_id') || '');
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const category = String(formData.get('category') || 'Main Course').trim();
  const price = Number(formData.get('price') || 0);
  const stockLevel = Number(formData.get('stock_level') || 100);
  const isVeg = String(formData.get('is_veg')) === 'true';

  if (!restaurantId || !name || !Number.isFinite(price) || price <= 0) {
    console.error('Create menu item skipped: invalid input');
    return;
  }

  if (role !== 'admin') {
    const { data: ownedRestaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!ownedRestaurant) {
      console.error('Create menu item blocked: restaurant not owned');
      return;
    }
  }

  const { error } = await supabase.from('menu_items').insert({
    restaurant_id: restaurantId,
    external_id: `manual-${Date.now()}`,
    name,
    description: description || null,
    category: category || 'Main Course',
    price,
    original_price: price,
    stock_level: Number.isFinite(stockLevel) ? stockLevel : 100,
    is_veg: isVeg,
    is_available: true,
  });

  if (error) {
    console.error('Create menu item failed:', error);
    return;
  }

  revalidatePath('/vendor/menu');
  revalidatePath('/vendor/dashboard');
}

async function updateMenuItem(formData: FormData) {
  'use server';

  const { user, role } = await requireRole('vendor');
  const supabase = await createClient();

  const itemId = String(formData.get('item_id') || '');
  const restaurantId = String(formData.get('restaurant_id') || '');
  const name = String(formData.get('name') || '').trim();
  const category = String(formData.get('category') || 'Main Course').trim();
  const price = Number(formData.get('price') || 0);
  const stockLevel = Number(formData.get('stock_level') || 0);
  const isAvailable = String(formData.get('is_available')) === 'true';

  if (!itemId || !restaurantId || !name || !Number.isFinite(price) || price < 0) {
    console.error('Update menu item skipped: invalid input');
    return;
  }

  if (role !== 'admin') {
    const { data: ownedRestaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!ownedRestaurant) {
      console.error('Update menu item blocked: restaurant not owned');
      return;
    }
  }

  const { error } = await supabase
    .from('menu_items')
    .update({
      name,
      category: category || 'Main Course',
      price,
      stock_level: Number.isFinite(stockLevel) ? stockLevel : 0,
      is_available: isAvailable,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('restaurant_id', restaurantId);

  if (error) {
    console.error('Update menu item failed:', error);
    return;
  }

  revalidatePath('/vendor/menu');
  revalidatePath('/vendor/dashboard');
}

type VendorMenuPageProps = {
  searchParams?: {
    restaurantId?: string;
  };
};

export default async function VendorMenuPage({
  searchParams,
}: VendorMenuPageProps) {
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

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select(
      'id, restaurant_id, name, description, price, category, is_veg, is_available, stock_level, created_at'
    )
    .eq('restaurant_id', restaurant.id)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  const menuRows = menuItems ?? [];

  return (
    <main className="min-h-screen bg-background text-white px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-white/50">
              {role === 'admin' ? 'Admin Preview · Vendor Menu' : 'Vendor Menu'}
            </p>
            <h1 className="text-3xl font-bold">{restaurant.name}</h1>
            <p className="mt-2 text-sm text-white/60">
              Add items, update prices, adjust stock, and control availability.
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
              Vendor Dashboard
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-4 text-xl font-bold">Add New Item</h2>

          <form action={createMenuItem} className="grid gap-3 md:grid-cols-6">
            <input type="hidden" name="restaurant_id" value={restaurant.id} />

            <input
              name="name"
              placeholder="Item name"
              className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm text-white md:col-span-2"
              required
            />

            <input
              name="category"
              placeholder="Category"
              defaultValue="Main Course"
              className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm text-white"
            />

            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Price"
              className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm text-white"
              required
            />

            <input
              name="stock_level"
              type="number"
              min="0"
              placeholder="Stock"
              defaultValue={100}
              className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm text-white"
            />

            <select
              name="is_veg"
              defaultValue="true"
              className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm text-white"
            >
              <option value="true">Veg</option>
              <option value="false">Non-Veg</option>
            </select>

            <input
              name="description"
              placeholder="Description optional"
              className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm text-white md:col-span-5"
            />

            <button className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10">
              Add Item
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Menu Items</h2>
            <p className="text-sm text-white/50">{menuRows.length} items</p>
          </div>

          <div className="space-y-3">
            {menuRows.map((item) => (
              <form
                key={item.id}
                action={updateMenuItem}
                className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-8"
              >
                <input type="hidden" name="item_id" value={item.id} />
                <input
                  type="hidden"
                  name="restaurant_id"
                  value={restaurant.id}
                />

                <input
                  name="name"
                  defaultValue={item.name}
                  className="rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white md:col-span-2"
                />

                <input
                  name="category"
                  defaultValue={item.category || 'Main Course'}
                  className="rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white"
                />

                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={Number(item.price || 0)}
                  className="rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white"
                />

                <input
                  name="stock_level"
                  type="number"
                  min="0"
                  defaultValue={item.stock_level ?? 0}
                  className="rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white"
                />

                <select
                  name="is_available"
                  defaultValue={item.is_available ? 'true' : 'false'}
                  className="rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white"
                >
                  <option value="true">Available</option>
                  <option value="false">Disabled</option>
                </select>

                <div className="flex items-center text-xs text-white/50">
                  {item.is_veg ? 'Veg' : 'Non-Veg'}
                </div>

                <button className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/10">
                  Save
                </button>
              </form>
            ))}

            {menuRows.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/50">
                No menu items found.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}