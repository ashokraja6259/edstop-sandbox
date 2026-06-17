// FILE: src/app/admin/lost-found/page.tsx

import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const LOST_FOUND_STATUSES = ['active', 'claimed', 'closed'];

async function updateLostFoundStatus(formData: FormData) {
  'use server';

  await requireRole('admin');

  const supabase = await createClient();

  const itemId = String(formData.get('item_id') || '');
  const status = String(formData.get('status') || '');

  if (!itemId || !LOST_FOUND_STATUSES.includes(status)) {
    console.error('Lost & Found status update skipped: invalid input');
    return;
  }

  const { error } = await supabase
    .from('lost_found_items')
    .update({ status })
    .eq('id', itemId);

  if (error) {
    console.error('Lost & Found status update failed:', error);
    return;
  }

  revalidatePath('/admin/lost-found');
  revalidatePath('/lost-found');
}

type LostFoundItem = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  item_type: 'lost' | 'found';
  location: string;
  contact_phone: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
};

export default async function AdminLostFoundPage() {
  await requireRole('admin');

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('lost_found_items')
    .select(
      'id, user_id, title, description, category, item_type, location, contact_phone, image_url, status, created_at'
    )
    .order('created_at', { ascending: false })
    .returns<LostFoundItem[]>();

  if (error) {
    console.error('Admin lost/found fetch failed:', error);
  }

  const items = data ?? [];

  const activeCount = items.filter((item) => item.status === 'active').length;
  const claimedCount = items.filter((item) => item.status === 'claimed').length;
  const closedCount = items.filter((item) => item.status === 'closed').length;
  const lostCount = items.filter((item) => item.item_type === 'lost').length;
  const foundCount = items.filter((item) => item.item_type === 'found').length;

  return (
    <main className="min-h-screen bg-background text-white px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/50">Admin</p>
            <h1 className="text-3xl font-bold">Lost & Found Moderation</h1>
            <p className="mt-2 text-sm text-white/60">
              Review lost/found posts and close claimed, spam, or unsafe entries.
            </p>
          </div>

          <Link
            href="/admin/operations"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
          >
            Operations
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-5">
          <Stat title="Total" value={items.length} />
          <Stat title="Active" value={activeCount} />
          <Stat title="Claimed" value={claimedCount} />
          <Stat title="Closed" value={closedCount} />
          <Stat title="Lost / Found" value={`${lostCount}/${foundCount}`} />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">All Posts</h2>
            <p className="text-sm text-white/50">{items.length} posts</p>
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
                      {item.item_type === 'lost' ? '🔎' : '📦'}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{item.title}</h3>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.item_type === 'lost'
                            ? 'bg-red-500/15 text-red-200'
                            : 'bg-emerald-500/15 text-emerald-200'
                        }`}
                      >
                        {item.item_type}
                      </span>

                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                        {item.status}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm text-white/60">
                      {item.description}
                    </p>

                    <div className="mt-3 grid gap-1 text-xs text-white/40">
                      <p>Category: {item.category}</p>
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
                        href={`/lost-found/${item.id}`}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                      >
                        View
                      </Link>

                      <form action={updateLostFoundStatus} className="flex gap-2">
                        <input type="hidden" name="item_id" value={item.id} />

                        <select
                          name="status"
                          defaultValue={item.status}
                          className="rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white"
                        >
                          {LOST_FOUND_STATUSES.map((status) => (
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
                No lost/found posts found.
              </div>
            )}
          </div>
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