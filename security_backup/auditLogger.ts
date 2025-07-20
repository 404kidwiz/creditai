/**
 * Enhanced Security Audit Logger
 * Provides comprehensive audit logging for security compliance
 */

import { createLogger } from '../logging/logger'
import { supabase } from '../supabase/client'
import { PIIMasker } from './piiMasker'
import crypto from 'crypto'

// Initialize logger
const logger = createLogger('security:audit')

/**
 * Audit event types
 */
export enum AuditEventType {
  // Authentication events
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTRATION = 'user_registration',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  FAILED_LOGIN = 'failed_login',
  ACCOUNT_LOCKED = 'account_locked',
  SESSION_TIMEOUT = 'session_timeout',
  
  // Document processing events
  DOCUMENT_UPLOADED = 'document_uploaded',
  DOCUMENT_PROCESSED = 'document_processed',
  DOCUMENT_DELETED = 'document_deleted',
  HIGH_SENSITIVITY_DOCUMENT = 'high_sensitivity_document_processed',
  PII_DETECTED = 'pii_detected',
  DATA_ENCRYPTED = 'data_encrypted',
  DATA_DECRYPTED = 'data_decrypted',
  
  // Access control events
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PERMISSION_DENIED = 'permission_denied',
  ADMIN_ACCESS = 'admin_access',
  API_KEY_USED = 'api_key_used',
  API_ACCESS = 'api_access',
  
  // Data events
  DATA_EXPORT = 'data_export',
  DATA_DELETION = 'data_deletion',
  BULK_OPERATION = 'bulk_operation',
  
  // System events
  SYSTEM_ERROR = 'system_error',
  SERVICE_FAILURE = 'service_failure',
  CONFIGURATION_CHANGE = 'configuration_change',
  
  // Security events
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SECURITY_SCAN_DETECTED = 'security_scan_detected',
  MALICIOUS_REQUEST = 'malicious_request'
}

/**
 * Risk levels for audit events
 */
export enum RiskLevel {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

/**
 * Audit event interface
 */
export interface AuditEvent {
  eventType: AuditEventType
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  resource?: string
  action?: string
  outcome: 'success' | 'failure' | 'error'
  riskLevel: RiskLevel
  details: Record<string, any>
  timestamp: string
}

/**
 * Security context interface
 */
export interface SecurityContext {
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  requestId?: string
}

/**
 * Enhanced Audit Logger class
 */
export class AuditLogger {
  private static instance: AuditLogger
  private auditQueue: AuditEvent[] = []
  private readonly BATCH_SIZE = 50
  private readonly FLUSH_INTERVAL = 5000 // 5 seconds
  
  private constructor() {
    this.initializeAuditLogger()
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }
  
  /**
   * Initialize audit logger
   */
  private initializeAuditLogger(): void {
    // Set up periodic batch flushing
    setInterval(() => {
      this.flushAuditQueue()
    }, this.FLUSH_INTERVAL)
    
    // Flush on process exit
    process.on('beforeExit', () => {
      this.flushAuditQueue()
    })
    
    logger.info('Security audit logger initialized')
  }
  
  /**
   * Log authentication event
   */
  async logAuthEvent(
    eventType: AuditEventType,
    context: SecurityContext,
    outcome: 'success' | 'failure' | 'error',
    details: Record<string, any> = {}
  ): Promise<void> {
    const riskLevel = this.calculateAuthRiskLevel(eventType, outcome, details)
    
    await this.logEvent({
      eventType,
      userId: context.userId,
      sessionId: context.sessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource: 'authentication',
      action: eventType,
      outcome,
      riskLevel,
      details: this.sanitizeDetails(details),
      timestamp: new Date().toISOString()
    })
  }
  
  /**
   * Log document processing event
   */
  async logDocumentEvent(
    eventType: AuditEventType,
    context: SecurityContext,
    outcome: 'success' | 'failure' | 'error',
    documentInfo: {
      fileName?: string
      fileSize?: number
      fileType?: string
      processingMethod?: string
      confidence?: number
      piiDetected?: boolean
      sensitivityScore?: number
    },
    details: Record<string, any> = {}
  ): Promise<void> {
    const riskLevel = this.calculateDocumentRiskLevel(eventType, documentInfo, details)
    
    await this.logEvent({
      eventType,
      userId: context.userId,
      sessionId: context.sessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource: 'document',
      action: eventType,
      outcome,
      riskLevel,
      details: this.sanitizeDetails({
        ...documentInfo,
        ...details
      }),
      timestamp: new Date().toISOString()
    })
  }
  
  /**
   * Log access control event
   */
  async logAccessEvent(
    eventType: AuditEventType,
    context: SecurityContext,
    resource: string,
    action: string,
    outcome: 'success' | 'failure' | 'error',
    details: Record<string, any> = {}
  ): Promise<void> {
    const riskLevel = this.calculateAccessRiskLevel(eventType, outcome, details)
    
    await this.logEvent({
      eventType,
      userId: context.userId,
      sessionId: context.sessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource,
      action,
      outcome,
      riskLevel,
      details: this.sanitizeDetails(details),
      timestamp: new Date().toISOString()
    })
  }
  
  /**
   * Log security event
   */
  async logSecurityEvent(
    eventType: AuditEventType,
    context: SecurityContext,
    outcome: 'success' | 'failure' | 'error',
    details: Record<string, any> = {}
  ): Promise<void> {
    const riskLevel = this.calculateSecurityRiskLevel(eventType, details)
    
    await this.logEvent({
      eventType,
      userId: context.userId,
      sessionId: context.sessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource: 'security',
      action: eventType,
      outcome,
      riskLevel,
      details: this.sanitizeDetails(details),
      timestamp: new Date().toISOString()
    })
  }
  
  /**
   * Log system event
   */
  async logSystemEvent(
    eventType: AuditEventType,
    outcome: 'success' | 'failure' | 'error',
    details: Record<string, any> = {}
  ): Promise<void> {
    const riskLevel = this.calculateSystemRiskLevel(eventType, outcome, details)
    
    await this.logEvent({
      eventType,
      resource: 'system',
      action: eventType,
      outcome,
      riskLevel,
      details: this.sanitizeDetails(details),
      timestamp: new Date().toISOString()
    })
  }
  
  /**
   * Log audit event
   */
  private async logEvent(event: AuditEvent): Promise<void> {
    try {
      // Add to queue for batch processing
      this.auditQueue.push(event)
      
      // Log to application logger
      logger.info(`Audit Event: ${event.eventType}`, {
        eventType: event.eventType,
        userId: event.userId,
        resource: event.resource,
        action: event.action,
        outcome: event.outcome,
        riskLevel: event.riskLevel,
        timestamp: event.timestamp
      })
      
      // Flush immediately for high-risk events
      if (event.riskLevel >= RiskLevel.HIGH) {
        await this.flushAuditQueue()
      }
      
      // Flush if queue is full
      if (this.auditQueue.length >= this.BATCH_SIZE) {
        await this.flushAuditQueue()
      }
      
    } catch (error) {
      logger.error('Failed to log audit event', error as Error)
    }
  }
  
  /**
   * Flush audit queue to database
   */
  private async flushAuditQueue(): Promise<void> {
    if (this.auditQueue.length === 0) {
      return
    }
    
    try {
      const events = [...this.auditQueue]
      this.auditQueue = []
      
      // Use imported supabase client
      
      // Prepare batch insert data
      const auditRecords = events.map(event => ({
        user_id: event.userId || null,
        event_type: event.eventType,
        event_details: {
          sessionId: event.sessionId,
          resource: event.resource,
          action: event.action,
          outcome: event.outcome,
          details: event.details,
          timestamp: event.timestamp
        },
        ip_address: event.ipAddress || null,
        user_agent: event.userAgent || null,
        session_id: event.sessionId || null,
        risk_score: event.riskLevel,
        created_at: event.timestamp
      }))
      
      // Batch insert to database
      const { error } = await supabase
        .from('security_audit_log')
        .insert(auditRecords)
      
      if (error) {
        logger.error('Failed to flush audit queue to database', error)
        // Re-add events to queue for retry
        this.auditQueue.unshift(...events)
      } else {
        logger.debug(`Flushed ${events.length} audit events to database`)
      }
      
    } catch (error) {
      logger.error('Failed to flush audit queue', error as Error)
    }
  }
  
  /**
   * Calculate risk level for authentication events
   */
  private calculateAuthRiskLevel(
    eventType: AuditEventType,
    outcome: string,
    details: Record<string, any>
  ): RiskLevel {
    // Failed authentication attempts are higher risk
    if (outcome === 'failure') {
      if (eventType === AuditEventType.FAILED_LOGIN) {
        return details.attemptCount > 3 ? RiskLevel.HIGH : RiskLevel.MEDIUM
      }
      return RiskLevel.MEDIUM
    }
    
    // Successful high-privilege operations
    if (eventType === AuditEventType.ADMIN_ACCESS) {
      return RiskLevel.MEDIUM
    }
    
    // Account security changes
    if ([AuditEventType.PASSWORD_CHANGE, AuditEventType.PASSWORD_RESET].includes(eventType)) {
      return RiskLevel.MEDIUM
    }
    
    return RiskLevel.LOW
  }
  
  /**
   * Calculate risk level for document events
   */
  private calculateDocumentRiskLevel(
    eventType: AuditEventType,
    documentInfo: any,
    details: Record<string, any>
  ): RiskLevel {
    // High sensitivity documents
    if (documentInfo.sensitivityScore > 80) {
      return RiskLevel.HIGH
    }
    
    // PII detected
    if (documentInfo.piiDetected) {
      return documentInfo.sensitivityScore > 50 ? RiskLevel.MEDIUM : RiskLevel.LOW
    }
    
    // Processing failures
    if (eventType === AuditEventType.SYSTEM_ERROR) {
      return RiskLevel.MEDIUM
    }
    
    return RiskLevel.LOW
  }
  
  /**
   * Calculate risk level for access events
   */
  private calculateAccessRiskLevel(
    eventType: AuditEventType,
    outcome: string,
    details: Record<string, any>
  ): RiskLevel {
    // Unauthorized access attempts
    if (eventType === AuditEventType.UNAUTHORIZED_ACCESS) {
      return RiskLevel.HIGH
    }
    
    // Permission denied events
    if (eventType === AuditEventType.PERMISSION_DENIED) {
      return RiskLevel.MEDIUM
    }
    
    // Admin access
    if (eventType === AuditEventType.ADMIN_ACCESS) {
      return RiskLevel.MEDIUM
    }
    
    return RiskLevel.LOW
  }
  
  /**
   * Calculate risk level for security events
   */
  private calculateSecurityRiskLevel(
    eventType: AuditEventType,
    details: Record<string, any>
  ): RiskLevel {
    // Critical security events
    if ([
      AuditEventType.MALICIOUS_REQUEST,
      AuditEventType.SECURITY_SCAN_DETECTED,
      AuditEventType.SUSPICIOUS_ACTIVITY
    ].includes(eventType)) {
      return RiskLevel.CRITICAL
    }
    
    // Rate limiting
    if (eventType === AuditEventType.RATE_LIMIT_EXCEEDED) {
      return details.severity === 'high' ? RiskLevel.HIGH : RiskLevel.MEDIUM
    }
    
    return RiskLevel.MEDIUM
  }
  
  /**
   * Calculate risk level for system events
   */
  private calculateSystemRiskLevel(
    eventType: AuditEventType,
    outcome: string,
    details: Record<string, any>
  ): RiskLevel {
    // Service failures
    if (eventType === AuditEventType.SERVICE_FAILURE) {
      return details.critical ? RiskLevel.HIGH : RiskLevel.MEDIUM
    }
    
    // Configuration changes
    if (eventType === AuditEventType.CONFIGURATION_CHANGE) {
      return RiskLevel.MEDIUM
    }
    
    // System errors
    if (eventType === AuditEventType.SYSTEM_ERROR) {
      return outcome === 'error' ? RiskLevel.MEDIUM : RiskLevel.LOW
    }
    
    return RiskLevel.LOW
  }
  
  /**
   * Sanitize audit details to prevent PII leakage
   */
  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(details)) {
      if (typeof value === 'string') {
        // Apply PII masking to string values
        const masked = PIIMasker.maskPII(value, {
          maskSSN: true,
          maskAccountNumbers: true,
          maskPhoneNumbers: true,
          maskEmailAddresses: true,
          preserveFormat: true
        })
        sanitized[key] = masked.maskedText
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize objects
        sanitized[key] = this.sanitizeDetails(value)
      } else {
        sanitized[key] = value
      }
    }
    
    return sanitized
  }
  
  /**
   * Get audit events for a user
   */
  async getUserAuditEvents(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      // Use imported supabase client
      
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      
      if (error) {
        logger.error('Failed to get user audit events', error)
        return []
      }
      
      return data || []
    } catch (error) {
      logger.error('Failed to get user audit events', error as Error)
      return []
    }
  }
  
  /**
   * Get high-risk audit events
   */
  async getHighRiskEvents(
    timeframe: string = '24h',
    limit: number = 100
  ): Promise<any[]> {
    try {
      // Use imported supabase client
      
      let hours = 24
      switch (timeframe) {
        case '1h': hours = 1; break
        case '24h': hours = 24; break
        case '7d': hours = 168; break
        case '30d': hours = 720; break
      }
      
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .gte('risk_score', RiskLevel.HIGH)
        .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) {
        logger.error('Failed to get high-risk audit events', error)
        return []
      }
      
      return data || []
    } catch (error) {
      logger.error('Failed to get high-risk audit events', error)
      return []
    }
  }
  
  /**
   * Generate audit summary report
   */
  async generateAuditSummary(timeframe: string = '24h'): Promise<{
    totalEvents: number
    riskDistribution: Record<string, number>
    topEventTypes: Record<string, number>
    failureRate: number
    highRiskEvents: number
  }> {
    try {
      // Use imported supabase client
      
      let hours = 24
      switch (timeframe) {
        case '1h': hours = 1; break
        case '24h': hours = 24; break
        case '7d': hours = 168; break
        case '30d': hours = 720; break
      }
      
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('event_type, risk_score, event_details')
        .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      
      if (error) {
        logger.error('Failed to generate audit summary', error)
        return {
          totalEvents: 0,
          riskDistribution: {},
          topEventTypes: {},
          failureRate: 0,
          highRiskEvents: 0
        }
      }
      
      const events = data || []
      const totalEvents = events.length
      
      // Calculate risk distribution
      const riskDistribution: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      }
      
      // Calculate event type distribution
      const topEventTypes: Record<string, number> = {}
      
      let failureCount = 0
      let highRiskEvents = 0
      
      events.forEach(event => {
        // Risk distribution
        if (event.risk_score === RiskLevel.LOW) riskDistribution.low++
        else if (event.risk_score === RiskLevel.MEDIUM) riskDistribution.medium++
        else if (event.risk_score === RiskLevel.HIGH) riskDistribution.high++
        else if (event.risk_score === RiskLevel.CRITICAL) riskDistribution.critical++
        
        // Event types
        topEventTypes[event.event_type] = (topEventTypes[event.event_type] || 0) + 1
        
        // Failure count
        if (event.event_details?.outcome === 'failure' || event.event_details?.outcome === 'error') {
          failureCount++
        }
        
        // High risk events
        if (event.risk_score >= RiskLevel.HIGH) {
          highRiskEvents++
        }
      })
      
      const failureRate = totalEvents > 0 ? (failureCount / totalEvents) * 100 : 0
      
      return {
        totalEvents,
        riskDistribution,
        topEventTypes,
        failureRate,
        highRiskEvents
      }
      
    } catch (error) {
      logger.error('Failed to generate audit summary', error)
      return {
        totalEvents: 0,
        riskDistribution: {},
        topEventTypes: {},
        failureRate: 0,
        highRiskEvents: 0
      }
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance()

// Export types (enums are already exported above)
export type { AuditEvent, SecurityContext }