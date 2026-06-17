// FILE: src/app/admin/support/page.tsx

import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SUPPORT_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

async function updateTicketStatus(formData: FormData) {
  'use server';

  await requireRole('admin');

  const supabase = await createClient();

  const ticketId = String(formData.get('ticket_id') || '');
  const status = String(formData.get('status') || '');

  if (!ticketId || !SUPPORT_STATUSES.includes(status)) {
    console.error('Support ticket update skipped: invalid input');
    return;
  }

  const { error } = await supabase
    .from('support_tickets')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId);

  if (error) {
    console.error('Support ticket status update failed:', error);
    return;
  }

  revalidatePath('/admin/support');
}

export default async function AdminSupportPage() {
  await requireRole('admin');

  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select(
      'id, user_id, category, subject, description, status, created_at, updated_at'
    )
    .order('created_at', { ascending: false });

  const ticketRows = tickets ?? [];

  const openCount = ticketRows.filter((ticket) => ticket.status === 'open').length;
  const progressCount = ticketRows.filter(
    (ticket) => ticket.status === 'in_progress'
  ).length;
  const resolvedCount = ticketRows.filter(
    (ticket) => ticket.status === 'resolved'
  ).length;
  const closedCount = ticketRows.filter((ticket) => ticket.status === 'closed').length;

  return (
    <main className="min-h-screen bg-background text-white px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/50">Admin</p>
            <h1 className="text-3xl font-bold">Support Tickets</h1>
            <p className="mt-2 text-sm text-white/60">
              Review student issues and move tickets through the support queue.
            </p>
          </div>

          <Link
            href="/admin/operations"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
          >
            Operations
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Stat title="Open" value={openCount} />
          <Stat title="In Progress" value={progressCount} />
          <Stat title="Resolved" value={resolvedCount} />
          <Stat title="Closed" value={closedCount} />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">All Tickets</h2>
            <p className="text-sm text-white/50">{ticketRows.length} tickets</p>
          </div>

          <div className="space-y-3">
            {ticketRows.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
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
                      User: {ticket.user_id}
                    </p>

                    <p className="mt-1 text-xs text-white/35">
                      Created:{' '}
                      {ticket.created_at
                        ? new Date(ticket.created_at).toLocaleString('en-IN')
                        : 'Date unavailable'}
                    </p>
                  </div>

                  <form action={updateTicketStatus} className="flex gap-2">
                    <input type="hidden" name="ticket_id" value={ticket.id} />

                    <select
                      name="status"
                      defaultValue={ticket.status}
                      className="rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white"
                    >
                      {SUPPORT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    <button className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10">
                      Save
                    </button>
                  </form>
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

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-white/50">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}