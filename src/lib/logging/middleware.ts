/**
 * Logging middleware for Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from './logger'
import { v4 as uuidv4 } from 'uuid'
import { Sentry } from './logger'

/**
 * Middleware to add request logging and performance tracking
 */
export function withLogging(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = uuidv4()
    const startTime = performance.now()
    
    // Extract user ID from auth if available
    let userId: string | undefined
    try {
      const authHeader = req.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // In a real app, you would decode the JWT or validate the token
        // This is a simplified example
        userId = 'authenticated-user'
      }
    } catch (error) {
      // Ignore auth errors in logging middleware
    }
    
    // Create request-specific logger
    const logger = createLogger('api', userId, requestId)
    
    // Start Sentry transaction if available
    const transaction = process.env.SENTRY_DSN 
      ? Sentry.startTransaction({
          op: 'http.server',
          name: `${req.method} ${req.nextUrl.pathname}`,
          tags: { userId }
        })
      : null
      
    try {
      // Log request start
      logger.info(`API Request: ${req.method} ${req.nextUrl.pathname}`, {
        method: req.method,
        url: req.nextUrl.toString(),
        userAgent: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        contentType: req.headers.get('content-type')
      })
      
      // Call the original handler
      const response = await handler(req)
      
      // Calculate duration
      const duration = performance.now() - startTime
      
      // Add timing header
      response.headers.set('Server-Timing', `total;dur=${Math.floor(duration)}`)
      
      // Log response
      logger.info(`API Response: ${req.method} ${req.nextUrl.pathname}`, {
        method: req.method,
        url: req.nextUrl.toString(),
        status: response.status,
        duration: Math.floor(duration),
        contentType: response.headers.get('content-type')
      })
      
      // Finish Sentry transaction if available
      if (transaction) {
        transaction.setHttpStatus(response.status)
        transaction.finish()
      }
      
      return response
    } catch (error) {
      // Calculate duration
      const duration = performance.now() - startTime
      
      // Log error
      logger.error(error instanceof Error ? error : new Error(String(error)), {
        method: req.method,
        url: req.nextUrl.toString(),
        duration: Math.floor(duration)
      })
      
      // Finish Sentry transaction with error if available
      if (transaction) {
        transaction.setHttpStatus(500)
        transaction.finish()
      }
      
      // Return error response
      return NextResponse.json(
        { 
          error: 'Internal Server Error',
          requestId
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Higher-order function to wrap API handlers with logging and error handling
 */
export function createApiHandler(handler: (req: NextRequest, logger: any) => Promise<NextResponse>) {
  return withLogging(async (req: NextRequest) => {
    const requestId = req.headers.get('x-request-id') || uuidv4()
    
    // Extract user ID from auth if available
    let userId: string | undefined
    try {
      const authHeader = req.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // In a real app, you would decode the JWT or validate the token
        userId = 'authenticated-user'
      }
    } catch (error) {
      // Ignore auth errors
    }
    
    // Create request-specific logger
    const logger = createLogger('api', userId, requestId)
    
    // Call handler with logger
    return await handler(req, logger)
  })
}