import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-16">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-xl sm:p-12">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to EdStop</h1>
        <p className="mt-3 text-gray-600">
          Campus super app for food, essentials, and student services at IIT Kharagpur.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {user ? (
            <Link
              href="/student-dashboard"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Sign In
            </Link>
          )}

          <Link
            href="/food-ordering-interface"
            className="inline-flex items-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Browse Food Ordering
          </Link>

          <Link
            href="/dark-store-shopping"
            className="inline-flex items-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Open Dark Store
          </Link>
        </div>
      </div>
    </main>
  );
}
