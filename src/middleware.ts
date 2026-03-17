// FILE: src/middleware.ts

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

function getRequiredRole(pathname: string) {
  if (adminRoutePrefixes.some((route) => pathname.startsWith(route))) {
    return 'admin' as const;
  }

  if (riderRoutePrefixes.some((route) => pathname.startsWith(route))) {
    return 'rider' as const;
  }

  if (vendorRoutePrefixes.some((route) => pathname.startsWith(route))) {
    return 'vendor' as const;
  }

  if (studentRoutePrefixes.some((route) => pathname.startsWith(route))) {
    return 'student' as const;
  }

  return null;
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

  // Authenticated users should not stay on login page.
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/student-dashboard', request.url));
  }

  // Unauthenticated users cannot access protected routes.
  if (!user && requiredRole) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Enforce role-based route access.
  if (user && requiredRole) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const userRole = (profile?.role || 'student') as 'student' | 'admin' | 'rider' | 'vendor';

    if (userRole !== requiredRole) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
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
    '/login',
    '/login/:path*',
    '/rider/:path*',
    '/rider-dashboard/:path*',
    '/admin/:path*',
    '/admin-promo-code-management/:path*',
    '/promotions-analytics-dashboard/:path*',
    '/promo-code-templates-management/:path*',
    '/template-review-queue/:path*',
    '/vendor/:path*',
  ],
};
