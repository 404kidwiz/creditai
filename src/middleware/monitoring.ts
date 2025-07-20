// Monitoring Middleware
// Integrates monitoring with Next.js requests

import { NextRequest, NextResponse } from 'next/server';
import { 
  recordHttpMetrics, 
  recordDbMetrics, 
  recordAiMetrics,
  recordError 
} from '@/lib/monitoring/prometheus/metrics';
import { 
  withSpan, 
  recordHttpRequest, 
  SpanAttributes 
} from '@/lib/monitoring/opentelemetry';
import { createLogger } from '@/lib/monitoring/logging';
import { alertManager } from '@/lib/monitoring/alerts';

const logger = createLogger({ component: 'monitoring-middleware' });

export interface RequestContext {
  requestId: string;
  startTime: number;
  route: string;
  method: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

// Request monitoring middleware
export function withRequestMonitoring(
  handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = req.headers.get('x-request-id') || 
                     `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const context: RequestContext = {
      requestId,
      startTime,
      route: req.nextUrl.pathname,
      method: req.method,
      userAgent: req.headers.get('user-agent') || undefined,
      ip: req.ip || req.headers.get('x-forwarded-for') || 'unknown',
    };

    // Extract user ID from auth header or session if available
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        // Extract user ID from JWT or session
        // This is a placeholder - implement based on your auth system
        context.userId = 'extracted-from-auth';
      }
    } catch (error) {
      // Ignore auth extraction errors
    }

    // Create span for the request
    return withSpan(
      `HTTP ${context.method} ${context.route}`,
      async () => {
        let response: NextResponse;
        let error: Error | null = null;

        try {
          // Call the actual handler
          response = await handler(req, context);
        } catch (err) {
          error = err as Error;
          logger.error('Request handler error', error, {
            requestId: context.requestId,
            route: context.route,
            method: context.method,
          });

          // Record error metrics
          recordError('request_handler_error', 'high', 'api');
          
          // Create error response
          response = NextResponse.json(
            { error: 'Internal server error', requestId: context.requestId },
            { status: 500 }
          );
        }

        const duration = Date.now() - startTime;
        const statusCode = response.status;

        // Record metrics
        recordHttpMetrics(
          context.method,
          context.route,
          statusCode,
          duration
        );

        recordHttpRequest(
          context.method,
          context.route,
          statusCode,
          duration
        );

        // Record alert metrics
        const errorRate = statusCode >= 500 ? 1 : 0;
        alertManager.recordMetric('error_rate', errorRate);
        alertManager.recordMetric('response_time_avg', duration);

        // Log request completion
        logger.info('Request completed', {
          requestId: context.requestId,
          method: context.method,
          route: context.route,
          statusCode,
          duration,
          userAgent: context.userAgent,
          ip: context.ip,
          userId: context.userId,
        });

        // Add monitoring headers to response
        response.headers.set('x-request-id', context.requestId);
        response.headers.set('x-response-time', duration.toString());

        return response;
      },
      {
        [SpanAttributes.REQUEST_ID]: context.requestId,
        [SpanAttributes.USER_ID]: context.userId || 'anonymous',
        'http.method': context.method,
        'http.route': context.route,
        'http.user_agent': context.userAgent || 'unknown',
        'http.client_ip': context.ip,
      }
    );
  };
}

// Database operation monitoring
export function withDatabaseMonitoring<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    `DB ${operation} ${table}`,
    async () => {
      const startTime = Date.now();
      let success = true;
      let error: Error | null = null;

      try {
        const result = await fn();
        return result;
      } catch (err) {
        success = false;
        error = err as Error;
        
        logger.error('Database operation failed', error, {
          operation,
          table,
        });

        recordError('database_error', 'high', 'database');
        throw err;
      } finally {
        const duration = Date.now() - startTime;
        
        recordDbMetrics(operation, table, duration, success);
        
        logger.debug('Database operation completed', {
          operation,
          table,
          duration,
          success,
        });

        // Record alert metric for slow queries
        if (duration > 5000) { // 5 seconds
          alertManager.recordMetric('slow_query_detected', 1, {
            operation,
            table,
          });
        }
      }
    },
    {
      'db.operation': operation,
      'db.table': table,
    }
  );
}

// AI API call monitoring
export function withAiMonitoring<T>(
  provider: string,
  model: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    `AI ${provider}/${model}`,
    async () => {
      const startTime = Date.now();
      let success = true;
      let error: Error | null = null;
      let tokenCount: { input: number; output: number } | undefined;

      try {
        const result = await fn();
        
        // Try to extract token usage from result if available
        if (typeof result === 'object' && result !== null) {
          const resultObj = result as any;
          if (resultObj.usage) {
            tokenCount = {
              input: resultObj.usage.prompt_tokens || 0,
              output: resultObj.usage.completion_tokens || 0,
            };
          }
        }

        return result;
      } catch (err) {
        success = false;
        error = err as Error;
        
        logger.error('AI API call failed', error, {
          provider,
          model,
        });

        recordError('ai_api_error', 'medium', 'ai');
        throw err;
      } finally {
        const duration = Date.now() - startTime;
        
        recordAiMetrics(provider, model, duration, success, tokenCount);
        
        logger.info('AI API call completed', {
          provider,
          model,
          duration,
          success,
          tokenCount,
        });

        // Record alert metrics
        const errorRate = success ? 0 : 1;
        alertManager.recordMetric('ai_model_error_rate', errorRate, {
          provider,
          model,
        });

        // Alert on slow AI calls
        if (duration > 30000) { // 30 seconds
          alertManager.recordMetric('slow_ai_call_detected', 1, {
            provider,
            model,
          });
        }
      }
    },
    {
      'ai.provider': provider,
      'ai.model': model,
    }
  );
}

// Business event monitoring
export function recordBusinessEvent(
  eventType: string,
  eventData: Record<string, any> = {},
  userId?: string
) {
  logger.logBusinessEvent(eventType, {
    ...eventData,
    userId,
    timestamp: new Date().toISOString(),
  });

  // Record business metrics
  switch (eventType) {
    case 'credit_report_analyzed':
      alertManager.recordMetric('credit_reports_analyzed_total', 1, {
        status: eventData.status || 'unknown',
        provider: eventData.provider || 'unknown',
      });
      break;
    
    case 'dispute_letter_generated':
      alertManager.recordMetric('dispute_letters_generated_total', 1, {
        type: eventData.type || 'unknown',
        status: eventData.status || 'unknown',
      });
      break;
    
    case 'user_registered':
      alertManager.recordMetric('user_registrations_total', 1, {
        source: eventData.source || 'unknown',
        plan: eventData.plan || 'free',
      });
      break;
    
    case 'subscription_created':
      alertManager.recordMetric('subscription_revenue_dollars', eventData.amount || 0, {
        plan: eventData.plan || 'unknown',
        billing_period: eventData.billing_period || 'unknown',
      });
      break;
  }
}

// Security event monitoring
export function recordSecurityEvent(
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, any> = {},
  userId?: string,
  ip?: string
) {
  logger.logSecurityEvent(eventType, severity, {
    ...details,
    userId,
    ip,
    timestamp: new Date().toISOString(),
  });

  // Record security alert metrics
  alertManager.recordMetric('security_events_total', 1, {
    event_type: eventType,
    severity,
  });

  // Immediate alert for critical security events
  if (severity === 'critical') {
    alertManager.recordMetric('critical_security_event', 1, {
      event_type: eventType,
      user_id: userId || 'anonymous',
      ip: ip || 'unknown',
    });
  }
}

// Performance monitoring decorator
export function withPerformanceMonitoring(
  operationName: string,
  thresholdMs: number = 1000
) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;

    descriptor.value = (async function (this: any, ...args: any[]) {
      const startTime = Date.now();
      
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;
        
        logger.logPerformanceMetric(operationName, duration, 'ms', {
          method: propertyName,
          args: args.length,
        });

        // Alert on slow operations
        if (duration > thresholdMs) {
          alertManager.recordMetric('slow_operation_detected', 1, {
            operation: operationName,
            method: propertyName,
            duration: duration.toString(),
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        logger.error(`Performance monitored operation failed: ${operationName}`, error, {
          method: propertyName,
          duration,
        });

        throw error;
      }
    }) as T;

    return descriptor;
  };
}