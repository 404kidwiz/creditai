import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { PROTECTED_ROUTES, PUBLIC_ROUTES, AUTH_ROUTES } from '@/types/auth'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          res.cookies.set(name, value, options)
        },
        remove(name: string, options: any) {
          res.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )

  // Get the current session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if the current path is protected
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => 
    pathname.startsWith(route)
  )

  // Check if the current path is public
  const isPublicRoute = PUBLIC_ROUTES.some((route) => 
    pathname === route || pathname.startsWith(route)
  )

  // Check if the current path is an auth route
  const isAuthRoute = pathname.startsWith('/login') || 
                      pathname.startsWith('/signup') || 
                      pathname.startsWith('/reset-password') ||
                      pathname.startsWith('/auth/')

  // If user is not authenticated and trying to access protected route
  if (!session && isProtectedRoute) {
    const redirectUrl = new URL(AUTH_ROUTES.SIGN_IN, req.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and trying to access auth routes, redirect to dashboard
  if (session && isAuthRoute && !pathname.startsWith('/auth/callback')) {
    return NextResponse.redirect(new URL(AUTH_ROUTES.DASHBOARD, req.url))
  }

  // Handle auth callbacks
  if (pathname.startsWith('/auth/callback')) {
    const code = req.nextUrl.searchParams.get('code')
    
    if (code) {
      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(new URL(AUTH_ROUTES.SIGN_IN, req.url))
      }

      // Check if user has profile
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        // Create profile if it doesn't exist
        if (profileError && profileError.code === 'PGRST116') {
          await supabase.from('profiles').insert({
            id: data.user.id,
            full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || '',
            phone: data.user.user_metadata?.phone || null,
            subscription_tier: 'free',
            subscription_status: 'active',
          })
        }
      }

      // Redirect to dashboard or specified redirect URL
      const redirectTo = req.nextUrl.searchParams.get('redirectTo')
      const redirectUrl = redirectTo || AUTH_ROUTES.DASHBOARD
      return NextResponse.redirect(new URL(redirectUrl, req.url))
    }
  }

  // Handle password recovery
  if (pathname.startsWith('/reset-password')) {
    const type = req.nextUrl.searchParams.get('type')
    
    if (type === 'recovery') {
      // User is coming from password reset email
      // Allow access to reset password page
      return res
    }
  }

  // Handle email verification
  if (pathname.startsWith('/verify-email')) {
    const type = req.nextUrl.searchParams.get('type')
    
    if (type === 'signup') {
      // User is coming from signup verification email
      // Allow access to verification page
      return res
    }
  }

  // Check subscription tier for premium routes
  if (session && isProtectedRoute) {
    const premiumRoutes = ['/reports/premium', '/disputes/premium', '/dashboard/premium']
    const isPremiumRoute = premiumRoutes.some(route => pathname.startsWith(route))
    
    if (isPremiumRoute) {
      // Get user profile to check subscription tier
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', session.user.id)
        .single()

      if (profile?.subscription_tier !== 'premium') {
        return NextResponse.redirect(new URL('/dashboard/upgrade', req.url))
      }
    }
  }

  // Allow access to public routes
  if (isPublicRoute) {
    return res
  }

  // For all other routes, proceed normally
  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 