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

  // 🔐 Get session (recommended in middleware)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user ?? null
  const pathname = request.nextUrl.pathname

  // 🔒 Define protected route prefixes
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

  // 🚫 If not logged in and accessing protected route
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  let role: string | null = null

  // 🔍 Fetch role only if logged in
  if (user) {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!error) {
      role = profile?.role ?? null
    }
  }

  // 🛑 Admin route protection
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 🛑 Vendor route protection
  if (pathname.startsWith('/vendor')) {
    if (role !== 'vendor') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 🛑 Rider route protection (if applicable)
  if (pathname.startsWith('/rider')) {
    if (role !== 'rider') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 🔄 Prevent logged-in users from accessing login page
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/student-dashboard', request.url))
  }

  return response
}

// 🎯 Only run middleware on protected routes
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