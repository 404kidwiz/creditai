// Centralized Logging System
// Structured logging with context and aggregation

import winston from 'winston';
import { createSpan, SpanAttributes } from '../opentelemetry';
import { recordError } from '../prometheus/metrics';

// Log levels
export const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace',
} as const;

// Log context interface
export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  creditReportId?: string;
  analysisId?: string;
  disputeId?: string;
  component?: string;
  operation?: string;
  [key: string]: any;
}

// Custom format for structured logging
const structuredFormat = winston.format.printf(({ timestamp, level, message, ...metadata }) => {
  const log = {
    timestamp,
    level,
    message,
    ...metadata,
  };
  return JSON.stringify(log);
});

// Create Winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    structuredFormat
  ),
  defaultMeta: {
    service: 'creditai',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      silent: process.env.NODE_ENV === 'test',
    }),
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 10485760, // 10MB
    maxFiles: 10,
  }));
}

// Logger wrapper class for enhanced functionality
export class Logger {
  private context: LogContext;
  private winstonLogger: winston.Logger;

  constructor(context: LogContext = {}) {
    this.context = context;
    this.winstonLogger = logger;
  }

  // Create child logger with additional context
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  // Log methods
  error(message: string, error?: Error | any, metadata?: any) {
    const span = createSpan('log.error', { level: 'error', component: this.context.component });
    
    try {
      const errorData = this.formatError(error);
      const logData = {
        ...this.context,
        ...metadata,
        ...errorData,
      };

      this.winstonLogger.error(message, logData);
      
      // Record error metric
      recordError(
        errorData.errorType || 'unknown',
        'high',
        this.context.component || 'unknown'
      );

      // Add to span
      if (error instanceof Error) {
        span.recordException(error);
      }
    } finally {
      span.end();
    }
  }

  warn(message: string, metadata?: any) {
    this.winstonLogger.warn(message, {
      ...this.context,
      ...metadata,
    });
  }

  info(message: string, metadata?: any) {
    this.winstonLogger.info(message, {
      ...this.context,
      ...metadata,
    });
  }

  debug(message: string, metadata?: any) {
    this.winstonLogger.debug(message, {
      ...this.context,
      ...metadata,
    });
  }

  trace(message: string, metadata?: any) {
    this.winstonLogger.silly(message, {
      ...this.context,
      ...metadata,
    });
  }

  // Specialized logging methods
  logHttpRequest(req: any, res: any, duration: number) {
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      ...this.context,
    };

    const level = res.statusCode >= 500 ? 'error' :
                 res.statusCode >= 400 ? 'warn' : 'info';

    this.winstonLogger.log(level, `HTTP ${req.method} ${req.url} ${res.statusCode}`, logData);
  }

  logDatabaseQuery(operation: string, table: string, duration: number, success: boolean, error?: Error) {
    const logData = {
      operation,
      table,
      duration,
      success,
      error: error ? this.formatError(error) : undefined,
      ...this.context,
    };

    const level = error ? 'error' : 'debug';
    this.winstonLogger.log(level, `Database ${operation} on ${table}`, logData);
  }

  logAiApiCall(provider: string, model: string, duration: number, success: boolean, metadata?: any) {
    const logData = {
      provider,
      model,
      duration,
      success,
      ...metadata,
      ...this.context,
    };

    const level = success ? 'info' : 'error';
    this.winstonLogger.log(level, `AI API call to ${provider}/${model}`, logData);
  }

  logBusinessEvent(event: string, metadata?: any) {
    this.info(`Business event: ${event}`, {
      eventType: 'business',
      event,
      ...metadata,
    });
  }

  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: any) {
    const logData = {
      eventType: 'security',
      event,
      severity,
      ...metadata,
      ...this.context,
    };

    const level = severity === 'critical' || severity === 'high' ? 'error' :
                 severity === 'medium' ? 'warn' : 'info';

    this.winstonLogger.log(level, `Security event: ${event}`, logData);
    
    // Record security error metric
    if (severity === 'high' || severity === 'critical') {
      recordError(`security_${event}`, severity, this.context.component || 'unknown');
    }
  }

  logPerformanceMetric(metric: string, value: number, unit: string, metadata?: any) {
    this.debug(`Performance metric: ${metric}`, {
      metricType: 'performance',
      metric,
      value,
      unit,
      ...metadata,
    });
  }

  // Helper methods
  private formatError(error: Error | any): any {
    if (!error) return {};

    if (error instanceof Error) {
      return {
        errorType: error.constructor.name,
        errorMessage: error.message,
        errorStack: error.stack,
        ...(error as any), // Include any custom properties
      };
    }

    return {
      errorType: 'UnknownError',
      errorData: error,
    };
  }

  // Audit logging
  logAudit(action: string, resource: string, result: 'success' | 'failure', metadata?: any) {
    this.info(`Audit: ${action} on ${resource}`, {
      auditType: 'audit',
      action,
      resource,
      result,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  // Transaction logging
  startTransaction(name: string): { end: (success: boolean, metadata?: any) => void } {
    const startTime = Date.now();
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.debug(`Transaction started: ${name}`, {
      transactionId,
      transactionName: name,
      transactionPhase: 'start',
    });

    return {
      end: (success: boolean, metadata?: any) => {
        const duration = Date.now() - startTime;
        const level = success ? 'info' : 'error';

        this.winstonLogger.log(level, `Transaction ${success ? 'completed' : 'failed'}: ${name}`, {
          transactionId,
          transactionName: name,
          transactionPhase: 'end',
          success,
          duration,
          ...metadata,
          ...this.context,
        });
      },
    };
  }
}

// Default logger instance
export const defaultLogger = new Logger();

// Convenience functions
export function createLogger(context: LogContext): Logger {
  return new Logger(context);
}

export function logError(message: string, error?: Error, context?: LogContext) {
  defaultLogger.child(context || {}).error(message, error);
}

export function logWarn(message: string, context?: LogContext) {
  defaultLogger.child(context || {}).warn(message);
}

export function logInfo(message: string, context?: LogContext) {
  defaultLogger.child(context || {}).info(message);
}

export function logDebug(message: string, context?: LogContext) {
  defaultLogger.child(context || {}).debug(message);
}

// Request logger middleware
export function createRequestLogger() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add request ID to request object
    req.requestId = requestId;
    
    // Create logger with request context
    req.logger = createLogger({
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip || req.connection.remoteAddress,
    });

    // Log request
    req.logger.info('Incoming request', {
      query: req.query,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
    });

    // Capture response
    const originalSend = res.send;
    res.send = function(data: any) {
      res.send = originalSend;
      res.send(data);

      const duration = Date.now() - startTime;
      req.logger.logHttpRequest(req, res, duration);
    };

    next();
  };
}

// Error logger middleware
export function createErrorLogger() {
  return (err: Error, req: any, res: any, next: any) => {
    const logger = req.logger || defaultLogger;
    
    logger.error('Unhandled error in request', err, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
    });

    next(err);
  };
}

// Process-level error handlers
process.on('uncaughtException', (error: Error) => {
  defaultLogger.error('Uncaught exception', error, {
    processEvent: 'uncaughtException',
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  defaultLogger.error('Unhandled rejection', reason, {
    processEvent: 'unhandledRejection',
    promise: promise.toString(),
  });
});