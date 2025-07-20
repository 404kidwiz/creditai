/**
 * Enhanced Security Audit Logger
 * Enterprise-grade audit logging system with comprehensive compliance features
 * Supports SOC 2, GDPR, CCPA, and other regulatory requirements
 */

import { createLogger } from '../logging/logger'
import { createClient } from '../supabase/client'
import { PIIMasker } from './piiMasker'
import crypto from 'crypto'

// Initialize logger
const logger = createLogger('security:enhanced-audit')

/**
 * Comprehensive audit event types covering all security requirements
 */
export enum EnhancedAuditEventType {
  // Authentication & Authorization
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTRATION = 'user_registration',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  FAILED_LOGIN = 'failed_login',
  ACCOUNT_LOCKED = 'account_locked',
  SESSION_EXPIRED = 'session_expired',
  SESSION_TERMINATED = 'session_terminated',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  ROLE_CHANGE = 'role_change',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  
  // Data Access & Processing
  DATA_ACCESS = 'data_access',
  DATA_EXPORT = 'data_export',
  DATA_DELETION = 'data_deletion',
  DATA_MODIFICATION = 'data_modification',
  BULK_OPERATION = 'bulk_operation',
  PII_ACCESS = 'pii_access',
  SENSITIVE_DATA_VIEW = 'sensitive_data_view',
  
  // Document & File Operations
  DOCUMENT_UPLOADED = 'document_uploaded',
  DOCUMENT_PROCESSED = 'document_processed',
  DOCUMENT_DOWNLOADED = 'document_downloaded',
  DOCUMENT_DELETED = 'document_deleted',
  FILE_ENCRYPTION = 'file_encryption',
  FILE_DECRYPTION = 'file_decryption',
  
  // Google Cloud Service Interactions
  GCP_API_CALL = 'gcp_api_call',
  GCP_DOCUMENT_AI_REQUEST = 'gcp_document_ai_request',
  GCP_VISION_API_REQUEST = 'gcp_vision_api_request',
  GCP_SERVICE_ERROR = 'gcp_service_error',
  GCP_CREDENTIAL_ACCESS = 'gcp_credential_access',
  
  // System & Configuration
  SYSTEM_CONFIG_CHANGE = 'system_config_change',
  ENVIRONMENT_CHANGE = 'environment_change',
  DATABASE_SCHEMA_CHANGE = 'database_schema_change',
  BACKUP_CREATED = 'backup_created',
  BACKUP_RESTORED = 'backup_restored',
  
  // Security Events
  SECURITY_INCIDENT = 'security_incident',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  ANOMALY_DETECTED = 'anomaly_detected',
  SECURITY_SCAN_DETECTED = 'security_scan_detected',
  MALICIOUS_REQUEST = 'malicious_request',
  
  // Compliance & Privacy
  GDPR_DATA_REQUEST = 'gdpr_data_request',
  GDPR_DATA_ERASURE = 'gdpr_data_erasure',
  CCPA_OPT_OUT = 'ccpa_opt_out',
  PRIVACY_POLICY_ACCEPTED = 'privacy_policy_accepted',
  CONSENT_GRANTED = 'consent_granted',
  CONSENT_REVOKED = 'consent_revoked',
  DATA_RETENTION_APPLIED = 'data_retention_applied',
  
  // Administrative Actions
  ADMIN_LOGIN = 'admin_login',
  ADMIN_ACTION = 'admin_action',
  USER_IMPERSONATION = 'user_impersonation',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  AUDIT_LOG_ACCESS = 'audit_log_access',
  
  // API & Integration
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',
  THIRD_PARTY_INTEGRATION = 'third_party_integration',
  WEBHOOK_TRIGGERED = 'webhook_triggered',
  
  // Errors & Incidents
  SYSTEM_ERROR = 'system_error',
  SERVICE_FAILURE = 'service_failure',
  DATA_BREACH_DETECTED = 'data_breach_detected',
  PERFORMANCE_DEGRADATION = 'performance_degradation'
}

/**
 * Enhanced risk levels with compliance mapping
 */
export enum RiskLevel {
  INFO = 0,      // Informational
  LOW = 1,       // Normal operations
  MEDIUM = 2,    // Requires attention
  HIGH = 3,      // Urgent attention needed
  CRITICAL = 4,  // Immediate action required
  INCIDENT = 5   // Security incident
}

/**
 * Compliance frameworks supported
 */
export enum ComplianceFramework {
  SOC2 = 'SOC2',
  GDPR = 'GDPR',
  CCPA = 'CCPA',
  HIPAA = 'HIPAA',
  PCI_DSS = 'PCI_DSS',
  ISO27001 = 'ISO27001'
}

/**
 * Enhanced audit event interface
 */
export interface EnhancedAuditEvent {
  eventType: EnhancedAuditEventType
  userId?: string
  sessionId?: string
  requestId?: string
  ipAddress?: string
  userAgent?: string
  resource?: string
  action?: string
  outcome: 'success' | 'failure' | 'error' | 'warning'
  riskLevel: RiskLevel
  complianceFrameworks: ComplianceFramework[]
  details: Record<string, any>
  timestamp: string
  processingTime?: number
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted'
  retentionPolicy?: string
  geolocation?: {
    country?: string
    region?: string
    city?: string
  }
}

/**
 * Enhanced security context
 */
export interface EnhancedSecurityContext {
  userId?: string
  sessionId?: string
  requestId?: string
  ipAddress?: string
  userAgent?: string
  deviceFingerprint?: string
  geolocation?: {
    country?: string
    region?: string
    city?: string
  }
  authenticationMethod?: string
  userRole?: string
  permissions?: string[]
}

/**
 * Google Cloud service interaction details
 */
export interface GCPServiceAuditDetails {
  serviceName: 'document-ai' | 'vision-api' | 'storage' | 'logging'
  operationType: 'read' | 'write' | 'delete' | 'list'
  resourcePath?: string
  requestSize?: number
  responseSize?: number
  processingTime?: number
  credentials?: string
  quotaConsumed?: number
  cost?: number
}

/**
 * Enhanced Audit Logger class with enterprise features
 */
export class EnhancedAuditLogger {
  private static instance: EnhancedAuditLogger
  private auditQueue: EnhancedAuditEvent[] = []
  private readonly BATCH_SIZE = 100
  private readonly FLUSH_INTERVAL = 3000 // 3 seconds
  private readonly MAX_QUEUE_SIZE = 10000
  private isProcessing = false
  
  private constructor() {
    this.initializeAuditLogger()
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): EnhancedAuditLogger {
    if (!EnhancedAuditLogger.instance) {
      EnhancedAuditLogger.instance = new EnhancedAuditLogger()
    }
    return EnhancedAuditLogger.instance
  }
  
  /**
   * Initialize enhanced audit logger
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
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      this.flushAuditQueue()
    })
    
    logger.info('Enhanced security audit logger initialized')
  }
  
  /**
   * Log Google Cloud Platform service interaction
   */
  async logGCPServiceInteraction(
    context: EnhancedSecurityContext,
    serviceDetails: GCPServiceAuditDetails,
    outcome: 'success' | 'failure' | 'error',
    details: Record<string, any> = {}
  ): Promise<void> {
    const eventType = this.mapGCPServiceToEventType(serviceDetails.serviceName)
    const riskLevel = this.calculateGCPRiskLevel(serviceDetails, outcome)
    
    await this.logEvent({
      eventType,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource: `gcp:${serviceDetails.serviceName}`,
      action: serviceDetails.operationType,
      outcome,
      riskLevel,
      complianceFrameworks: [ComplianceFramework.SOC2, ComplianceFramework.GDPR],
      details: this.sanitizeGCPDetails({
        ...serviceDetails,
        ...details
      }),
      timestamp: new Date().toISOString(),
      processingTime: serviceDetails.processingTime,
      dataClassification: 'confidential'
    })
  }
  
  /**
   * Log data access with enhanced compliance tracking
   */
  async logDataAccess(
    context: EnhancedSecurityContext,
    dataDetails: {
      resourceType: string
      resourceId: string
      dataTypes: string[]
      sensitivityLevel: 'low' | 'medium' | 'high' | 'critical'
      purpose: string
      lawfulBasis?: string // GDPR requirement
    },
    outcome: 'success' | 'failure' | 'error',
    details: Record<string, any> = {}
  ): Promise<void> {
    const riskLevel = this.calculateDataAccessRiskLevel(dataDetails.sensitivityLevel, outcome)
    const complianceFrameworks = this.determineComplianceFrameworks(dataDetails)
    
    await this.logEvent({
      eventType: EnhancedAuditEventType.DATA_ACCESS,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource: `${dataDetails.resourceType}:${dataDetails.resourceId}`,
      action: 'read',
      outcome,
      riskLevel,
      complianceFrameworks,
      details: this.sanitizeDetails({
        ...dataDetails,
        ...details,
        userRole: context.userRole,
        authenticationMethod: context.authenticationMethod
      }),
      timestamp: new Date().toISOString(),
      dataClassification: this.mapSensitivityToClassification(dataDetails.sensitivityLevel),
      retentionPolicy: this.getRetentionPolicy(complianceFrameworks),
      geolocation: context.geolocation
    })
  }
  
  /**
   * Log document processing with comprehensive tracking
   */
  async logDocumentProcessing(
    context: EnhancedSecurityContext,
    documentInfo: {
      fileName: string
      fileSize: number
      fileType: string
      processingMethod: string
      extractedDataTypes: string[]
      piiDetected: boolean
      sensitivityScore: number
      gcpService?: string
    },
    outcome: 'success' | 'failure' | 'error',
    details: Record<string, any> = {}
  ): Promise<void> {
    const riskLevel = this.calculateDocumentRiskLevel(documentInfo)
    
    await this.logEvent({
      eventType: EnhancedAuditEventType.DOCUMENT_PROCESSED,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource: 'document',
      action: 'process',
      outcome,
      riskLevel,
      complianceFrameworks: [
        ComplianceFramework.SOC2,
        ComplianceFramework.GDPR,
        ComplianceFramework.CCPA
      ],
      details: this.sanitizeDetails({
        fileName: this.maskFileName(documentInfo.fileName),
        fileSize: documentInfo.fileSize,
        fileType: documentInfo.fileType,
        processingMethod: documentInfo.processingMethod,
        extractedDataTypes: documentInfo.extractedDataTypes,
        piiDetected: documentInfo.piiDetected,
        sensitivityScore: documentInfo.sensitivityScore,
        gcpService: documentInfo.gcpService,
        ...details
      }),
      timestamp: new Date().toISOString(),
      dataClassification: documentInfo.piiDetected ? 'restricted' : 'confidential'
    })
  }
  
  /**
   * Log security incident with immediate alerting
   */
  async logSecurityIncident(
    context: EnhancedSecurityContext,
    incidentDetails: {
      incidentType: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      affectedSystems: string[]
      potentialImpact: string
      mitigationSteps?: string[]
    },
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logEvent({
      eventType: EnhancedAuditEventType.SECURITY_INCIDENT,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource: 'security',
      action: 'incident',
      outcome: 'warning',
      riskLevel: RiskLevel.INCIDENT,
      complianceFrameworks: [
        ComplianceFramework.SOC2,
        ComplianceFramework.ISO27001
      ],
      details: this.sanitizeDetails({
        ...incidentDetails,
        ...details,
        incidentId: crypto.randomUUID(),
        reportedAt: new Date().toISOString()
      }),
      timestamp: new Date().toISOString(),
      dataClassification: 'restricted'
    })
    
    // Immediate flush for security incidents
    await this.flushAuditQueue()
    
    // Trigger incident response (to be implemented)
    await this.triggerIncidentResponse(incidentDetails)
  }
  
  /**
   * Log GDPR data subject request
   */
  async logGDPRRequest(
    context: EnhancedSecurityContext,
    requestDetails: {
      requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection'
      dataSubject: string
      lawfulBasis: string
      processingPurpose: string
      requestedActions: string[]
    },
    outcome: 'success' | 'failure' | 'error',
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logEvent({
      eventType: EnhancedAuditEventType.GDPR_DATA_REQUEST,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource: 'gdpr',
      action: requestDetails.requestType,
      outcome,
      riskLevel: RiskLevel.MEDIUM,
      complianceFrameworks: [ComplianceFramework.GDPR],
      details: this.sanitizeDetails({
        ...requestDetails,
        ...details,
        requestId: crypto.randomUUID(),
        receivedAt: new Date().toISOString()
      }),
      timestamp: new Date().toISOString(),
      dataClassification: 'restricted',
      retentionPolicy: 'gdpr_7_years'
    })
  }
  
  /**
   * Log audit event
   */
  private async logEvent(event: EnhancedAuditEvent): Promise<void> {
    try {
      // Add integrity hash
      event.details.auditHash = this.generateAuditHash(event)
      
      // Check queue size
      if (this.auditQueue.length >= this.MAX_QUEUE_SIZE) {
        logger.error('Audit queue overflow, dropping oldest events')
        this.auditQueue.splice(0, this.BATCH_SIZE)
      }
      
      // Add to queue for batch processing
      this.auditQueue.push(event)
      
      // Log to application logger
      logger.info(`Enhanced Audit Event: ${event.eventType}`, {
        eventType: event.eventType,
        userId: event.userId,
        resource: event.resource,
        action: event.action,
        outcome: event.outcome,
        riskLevel: event.riskLevel,
        complianceFrameworks: event.complianceFrameworks,
        timestamp: event.timestamp
      })
      
      // Immediate flush for high-risk events
      if (event.riskLevel >= RiskLevel.HIGH) {
        await this.flushAuditQueue()
      }
      
      // Flush if queue is getting full
      if (this.auditQueue.length >= this.BATCH_SIZE) {
        await this.flushAuditQueue()
      }
      
    } catch (error) {
      logger.error('Failed to log enhanced audit event', error)
    }
  }
  
  /**
   * Flush audit queue to database with enhanced error handling
   */
  private async flushAuditQueue(): Promise<void> {
    if (this.auditQueue.length === 0 || this.isProcessing) {
      return
    }
    
    this.isProcessing = true
    
    try {
      const events = [...this.auditQueue]
      this.auditQueue = []
      
      const supabase = createClient()
      
      // Prepare batch insert data with enhanced fields
      const auditRecords = events.map(event => ({
        user_id: event.userId || null,
        session_id: event.sessionId || null,
        request_id: event.requestId || null,
        event_type: event.eventType,
        event_details: {
          ...event.details,
          resource: event.resource,
          action: event.action,
          outcome: event.outcome,
          complianceFrameworks: event.complianceFrameworks,
          dataClassification: event.dataClassification,
          retentionPolicy: event.retentionPolicy,
          geolocation: event.geolocation,
          processingTime: event.processingTime
        },
        ip_address: event.ipAddress || null,
        user_agent: event.userAgent || null,
        risk_score: event.riskLevel,
        compliance_frameworks: event.complianceFrameworks,
        data_classification: event.dataClassification || 'internal',
        retention_policy: event.retentionPolicy || 'default_1_year',
        created_at: event.timestamp
      }))
      
      // Batch insert to enhanced audit table
      const { error } = await supabase
        .from('enhanced_security_audit_log')
        .insert(auditRecords)
      
      if (error) {
        logger.error('Failed to flush enhanced audit queue to database', error)
        // Re-add events to queue for retry
        this.auditQueue.unshift(...events)
      } else {
        logger.debug(`Flushed ${events.length} enhanced audit events to database`)
      }
      
    } catch (error) {
      logger.error('Failed to flush enhanced audit queue', error)
    } finally {
      this.isProcessing = false
    }
  }
  
  /**
   * Generate integrity hash for audit event
   */
  private generateAuditHash(event: EnhancedAuditEvent): string {
    const hashData = {
      eventType: event.eventType,
      userId: event.userId,
      timestamp: event.timestamp,
      resource: event.resource,
      action: event.action,
      outcome: event.outcome
    }
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex')
  }
  
  /**
   * Map GCP service to audit event type
   */
  private mapGCPServiceToEventType(serviceName: string): EnhancedAuditEventType {
    switch (serviceName) {
      case 'document-ai':
        return EnhancedAuditEventType.GCP_DOCUMENT_AI_REQUEST
      case 'vision-api':
        return EnhancedAuditEventType.GCP_VISION_API_REQUEST
      default:
        return EnhancedAuditEventType.GCP_API_CALL
    }
  }
  
  /**
   * Calculate risk level for GCP operations
   */
  private calculateGCPRiskLevel(
    serviceDetails: GCPServiceAuditDetails,
    outcome: string
  ): RiskLevel {
    if (outcome === 'failure' || outcome === 'error') {
      return RiskLevel.MEDIUM
    }
    
    // High volume operations are medium risk
    if (serviceDetails.requestSize && serviceDetails.requestSize > 10 * 1024 * 1024) {
      return RiskLevel.MEDIUM
    }
    
    return RiskLevel.LOW
  }
  
  /**
   * Calculate data access risk level
   */
  private calculateDataAccessRiskLevel(
    sensitivityLevel: string,
    outcome: string
  ): RiskLevel {
    if (outcome === 'failure') {
      return RiskLevel.MEDIUM
    }
    
    switch (sensitivityLevel) {
      case 'critical':
        return RiskLevel.HIGH
      case 'high':
        return RiskLevel.MEDIUM
      case 'medium':
        return RiskLevel.LOW
      default:
        return RiskLevel.INFO
    }
  }
  
  /**
   * Calculate document processing risk level
   */
  private calculateDocumentRiskLevel(documentInfo: any): RiskLevel {
    if (documentInfo.piiDetected && documentInfo.sensitivityScore > 80) {
      return RiskLevel.HIGH
    }
    
    if (documentInfo.piiDetected) {
      return RiskLevel.MEDIUM
    }
    
    return RiskLevel.LOW
  }
  
  /**
   * Determine applicable compliance frameworks
   */
  private determineComplianceFrameworks(dataDetails: any): ComplianceFramework[] {
    const frameworks: ComplianceFramework[] = [ComplianceFramework.SOC2]
    
    if (dataDetails.dataTypes.some((type: string) => 
      ['pii', 'personal_data', 'financial_data'].includes(type)
    )) {
      frameworks.push(ComplianceFramework.GDPR)
      frameworks.push(ComplianceFramework.CCPA)
    }
    
    return frameworks
  }
  
  /**
   * Map sensitivity level to data classification
   */
  private mapSensitivityToClassification(
    sensitivityLevel: string
  ): 'public' | 'internal' | 'confidential' | 'restricted' {
    switch (sensitivityLevel) {
      case 'critical':
        return 'restricted'
      case 'high':
        return 'confidential'
      case 'medium':
        return 'internal'
      default:
        return 'public'
    }
  }
  
  /**
   * Get retention policy based on compliance frameworks
   */
  private getRetentionPolicy(frameworks: ComplianceFramework[]): string {
    if (frameworks.includes(ComplianceFramework.GDPR)) {
      return 'gdpr_7_years'
    }
    
    if (frameworks.includes(ComplianceFramework.SOC2)) {
      return 'soc2_3_years'
    }
    
    return 'default_1_year'
  }
  
  /**
   * Sanitize GCP service details
   */
  private sanitizeGCPDetails(details: any): Record<string, any> {
    const sanitized = { ...details }
    
    // Remove sensitive credentials
    if (sanitized.credentials) {
      sanitized.credentials = '[REDACTED]'
    }
    
    // Mask file paths
    if (sanitized.resourcePath) {
      sanitized.resourcePath = this.maskFilePath(sanitized.resourcePath)
    }
    
    return this.sanitizeDetails(sanitized)
  }
  
  /**
   * Enhanced detail sanitization
   */
  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(details)) {
      if (typeof value === 'string') {
        // Apply enhanced PII masking
        const masked = PIIMasker.maskPII(value, {
          maskSSN: true,
          maskAccountNumbers: true,
          maskPhoneNumbers: true,
          maskEmailAddresses: true,
          preserveFormat: true
        })
        sanitized[key] = masked.maskedText
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value)
      } else {
        sanitized[key] = value
      }
    }
    
    return sanitized
  }
  
  /**
   * Mask file name for logging
   */
  private maskFileName(fileName: string): string {
    const parts = fileName.split('.')
    const extension = parts.pop()
    const name = parts.join('.')
    
    if (name.length <= 4) {
      return `${name}.${extension}`
    }
    
    return `${name.substring(0, 2)}...${name.substring(name.length - 2)}.${extension}`
  }
  
  /**
   * Mask file path for logging
   */
  private maskFilePath(path: string): string {
    const parts = path.split('/')
    return parts.map((part, index) => {
      if (index < 2 || index === parts.length - 1) {
        return part
      }
      return '***'
    }).join('/')
  }
  
  /**
   * Trigger incident response procedures
   */
  private async triggerIncidentResponse(incidentDetails: any): Promise<void> {
    // This would integrate with incident response system
    logger.critical(`Security incident detected: ${incidentDetails.incidentType}`, {
      severity: incidentDetails.severity,
      affectedSystems: incidentDetails.affectedSystems,
      potentialImpact: incidentDetails.potentialImpact
    })
    
    // TODO: Implement actual incident response triggers
    // - Send alerts to security team
    // - Create tickets in incident management system
    // - Trigger automated containment procedures
  }
}

// Export singleton instance
export const enhancedAuditLogger = EnhancedAuditLogger.getInstance()

// Export types and enums
export {
  EnhancedAuditEventType,
  RiskLevel,
  ComplianceFramework,
  type EnhancedAuditEvent,
  type EnhancedSecurityContext,
  type GCPServiceAuditDetails
}