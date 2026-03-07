// FILE: src/app/admin/dashboard/DashboardShell.tsx

import { createClient } from '@/lib/supabase/server';
import DashboardUI from './DashboardUI';

type RevenueBreakdown = {
  gross_revenue: number | null;
  platform_commission: number | null;
  rider_cost: number | null;
  restaurant_payout: number | null;
  net_platform_profit: number | null;
  created_at: string;
};

export default async function DashboardShell({
  range,
}: {
  range: number;
}) {
  const supabase = await createClient();

  /* ================= DATE RANGE ================= */

  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - Number(range || 0));

  /* ================= FETCH DATA ================= */

  const { data, error } = await supabase
    .from('admin_financial_breakdown')
    .select('*')
    .gte('created_at', dateLimit.toISOString())
    .returns<RevenueBreakdown[]>();

  if (error) {
    console.error('Dashboard breakdown fetch error:', error.message);
  }

  const breakdown: RevenueBreakdown[] = data ?? [];

  /* ================= TOTALS ================= */

  const totalGross = breakdown.reduce(
    (sum, o) => sum + (o.gross_revenue ?? 0),
    0
  );

  const totalCommission = breakdown.reduce(
    (sum, o) => sum + (o.platform_commission ?? 0),
    0
  );

  const totalRider = breakdown.reduce(
    (sum, o) => sum + (o.rider_cost ?? 0),
    0
  );

  const totalRestaurant = breakdown.reduce(
    (sum, o) => sum + (o.restaurant_payout ?? 0),
    0
  );

  const netProfit = breakdown.reduce(
    (sum, o) => sum + (o.net_platform_profit ?? 0),
    0
  );

  const avgOrderValue =
    breakdown.length > 0 ? totalGross / breakdown.length : 0;

  const contributionMargin =
    totalGross > 0
      ? Number(((netProfit / totalGross) * 100).toFixed(2))
      : 0;

  /* ================= DAILY MAP ================= */

  const dailyMap: Record<string, number> = {};

  breakdown.forEach((o) => {
    if (!o.created_at) return;

    const day = o.created_at.split('T')[0];

    if (!dailyMap[day]) dailyMap[day] = 0;
    dailyMap[day] += o.gross_revenue ?? 0;
  });

  const dailyValues = Object.values(dailyMap);

  const avgDaily =
    dailyValues.length > 0
      ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length
      : 0;

  /* ================= ANOMALY DETECTION ================= */

  const anomalies = Object.entries(dailyMap)
    .filter(([_, value]) =>
      avgDaily > 0 &&
      (value > avgDaily * 1.8 || value < avgDaily * 0.4)
    )
    .map(([day, value]) => ({
      day,
      value,
    }));

  /* ================= FORECAST ================= */

  const forecast: { day: string; total_revenue: number }[] = [];

  const projectedDaily = avgDaily;

  for (let i = 1; i <= 30; i++) {
    forecast.push({
      day: `+${i}`,
      total_revenue: Math.round(projectedDaily),
    });
  }

  /* ================= RETURN ================= */

  return (
    <DashboardUI
      totals={{
        totalGross,
        totalCommission,
        totalRider,
        totalRestaurant,
        netProfit,
        avgOrderValue,
        contributionMargin,
      }}
      forecast={forecast}
      anomalies={anomalies}
      orderCount={breakdown.length}
    />
  );
}