// FILE: src/middleware.ts

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Only check if session exists
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const protectedRoutes = [
    '/dashboard',
    '/food',
    '/store',
    '/wallet',
    '/ai',
    '/rider',
    '/admin',
    '/vendor',
  ]

  const isProtected = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  // If not logged in → redirect to login
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If logged in and visiting login → redirect
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/food/:path*',
    '/store/:path*',
    '/wallet/:path*',
    '/ai/:path*',
    '/rider/:path*',
    '/admin/:path*',
    '/vendor/:path*',
  ],
}