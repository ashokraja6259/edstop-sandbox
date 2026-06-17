// FILE: src/app/marketplace/[id]/page.tsx

'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

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

const formatPrice = (price: number) => (price === 0 ? 'Free' : `₹${price}`);

export default function MarketplaceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();

  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadItem = async () => {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('marketplace_items')
        .select('id, user_id, title, description, category, price, condition, location, contact_phone, image_url, status, created_at')
        .eq('id', params.id)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
        setItem(null);
      } else {
        setItem((data as MarketplaceItem | null) ?? null);
      }

      setLoading(false);
    };

    if (params.id) void loadItem();
  }, [params.id, supabase]);

  const handleMarkSold = async () => {
    if (!item || !user || item.user_id !== user.id) return;

    try {
      setUpdating(true);
      const { error: updateError } = await supabase
        .from('marketplace_items')
        .update({ status: 'sold' })
        .eq('id', item.id);

      if (updateError) throw updateError;
      setItem({ ...item, status: 'sold' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update listing.');
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = async () => {
    if (!item || !user || item.user_id !== user.id) return;

    try {
      setUpdating(true);
      const { error: updateError } = await supabase
        .from('marketplace_items')
        .update({ status: 'closed' })
        .eq('id', item.id);

      if (updateError) throw updateError;
      router.push('/marketplace');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to close listing.');
    } finally {
      setUpdating(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      await navigator.share({
        title: item?.title ?? 'Marketplace item',
        text: item?.description ?? 'Check this listing on EdStop.',
        url,
      });
      return;
    }

    await navigator.clipboard.writeText(url);
    alert('Link copied to clipboard.');
  };

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading listing...</main>;
  }

  if (!item) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto max-w-3xl px-4 py-10">
          <Link href="/marketplace" className="text-sm text-purple-300 hover:text-purple-200">← Back to Marketplace</Link>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center">
            <h1 className="text-2xl font-black">Listing not found</h1>
            <p className="mt-2 text-sm text-white/60">This listing may have been sold, closed, or removed.</p>
          </div>
        </section>
      </main>
    );
  }

  const isOwner = user?.id === item.user_id;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/marketplace" className="text-sm text-purple-300 hover:text-purple-200">← Back to Marketplace</Link>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{item.title}</h1>
            <p className="mt-2 text-sm text-white/50">Posted on {new Date(item.created_at).toLocaleDateString()}</p>
          </div>

          <button type="button" onClick={handleShare} className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white/80 transition hover:bg-white/[0.1]">
            Share
          </button>
        </div>

        {error && <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06]">
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image_url} alt={item.title} className="max-h-[520px] w-full object-cover" />
            ) : (
              <div className="flex h-80 items-center justify-center bg-slate-900 text-7xl">🛍️</div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-200">
                  {formatPrice(item.price)}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/70">
                  {item.status}
                </span>
              </div>

              <div className="mt-5 space-y-4 text-sm">
                <p>🏷️ {item.category}</p>
                <p>✨ {item.condition.replace('_', ' ')}</p>
                <p>📍 {item.location}</p>
                {item.contact_phone && (
                  <a href={`tel:${item.contact_phone}`} className="inline-flex text-purple-300 hover:text-purple-200">
                    📞 {item.contact_phone}
                  </a>
                )}
              </div>
            </div>

            {isOwner && item.status === 'active' && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <h2 className="text-base font-black">Manage Listing</h2>
                <div className="mt-4 grid gap-3">
                  <button type="button" onClick={handleMarkSold} disabled={updating} className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-400 disabled:opacity-50">
                    {updating ? 'Updating...' : 'Mark as Sold'}
                  </button>
                  <button type="button" onClick={handleClose} disabled={updating} className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/15 disabled:opacity-50">
                    Close Listing
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.06] p-5">
          <h2 className="text-lg font-black">Description</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/70">{item.description}</p>
        </div>
      </section>
    </main>
  );
}