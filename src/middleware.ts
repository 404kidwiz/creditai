import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createRateLimiter, getUserTierFromRequest } from './lib/security/rateLimiter'
import { createPiiMaskingMiddleware } from './lib/security/piiMaskingMiddleware'
import { auditLogger, AuditEventType, RiskLevel } from './lib/security/auditLogger'

// Configure paths that should be protected by security middleware
const PROTECTED_API_PATHS = [
  '/api/process-pdf',
  '/api/analysis',
  '/api/validation',
  '/api/confidence',
  '/api/recommendations',
  '/api/analytics',
]

// Configure paths that should be excluded from security middleware
const EXCLUDED_PATHS = [
  '/api/health',
  '/api/system/status',
  '/_next',
  '/favicon.ico',
  '/static',
]

// Create rate limiter middleware
const rateLimiter = createRateLimiter({
  getUserTier: getUserTierFromRequest,
  includeHeaders: true,
  excludePaths: EXCLUDED_PATHS,
})

// Create PII masking middleware
const piiMasker = createPiiMaskingMiddleware({
  excludePaths: EXCLUDED_PATHS,
})

// Middleware function
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Skip excluded paths
  if (EXCLUDED_PATHS.some(excludePath => path.startsWith(excludePath))) {
    return NextResponse.next()
  }

  // Only apply to API routes
  if (!path.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Apply security middleware to protected API paths
  if (PROTECTED_API_PATHS.some(protectedPath => path.startsWith(protectedPath))) {
    try {
      // Apply rate limiting
      const rateLimitResult = await applyRateLimiting(request)
      if (rateLimitResult.status === 429) {
        return rateLimitResult
      }

      // Apply PII masking for responses
      // Note: This is handled in the API routes themselves for more granular control
      
      // Continue with the request
      return NextResponse.next()
    } catch (error) {
      console.error('Security middleware error:', error)
      
      // Log the error
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        {
          ipAddress: request.ip,
          userAgent: request.headers.get('user-agent') || undefined,
        },
        {
          component: 'security-middleware',
          path,
          method: request.method,
          error: error instanceof Error ? error.message : String(error),
        },
        RiskLevel.HIGH
      )
      
      // Return error response
      return NextResponse.json(
        {
          error: 'Security middleware error',
          message: 'An error occurred while processing your request',
        },
        {
          status: 500,
        }
      )
    }
  }

  // For non-protected API paths, just continue
  return NextResponse.next()
}

// Helper function to apply rate limiting
async function applyRateLimiting(request: NextRequest): Promise<NextResponse> {
  return new Promise((resolve) => {
    rateLimiter(request, async () => {
      resolve(NextResponse.next())
      return NextResponse.next()
    }).then(response => {
      if (response.status === 429) {
        resolve(response)
      }
    }).catch(error => {
      console.error('Rate limiting error:', error)
      resolve(
        NextResponse.json(
          {
            error: 'Rate limiting error',
            message: 'An error occurred while processing your request',
          },
          {
            status: 500,
          }
        )
      )
    })
  })
}

// Configure middleware to match specific paths
export const config = {
  matcher: [
    '/api/:path*',
  ],
}