// FILE: src/app/admin/dashboard/DashboardUI.tsx

'use client';

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useState, useEffect, useMemo } from 'react';

/* ================= MAIN COMPONENT ================= */

export default function DashboardUI({
  totals,
  forecast,
  anomalies,
  orderCount,
  weeklyData = [],
  restaurantData = [],
  riderData = [],
}: any) {

  const [darkMode, setDarkMode] = useState(true);
  const [commissionRate, setCommissionRate] = useState(0);
  const [riderBonus, setRiderBonus] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);

  /* ================= AUTO REFRESH ================= */

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      window.location.reload();
    }, 20000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  /* ================= SIMULATOR ================= */

  const simulatedProfit = useMemo(() => {
    const gross = totals?.totalGross || 0;
    const baseProfit = totals?.netProfit || 0;
    const commissionImpact = (gross * commissionRate) / 100;
    return baseProfit + commissionImpact - riderBonus;
  }, [commissionRate, riderBonus, totals]);

  /* ================= THEME ================= */

  const bg = darkMode ? "bg-[#0f172a]" : "bg-gray-100";
  const card = darkMode ? "bg-[#1e293b] border-gray-700" : "bg-white border-gray-200";
  const textPrimary = darkMode ? "text-white" : "text-gray-900";
  const textMuted = darkMode ? "text-gray-400" : "text-gray-600";

  /* ================= CSV EXPORT ================= */

  const downloadCSV = () => {
    if (!weeklyData.length) return;

    const headers = ['Week','Restaurant Payout','Rider Cost','Net Profit'];
    const rows = weeklyData.map((w: any) => [
      w.week,
      w.restaurant_payout,
      w.rider_cost,
      w.net_profit,
    ]);

    const csvContent =
      [headers, ...rows].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `weekly_settlement.csv`;
    link.click();
  };

  return (
    <div className={`min-h-screen ${bg} p-10 space-y-12 transition-all`}>

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className={`text-3xl font-bold ${textPrimary}`}>
          EdStop Executive Dashboard
        </h1>

        <div className="flex gap-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            {autoRefresh ? "Auto Refresh ON" : "Enable Auto Refresh"}
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg"
          >
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card title="Gross Revenue" value={totals?.totalGross} card={card} text={textPrimary} muted={textMuted} />
        <Card title="Net Profit" value={totals?.netProfit} card={card} text={textPrimary} muted={textMuted} />
        <Card title="Avg Order Value" value={totals?.avgOrderValue} card={card} text={textPrimary} muted={textMuted} />
        <Card title="Contribution Margin %" value={totals?.contributionMargin} card={card} text={textPrimary} muted={textMuted} />
      </div>

      {/* FORECAST */}
      <Section title="30-Day Revenue Forecast" card={card} text={textPrimary}>
        <Chart data={forecast} darkMode={darkMode} />
      </Section>

      {/* UNIT ECONOMICS */}
      <Section title="Unit Economics" card={card} text={textPrimary}>
        <p>Total Orders: {orderCount}</p>
        <p>Commission Revenue: ₹{totals?.totalCommission}</p>
        <p>Restaurant Payout: ₹{totals?.totalRestaurant}</p>
        <p>Rider Cost: ₹{totals?.totalRider}</p>
      </Section>

      {/* SIMULATOR */}
      <Section title="Contribution Margin Simulator" card={card} text={textPrimary}>
        <div className="space-y-4">

          <div>
            <label className={textMuted}>Increase Commission (%)</label>
            <input
              type="range"
              min="0"
              max="10"
              value={commissionRate}
              onChange={(e) => setCommissionRate(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className={textMuted}>Rider Bonus (₹)</label>
            <input
              type="range"
              min="0"
              max="5000"
              step="500"
              value={riderBonus}
              onChange={(e) => setRiderBonus(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="text-xl font-bold">
            Simulated Profit: ₹{Math.round(simulatedProfit)}
          </div>
        </div>
      </Section>

      {/* WEEKLY */}
      <Section title="Weekly Settlement" card={card} text={textPrimary}>
        <button
          onClick={downloadCSV}
          className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          Download CSV
        </button>

        <Table
          headers={['Week','Restaurant Payout','Rider Cost','Net Profit']}
          rows={weeklyData.map((w:any)=>[
            w.week,
            `₹${Math.round(w.restaurant_payout)}`,
            `₹${Math.round(w.rider_cost)}`,
            `₹${Math.round(w.net_profit)}`
          ])}
        />
      </Section>

      {/* RESTAURANTS */}
      <Section title="Restaurant Profitability" card={card} text={textPrimary}>
        <Table
          headers={['Restaurant','Orders','Net Profit']}
          rows={restaurantData.map((r:any)=>[
            r.restaurant,
            r.orders,
            `₹${Math.round(r.net_profit)}`
          ])}
        />
      </Section>

      {/* RIDERS */}
      <Section title="Rider Performance" card={card} text={textPrimary}>
        <Table
          headers={['Rider','Deliveries','Total Earned']}
          rows={riderData.map((r:any)=>[
            r.rider,
            r.deliveries,
            `₹${Math.round(r.total_earned)}`
          ])}
        />
      </Section>

      {/* ANOMALIES */}
      <Section title="Revenue Anomalies" card={card} text={textPrimary}>
        {anomalies.length === 0 ? (
          <p>No abnormal spikes detected</p>
        ) : (
          anomalies.map((a:any,i:number)=>(
            <div key={i} className="text-red-500">
              {a.day} → ₹{a.value}
            </div>
          ))
        )}
      </Section>

    </div>
  );
}

/* ================= COMPONENTS ================= */

function Card({ title, value, card, text, muted }: any) {
  return (
    <div className={`${card} p-6 rounded-xl border`}>
      <p className={`${muted} text-sm mb-2`}>{title}</p>
      <p className={`text-2xl font-bold ${text}`}>
        ₹{Math.round(value || 0)}
      </p>
    </div>
  );
}

function Section({ title, children, card, text }: any) {
  return (
    <div className={`${card} p-8 rounded-2xl border`}>
      <h2 className={`text-2xl font-semibold mb-6 ${text}`}>{title}</h2>
      {children}
    </div>
  );
}

function Chart({ data, darkMode }: any) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <CartesianGrid stroke={darkMode ? "#334155" : "#e5e7eb"} />
          <XAxis dataKey="day" stroke={darkMode ? "#94a3b8" : "#6b7280"} />
          <YAxis stroke={darkMode ? "#94a3b8" : "#6b7280"} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="total_revenue"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Table({ headers, rows }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr>
            {headers.map((h:any)=>
              <th key={h} className="py-2">{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row:any,i:number)=>(
            <tr key={i} className="border-t">
              {row.map((cell:any,j:number)=>
                <td key={j} className="py-2">{cell}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}