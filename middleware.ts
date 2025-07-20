import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { PROTECTED_ROUTES, PUBLIC_ROUTES, AUTH_ROUTES } from '@/types/auth'
import { createAPIProtection } from '@/lib/security/apiProtection'
import { auditLogger, AuditEventType, RiskLevel } from '@/lib/security/auditLogger'
import crypto from 'crypto'

// Initialize API Protection Middleware
const apiProtection = createAPIProtection({
  // Enhanced security for production
  requireHttps: process.env.NODE_ENV === 'production',
  enableRateLimiting: true,
  enableDDoSProtection: true,
  suspiciousPatternDetection: true,
  fileUploadProtection: true,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.txt'],
  allowedOrigins: [
    'http://localhost:3000',
    'https://creditai.com',
    'https://*.creditai.com'
  ],
  corsEnabled: true,
  securityHeaders: true
})

// Session management utilities
const sessionManager = {
  validateSession: async (session: any) => {
    if (!session) return { isValid: false, shouldRefresh: false }
    
    const now = Date.now()
    const sessionTime = new Date(session.expires_at || 0).getTime()
    const timeUntilExpiry = sessionTime - now
    
    // Session expired
    if (timeUntilExpiry <= 0) {
      return { isValid: false, shouldRefresh: false }
    }
    
    // Session expires within 15 minutes, should refresh
    if (timeUntilExpiry <= 15 * 60 * 1000) {
      return { isValid: true, shouldRefresh: true }
    }
    
    return { isValid: true, shouldRefresh: false }
  },
  
  createSession: async (userId: string) => {
    auditLogger.logEvent(
      AuditEventType.SESSION_CREATED,
      { userId },
      { timestamp: new Date().toISOString() },
      RiskLevel.LOW
    )
    return { success: true }
  }
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  
  // Apply API Protection Middleware first
  const protectionResponse = await apiProtection.protect(req)
  if (protectionResponse) {
    return protectionResponse
  }
  
  // Initialize response
  const res = NextResponse.next()
  
  // Add request ID for tracking
  res.headers.set('X-Request-ID', crypto.randomUUID())
  
  // Enhanced audit logging for sensitive routes
  if (pathname.startsWith('/api/') || pathname.startsWith('/dashboard') || pathname.startsWith('/upload')) {
    auditLogger.logEvent(
      AuditEventType.API_ACCESS,
      {
        ipAddress: req.ip || req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || undefined
      },
      {
        path: pathname,
        method: req.method,
        timestamp: new Date().toISOString()
      },
      RiskLevel.LOW
    )
  }

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

  // Session management and validation
  if (session) {
    const sessionValidation = await sessionManager.validateSession(session)

    if (!sessionValidation.isValid) {
      // Session is invalid, force logout
      auditLogger.logEvent(
        AuditEventType.SESSION_TIMEOUT,
        {
          userId: session.user.id,
          ipAddress: req.ip || req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || undefined
        },
        {
          sessionId: session.access_token,
          reason: 'session_invalid'
        },
        RiskLevel.MEDIUM
      )

      // Clear the session and redirect to login
      const response = NextResponse.redirect(new URL(AUTH_ROUTES.SIGN_IN, req.url))
      response.cookies.delete('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token')
      return response
    }

    // If session needs refresh (approaching timeout), add header
    if (sessionValidation.shouldRefresh) {
      res.headers.set('X-Session-Refresh-Needed', 'true')
    }
  }

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
        auditLogger.logEvent(
          AuditEventType.FAILED_LOGIN,
          {
            ipAddress: req.ip || req.headers.get('x-forwarded-for') || 'unknown',
            userAgent: req.headers.get('user-agent') || undefined
          },
          {
            reason: 'auth_callback_error',
            error: error.message
          },
          RiskLevel.HIGH
        )
        return NextResponse.redirect(new URL(AUTH_ROUTES.SIGN_IN, req.url))
      }

      // Check if user has profile
      if (data.user && data.session) {
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

        // Create session in session manager
        await sessionManager.createSession(data.user.id)
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

  // Process response with API protection (adds security headers, etc.)
  return apiProtection.processResponse(req, res)
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