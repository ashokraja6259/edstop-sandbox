// FILE: src/middleware.ts

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

  const protectedRoutes = [
    '/dashboard',
    '/student-dashboard',
    '/food',
    '/store',
    '/wallet',
    '/ai',
    '/rider',
    '/rider-dashboard',
    '/admin',
    '/admin-promo-code-management',
    '/promotions-analytics-dashboard',
    '/promo-code-templates-management',
    '/template-review-queue',
    '/vendor',
    '/order-history',
  ];

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // If not logged in → redirect to login
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If logged in and visiting login → redirect
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/student-dashboard', request.url));
  }

  const requiredRole = getRequiredRole(pathname);

  if (user && requiredRole) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const userRole = profile?.role || 'student';

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
    '/store/:path*',
    '/wallet/:path*',
    '/ai/:path*',
    '/rider/:path*',
    '/rider-dashboard/:path*',
    '/admin/:path*',
    '/admin-promo-code-management/:path*',
    '/promotions-analytics-dashboard/:path*',
    '/promo-code-templates-management/:path*',
    '/template-review-queue/:path*',
    '/vendor/:path*',
    '/order-history/:path*',
  ],
};
