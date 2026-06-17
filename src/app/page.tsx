// FILE: src/app/page.tsx

import Link from 'next/link';

const liveServices = [
  {
    title: 'Food Ordering',
    description:
      'Order from campus restaurants and track your food orders from one place.',
    href: '/food-ordering-interface',
    icon: '🍔',
    badge: 'Live',
  },
  {
    title: 'Dark Store',
    description:
      'Get daily essentials, snacks, and quick campus needs delivered faster.',
    href: '/dark-store-shopping',
    icon: '🛒',
    badge: 'Live',
  },
  {
    title: 'Lost & Found',
    description:
      'Report lost items, post found items, and help students recover belongings.',
    href: '/lost-found',
    icon: '🔎',
    badge: 'New',
  },
  {
    title: 'Buy & Sell',
    description:
      'Buy, sell, or give away useful items within the IIT KGP student community.',
    href: '/marketplace',
    icon: '💸',
    badge: 'New',
  },
];

const steps = [
  'Create your EdStop account',
  'Complete your student profile',
  'Use food, essentials, Lost & Found, and marketplace',
  'Install EdStop for faster access',
];

const upcoming = [
  'Student Blogs',
  'Campus Deals',
  'AI Companion',
  'Events & Announcements',
];

const faqs = [
  {
    q: 'Is EdStop only for IIT Kharagpur?',
    a: 'Yes, EdStop is currently focused on IIT Kharagpur campus use and launch testing.',
  },
  {
    q: 'Can I install EdStop like an app?',
    a: 'Yes. EdStop supports PWA install, so you can add it to your phone home screen.',
  },
  {
    q: 'Are Lost & Found and Buy & Sell live?',
    a: 'Yes. Both modules are live in V1 and available after login.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/25 via-purple-600/15 to-pink-500/20" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-purple-500/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-xl font-black shadow-lg shadow-purple-500/25">
            E
          </div>
          <div>
            <p className="text-lg font-black leading-none">EdStop</p>
            <p className="text-xs text-white/50">IIT KGP Campus Super App</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-white/80 hover:bg-white/[0.1]"
          >
            Login
          </Link>
          <Link
            href="/student-dashboard"
            className="hidden rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-white/90 sm:inline-flex"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur">
            Built for IIT Kharagpur students
          </div>

          <h1 className="max-w-4xl text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            Everything IIT KGP needs,
            <span className="block bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              in one app.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
            Food, essentials, Lost & Found, Buy & Sell, order history, profile
            management, and campus-first services — all inside EdStop.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="rounded-2xl bg-white px-6 py-3.5 text-center text-sm font-black text-slate-950 shadow-xl shadow-purple-500/20 hover:bg-white/90"
            >
              Get Started
            </Link>
            <Link
              href="#services"
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-3.5 text-center text-sm font-bold text-white/80 hover:bg-white/[0.1]"
            >
              Explore Services
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {['Food', 'Essentials', 'Lost & Found', 'Marketplace'].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white/75"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-xl">
          <div className="rounded-3xl bg-slate-950/60 p-5">
            <p className="text-sm font-bold text-purple-200">Live on EdStop</p>
            <div className="mt-5 space-y-3">
              {liveServices.map((service) => (
                <Link
                  key={service.title}
                  href={service.href}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 transition hover:bg-white/[0.1]"
                >
                  <div className="text-3xl">{service.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black">{service.title}</h3>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-200">
                        {service.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-white/55">
                      {service.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-bold text-purple-300">Live services</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Campus utilities that are already working.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {liveServices.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl transition hover:-translate-y-1 hover:bg-white/[0.1]"
            >
              <div className="text-4xl">{service.icon}</div>
              <div className="mt-4 flex items-center gap-2">
                <h3 className="text-lg font-black">{service.title}</h3>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black text-white/70">
                  {service.badge}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/60">
                {service.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
            <p className="text-sm font-bold text-purple-300">How it works</p>
            <h2 className="mt-2 text-3xl font-black">Start in minutes.</h2>
            <div className="mt-6 space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">
                    {index + 1}
                  </div>
                  <p className="text-sm font-semibold text-white/75">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 p-6">
            <p className="text-sm font-bold text-purple-200">Install EdStop</p>
            <h2 className="mt-2 text-3xl font-black">Use it like a mobile app.</h2>
            <p className="mt-4 text-sm leading-6 text-white/65">
              Add EdStop to your home screen for faster access to food,
              essentials, Lost & Found, marketplace, and student services.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-white/90"
            >
              Open EdStop
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
          <p className="text-sm font-bold text-purple-300">Coming next</p>
          <h2 className="mt-2 text-3xl font-black">More campus features are on the way.</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm font-bold text-white/70"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-bold text-purple-300">FAQ</p>
          <h2 className="mt-2 text-3xl font-black">Questions students may ask.</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="rounded-3xl border border-white/10 bg-white/[0.06] p-5"
            >
              <h3 className="font-black">{faq.q}</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="font-black">EdStop</p>
            <p className="mt-1 text-sm text-white/45">
              Built for IIT Kharagpur campus life.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-white/55">
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/login" className="hover:text-white">
              Login
            </Link>
            <Link href="/student-dashboard" className="hover:text-white">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}