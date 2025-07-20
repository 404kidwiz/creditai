/**
 * Comprehensive Security Middleware
 * Combines rate limiting, PII masking, and input validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter, getUserTierFromRequest } from './rateLimiter';
import { createPiiMaskingMiddleware } from './piiMaskingMiddleware';
import { auditLogger, AuditEventType, RiskLevel } from './auditLogger';
import { sanitizeErrorMessage } from './piiAuditIntegration';

/**
 * Security middleware options
 */
export interface SecurityMiddlewareOptions {
  // Enable/disable rate limiting
  enableRateLimiting?: boolean;
  // Enable/disable PII masking
  enablePiiMasking?: boolean;
  // Enable/disable input validation
  enableInputValidation?: boolean;
  // Paths to exclude from security middleware
  excludePaths?: string[];
}

/**
 * Create comprehensive security middleware
 */
export function createSecurityMiddleware(options: SecurityMiddlewareOptions = {}) {
  const {
    enableRateLimiting = true,
    enablePiiMasking = true,
    enableInputValidation = true,
    excludePaths = ['/api/health', '/api/system/status'],
  } = options;

  // Create individual middleware components
  const rateLimiter = enableRateLimiting
    ? createRateLimiter({
        getUserTier: getUserTierFromRequest,
        excludePaths,
      })
    : null;

  const piiMasker = enablePiiMasking
    ? createPiiMaskingMiddleware({
        excludePaths,
      })
    : null;

  return async function securityMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Skip excluded paths
    const path = req.nextUrl.pathname;
    if (excludePaths.some(excludePath => path.startsWith(excludePath))) {
      return handler(req);
    }

    try {
      // Apply rate limiting
      if (rateLimiter) {
        const rateLimitedHandler = async (req: NextRequest) => {
          // Apply PII masking
          if (piiMasker) {
            return piiMasker(req, handler);
          }
          return handler(req);
        };

        return rateLimiter(req, rateLimitedHandler);
      }

      // Apply PII masking
      if (piiMasker) {
        return piiMasker(req, handler);
      }

      // If no middleware is enabled, just call the handler
      return handler(req);
    } catch (error) {
      // Log security middleware error
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        {
          ipAddress: req.ip,
          userAgent: req.headers.get('user-agent') || undefined,
        },
        {
          component: 'security-middleware',
          path,
          method: req.method,
          error: sanitizeErrorMessage(String(error)),
        },
        RiskLevel.HIGH
      );

      // Return error response
      return NextResponse.json(
        {
          error: 'Security middleware error',
          message: 'An error occurred while processing your request',
        },
        {
          status: 500,
        }
      );
    }
  };
}

/**
 * Apply security middleware to a Next.js API route handler
 */
export function withSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: SecurityMiddlewareOptions = {}
) {
  const securityMiddleware = createSecurityMiddleware(options);
  
  return (req: NextRequest) => securityMiddleware(req, handler);
}