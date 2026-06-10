import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const services = [
  {
    title: 'Food Ordering',
    description: 'Order from campus restaurants with simple COD checkout.',
    href: '/food-ordering-interface',
  },
  {
    title: 'Dark Store',
    description: 'Get hostel essentials and daily needs delivered quickly.',
    href: '/dark-store-shopping',
  },
  {
    title: 'Order History',
    description: 'Track your food and essentials orders in one place.',
    href: '/order-history',
  },
];

const comingSoon = [
  'Lost & Found',
  'Buy & Sell Marketplace',
  'Student Blogs',
  'Campus Deals',
  'AI Companion',
  'Events & Announcements',
];

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden px-4 py-8 sm:py-12">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-pink-500/20" />
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-xl font-black shadow-lg">
                E
              </div>
              <div>
                <p className="text-lg font-bold leading-none">EdStop</p>
                <p className="text-xs text-white/50">Campus Super App</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              {user ? (
                <Link
                  href="/student-dashboard"
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-white/90"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-white/90"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </header>

          <div className="grid gap-10 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur">
                Built for IIT Kharagpur students
              </div>

              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
                Food, essentials, and student services — all in one campus app.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                EdStop is building a fast, trusted and student-first commerce
                layer for campus life — starting with food ordering, dark store
                essentials, order history, and soon community features.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {user ? (
                  <Link
                    href="/student-dashboard"
                    className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-center text-sm font-bold text-white shadow-lg hover:opacity-95"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-center text-sm font-bold text-white shadow-lg hover:opacity-95"
                  >
                    Get Started
                  </Link>
                )}

                <Link
                  href="#about"
                  className="rounded-2xl border border-white/15 px-6 py-3 text-center text-sm font-bold text-white hover:bg-white/10"
                >
                  Learn More
                </Link>
              </div>

              <p className="mt-4 text-xs text-white/50">
                Install EdStop on your phone using “Add to Home Screen” for an
                app-like experience.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur">
              <div className="rounded-2xl bg-slate-950/80 p-5">
                <p className="text-sm font-semibold text-white/60">Today on EdStop</p>

                <div className="mt-5 space-y-3">
                  {[
                    ['Food Delivery', 'Campus restaurants', 'Live'],
                    ['Dark Store', 'Hostel essentials', 'Live'],
                    ['Order History', 'Track every order', 'Live'],
                    ['Lost & Found', 'Community utility', 'Soon'],
                  ].map(([title, subtitle, badge]) => (
                    <div
                      key={title}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div>
                        <p className="font-semibold">{title}</p>
                        <p className="text-xs text-white/45">{subtitle}</p>
                      </div>
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                        {badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
            <h2 className="text-2xl font-bold">About EdStop</h2>
            <p className="mt-4 text-sm leading-7 text-white/65">
              EdStop is a campus-first platform designed to simplify daily
              student life. We are starting with food and essentials, then
              expanding into trusted student services, community discovery,
              marketplace tools, and campus support utilities.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
            <h2 className="text-2xl font-bold">Our Vision</h2>
            <p className="mt-4 text-sm leading-7 text-white/65">
              Our vision is to become the most useful digital companion for
              campus communities — helping students save time, discover trusted
              services, access essentials, and participate in a stronger student
              network.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black">Live Services</h2>
              <p className="mt-2 text-sm text-white/55">
                Start using these services today.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {services.map((service) => (
              <Link
                key={service.title}
                href={service.href}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:bg-white/[0.07]"
              >
                <h3 className="text-lg font-bold">{service.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  {service.description}
                </p>
                <p className="mt-5 text-sm font-semibold text-purple-300">
                  Open →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-7">
          <h2 className="text-3xl font-black">Coming Soon</h2>
          <p className="mt-2 text-sm text-white/55">
            More student-first modules are being built for the campus community.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {comingSoon.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4 text-sm font-semibold text-white/80"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 text-sm text-white/45 sm:flex-row">
          <p>© {new Date().getFullYear()} EdStop. Built for campus life.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-white">
              Sign In
            </Link>
            <Link href="/student-dashboard" className="hover:text-white">
              Dashboard
            </Link>
            <Link href="/order-history" className="hover:text-white">
              Orders
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}