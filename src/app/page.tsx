import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen gradient-mesh px-4 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl glass-card p-8 sm:p-12">
          <p className="inline-flex rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/80">
            IIT Kharagpur Campus Commerce
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            EdStop: one app for food, essentials, and campus life.
          </h1>

          <p className="mt-4 max-w-2xl text-sm text-white/70 sm:text-base">
            Order from campus restaurants, shop from the Dark Store, and track everything in one place.
            Built for IIT students with fast delivery and clear order visibility.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={user ? '/student-dashboard' : '/login'}
              className="inline-flex items-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-white/90"
            >
              {user ? 'Go to Dashboard' : 'Sign In'}
            </Link>
            <Link
              href="/food-ordering-interface"
              className="inline-flex items-center rounded-lg border border-white/25 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              Food Ordering
            </Link>
            <Link
              href="/dark-store-shopping"
              className="inline-flex items-center rounded-lg border border-white/25 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              Dark Store
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl glass p-5">
            <h2 className="text-sm font-semibold">Fast Delivery</h2>
            <p className="mt-2 text-xs text-white/70">Campus-first delivery flow optimized for hostels and departments.</p>
          </div>
          <div className="rounded-2xl glass p-5">
            <h2 className="text-sm font-semibold">Secure Checkout</h2>
            <p className="mt-2 text-xs text-white/70">Server-validated ordering and payment verification on critical paths.</p>
          </div>
          <div className="rounded-2xl glass p-5">
            <h2 className="text-sm font-semibold">Live Tracking</h2>
            <p className="mt-2 text-xs text-white/70">Track your orders and return to dashboard without losing context.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
