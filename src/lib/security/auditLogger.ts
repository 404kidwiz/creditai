/**
 * Basic audit logging utility
 * Simplified implementation for build compatibility
 */

export enum AuditEventType {
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  DATA_ACCESS = 'data_access',
  API_ACCESS = 'api_access',
  FILE_UPLOAD = 'file_upload',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SESSION_TIMEOUT = 'session_timeout',
  FAILED_LOGIN = 'failed_login',
  // Additional event types for PDF processing API
  DOCUMENT_UPLOADED = 'document_uploaded',
  PII_DETECTED = 'pii_detected',
  HIGH_SENSITIVITY_DOCUMENT = 'high_sensitivity_document',
  DATA_ENCRYPTED = 'data_encrypted',
  DOCUMENT_PROCESSED = 'document_processed',
  SYSTEM_ERROR = 'system_error',
  SERVICE_FAILURE = 'service_failure',
  // Enhanced security events for Sprint 4
  SECURITY_THREAT_DETECTED = 'security_threat_detected',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  MALICIOUS_REQUEST_BLOCKED = 'malicious_request_blocked',
  DDOS_ATTACK_DETECTED = 'ddos_attack_detected',
  IP_BLOCKED = 'ip_blocked',
  SESSION_CREATED = 'session_created',
  SESSION_EXPIRED = 'session_expired',
  MFA_CHALLENGE_INITIATED = 'mfa_challenge_initiated',
  MFA_SUCCESS = 'mfa_success',
  MFA_FAILURE = 'mfa_failure',
  ENCRYPTION_KEY_ROTATED = 'encryption_key_rotated',
  DATA_DECRYPTION_REQUESTED = 'data_decryption_requested',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  GDPR_DATA_REQUEST = 'gdpr_data_request',
  GDPR_DATA_DELETION = 'gdpr_data_deletion',
  SOC2_AUDIT_EVENT = 'soc2_audit_event',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AuditEvent {
  id: string
  eventType: AuditEventType
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  timestamp: string
  details?: Record<string, any>
  riskLevel: RiskLevel
}

export interface SecurityContext {
  userId?: string | null
  sessionId?: string | null
  ipAddress?: string
  userAgent?: string
}

export class AuditLogger {
  private events: AuditEvent[] = []

  logEvent(
    eventType: AuditEventType,
    context: SecurityContext,
    details?: Record<string, any>,
    riskLevel: RiskLevel = RiskLevel.LOW
  ): void {
    const event: AuditEvent = {
      id: Math.random().toString(36).substr(2, 9),
      eventType,
      userId: context.userId || undefined,
      sessionId: context.sessionId || undefined,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      timestamp: new Date().toISOString(),
      details: details || {},
      riskLevel,
    }

    this.events.push(event)
    
    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Audit Event:', event)
    }

    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000)
    }
  }

  logSecurityEvent(
    eventType: AuditEventType,
    context: SecurityContext,
    outcome: 'success' | 'failure' | 'error',
    details?: Record<string, any>
  ): void {
    const riskLevel = outcome === 'failure' || outcome === 'error' 
      ? RiskLevel.HIGH 
      : RiskLevel.MEDIUM

    this.logEvent(eventType, context, { outcome, ...details }, riskLevel)
  }

  logAccessEvent(
    eventType: AuditEventType,
    context: SecurityContext,
    resource: string,
    method: string,
    outcome: 'success' | 'failure' | 'error',
    details?: Record<string, any>
  ): void {
    this.logEvent(eventType, context, { 
      resource, 
      method, 
      outcome, 
      ...details 
    }, RiskLevel.LOW)
  }

  logAuthEvent(
    eventType: AuditEventType,
    context: SecurityContext,
    outcome: 'success' | 'failure' | 'error',
    details?: Record<string, any>
  ): void {
    const riskLevel = outcome === 'failure' 
      ? RiskLevel.HIGH 
      : RiskLevel.MEDIUM

    this.logEvent(eventType, context, { outcome, ...details }, riskLevel)
  }

  getEvents(limit: number = 100): AuditEvent[] {
    return this.events.slice(-limit)
  }

  getEventsByType(eventType: AuditEventType, limit: number = 100): AuditEvent[] {
    return this.events
      .filter(event => event.eventType === eventType)
      .slice(-limit)
  }

  getEventsByRiskLevel(riskLevel: RiskLevel, limit: number = 100): AuditEvent[] {
    return this.events
      .filter(event => event.riskLevel === riskLevel)
      .slice(-limit)
  }

  // API compatibility methods
  async logDocumentEvent(
    eventType: AuditEventType,
    context: SecurityContext,
    outcome: 'success' | 'failure' | 'error',
    details?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    const riskLevel = outcome === 'failure' || outcome === 'error' 
      ? RiskLevel.HIGH 
      : RiskLevel.MEDIUM

    this.logEvent(eventType, context, { 
      outcome, 
      ...details, 
      metadata: metadata || {} 
    }, riskLevel)
  }

  async logSystemEvent(
    eventType: AuditEventType,
    outcome: 'success' | 'failure' | 'error',
    details?: Record<string, any>
  ): Promise<void> {
    const riskLevel = outcome === 'failure' || outcome === 'error' 
      ? RiskLevel.HIGH 
      : RiskLevel.MEDIUM

    this.logEvent(eventType, {}, { 
      outcome, 
      ...details 
    }, riskLevel)
  }

  // Static helper methods
  static createSecurityContext(
    userId?: string | null,
    sessionId?: string | null,
    ipAddress?: string,
    userAgent?: string
  ): SecurityContext {
    return {
      userId,
      sessionId,
      ipAddress,
      userAgent,
    }
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger()

// Export for compatibility
export { AuditLogger as default }