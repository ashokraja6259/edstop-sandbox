// FILE: src/app/student-dashboard/page.tsx

import type { Metadata } from 'next';
import StudentDashboardInteractive from './components/StudentDashboardInteractive';

export const metadata: Metadata = {
  title: 'Dashboard - EdStop | IIT Kharagpur Campus Commerce',
  description: 'Your personal campus commerce hub at IIT Kharagpur. Order food, shop essentials, manage EdCoins wallet, and get AI assistance.',
  openGraph: {
    title: 'EdStop - IIT KGP Campus Commerce',
    description: 'Food delivery, dark store shopping, AI companion & more for IIT Kharagpur students.',
    type: 'website',
  },
};

export default function StudentDashboardPage() {
  return <StudentDashboardInteractive />;
}