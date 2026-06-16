// FILE: src/app/privacy/page.tsx

import Link from 'next/link';

const sections = [
  {
    title: 'Information We Collect',
    body: 'We may collect account information such as your name, email address, phone number, hall, room details, profile information, order history, and information required to provide services through EdStop.',
  },
  {
    title: 'How We Use Information',
    body: 'Information is used to authenticate users, manage profiles, process orders, provide support, improve services, maintain platform security, and develop future campus-focused features.',
  },
  {
    title: 'Order and Delivery Data',
    body: 'When you place an order, information relevant to fulfillment may be shared with authorized vendors, delivery partners, or service operators involved in completing that order.',
  },
  {
    title: 'Account Security',
    body: 'We take reasonable steps to protect account information. Users are responsible for maintaining the confidentiality of their login credentials and devices.',
  },
  {
    title: 'Analytics and Improvements',
    body: 'We may use aggregated and non-identifying information to understand usage patterns, improve platform reliability, and prioritize future feature development.',
  },
  {
    title: 'Data Retention',
    body: 'Information may be retained for operational, security, support, compliance, or service-improvement purposes. Retention periods may vary depending on the type of data involved.',
  },
  {
    title: 'Future Community Features',
    body: 'Future modules such as Lost & Found, Buy & Sell, blogs, and student communities may allow users to publish content. Users remain responsible for content they submit through the platform.',
  },
  {
    title: 'Policy Updates',
    body: 'This Privacy Policy may be updated as EdStop evolves. Continued use of the platform after updates may constitute acceptance of the revised policy.',
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/25 via-purple-600/15 to-pink-500/20" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-purple-500/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
      </div>

      <section className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-xl font-black">
              E
            </div>
            <div>
              <p className="text-lg font-black leading-none">EdStop</p>
              <p className="text-xs text-white/50">Campus Super App</p>
            </div>
          </Link>

          <Link href="/login" className="text-sm font-semibold text-purple-300 hover:text-purple-200">
            Back to Login
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-8">
            <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/75">
              Privacy policy
            </p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/60">
              Last updated: June 16, 2026. This policy explains how EdStop handles information during launch and ongoing platform development.
            </p>
          </div>

          <div className="space-y-5">
            {sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <h2 className="text-base font-black text-white">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-white/65">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
            EdStop does not sell user data. Information is used to operate and improve platform services and campus experiences.
          </div>
        </div>
      </section>
    </main>
  );
}
