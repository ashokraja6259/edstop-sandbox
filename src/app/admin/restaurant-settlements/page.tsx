// FILE: src/app/admin/restaurant-settlements/page.tsx

import RestaurantSettlementsClient from './RestaurantSettlementsClient';
import { requireRole } from '@/lib/auth/requireRole';

export default async function RestaurantSettlementsPage() {
  await requireRole('admin');
  return <RestaurantSettlementsClient />;
}
