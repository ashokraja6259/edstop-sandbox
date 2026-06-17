// FILE: src/app/admin/marketplace/page.tsx

import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MARKETPLACE_STATUSES = ['active', 'sold', 'closed'];

async function updateMarketplaceStatus(formData: FormData) {
  'use server';

  await requireRole('admin');

  const supabase = await createClient();

  const itemId = String(formData.get('item_id') || '');
  const status = String(formData.get('status') || '');

  if (!itemId || !MARKETPLACE_STATUSES.includes(status)) {
    console.error('Marketplace status update skipped: invalid input');
    return;
  }

  const { error } = await supabase
    .from('marketplace_items')
    .update({ status })
    .eq('id', itemId);

  if (error) {
    console.error('Marketplace status update failed:', error);
    return;
  }

  revalidatePath('/admin/marketplace');
  revalidatePath('/marketplace');
}

type MarketplaceItem = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  condition: string;
  location: string;
  contact_phone: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
};

const formatPrice = (price: number) => (price === 0 ? 'Free' : `₹${price}`);

export default async function AdminMarketplacePage() {
  await requireRole('admin');

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('marketplace_items')
    .select(
      'id, user_id, title, description, category, price, condition, location, contact_phone, image_url, status, created_at'
    )
    .order('created_at', { ascending: false })
    .returns<MarketplaceItem[]>();

  if (error) {
    console.error('Admin marketplace fetch failed:', error);
  }

  const items = data ?? [];

  const activeCount = items.filter((item) => item.status === 'active').length;
  const soldCount = items.filter((item) => item.status === 'sold').length;
  const closedCount = items.filter((item) => item.status === 'closed').length;

  return (
    <main className="min-h-screen bg-background text-white px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/50">Admin</p>
            <h1 className="text-3xl font-bold">Marketplace Moderation</h1>
            <p className="mt-2 text-sm text-white/60">
              Review campus buy/sell listings and close unsafe or outdated posts.
            </p>
          </div>

          <Link
            href="/admin/operations"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
          >
            Operations
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Stat title="Total Listings" value={items.length} />
          <Stat title="Active" value={activeCount} />
          <Stat title="Sold" value={soldCount} />
          <Stat title="Closed" value={closedCount} />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">All Listings</h2>
            <p className="text-sm text-white/50">{items.length} listings</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex gap-4">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="h-24 w-24 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-3xl">
                      🛍️
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{item.title}</h3>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                        {item.status}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                        {formatPrice(Number(item.price || 0))}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm text-white/60">
                      {item.description}
                    </p>

                    <div className="mt-3 grid gap-1 text-xs text-white/40">
                      <p>Category: {item.category}</p>
                      <p>Condition: {item.condition?.replaceAll('_', ' ')}</p>
                      <p>Location: {item.location}</p>
                      <p>Phone: {item.contact_phone || 'Not provided'}</p>
                      <p>User: {item.user_id}</p>
                      <p>
                        Created:{' '}
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString('en-IN')
                          : 'Date unavailable'}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/marketplace/${item.id}`}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                      >
                        View
                      </Link>

                      <form action={updateMarketplaceStatus} className="flex gap-2">
                        <input type="hidden" name="item_id" value={item.id} />

                        <select
                          name="status"
                          defaultValue={item.status}
                          className="rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white"
                        >
                          {MARKETPLACE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>

                        <button className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10">
                          Save
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/50 lg:col-span-2">
                No marketplace listings found.
              </div>
            )}
          </div>
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