// FILE: src/app/notifications/page.tsx

import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function markAsRead(formData: FormData) {
  'use server';

  const supabase = await createClient();

  const notificationId = String(formData.get('notification_id') || '');

  if (!notificationId) return;

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  revalidatePath('/notifications');
}

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Please login.</p>
      </main>
    );
  }

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-background text-white px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/50">EdStop</p>
            <h1 className="text-3xl font-bold">Notifications</h1>
          </div>

          <Link
            href="/student-dashboard"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
          >
            Dashboard
          </Link>
        </header>

        <div className="space-y-3">
          {(notifications || []).map((notification) => (
            <div
              key={notification.id}
              className={`rounded-2xl border p-4 ${
                notification.is_read
                  ? 'border-white/10 bg-black/20'
                  : 'border-purple-500/30 bg-purple-500/10'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">
                    {notification.title}
                  </h3>

                  <p className="mt-1 text-sm text-white/70">
                    {notification.message}
                  </p>

                  <p className="mt-2 text-xs text-white/40">
                    {new Date(notification.created_at).toLocaleString('en-IN')}
                  </p>
                </div>

                {!notification.is_read && (
                  <form action={markAsRead}>
                    <input
                      type="hidden"
                      name="notification_id"
                      value={notification.id}
                    />
                    <button className="rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/10">
                      Mark Read
                    </button>
                  </form>
                )}
              </div>

              {notification.link_url && (
                <Link
                  href={notification.link_url}
                  className="mt-3 inline-block text-sm text-purple-300 hover:text-purple-200"
                >
                  Open →
                </Link>
              )}
            </div>
          ))}

          {(notifications || []).length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-white/50">
              No notifications yet.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}