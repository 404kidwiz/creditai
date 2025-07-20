/**
 * PII Masking Middleware
 * Automatically masks PII in API requests and responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { maskPIIWithAudit, maskObjectWithAudit } from './piiAuditIntegration';
import { getSessionUser } from '../auth/sessionUtils';

/**
 * Configuration options for PII masking middleware
 */
export interface PiiMaskingOptions {
  maskRequestBody?: boolean;
  maskResponseBody?: boolean;
  maskUrlParams?: boolean;
  maskHeaders?: string[];
  excludePaths?: string[];
  contextProvider?: (req: NextRequest) => string;
}

/**
 * Default options for PII masking
 */
const defaultOptions: PiiMaskingOptions = {
  maskRequestBody: true,
  maskResponseBody: true,
  maskUrlParams: false,
  maskHeaders: ['authorization', 'cookie'],
  excludePaths: ['/api/system/', '/api/health/'],
  contextProvider: (req) => `${req.method} ${req.nextUrl.pathname}`,
};

/**
 * Create PII masking middleware
 */
export function createPiiMaskingMiddleware(options: PiiMaskingOptions = {}) {
  const config = { ...defaultOptions, ...options };

  return async function piiMaskingMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Skip excluded paths
    if (config.excludePaths?.some(path => req.nextUrl.pathname.includes(path))) {
      return handler(req);
    }

    // Get user context for audit logging
    const user = await getSessionUser(req);
    const userId = user?.id;
    const sessionId = req.cookies.get('sessionId')?.value;
    const ipAddress = req.headers.get('x-forwarded-for') || req.ip;
    const userAgent = req.headers.get('user-agent');
    const context = config.contextProvider ? config.contextProvider(req) : undefined;

    // Create a clone of the request to modify
    const modifiedReq = req.clone();

    // Mask request body if needed
    if (config.maskRequestBody && req.body) {
      try {
        const body = await req.json();
        const maskedBody = await maskObjectWithAudit(body, userId, context, {
          ipAddress,
          userAgent,
          sessionId,
        });
        
        // Create a new request with the masked body
        const newReq = new NextRequest(req.url, {
          method: req.method,
          headers: req.headers,
          body: JSON.stringify(maskedBody),
        });
        
        // Process the modified request
        const response = await handler(newReq);
        
        // Mask response body if needed
        if (config.maskResponseBody && response.body) {
          const responseBody = await response.json();
          const maskedResponseBody = await maskObjectWithAudit(responseBody, userId, context, {
            ipAddress,
            userAgent,
            sessionId,
          });
          
          // Create a new response with the masked body
          return NextResponse.json(maskedResponseBody, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }
        
        return response;
      } catch (error) {
        // If there's an error processing the body, continue with the original request
        console.error('Error in PII masking middleware:', error);
      }
    }

    // If we couldn't modify the request, just process it normally
    const response = await handler(req);

    // Mask response body if needed
    if (config.maskResponseBody && response.body) {
      try {
        const responseBody = await response.json();
        const maskedResponseBody = await maskObjectWithAudit(responseBody, userId, context, {
          ipAddress,
          userAgent,
          sessionId,
        });
        
        // Create a new response with the masked body
        return NextResponse.json(maskedResponseBody, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch (error) {
        // If there's an error processing the response, return the original response
        console.error('Error masking response in PII middleware:', error);
      }
    }

    return response;
  };
}

/**
 * Helper function to create a middleware that only masks responses
 */
export function createResponsePiiMaskingMiddleware() {
  return createPiiMaskingMiddleware({
    maskRequestBody: false,
    maskResponseBody: true,
  });
}

/**
 * Helper function to create a middleware that only masks requests
 */
export function createRequestPiiMaskingMiddleware() {
  return createPiiMaskingMiddleware({
    maskRequestBody: true,
    maskResponseBody: false,
  });
}