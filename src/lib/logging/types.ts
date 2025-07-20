/**
 * Type definitions for the structured logging system
 */

// Valid log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Types that can be logged
export type Loggable = string | number | boolean | null | undefined | object

// Context for child loggers
export type LogContext = string | {
  context?: string
  userId?: string
  requestId?: string
}

// Request tracking information
export interface RequestInfo {
  method: string
  url: string
  ip?: string
  userAgent?: string
  userId?: string
  requestId: string
  startTime: number
}

// Performance metrics
export interface PerformanceMetrics {
  name: string
  duration: number
  timestamp: number
  context?: string
  userId?: string
  requestId?: string
  [key: string]: any
}

// Security event information
export interface SecurityEvent {
  type: 'authentication' | 'authorization' | 'data_access' | 'pii_detection' | 'suspicious_activity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  ip?: string
  userAgent?: string
  details: Record<string, any>
}

// Business event information
export interface BusinessEvent {
  type: string
  category: 'dispute' | 'analysis' | 'report' | 'user' | 'system'
  userId?: string
  details: Record<string, any>
}

// Error with additional context
export interface EnhancedError extends Error {
  code?: string
  statusCode?: number
  context?: Record<string, any>
  userId?: string
  requestId?: string
}