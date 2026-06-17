// FILE: src/app/admin/dashboard/DashboardUI.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Metrics = {
  totalOrders: number;
  todayOrders: number;
  revenue: number;
  todayRevenue: number;
  averageOrderValue: number;
  deliveredOrders: number;
  readyOrders: number;
  outForDeliveryOrders: number;
  cancelledOrders: number;
  restaurants: number;
  openRestaurants: number;
  activeRestaurants: number;
  openTickets: number;
  activeMarketplace: number;
  activeLostFound: number;
};

type OrderStatusCount = {
  status: string;
  count: number;
};

type TopRestaurant = {
  name: string;
  orders: number;
  revenue: number;
};

type RecentOrder = {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  final_amount: number | null;
  total_amount: number | null;
  payment_method: string | null;
  restaurant_name: string | null;
  created_at: string | null;
};

type DashboardUIProps = {
  range: number;
  metrics: Metrics;
  orderStatusCounts: OrderStatusCount[];
  topRestaurants: TopRestaurant[];
  recentOrders: RecentOrder[];
};

const money = (value: number) => `₹${Number(value || 0).toFixed(2)}`;

export default function DashboardUI({
  range,
  metrics,
  orderStatusCounts,
  topRestaurants,
  recentOrders,
}: DashboardUIProps) {
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      window.location.reload();
    }, 20000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <main className="min-h-screen bg-background text-white px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-white/50">Admin</p>
            <h1 className="text-3xl font-bold">EdStop Command Center</h1>
            <p className="mt-2 text-sm text-white/60">
              Live launch operations overview for orders, restaurants, support,
              marketplace, and lost & found.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/operations"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
            >
              Operations
            </Link>

            <Link
              href="/admin/support"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
            >
              Support
            </Link>

            <button
              type="button"
              onClick={() => setAutoRefresh((value) => !value)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
            >
              {autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
            </button>
          </div>
        </header>

        <section className="flex flex-wrap gap-2">
          {[7, 30, 90].map((days) => (
            <Link
              key={days}
              href={`/admin/dashboard?range=${days}`}
              className={`rounded-xl border px-4 py-2 text-sm ${
                range === days
                  ? 'border-purple-400 bg-purple-500/20 text-purple-100'
                  : 'border-white/10 hover:bg-white/10'
              }`}
            >
              {days} days
            </Link>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Stat title="Today Orders" value={metrics.todayOrders} />
          <Stat title="Today Revenue" value={money(metrics.todayRevenue)} />
          <Stat title="Total Orders" value={metrics.totalOrders} />
          <Stat title="Range Revenue" value={money(metrics.revenue)} />
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Stat title="Ready Orders" value={metrics.readyOrders} />
          <Stat title="Out For Delivery" value={metrics.outForDeliveryOrders} />
          <Stat title="Delivered" value={metrics.deliveredOrders} />
          <Stat title="Avg Order Value" value={money(metrics.averageOrderValue)} />
        </section>

        <section className="grid gap-4 md:grid-cols-5">
          <Stat title="Restaurants" value={metrics.restaurants} />
          <Stat title="Open Outlets" value={metrics.openRestaurants} />
          <Stat title="Active Outlets" value={metrics.activeRestaurants} />
          <Stat title="Open Tickets" value={metrics.openTickets} />
          <Stat title="Cancelled" value={metrics.cancelledOrders} />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Panel title="Order Pipeline">
            <div className="space-y-3">
              {orderStatusCounts.map((row) => (
                <div
                  key={row.status}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                >
                  <span className="text-sm capitalize text-white/70">
                    {row.status.replaceAll('_', ' ')}
                  </span>
                  <span className="text-xl font-bold">{row.count}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Community Modules">
            <div className="space-y-3">
              <ModuleLink
                title="Marketplace Active"
                value={metrics.activeMarketplace}
                href="/admin/marketplace"
              />
              <ModuleLink
                title="Lost & Found Active"
                value={metrics.activeLostFound}
                href="/admin/lost-found"
              />
              <ModuleLink
                title="Support Queue"
                value={metrics.openTickets}
                href="/admin/support"
              />
            </div>
          </Panel>

          <Panel title="Launch Actions">
            <div className="grid gap-3">
              <ActionLink href="/admin/operations" label="Open Operations Center" />
              <ActionLink href="/vendor/dashboard" label="Preview Vendor Dashboard" />
              <ActionLink href="/vendor/orders" label="Preview Vendor Orders" />
              <ActionLink href="/rider-dashboard" label="Open Rider Dashboard" />
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel title="Top Restaurants">
            <div className="space-y-3">
              {topRestaurants.map((restaurant) => (
                <div
                  key={restaurant.name}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{restaurant.name}</h3>
                      <p className="text-xs text-white/40">
                        {restaurant.orders} orders
                      </p>
                    </div>
                    <p className="font-bold">{money(restaurant.revenue)}</p>
                  </div>
                </div>
              ))}

              {topRestaurants.length === 0 && <Empty text="No restaurant order data yet." />}
            </div>
          </Panel>

          <Panel title="Recent Orders">
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">#{order.order_number}</h3>
                      <p className="text-sm text-white/50">
                        {order.restaurant_name || order.order_type || 'Order'}
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleString('en-IN')
                          : 'Date unavailable'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold">
                        {money(Number(order.final_amount || order.total_amount || 0))}
                      </p>
                      <p className="mt-1 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                        {order.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {recentOrders.length === 0 && <Empty text="No recent orders found." />}
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-white/50">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function ModuleLink({
  title,
  value,
  href,
}: {
  title: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 hover:bg-white/10"
    >
      <span className="text-sm text-white/70">{title}</span>
      <span className="text-xl font-bold">{value}</span>
    </Link>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm hover:bg-white/10"
    >
      {label}
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/50">
      {text}
    </div>
  );
}