// FILE: src/app/help/page.tsx

import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function createSupportTicket(formData: FormData) {
  'use server';

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const category = String(formData.get('category') || '').trim();
  const subject = String(formData.get('subject') || '').trim();
  const description = String(formData.get('description') || '').trim();

  if (!category || !subject || !description) {
    console.error('Support ticket skipped: missing fields');
    return;
  }

  const { error } = await supabase.from('support_tickets').insert({
    user_id: user.id,
    category,
    subject,
    description,
    status: 'open',
  });

  if (error) {
    console.error('Support ticket creation failed:', error);
    return;
  }

  revalidatePath('/help');
}

export default async function HelpPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id, category, subject, description, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const ticketRows = tickets ?? [];

  return (
    <main className="min-h-screen bg-background text-white px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/50">Support</p>
            <h1 className="text-3xl font-bold">Help Center</h1>
            <p className="mt-2 text-sm text-white/60">
              Raise an issue for orders, payments, marketplace, lost & found, or general help.
            </p>
          </div>

          <Link
            href="/student-dashboard"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
          >
            Dashboard
          </Link>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-4 text-xl font-bold">Create Support Ticket</h2>

          <form action={createSupportTicket} className="grid gap-4">
            <select
              name="category"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white"
              required
            >
              <option value="">Select issue category</option>
              <option value="order">Order Issue</option>
              <option value="payment">Payment Issue</option>
              <option value="marketplace">Marketplace Issue</option>
              <option value="lost_found">Lost & Found Issue</option>
              <option value="account">Account Issue</option>
              <option value="general">General Support</option>
            </select>

            <input
              name="subject"
              placeholder="Short subject"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white"
              required
            />

            <textarea
              name="description"
              placeholder="Describe the issue clearly..."
              rows={5}
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white"
              required
            />

            <button className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold hover:bg-white/10">
              Submit Ticket
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">My Tickets</h2>
            <p className="text-sm text-white/50">{ticketRows.length} tickets</p>
          </div>

          <div className="space-y-3">
            {ticketRows.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{ticket.subject}</h3>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                        {ticket.category}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                        {ticket.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-white/60">
                      {ticket.description}
                    </p>

                    <p className="mt-2 text-xs text-white/35">
                      {ticket.created_at
                        ? new Date(ticket.created_at).toLocaleString('en-IN')
                        : 'Date unavailable'}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {ticketRows.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/50">
                No support tickets yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}