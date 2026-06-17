// FILE: src/app/marketplace/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type MarketplaceItem = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  condition: 'new' | 'like_new' | 'used' | 'fair';
  location: string;
  contact_phone: string | null;
  image_url: string | null;
  status: 'active' | 'sold' | 'closed';
  created_at: string;
};

const categories = ['All', 'Books', 'Electronics', 'Cycle', 'Furniture', 'Clothing', 'Stationery', 'Other'];

const formatPrice = (price: number) => (price === 0 ? 'Free' : `₹${price}`);

export default function MarketplacePage() {
  const supabase = createClient();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('marketplace_items')
        .select('id, user_id, title, description, category, price, condition, location, contact_phone, image_url, status, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setItems([]);
      } else {
        setItems((data ?? []) as MarketplaceItem[]);
      }

      setLoading(false);
    };

    void loadItems();
  }, [supabase]);

  const filteredItems = useMemo(() => {
    if (category === 'All') return items;
    return items.filter((item) => item.category === category);
  }, [category, items]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/student-dashboard" className="text-sm text-purple-300 hover:text-purple-200">
              ← Back to Dashboard
            </Link>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Buy & Sell</h1>
            <p className="mt-2 text-sm text-white/60">
              Buy, sell, or give away useful items inside the IIT KGP campus community.
            </p>
          </div>

          <Link href="/marketplace/new" className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-white/90">
            Sell Item
          </Link>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.06] p-1">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                category === item ? 'bg-white text-slate-950' : 'text-white/65 hover:text-white'
              }`}
            >
              {item}
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
            Loading marketplace items...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center">
            <h2 className="text-xl font-black">No listings yet</h2>
            <p className="mt-2 text-sm text-white/60">Be the first to list an item.</p>
            <Link href="/marketplace/new" className="mt-5 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">
              Sell Item
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <Link
                key={item.id}
                href={`/marketplace/${item.id}`}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-xl transition hover:-translate-y-1 hover:bg-white/[0.09]"
              >
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt={item.title} className="h-48 w-full object-cover" />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-slate-900 text-5xl">🛍️</div>
                )}

                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-200">
                      {formatPrice(item.price)}
                    </span>
                    <span className="text-xs text-white/40">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h2 className="line-clamp-2 text-lg font-black">{item.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/60">{item.description}</p>

                  <div className="mt-4 space-y-2 text-sm text-white/65">
                    <p>📍 {item.location}</p>
                    <p>🏷️ {item.category}</p>
                    <p>✨ {item.condition.replace('_', ' ')}</p>
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