// FILE: src/app/marketplace/new/page.tsx

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const categories = ['Books', 'Electronics', 'Cycle', 'Furniture', 'Clothing', 'Stationery', 'Other'];

export default function NewMarketplacePage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [price, setPrice] = useState('0');
  const [condition, setCondition] = useState<'new' | 'like_new' | 'used' | 'fair'>('used');
  const [location, setLocation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const uploadImage = async () => {
    if (!imageFile || !user) return null;

    const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${user.id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('marketplace-images')
      .upload(fileName, imageFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('marketplace-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const numericPrice = Number(price);

    if (!user) {
      setError('Please sign in to list an item.');
      return;
    }

    if (!title.trim() || !description.trim() || !location.trim()) {
      setError('Please fill in title, description, and location.');
      return;
    }

    if (!Number.isInteger(numericPrice) || numericPrice < 0) {
      setError('Price must be 0 or a positive whole number.');
      return;
    }

    if (imageFile && imageFile.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5 MB.');
      return;
    }

    try {
      setSubmitting(true);
      const imageUrl = await uploadImage();

      const { error: insertError } = await supabase.from('marketplace_items').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        price: numericPrice,
        condition,
        location: location.trim(),
        contact_phone: contactPhone.trim() || null,
        image_url: imageUrl,
        status: 'active',
      });

      if (insertError) throw insertError;

      router.push('/marketplace');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create listing.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-10">
        <div className="mb-8">
          <Link href="/marketplace" className="text-sm text-purple-300 hover:text-purple-200">
            ← Back to Marketplace
          </Link>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Create Listing</h1>
          <p className="mt-2 text-sm text-white/60">Sell or give away an item to other IIT KGP students.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl sm:p-7">
          {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/60">Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Scientific calculator, cycle, study table"
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-purple-400/60"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/60">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add brand, age, condition, reason for selling, and pickup details."
              rows={5}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-purple-400/60"
              disabled={submitting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-white/60">Price</label>
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                type="number"
                min={0}
                step={1}
                placeholder="0 for free"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-purple-400/60"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-white/60">Category</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-purple-400/60"
                disabled={submitting}
              >
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-white/60">Condition</label>
              <select
                value={condition}
                onChange={(event) => setCondition(event.target.value as 'new' | 'like_new' | 'used' | 'fair')}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-purple-400/60"
                disabled={submitting}
              >
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="used">Used</option>
                <option value="fair">Fair</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-white/60">Location</label>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. LBS Hall, Tech Market"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-purple-400/60"
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/60">Contact Phone Optional</label>
            <input
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              placeholder="e.g. +919876543210"
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-purple-400/60"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/60">Image Optional</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-bold file:text-slate-950"
              disabled={submitting}
            />
            <p className="mt-1.5 text-xs text-white/40">JPG, PNG, or WEBP. Max 5 MB.</p>
          </div>

          <button
            type="submit"
            disabled={submitting || !user}
            className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-purple-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Creating Listing...' : 'Create Listing'}
          </button>
        </form>
      </section>
    </main>
  );
}