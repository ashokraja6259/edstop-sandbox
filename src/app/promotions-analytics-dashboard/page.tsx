// FILE: src/app/promotions-analytics-dashboard/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

interface PromoAnalytics {
  code: string;
  title: string;
  usageCount: number;
  uniqueUsers: number;
  totalDiscount: number;
  redemptionRate: number;
  conversionRate: number;
  revenueImpact: number;
  isActive: boolean;
  discountType: string;
  discountValue: number;
}

interface DailyUsage {
  date: string;
  usages: number;
  discount: number;
  orders: number;
}

interface KPI {
  label: string;
  value: string;
  subValue: string;
  icon: string;
  color: string;
  bgColor: string;
  trend: number;
}

const PROMO_DATA: PromoAnalytics[] = [
  {
    code: 'WELCOME20',
    title: 'Welcome Discount',
    usageCount: 1240,
    uniqueUsers: 1180,
    totalDiscount: 24800,
    redemptionRate: 78.5,
    conversionRate: 65.2,
    revenueImpact: 98400,
    isActive: true,
    discountType: 'percentage',
    discountValue: 20,
  },
  {
    code: 'FLAT50',
    title: 'Flat ₹50 Off',
    usageCount: 890,
    uniqueUsers: 820,
    totalDiscount: 44500,
    redemptionRate: 62.3,
    conversionRate: 58.1,
    revenueImpact: 71200,
    isActive: true,
    discountType: 'flat',
    discountValue: 50,
  },
  {
    code: 'FOOD15',
    title: 'Food 15% Off',
    usageCount: 654,
    uniqueUsers: 601,
    totalDiscount: 19620,
    redemptionRate: 55.8,
    conversionRate: 49.3,
    revenueImpact: 52320,
    isActive: true,
    discountType: 'percentage',
    discountValue: 15,
  },
  {
    code: 'STORE10',
    title: 'Store 10% Off',
    usageCount: 432,
    uniqueUsers: 398,
    totalDiscount: 8640,
    redemptionRate: 44.1,
    conversionRate: 38.7,
    revenueImpact: 34560,
    isActive: true,
    discountType: 'percentage',
    discountValue: 10,
  },
  {
    code: 'EDSTOP30',
    title: 'EdStop Special 30%',
    usageCount: 310,
    uniqueUsers: 290,
    totalDiscount: 18600,
    redemptionRate: 38.2,
    conversionRate: 32.5,
    revenueImpact: 24800,
    isActive: true,
    discountType: 'percentage',
    discountValue: 30,
  },
  {
    code: 'KGPFREE',
    title: 'KGP Free Delivery',
    usageCount: 678,
    uniqueUsers: 645,
    totalDiscount: 13560,
    redemptionRate: 71.4,
    conversionRate: 68.9,
    revenueImpact: 54240,
    isActive: true,
    discountType: 'free-delivery',
    discountValue: 0,
  },
];

const generateDailyData = (days: number): DailyUsage[] => {
  const data: DailyUsage[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayLabel = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    data.push({
      date: dayLabel,
      usages: Math.floor(Math.random() * 120) + 40,
      discount: Math.floor(Math.random() * 8000) + 2000,
      orders: Math.floor(Math.random() * 200) + 80,
    });
  }
  return data;
};

const PIE_COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const DATE_PRESETS = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'This Month', days: 30 },
];

export default function PromotionsAnalyticsDashboard() {
  const [selectedPreset, setSelectedPreset] = useState(1);
  const [dailyData, setDailyData] = useState<DailyUsage[]>([]);
  const [sortBy, setSortBy] = useState<'usageCount' | 'totalDiscount' | 'redemptionRate'>('usageCount');
  const [activeTab, setActiveTab] = useState<'overview' | 'codes' | 'trends'>('overview');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    setDailyData(generateDailyData(DATE_PRESETS[selectedPreset].days));
  }, [selectedPreset]);

  const totalUsage = PROMO_DATA.reduce((s, p) => s + p.usageCount, 0);
  const totalDiscount = PROMO_DATA.reduce((s, p) => s + p.totalDiscount, 0);
  const totalUniqueUsers = PROMO_DATA.reduce((s, p) => s + p.uniqueUsers, 0);
  const avgRedemptionRate = PROMO_DATA.reduce((s, p) => s + p.redemptionRate, 0) / PROMO_DATA.length;
  const totalRevenueImpact = PROMO_DATA.reduce((s, p) => s + p.revenueImpact, 0);
  const activeCodes = PROMO_DATA.filter(p => p.isActive).length;

  const kpis: KPI[] = [
    {
      label: 'Total Redemptions',
      value: totalUsage.toLocaleString('en-IN'),
      subValue: `+${Math.floor(totalUsage * 0.12).toLocaleString('en-IN')} this period`,
      icon: 'TicketIcon',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      trend: 12,
    },
    {
      label: 'Total Discount Given',
      value: `₹${(totalDiscount / 1000).toFixed(1)}K`,
      subValue: `Across ${activeCodes} active codes`,
      icon: 'CurrencyRupeeIcon',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
      trend: 8.4,
    },
    {
      label: 'Avg Redemption Rate',
      value: `${avgRedemptionRate.toFixed(1)}%`,
      subValue: 'Of codes distributed',
      icon: 'ChartBarIcon',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      trend: 3.2,
    },
    {
      label: 'Unique Users',
      value: totalUniqueUsers.toLocaleString('en-IN'),
      subValue: 'Used at least 1 promo',
      icon: 'UsersIcon',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      trend: 15.7,
    },
    {
      label: 'Revenue Influenced',
      value: `₹${(totalRevenueImpact / 1000).toFixed(1)}K`,
      subValue: 'Orders with promo applied',
      icon: 'TrendingUpIcon',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      trend: 22.1,
    },
    {
      label: 'Active Promo Codes',
      value: activeCodes.toString(),
      subValue: `${PROMO_DATA.length} total codes`,
      icon: 'TagIcon',
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      trend: 0,
    },
  ];

  const sortedCodes = [...PROMO_DATA].sort((a, b) => b[sortBy] - a[sortBy]);

  const pieData = PROMO_DATA.map(p => ({
    name: p.code,
    value: p.usageCount,
  }));

  const handleExport = useCallback(() => {
    const csv = [
      ['Code', 'Title', 'Usage Count', 'Unique Users', 'Total Discount (₹)', 'Redemption Rate (%)', 'Conversion Rate (%)', 'Revenue Impact (₹)'],
      ...PROMO_DATA.map(p => [
        p.code, p.title, p.usageCount, p.uniqueUsers,
        p.totalDiscount, p.redemptionRate.toFixed(1), p.conversionRate.toFixed(1), p.revenueImpact,
      ]),
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'promo-analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/promotions" className="p-2 rounded-xl glass hover:bg-white/10 transition-smooth">
              <Icon name="ArrowLeftIcon" size={18} className="text-white/70" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">Promotions Analytics</h1>
              <p className="text-xs text-white/50">Campaign performance & insights</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90 transition-smooth press-scale"
          >
            <Icon name="ArrowDownTrayIcon" size={16} className="text-white" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Date Filter */}
        <div className="glass rounded-2xl border border-white/10 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Icon name="CalendarIcon" size={16} className="text-purple-400" />
              <span>Date Range:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedPreset(idx); setShowCustom(false); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth ${
                    selectedPreset === idx && !showCustom
                      ? 'gradient-primary text-white shadow-glow-purple'
                      : 'glass text-white/60 hover:bg-white/10'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                onClick={() => setShowCustom(!showCustom)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth ${
                  showCustom ? 'gradient-primary text-white shadow-glow-purple' : 'glass text-white/60 hover:bg-white/10'
                }`}
              >
                Custom Range
              </button>
            </div>
            {showCustom && (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="px-3 py-1.5 rounded-lg glass border border-white/10 text-white text-xs bg-transparent focus:outline-none focus:border-purple-500"
                />
                <span className="text-white/40 text-xs">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="px-3 py-1.5 rounded-lg glass border border-white/10 text-white text-xs bg-transparent focus:outline-none focus:border-purple-500"
                />
                <button className="px-3 py-1.5 rounded-lg gradient-primary text-white text-xs font-medium hover:opacity-90 transition-smooth">
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="glass rounded-2xl border border-white/10 p-4 flex flex-col gap-2">
              <div className={`w-9 h-9 ${kpi.bgColor} rounded-xl flex items-center justify-center`}>
                <Icon name={kpi.icon as any} size={18} className={kpi.color} />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{kpi.value}</p>
                <p className="text-xs text-white/50 mt-0.5">{kpi.label}</p>
              </div>
              <div className="flex items-center gap-1">
                {kpi.trend > 0 ? (
                  <>
                    <Icon name="ArrowTrendingUpIcon" size={12} className="text-emerald-400" />
                    <span className="text-xs text-emerald-400">+{kpi.trend}%</span>
                  </>
                ) : (
                  <span className="text-xs text-white/30">—</span>
                )}
                <span className="text-xs text-white/30 truncate">{kpi.subValue}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 glass rounded-xl border border-white/10 w-fit">
          {(['overview', 'codes', 'trends'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-smooth ${
                activeTab === tab ? 'gradient-primary text-white shadow-glow-purple' : 'text-white/50 hover:text-white'
              }`}
            >
              {tab === 'overview' ? 'Overview' : tab === 'codes' ? 'Code Performance' : 'Usage Trends'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Usage Chart */}
            <div className="glass rounded-2xl border border-white/10 p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Icon name="ChartBarIcon" size={16} className="text-purple-400" />
                Daily Redemptions
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyData.slice(-14)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(15,10,40,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }}
                    cursor={{ fill: 'rgba(139,92,246,0.1)' }}
                  />
                  <Bar dataKey="usages" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Redemptions" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Discount Distributed Chart */}
            <div className="glass rounded-2xl border border-white/10 p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Icon name="CurrencyRupeeIcon" size={16} className="text-pink-400" />
                Daily Discount Distributed (₹)
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyData.slice(-14)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(15,10,40,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }}
                    formatter={(value) => {
  const safeValue = typeof value === 'number' ? value : 0;
  return [`₹${safeValue.toLocaleString('en-IN')}`, 'Discount'];
}}                 />
                  <Line type="monotone" dataKey="discount" stroke="#ec4899" strokeWidth={2} dot={false} name="Discount" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart - Code Share */}
            <div className="glass rounded-2xl border border-white/10 p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Icon name="ChartPieIcon" size={16} className="text-cyan-400" />
                Redemption Share by Code
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'rgba(15,10,40,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }}
                  />
                  <Legend formatter={(val) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{val}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Redemption Rates Bar */}
            <div className="glass rounded-2xl border border-white/10 p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Icon name="ArrowTrendingUpIcon" size={16} className="text-emerald-400" />
                Redemption Rates by Code
              </h3>
              <div className="space-y-3">
                {PROMO_DATA.sort((a, b) => b.redemptionRate - a.redemptionRate).map((promo, idx) => (
                  <div key={promo.code}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold" style={{ color: PIE_COLORS[idx % PIE_COLORS.length] }}>{promo.code}</span>
                        <span className="text-xs text-white/40">{promo.title}</span>
                      </div>
                      <span className="text-xs font-semibold text-white">{promo.redemptionRate.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${promo.redemptionRate}%`, background: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Code Performance Tab */}
        {activeTab === 'codes' && (
          <div className="space-y-4">
            {/* Sort Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-white/50">Sort by:</span>
              {([
                { key: 'usageCount', label: 'Usage Count' },
                { key: 'totalDiscount', label: 'Discount Given' },
                { key: 'redemptionRate', label: 'Redemption Rate' },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth ${
                    sortBy === opt.key ? 'gradient-primary text-white' : 'glass text-white/50 hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Code Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedCodes.map((promo, idx) => (
                <div key={promo.code} className="glass rounded-2xl border border-white/10 p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: `${PIE_COLORS[idx % PIE_COLORS.length]}20`, color: PIE_COLORS[idx % PIE_COLORS.length] }}>
                          #{idx + 1}
                        </span>
                        <span className="font-mono font-bold text-white text-sm">{promo.code}</span>
                        {promo.isActive && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Active</span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-1">{promo.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">{promo.usageCount.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-white/40">redemptions</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-xs text-white/40">Unique Users</p>
                      <p className="text-sm font-bold text-white mt-0.5">{promo.uniqueUsers.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-xs text-white/40">Total Discount</p>
                      <p className="text-sm font-bold text-pink-400 mt-0.5">₹{promo.totalDiscount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-xs text-white/40">Redemption Rate</p>
                      <p className="text-sm font-bold text-cyan-400 mt-0.5">{promo.redemptionRate.toFixed(1)}%</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-xs text-white/40">Revenue Impact</p>
                      <p className="text-sm font-bold text-emerald-400 mt-0.5">₹{(promo.revenueImpact / 1000).toFixed(1)}K</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-white/40 mb-1">
                      <span>Conversion Rate</span>
                      <span>{promo.conversionRate.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${promo.conversionRate}%`, background: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            {/* Full period line chart */}
            <div className="glass rounded-2xl border border-white/10 p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Icon name="ChartBarIcon" size={16} className="text-purple-400" />
                Redemptions & Orders Over Time
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(dailyData.length / 7)} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(15,10,40,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }}
                  />
                  <Legend formatter={(val) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{val}</span>} />
                  <Line type="monotone" dataKey="usages" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Redemptions" />
                  <Line type="monotone" dataKey="orders" stroke="#06b6d4" strokeWidth={2} dot={false} name="Total Orders" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Most Used Codes Table */}
            <div className="glass rounded-2xl border border-white/10 p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Icon name="StarIcon" size={16} className="text-amber-400" />
                Most-Used Codes Ranking
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-3 text-xs text-white/40 font-medium">Rank</th>
                      <th className="text-left py-2 px-3 text-xs text-white/40 font-medium">Code</th>
                      <th className="text-right py-2 px-3 text-xs text-white/40 font-medium">Uses</th>
                      <th className="text-right py-2 px-3 text-xs text-white/40 font-medium">Discount</th>
                      <th className="text-right py-2 px-3 text-xs text-white/40 font-medium">Rate</th>
                      <th className="text-right py-2 px-3 text-xs text-white/40 font-medium">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...PROMO_DATA].sort((a, b) => b.usageCount - a.usageCount).map((promo, idx) => (
                      <tr key={promo.code} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${PIE_COLORS[idx % PIE_COLORS.length]}20`, color: PIE_COLORS[idx % PIE_COLORS.length] }}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-mono font-bold text-white text-xs">{promo.code}</p>
                          <p className="text-xs text-white/40">{promo.title}</p>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="text-white font-semibold">{promo.usageCount.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="text-pink-400 font-semibold">₹{promo.totalDiscount.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="text-cyan-400">{promo.redemptionRate.toFixed(1)}%</span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="text-emerald-400">{((promo.revenueImpact / promo.totalDiscount) || 0).toFixed(1)}x</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
