/**
 * Application Performance Monitoring (APM) with Sentry
 * Provides request tracing, performance monitoring, and error tracking
 */

import * as Sentry from '@sentry/node'
import { ProfilingIntegration } from '@sentry/profiling-node'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '../logging'

// Initialize logger
const logger = createLogger('monitoring:apm')

/**
 * Initialize Sentry APM
 */
export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    logger.warn('Sentry DSN not provided, APM monitoring disabled')
    return
  }

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      profilesSampleRate: 0.1,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express(),
        new Sentry.Integrations.Postgres(),
        new ProfilingIntegration()
      ],
      beforeSend(event) {
        // Sanitize sensitive data before sending to Sentry
        if (event.request && event.request.headers) {
          // Remove authorization header
          delete event.request.headers.Authorization
          delete event.request.headers.authorization
        }

        // Remove sensitive data from request body
        if (event.request && event.request.data) {
          const sensitiveFields = ['password', 'token', 'ssn', 'socialSecurityNumber', 'accountNumber']
          for (const field of sensitiveFields) {
            if (event.request.data[field]) {
              event.request.data[field] = '[REDACTED]'
            }
          }
        }

        return event
      }
    })

    logger.info('Sentry APM initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize Sentry APM', error as Error)
  }
}

/**
 * Middleware to add Sentry request monitoring
 */
export function withSentryMonitoring(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Skip monitoring if Sentry is not initialized
    if (!process.env.SENTRY_DSN) {
      return handler(req)
    }

    const transaction = Sentry.startTransaction({
      op: 'http.server',
      name: `${req.method} ${req.nextUrl.pathname}`
    })

    // Set transaction as current
    Sentry.getCurrentHub().configureScope(scope => {
      scope.setSpan(transaction)
    })

    try {
      // Add request data to transaction
      transaction.setData('url', req.url)
      transaction.setData('method', req.method)
      transaction.setData('headers', {
        'user-agent': req.headers.get('user-agent'),
        'content-type': req.headers.get('content-type')
      })

      // Start child span for handler execution
      const span = transaction.startChild({
        op: 'handler',
        description: `Handler: ${req.method} ${req.nextUrl.pathname}`
      })

      // Execute handler
      const response = await handler(req)

      // Finish handler span
      span.setStatus(response.status >= 400 ? 'error' : 'ok')
      span.setData('status', response.status)
      span.finish()

      // Add response data to transaction
      transaction.setData('status', response.status)
      transaction.setHttpStatus(response.status)

      return response
    } catch (error) {
      // Capture exception
      Sentry.captureException(error)

      // Set transaction status to error
      transaction.setStatus('error')
      transaction.setData('error', error instanceof Error ? error.message : String(error))

      // Re-throw error to be handled by error middleware
      throw error
    } finally {
      // Finish transaction
      transaction.finish()
    }
  }
}

/**
 * Create a custom transaction for monitoring specific operations
 */
export function createTransaction(name: string, operation: string) {
  if (!process.env.SENTRY_DSN) {
    // Return no-op functions if Sentry is not initialized
    return {
      startSpan: () => ({
        finish: () => {},
        setData: () => {},
        setStatus: () => {}
      }),
      setData: () => {},
      finish: () => {}
    }
  }

  const transaction = Sentry.startTransaction({
    name,
    op: operation
  })

  return {
    startSpan: (description: string, op: string) => {
      const span = transaction.startChild({
        description,
        op
      })
      return {
        finish: () => span.finish(),
        setData: (key: string, value: any) => span.setData(key, value),
        setStatus: (status: 'ok' | 'error') => span.setStatus(status)
      }
    },
    setData: (key: string, value: any) => transaction.setData(key, value),
    finish: () => transaction.finish()
  }
}

/**
 * Monitor business logic operations
 */
export function monitorBusinessLogic<T>(
  operation: string,
  category: string,
  func: () => Promise<T>
): Promise<T> {
  if (!process.env.SENTRY_DSN) {
    return func()
  }

  const transaction = Sentry.startTransaction({
    name: operation,
    op: `business.${category}`
  })

  return new Promise<T>(async (resolve, reject) => {
    try {
      const result = await func()
      transaction.setStatus('ok')
      resolve(result)
    } catch (error) {
      transaction.setStatus('error')
      transaction.setData('error', error instanceof Error ? error.message : String(error))
      Sentry.captureException(error)
      reject(error)
    } finally {
      transaction.finish()
    }
  })
}

/**
 * Monitor credit analysis accuracy
 */
export function monitorCreditAnalysis(
  analysisType: string,
  expectedScore: number,
  actualScore: number,
  metadata: Record<string, any>
) {
  if (!process.env.SENTRY_DSN) {
    return
  }

  const accuracy = Math.abs(expectedScore - actualScore)
  const isAccurate = accuracy <= 10 // Within 10 points

  // Log as breadcrumb
  Sentry.addBreadcrumb({
    category: 'credit_analysis',
    message: `Credit analysis ${analysisType}: expected=${expectedScore}, actual=${actualScore}`,
    level: isAccurate ? 'info' : 'warning',
    data: {
      analysisType,
      expectedScore,
      actualScore,
      accuracy,
      isAccurate,
      ...metadata
    }
  })

  // If accuracy is poor, capture as event
  if (!isAccurate) {
    Sentry.captureMessage(`Credit analysis accuracy issue: ${analysisType}`, {
      level: 'warning',
      tags: {
        analysisType,
        accuracy: String(accuracy)
      },
      extra: {
        expectedScore,
        actualScore,
        ...metadata
      }
    })
  }
}

/**
 * Monitor dispute success rates
 */
export function monitorDisputeSuccess(
  disputeType: string,
  isSuccessful: boolean,
  metadata: Record<string, any>
) {
  if (!process.env.SENTRY_DSN) {
    return
  }

  // Log as breadcrumb
  Sentry.addBreadcrumb({
    category: 'dispute_success',
    message: `Dispute ${disputeType}: ${isSuccessful ? 'successful' : 'failed'}`,
    level: isSuccessful ? 'info' : 'warning',
    data: {
      disputeType,
      isSuccessful,
      ...metadata
    }
  })

  // If dispute failed, capture as event
  if (!isSuccessful) {
    Sentry.captureMessage(`Dispute failed: ${disputeType}`, {
      level: 'warning',
      tags: {
        disputeType,
        success: 'false'
      },
      extra: metadata
    })
  }
}

// Export Sentry for direct use
export { Sentry }