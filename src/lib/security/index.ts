/**
 * Security System Integration Hub
 * Exports and integrates all security components
 */

// Core security components
export { auditLogger, AuditEventType, RiskLevel } from './auditLogger';
export { createAPIProtection } from './apiProtection';
export { createEnhancedRateLimiter, enhancedRateLimitStore } from './enhancedRateLimiter';

// Authentication and MFA
export { mfaService, MFAMethod } from './mfaAuthentication';
export { enhancedAuthService } from './enhancedAuth';

// Encryption and secure storage
export { 
  encryptionService, 
  fieldEncryption, 
  DataClassification,
  EncryptionAlgorithm 
} from './dataEncryption';
export { secureStorageService, STORAGE_CONFIGS } from './secureStorage';

// Threat detection and monitoring
export { 
  threatDetectionService, 
  ThreatType, 
  ThreatSeverity 
} from './threatDetection';
export { securityMonitoringService } from './securityMonitoring';

// Compliance framework
export { 
  complianceFrameworkService, 
  ComplianceFramework, 
  RequirementType 
} from './complianceFramework';

// Import dependencies for internal use
import { auditLogger, AuditEventType, RiskLevel } from './auditLogger';
import { threatDetectionService } from './threatDetection';
import { encryptionService } from './dataEncryption';
import { mfaService } from './mfaAuthentication';
import { complianceFrameworkService } from './complianceFramework';
import { securityMonitoringService } from './securityMonitoring';

/**
 * Comprehensive Security Manager
 * Orchestrates all security components and provides unified security operations
 */
export class SecurityManager {
  private static instance: SecurityManager;
  private initialized = false;
  
  private constructor() {}
  
  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }
  
  /**
   * Initialize the security system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Initialize security event processing
      this.setupSecurityEventProcessing();
      
      // Start security monitoring
      this.startSecurityMonitoring();
      
      // Initialize compliance monitoring
      this.setupComplianceMonitoring();
      
      this.initialized = true;
      
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR, // Using existing event type
        {},
        {
          action: 'security_system_initialized',
          timestamp: new Date().toISOString(),
          components: [
            'audit_logging',
            'api_protection',
            'rate_limiting',
            'mfa_authentication',
            'encryption',
            'threat_detection',
            'security_monitoring',
            'compliance_framework'
          ]
        },
        RiskLevel.LOW
      );
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        {},
        {
          action: 'security_system_initialization_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.CRITICAL
      );
      
      throw new Error('Failed to initialize security system');
    }
  }
  
  /**
   * Setup security event processing pipeline
   */
  private setupSecurityEventProcessing(): void {
    // Intercept audit events and process them through threat detection
    const originalLogEvent = auditLogger.logEvent.bind(auditLogger);
    
    auditLogger.logEvent = (eventType, context, details, riskLevel) => {
      // Call original logging
      originalLogEvent(eventType, context, details, riskLevel);
      
      // Create audit event for threat detection
      const auditEvent = {
        id: Math.random().toString(36).substr(2, 9),
        eventType,
        userId: context.userId || undefined,
        sessionId: context.sessionId || undefined,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        timestamp: new Date().toISOString(),
        details: details || {},
        riskLevel
      };
      
      // Process through threat detection (async, don't block logging)
      threatDetectionService.processEvent(auditEvent).catch(error => {
        console.error('Error processing security event:', error);
      });
    };
  }
  
  /**
   * Start comprehensive security monitoring
   */
  private startSecurityMonitoring(): void {
    // Monitor system health
    setInterval(() => {
      this.performSecurityHealthCheck();
    }, 300000); // Every 5 minutes
    
    // Generate security reports
    setInterval(() => {
      this.generateAutomatedSecurityReport();
    }, 86400000); // Daily
  }
  
  /**
   * Setup compliance monitoring
   */
  private setupComplianceMonitoring(): void {
    // Monitor for compliance violations
    setInterval(() => {
      this.checkComplianceStatus();
    }, 3600000); // Every hour
  }
  
  /**
   * Perform comprehensive security health check
   */
  private async performSecurityHealthCheck(): Promise<void> {
    try {
      const healthCheck = {
        timestamp: new Date(),
        checks: {
          auditLogging: this.checkAuditLogging(),
          threatDetection: this.checkThreatDetection(),
          encryption: this.checkEncryption(),
          authentication: this.checkAuthentication(),
          compliance: this.checkCompliance()
        }
      };
      
      const failedChecks = Object.entries(healthCheck.checks)
        .filter(([_, status]) => !status)
        .map(([check, _]) => check);
      
      if (failedChecks.length > 0) {
        auditLogger.logEvent(
          AuditEventType.SYSTEM_ERROR,
          {},
          {
            action: 'security_health_check_failed',
            failedChecks,
            healthCheck
          },
          RiskLevel.HIGH
        );
      }
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        {},
        {
          action: 'security_health_check_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
    }
  }
  
  /**
   * Generate automated security report
   */
  private async generateAutomatedSecurityReport(): Promise<void> {
    try {
      const dashboard = await securityMonitoringService.getSecurityDashboard();
      
      // Generate daily security summary
      const summary = {
        date: new Date().toISOString().split('T')[0],
        metrics: dashboard.metrics,
        criticalAlerts: dashboard.criticalAlerts.length,
        systemStatus: dashboard.systemStatus.overall,
        topThreats: dashboard.topThreats.slice(0, 5)
      };
      
      auditLogger.logEvent(
        AuditEventType.SOC2_AUDIT_EVENT,
        {},
        {
          action: 'daily_security_report_generated',
          summary
        },
        RiskLevel.LOW
      );
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        {},
        {
          action: 'security_report_generation_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.MEDIUM
      );
    }
  }
  
  /**
   * Check compliance status
   */
  private checkComplianceStatus(): void {
    try {
      const dashboard = complianceFrameworkService.getComplianceDashboard();
      
      // Check for compliance issues
      if (dashboard.overall.nonCompliant > 0) {
        auditLogger.logEvent(
          AuditEventType.COMPLIANCE_VIOLATION,
          {},
          {
            action: 'compliance_violations_detected',
            nonCompliantRequirements: dashboard.overall.nonCompliant,
            totalRequirements: dashboard.overall.total
          },
          RiskLevel.HIGH
        );
      }
      
      // Check for overdue assessments
      if (dashboard.upcomingAssessments.length > 0) {
        const overdueAssessments = dashboard.upcomingAssessments.filter(
          req => req.nextAssessment < new Date()
        );
        
        if (overdueAssessments.length > 0) {
          auditLogger.logEvent(
            AuditEventType.COMPLIANCE_VIOLATION,
            {},
            {
              action: 'overdue_compliance_assessments',
              count: overdueAssessments.length,
              assessments: overdueAssessments.map(a => a.id)
            },
            RiskLevel.MEDIUM
          );
        }
      }
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        {},
        {
          action: 'compliance_status_check_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.MEDIUM
      );
    }
  }
  
  /**
   * Health check methods
   */
  private checkAuditLogging(): boolean {
    try {
      // Test audit logging
      const events = auditLogger.getEvents(1);
      return true;
    } catch {
      return false;
    }
  }
  
  private checkThreatDetection(): boolean {
    try {
      // Check if threat detection service is responding
      const alerts = threatDetectionService.getActiveAlerts();
      return true;
    } catch {
      return false;
    }
  }
  
  private checkEncryption(): boolean {
    try {
      // Test encryption service
      const keys = encryptionService.listKeys();
      return true;
    } catch {
      return false;
    }
  }
  
  private checkAuthentication(): boolean {
    try {
      // Check MFA service
      const status = mfaService.getUserMFAStatus('test-user');
      return true;
    } catch {
      return false;
    }
  }
  
  private checkCompliance(): boolean {
    try {
      // Check compliance framework
      const dashboard = complianceFrameworkService.getComplianceDashboard();
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Public security operations
   */
  
  /**
   * Get comprehensive security status
   */
  async getSecurityStatus(): Promise<{
    system: {
      initialized: boolean;
      healthy: boolean;
      lastHealthCheck: Date;
    };
    metrics: any;
    threats: any;
    compliance: any;
  }> {
    const dashboard = await securityMonitoringService.getSecurityDashboard();
    const complianceDashboard = complianceFrameworkService.getComplianceDashboard();
    
    return {
      system: {
        initialized: this.initialized,
        healthy: dashboard.systemStatus.overall === 'healthy',
        lastHealthCheck: new Date()
      },
      metrics: dashboard.metrics,
      threats: {
        total: dashboard.metrics.totalThreats,
        critical: dashboard.criticalAlerts.length,
        topThreats: dashboard.topThreats
      },
      compliance: {
        overall: complianceDashboard.overall,
        frameworks: complianceDashboard.byFramework,
        openRisks: complianceDashboard.openRisks.length
      }
    };
  }
  
  /**
   * Emergency security lockdown
   */
  async emergencyLockdown(reason: string, initiatedBy: string): Promise<void> {
    auditLogger.logEvent(
      AuditEventType.SECURITY_THREAT_DETECTED,
      { userId: initiatedBy },
      {
        action: 'emergency_lockdown_initiated',
        reason,
        timestamp: new Date().toISOString()
      },
      RiskLevel.CRITICAL
    );
    
    // In a real implementation, this would:
    // 1. Block all API access except for admin endpoints
    // 2. Invalidate all user sessions
    // 3. Send emergency notifications
    // 4. Enable enhanced monitoring
    
    console.log(`EMERGENCY LOCKDOWN INITIATED: ${reason}`);
  }
  
  /**
   * Security incident response
   */
  async respondToIncident(
    type: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    affectedSystems: string[]
  ): Promise<string> {
    const incident = securityMonitoringService.createIncident(
      `Security Incident: ${type}`,
      description,
      severity,
      'security',
      affectedSystems
    );
    
    auditLogger.logEvent(
      AuditEventType.SECURITY_THREAT_DETECTED,
      {},
      {
        action: 'security_incident_created',
        incidentId: incident.id,
        type,
        severity,
        affectedSystems
      },
      severity === 'critical' ? RiskLevel.CRITICAL :
      severity === 'high' ? RiskLevel.HIGH :
      severity === 'medium' ? RiskLevel.MEDIUM : RiskLevel.LOW
    );
    
    return incident.id;
  }
}

// Export the singleton security manager
export const securityManager = SecurityManager.getInstance();

// Auto-initialize security system
if (typeof window === 'undefined') {
  // Server-side initialization
  securityManager.initialize().catch(error => {
    console.error('Failed to initialize security system:', error);
  });
}
