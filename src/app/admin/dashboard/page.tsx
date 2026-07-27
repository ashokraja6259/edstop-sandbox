// FILE: src/app/admin/dashboard/page.tsx

import { Suspense } from 'react';
import DashboardShell from './DashboardShell';
import { requireRole } from '@/lib/auth/requireRole';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireRole('admin');

  const { range: requestedRange } = await searchParams;
  const range = Number(requestedRange || 30);

  return (
    <Suspense fallback={<div className="p-8">Loading Dashboard...</div>}>
      <DashboardShell range={range} />
    </Suspense>
  );
}
