// FILE: src/app/terms/page.tsx

import Link from 'next/link';

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using EdStop, you agree to these Terms & Conditions. If you do not agree, please do not use the platform.',
  },
  {
    title: '2. About EdStop',
    body: 'EdStop is a campus-focused platform intended to help students access services such as food ordering, dark store essentials, order tracking, student profile management, and future campus utilities.',
  },
  {
    title: '3. Account Responsibility',
    body: 'You are responsible for keeping your login details secure and for all activity under your account. Please use accurate profile, contact, hall, and room information so orders and services can be handled correctly.',
  },
  {
    title: '4. Student and Campus Use',
    body: 'EdStop is currently built for launch and testing within the IIT Kharagpur campus context. Some features may be limited, experimental, or available only to selected users during rollout.',
  },
  {
    title: '5. Orders, Payments, and Availability',
    body: 'Product availability, pricing, delivery timing, and service coverage may change. Cash on Delivery orders must be paid at the time of delivery. Online payment features may be enabled or disabled depending on payment provider readiness.',
  },
  {
    title: '6. User Conduct',
    body: 'You agree not to misuse EdStop, place fake orders, provide false information, abuse delivery partners or vendors, attempt unauthorized access, or interfere with platform operations.',
  },
  {
    title: '7. Future Marketplace Features',
    body: 'Upcoming modules such as Lost & Found, Buy & Sell, Blog, and student services may have additional rules. EdStop may moderate, restrict, or remove content that is unsafe, misleading, unlawful, spammy, or against campus guidelines.',
  },
  {
    title: '8. Changes to Services',
    body: 'We may update, pause, remove, or improve features as the platform evolves. During launch, bugs and service interruptions may occur, and we will work to resolve them as quickly as possible.',
  },
  {
    title: '9. Limitation of Liability',
    body: 'EdStop is provided on an as-is and as-available basis during launch. To the maximum extent permitted by law, EdStop is not liable for indirect losses, service interruptions, incorrect user-provided details, or issues outside our reasonable control.',
  },
  {
    title: '10. Contact',
    body: 'For support, corrections, or questions about these terms, please contact the EdStop team through the official support channel shared on the platform.',
  },
];

export default function TermsPage() {
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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-xl font-black shadow-lg shadow-purple-500/25">
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
              Launch policy
            </p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Terms & Conditions
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/60">
              Last updated: June 16, 2026. These terms are written for EdStop&apos;s campus launch phase and may be updated as more modules go live.
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

          <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            This page is a practical launch-ready policy page, not a substitute for formal legal advice. Review with counsel before large-scale public rollout.
          </div>
        </div>
      </section>
    </main>
  );
}
