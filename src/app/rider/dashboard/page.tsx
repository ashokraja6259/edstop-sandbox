// FILE: src/app/rider/dashboard/page.tsx

import { requireRole } from '@/lib/auth/requireRole';

export default async function RiderDashboardPage() {
  await requireRole('rider');

  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-bold">Rider Dashboard</h1>
    </div>
  );
}
