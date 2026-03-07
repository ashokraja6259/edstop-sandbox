// FILE: src/app/admin/dashboard/page.tsx

import { Suspense } from 'react';
import DashboardShell from './DashboardShell';

export const dynamic = 'force-dynamic';

export default function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const range = Number(searchParams?.range || 30);

  return (
    <Suspense fallback={<div className="p-8">Loading Dashboard...</div>}>
      <DashboardShell range={range} />
    </Suspense>
  );
}