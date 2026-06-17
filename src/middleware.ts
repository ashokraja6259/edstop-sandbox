// FILE: src/middleware.ts

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type AppRole = 'student' | 'admin' | 'rider' | 'vendor';

const studentRoutePrefixes = [
  '/dashboard',
  '/student-dashboard',
  '/food',
  '/food-ordering-interface',
  '/store',
  '/dark-store-shopping',
  '/wallet',
  '/ai',
  '/ai-companion-interface',
  '/order-history',
  '/orders',
  '/student-profile',
  '/promotions',
  '/lost-found',
  '/marketplace',
];

const adminRoutePrefixes = [
  '/admin',
  '/admin-promo-code-management',
  '/promotions-analytics-dashboard',
  '/promo-code-templates-management',
  '/template-review-queue',
];

const riderRoutePrefixes = ['/rider', '/rider-dashboard'];
const vendorRoutePrefixes = ['/vendor'];

function getRequiredRole(pathname: string): AppRole | null {
  if (adminRoutePrefixes.some((route) => pathname.startsWith(route))) {
    return 'admin';
  }

  if (riderRoutePrefixes.some((route) => pathname.startsWith(route))) {
    return 'rider';
  }

  if (vendorRoutePrefixes.some((route) => pathname.startsWith(route))) {
    return 'vendor';
  }

  if (studentRoutePrefixes.some((route) => pathname.startsWith(route))) {
    return 'student';
  }

  return null;
}

function getHomeRouteForRole(role: AppRole) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'rider') return '/rider-dashboard';
  if (role === 'vendor') return '/vendor/dashboard';

  return '/student-dashboard';
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const requiredRole = getRequiredRole(pathname);

  let userRole: AppRole = 'student';

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    userRole = (profile?.role || 'student') as AppRole;
  }

  // Authenticated users should not stay on login page.
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL(getHomeRouteForRole(userRole), request.url));
  }

  // Unauthenticated users cannot access protected routes.
  if (!user && requiredRole) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Enforce role-based route access.
  if (user && requiredRole && userRole !== requiredRole) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/student-dashboard/:path*',
    '/food/:path*',
    '/food-ordering-interface/:path*',
    '/store/:path*',
    '/dark-store-shopping/:path*',
    '/wallet/:path*',
    '/ai/:path*',
    '/ai-companion-interface/:path*',
    '/order-history/:path*',
    '/orders/:path*',
    '/student-profile/:path*',
    '/promotions/:path*',
    '/lost-found/:path*',
    '/login',
    '/login/:path*',
    '/rider/:path*',
    '/rider-dashboard/:path*',
    '/admin/:path*',
    '/admin-promo-code-management/:path*',
    '/promotions-analytics-dashboard/:path*',
    '/promo-code-templates-management/:path*',
    '/template-review-queue/:path*',
    '/marketplace/:path*',
    '/vendor/:path*',
  ],
};