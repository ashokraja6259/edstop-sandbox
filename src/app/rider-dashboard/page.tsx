// FILE: src/app/rider-dashboard/page.tsx

import type { Metadata } from 'next';
import RiderDashboardInteractive from './components/RiderDashboardInteractive';
import { requireRole } from '@/lib/auth/requireRole';

export const metadata: Metadata = {
  title: 'Rider Dashboard - EdStop',
  description: 'Manage your delivery orders, track earnings, and optimize routes with batch delivery support for efficient campus deliveries at IIT Kharagpur.',
};

export default async function RiderDashboardPage() {
  await requireRole('rider');
  return <RiderDashboardInteractive />;
}
