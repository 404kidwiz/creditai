/**
 * Structured Logging System
 * Replaces console.log with Winston and Sentry for secure, structured logging
 */

import winston from 'winston'
import { Loggable, LogLevel, LogContext } from './types'
import { PIIMasker } from '../security/piiMasker'
import * as Sentry from '@sentry/node'
import { SeverityLevel } from '@sentry/types'

// Configure Winston format
const { combine, timestamp, json, printf, colorize } = winston.format

// Custom format for development logs
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  const metaString = Object.keys(metadata).length 
    ? `\n${JSON.stringify(metadata, null, 2)}` 
    : ''
  return `${timestamp} [${level}]: ${message}${metaString}`
})

// Create Winston logger instance
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    process.env.NODE_ENV === 'production' 
      ? json() 
      : combine(colorize(), devFormat)
  ),
  defaultMeta: { 
    service: 'credit-report-analyzer',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport for all environments
    new winston.transports.Console(),
    
    // File transport for production
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 10
      }),
      new winston.transports.File({ 
        filename: 'logs/combined.log',
        maxsize: 10485760, // 10MB
        maxFiles: 10
      })
    ] : [])
  ]
})

// Initialize Sentry if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express(),
      new Sentry.Integrations.Postgres()
    ]
  })
}

/**
 * Sanitize log data to prevent PII leakage
 */
function sanitizeLogData(data: any): any {
  if (typeof data === 'string') {
    return PIIMasker.sanitizeErrorMessage(data)
  }
  
  if (typeof data !== 'object' || data === null) {
    return data
  }
  
  // Handle Error objects
  if (data instanceof Error) {
    const sanitizedError = {
      name: data.name,
      message: PIIMasker.sanitizeErrorMessage(data.message),
      stack: process.env.NODE_ENV === 'development' ? data.stack : undefined
    }
    return sanitizedError
  }
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item))
  }
  
  // Handle objects
  const sanitized: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    // Skip sensitive fields or mask them
    if (['password', 'token', 'secret', 'key', 'authorization'].includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]'
    } else if (key === 'ssn' || key === 'socialSecurityNumber') {
      sanitized[key] = 'XXX-XX-XXXX'
    } else if (key === 'accountNumber' || key === 'account') {
      if (typeof value === 'string' && value.length > 4) {
        sanitized[key] = 'XXXX' + value.slice(-4)
      } else {
        sanitized[key] = '[MASKED]'
      }
    } else {
      sanitized[key] = sanitizeLogData(value)
    }
  }
  
  return sanitized
}

/**
 * Main logger class
 */
export class Logger {
  private context: string
  private userId?: string
  private requestId?: string
  
  constructor(context: string, userId?: string, requestId?: string) {
    this.context = context
    this.userId = userId
    this.requestId = requestId
  }
  
  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    if (typeof context === 'string') {
      return new Logger(`${this.context}:${context}`, this.userId, this.requestId)
    }
    
    return new Logger(
      context.context || this.context,
      context.userId || this.userId,
      context.requestId || this.requestId
    )
  }
  
  /**
   * Log at debug level
   */
  debug(message: string, ...args: Loggable[]): void {
    this.log('debug', message, ...args)
  }
  
  /**
   * Log at info level
   */
  info(message: string, ...args: Loggable[]): void {
    this.log('info', message, ...args)
  }
  
  /**
   * Log at warning level
   */
  warn(message: string, ...args: Loggable[]): void {
    this.log('warn', message, ...args)
  }
  
  /**
   * Log at error level
   */
  error(message: string | Error, ...args: Loggable[]): void {
    // Handle Error objects
    if (message instanceof Error) {
      const error = message
      this.log('error', error.message, { error, ...this.mergeArgs(args) })
      
      // Send to Sentry if available
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(error, {
          tags: {
            context: this.context,
            userId: this.userId
          },
          extra: this.mergeArgs(args)
        })
      }
    } else {
      this.log('error', message, ...args)
    }
  }
  
  /**
   * Log at critical level
   */
  critical(message: string | Error, ...args: Loggable[]): void {
    // Handle Error objects
    if (message instanceof Error) {
      const error = message
      this.log('error', `CRITICAL: ${error.message}`, { error, ...this.mergeArgs(args) })
      
      // Always send to Sentry if available
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(error, {
          level: 'fatal',
          tags: {
            context: this.context,
            userId: this.userId,
            critical: true
          },
          extra: this.mergeArgs(args)
        })
      }
    } else {
      this.log('error', `CRITICAL: ${message}`, ...args)
    }
  }
  
  /**
   * Start performance measurement
   */
  startTimer(label: string): () => number {
    const start = performance.now()
    return () => {
      const duration = performance.now() - start
      this.info(`${label} completed`, { duration_ms: Math.round(duration) })
      return duration
    }
  }
  
  /**
   * Log API request
   */
  logRequest(req: any, res: any): void {
    const requestData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: res.responseTime,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.ip,
      userId: this.userId || 'anonymous'
    }
    
    this.info(`API ${req.method} ${req.url}`, requestData)
  }
  
  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, ...args: Loggable[]): void {
    const metadata = {
      context: this.context,
      ...(this.userId && { userId: this.userId }),
      ...(this.requestId && { requestId: this.requestId }),
      ...this.mergeArgs(args)
    }
    
    // Sanitize all data before logging
    const sanitizedMessage = sanitizeLogData(message)
    const sanitizedMetadata = sanitizeLogData(metadata)
    
    // Log to Winston
    winstonLogger.log(level, sanitizedMessage, sanitizedMetadata)
    
    // Log to Sentry for warning and above if available
    if (process.env.SENTRY_DSN && (level === 'warn' || level === 'error')) {
      Sentry.addBreadcrumb({
        category: this.context,
        message: sanitizedMessage,
        level: level === 'warn' ? 'warning' : 'error',
        data: sanitizedMetadata
      })
      
      if (level === 'error') {
        Sentry.captureMessage(sanitizedMessage, {
          level: 'error',
          tags: {
            context: this.context,
            userId: this.userId
          },
          extra: sanitizedMetadata
        })
      }
    }
  }
  
  /**
   * Merge multiple log arguments into a single object
   */
  private mergeArgs(args: Loggable[]): Record<string, any> {
    if (args.length === 0) return {}
    
    // If first arg is an object, use it as base
    const base = typeof args[0] === 'object' && args[0] !== null ? { ...args[0] } : {}
    
    // Add remaining args
    for (let i = typeof args[0] === 'object' && args[0] !== null ? 1 : 0; i < args.length; i++) {
      const arg = args[i]
      
      if (typeof arg === 'object' && arg !== null) {
        Object.assign(base, arg)
      } else {
        base[`arg${i}`] = arg
      }
    }
    
    return base
  }
}

// Create default logger instance
export const logger = new Logger('app')

// Export a factory function to create loggers
export function createLogger(context: string, userId?: string, requestId?: string): Logger {
  return new Logger(context, userId, requestId)
}

// Export Sentry for direct use when needed
export { Sentry }