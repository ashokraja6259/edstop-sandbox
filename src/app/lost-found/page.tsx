// FILE: src/app/lost-found/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

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
  status: 'active' | 'claimed' | 'closed';
  created_at: string;
};

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Lost', value: 'lost' },
  { label: 'Found', value: 'found' },
];

export default function LostFoundPage() {
  const supabase = createClient();
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all');

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('lost_found_items')
        .select(
          'id, user_id, title, description, category, item_type, location, contact_phone, image_url, status, created_at'
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setItems([]);
      } else {
        setItems((data ?? []) as LostFoundItem[]);
      }

      setLoading(false);
    };

    void loadItems();
  }, [supabase]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.item_type === filter);
  }, [filter, items]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/student-dashboard" className="text-sm text-purple-300 hover:text-purple-200">
              ← Back to Dashboard
            </Link>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Lost & Found
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Report lost items, post found items, and help IIT KGP students reconnect with their belongings.
            </p>
          </div>

          <Link
            href="/lost-found/new"
            className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-white/90"
          >
            Post Item
          </Link>
        </div>

        <div className="mb-6 flex gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-1">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value as 'all' | 'lost' | 'found')}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                filter === item.value
                  ? 'bg-white text-slate-950'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center text-white/60">
            Loading lost and found items...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center">
            <h2 className="text-xl font-black">No items yet</h2>
            <p className="mt-2 text-sm text-white/60">
              Be the first to post a lost or found item.
            </p>
            <Link
              href="/lost-found/new"
              className="mt-5 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950"
            >
              Post Item
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
             <Link
  key={item.id}
  href={`/lost-found/${item.id}`}
  className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-xl transition hover:-translate-y-1 hover:bg-white/[0.09]"
>
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-slate-900 text-5xl">
                    {item.item_type === 'lost' ? '🔎' : '📦'}
                  </div>
                )}

                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        item.item_type === 'lost'
                          ? 'bg-red-500/15 text-red-200'
                          : 'bg-emerald-500/15 text-emerald-200'
                      }`}
                    >
                      {item.item_type === 'lost' ? 'Lost' : 'Found'}
                    </span>
                    <span className="text-xs text-white/40">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h2 className="line-clamp-2 text-lg font-black">{item.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/60">
                    {item.description}
                  </p>

                  <div className="mt-4 space-y-2 text-sm text-white/65">
                    <p>📍 {item.location}</p>
                    <p>🏷️ {item.category}</p>
                    {item.contact_phone && <p>📞 {item.contact_phone}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}