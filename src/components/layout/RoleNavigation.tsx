// FILE: src/components/layout/RoleNavigation.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type NavRole = 'student' | 'admin' | 'vendor' | 'rider';

type NavItem = {
  label: string;
  href: string;
  emoji: string;
  roles: NavRole[];
};

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/reset-password',
  '/privacy',
  '/terms',
  '/account-deletion',
  '/unauthorized',
  '/403-unauthorized-error-page',
  '/404-not-found-error-page',
];

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/student-dashboard',
    emoji: '🏠',
    roles: ['student'],
  },
  {
    label: 'Food',
    href: '/food-ordering-interface',
    emoji: '🍔',
    roles: ['student'],
  },
  {
    label: 'Store',
    href: '/dark-store-shopping',
    emoji: '🛒',
    roles: ['student'],
  },
  {
    label: 'Orders',
    href: '/order-history',
    emoji: '📦',
    roles: ['student'],
  },
  {
    label: 'Wallet',
    href: '/wallet',
    emoji: '💰',
    roles: ['student'],
  },
  {
    label: 'Marketplace',
    href: '/marketplace',
    emoji: '🏪',
    roles: ['student'],
  },
  {
    label: 'Lost & Found',
    href: '/lost-found',
    emoji: '🔍',
    roles: ['student'],
  },
  {
    label: 'Support',
    href: '/help',
    emoji: '🎫',
    roles: ['student'],
  },
  {
    label: 'Notifications',
    href: '/notifications',
    emoji: '🔔',
    roles: ['student', 'admin', 'vendor', 'rider'],
  },
  {
    label: 'Profile',
    href: '/student-profile',
    emoji: '👤',
    roles: ['student'],
  },

  {
    label: 'Admin Dashboard',
    href: '/admin/dashboard',
    emoji: '📊',
    roles: ['admin'],
  },
  {
    label: 'Operations',
    href: '/admin/operations',
    emoji: '🛠️',
    roles: ['admin'],
  },
  {
    label: 'Vendors',
    href: '/admin/vendors',
    emoji: '🏪',
    roles: ['admin'],
  },
  {
    label: 'Riders',
    href: '/admin/riders',
    emoji: '🚴',
    roles: ['admin'],
  },
  {
    label: 'Support',
    href: '/admin/support',
    emoji: '🎫',
    roles: ['admin'],
  },
  {
    label: 'Marketplace',
    href: '/admin/marketplace',
    emoji: '🏪',
    roles: ['admin'],
  },
  {
    label: 'Lost & Found',
    href: '/admin/lost-found',
    emoji: '🔍',
    roles: ['admin'],
  },
  {
    label: 'Settlements',
    href: '/admin/restaurant-settlements',
    emoji: '💵',
    roles: ['admin'],
  },

  {
    label: 'Vendor Dashboard',
    href: '/vendor/dashboard',
    emoji: '📊',
    roles: ['vendor'],
  },
  {
    label: 'Vendor Orders',
    href: '/vendor/orders',
    emoji: '📋',
    roles: ['vendor'],
  },
  {
    label: 'Vendor Menu',
    href: '/vendor/menu',
    emoji: '🍽️',
    roles: ['vendor'],
  },

  {
    label: 'Rider Dashboard',
    href: '/rider-dashboard',
    emoji: '🚴',
    roles: ['rider'],
  },
];

function normalizeRole(role: string | null): NavRole {
  if (role === 'admin') return 'admin';
  if (role === 'vendor') return 'vendor';
  if (role === 'rider') return 'rider';

  return 'student';
}

export default function RoleNavigation() {
  const pathname = usePathname();
  const { user, userRole, loading, profileLoading } = useAuth();
  const [open, setOpen] = useState(false);

  const role = normalizeRole(userRole);

  const shouldHide = useMemo(() => {
    if (!pathname) return true;
    if (loading || profileLoading) return true;
    if (!user) return true;
    if (PUBLIC_PATHS.includes(pathname)) return true;
    if (pathname.startsWith('/auth/')) return true;

    return false;
  }, [loading, pathname, profileLoading, user]);

  const items = useMemo(
    () => NAV_ITEMS.filter((item) => item.roles.includes(role)),
    [role]
  );

  if (shouldHide || items.length === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/80 text-2xl text-white shadow-2xl backdrop-blur-xl hover:bg-black"
        aria-label="Open navigation"
      >
        ☰
      </button>

      {open && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed bottom-24 right-5 z-[91] w-[min(92vw,360px)] overflow-hidden rounded-3xl border border-white/10 bg-[#09090f]/95 text-white shadow-2xl backdrop-blur-xl transition-all duration-200 ${
          open
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <div className="border-b border-white/10 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-white/40">
            EdStop Navigation
          </p>
          <h2 className="mt-1 text-xl font-bold capitalize">{role} Menu</h2>
        </div>

        <nav className="max-h-[65vh] overflow-y-auto p-3">
          <div className="grid gap-2">
            {items.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);

              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                    isActive
                      ? 'border-purple-400/50 bg-purple-500/20 text-purple-100'
                      : 'border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}