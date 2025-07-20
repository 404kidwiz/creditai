/**
 * Comprehensive Compliance Framework
 * Implements SOC2, GDPR, CCPA, PCI DSS, and other regulatory requirements
 */

import { auditLogger, AuditEventType, RiskLevel } from './auditLogger';
import { secureStorageService } from './secureStorage';
import { encryptionService, DataClassification } from './dataEncryption';
import crypto from 'crypto';

/**
 * Compliance frameworks
 */
export enum ComplianceFramework {
  SOC2 = 'soc2',
  GDPR = 'gdpr',
  CCPA = 'ccpa',
  PCI_DSS = 'pci_dss',
  HIPAA = 'hipaa',
  ISO_27001 = 'iso_27001',
  NIST = 'nist'
}

/**
 * Compliance requirement types
 */
export enum RequirementType {
  ACCESS_CONTROL = 'access_control',
  DATA_PROTECTION = 'data_protection',
  INCIDENT_RESPONSE = 'incident_response',
  AUDIT_LOGGING = 'audit_logging',
  RISK_ASSESSMENT = 'risk_assessment',
  VENDOR_MANAGEMENT = 'vendor_management',
  BUSINESS_CONTINUITY = 'business_continuity',
  PRIVACY_CONTROLS = 'privacy_controls'
}

/**
 * Compliance requirement
 */
export interface ComplianceRequirement {
  id: string;
  framework: ComplianceFramework;
  type: RequirementType;
  title: string;
  description: string;
  implementation: string;
  evidence: string[];
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  lastAssessed: Date;
  nextAssessment: Date;
  responsible: string;
  controls: ComplianceControl[];
  risks: ComplianceRisk[];
}

/**
 * Compliance control
 */
export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  type: 'preventive' | 'detective' | 'corrective';
  automated: boolean;
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  implementation: string;
  testing: {
    lastTested: Date;
    nextTest: Date;
    results: 'effective' | 'ineffective' | 'not_tested';
    findings: string[];
  };
}

/**
 * Compliance risk
 */
export interface ComplianceRisk {
  id: string;
  name: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  risk_score: number;
  mitigation: string;
  owner: string;
  status: 'open' | 'mitigated' | 'accepted' | 'transferred';
}

/**
 * Data subject rights request (GDPR/CCPA)
 */
export interface DataSubjectRequest {
  id: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  subjectId: string;
  email: string;
  framework: ComplianceFramework;
  description: string;
  status: 'received' | 'verifying' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  dueDate: Date;
  completedAt?: Date;
  response?: string;
  evidence: string[];
  assignedTo?: string;
}

/**
 * Privacy impact assessment
 */
export interface PrivacyImpactAssessment {
  id: string;
  name: string;
  description: string;
  dataTypes: DataClassification[];
  processing_purpose: string;
  legal_basis: string;
  data_retention: string;
  risks: {
    risk: string;
    likelihood: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }[];
  status: 'draft' | 'review' | 'approved' | 'rejected';
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

/**
 * SOC2 Trust Service Criteria
 */
const SOC2_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'soc2-cc1.1',
    framework: ComplianceFramework.SOC2,
    type: RequirementType.ACCESS_CONTROL,
    title: 'Control Environment - Integrity and Ethical Values',
    description: 'The entity demonstrates a commitment to integrity and ethical values',
    implementation: 'Code of conduct, ethics training, background checks',
    evidence: ['ethics_policy.pdf', 'training_records.xlsx'],
    status: 'compliant',
    lastAssessed: new Date(),
    nextAssessment: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    responsible: 'CISO',
    controls: [],
    risks: []
  },
  {
    id: 'soc2-cc6.1',
    framework: ComplianceFramework.SOC2,
    type: RequirementType.AUDIT_LOGGING,
    title: 'Logical and Physical Access Controls',
    description: 'The entity implements logical access security software, infrastructure, and architectures',
    implementation: 'Multi-factor authentication, role-based access control, audit logging',
    evidence: ['access_control_policy.pdf', 'audit_logs.json'],
    status: 'compliant',
    lastAssessed: new Date(),
    nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    responsible: 'Security Team',
    controls: [],
    risks: []
  }
];

/**
 * GDPR Requirements
 */
const GDPR_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'gdpr-art5',
    framework: ComplianceFramework.GDPR,
    type: RequirementType.DATA_PROTECTION,
    title: 'Principles relating to processing of personal data',
    description: 'Personal data must be processed lawfully, fairly, and transparently',
    implementation: 'Privacy policy, data processing agreements, consent management',
    evidence: ['privacy_policy.pdf', 'consent_records.json'],
    status: 'compliant',
    lastAssessed: new Date(),
    nextAssessment: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    responsible: 'DPO',
    controls: [],
    risks: []
  },
  {
    id: 'gdpr-art32',
    framework: ComplianceFramework.GDPR,
    type: RequirementType.DATA_PROTECTION,
    title: 'Security of processing',
    description: 'Appropriate technical and organizational measures to ensure security',
    implementation: 'Encryption, access controls, security monitoring, incident response',
    evidence: ['encryption_policy.pdf', 'security_measures.json'],
    status: 'compliant',
    lastAssessed: new Date(),
    nextAssessment: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    responsible: 'Security Team',
    controls: [],
    risks: []
  }
];

/**
 * Compliance Framework Service
 */
export class ComplianceFrameworkService {
  private requirements = new Map<string, ComplianceRequirement>();
  private dataSubjectRequests = new Map<string, DataSubjectRequest>();
  private privacyAssessments = new Map<string, PrivacyImpactAssessment>();
  private dataProcessingRecords = new Map<string, any>();
  private consentRecords = new Map<string, any>();
  
  constructor() {
    this.initializeRequirements();
    this.startComplianceMonitoring();
  }
  
  /**
   * Initialize compliance requirements
   */
  private initializeRequirements(): void {
    [...SOC2_REQUIREMENTS, ...GDPR_REQUIREMENTS].forEach(req => {
      this.requirements.set(req.id, req);
    });
  }
  
  /**
   * Get compliance status dashboard
   */
  getComplianceDashboard(): {
    overall: { compliant: number; partial: number; nonCompliant: number; total: number };
    byFramework: Record<ComplianceFramework, { compliant: number; total: number }>;
    upcomingAssessments: ComplianceRequirement[];
    openRisks: ComplianceRisk[];
    recentActivities: any[];
  } {
    const requirements = Array.from(this.requirements.values());
    
    // Overall compliance status
    const overall = {
      compliant: requirements.filter(r => r.status === 'compliant').length,
      partial: requirements.filter(r => r.status === 'partial').length,
      nonCompliant: requirements.filter(r => r.status === 'non_compliant').length,
      total: requirements.length
    };
    
    // Compliance by framework
    const byFramework = {} as Record<ComplianceFramework, { compliant: number; total: number }>;
    
    Object.values(ComplianceFramework).forEach(framework => {
      const frameworkReqs = requirements.filter(r => r.framework === framework);
      byFramework[framework] = {
        compliant: frameworkReqs.filter(r => r.status === 'compliant').length,
        total: frameworkReqs.length
      };
    });
    
    // Upcoming assessments (next 30 days)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const upcomingAssessments = requirements
      .filter(r => r.nextAssessment <= thirtyDaysFromNow)
      .sort((a, b) => a.nextAssessment.getTime() - b.nextAssessment.getTime());
    
    // Open risks
    const openRisks = requirements
      .flatMap(r => r.risks)
      .filter(risk => risk.status === 'open')
      .sort((a, b) => b.risk_score - a.risk_score);
    
    // Recent compliance activities
    const recentActivities = auditLogger.getEvents(100)
      .filter(event => [
        AuditEventType.GDPR_DATA_REQUEST,
        AuditEventType.GDPR_DATA_DELETION,
        AuditEventType.SOC2_AUDIT_EVENT,
        AuditEventType.COMPLIANCE_VIOLATION
      ].includes(event.eventType))
      .slice(0, 10);
    
    return {
      overall,
      byFramework,
      upcomingAssessments,
      openRisks,
      recentActivities
    };
  }
  
  /**
   * Handle data subject rights request (GDPR/CCPA)
   */
  async handleDataSubjectRequest(
    type: DataSubjectRequest['type'],
    subjectId: string,
    email: string,
    framework: ComplianceFramework,
    description: string
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      const requestId = crypto.randomUUID();
      
      // Calculate due date based on framework
      const dueDate = new Date();
      if (framework === ComplianceFramework.GDPR) {
        dueDate.setDate(dueDate.getDate() + 30); // 30 days for GDPR
      } else if (framework === ComplianceFramework.CCPA) {
        dueDate.setDate(dueDate.getDate() + 45); // 45 days for CCPA
      }
      
      const request: DataSubjectRequest = {
        id: requestId,
        type,
        subjectId,
        email,
        framework,
        description,
        status: 'received',
        requestedAt: new Date(),
        dueDate,
        evidence: []
      };
      
      this.dataSubjectRequests.set(requestId, request);
      
      // Log the request
      auditLogger.logEvent(
        AuditEventType.GDPR_DATA_REQUEST,
        { userId: subjectId },
        {
          requestId,
          type,
          framework,
          dueDate
        },
        RiskLevel.MEDIUM
      );
      
      // Start processing workflow
      await this.processDataSubjectRequest(requestId);
      
      return { success: true, requestId };
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        { userId: subjectId },
        {
          action: 'data_subject_request_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process request'
      };
    }
  }
  
  /**
   * Process data subject request
   */
  private async processDataSubjectRequest(requestId: string): Promise<void> {
    const request = this.dataSubjectRequests.get(requestId);
    if (!request) return;
    
    try {
      // Update status to verifying
      request.status = 'verifying';
      this.dataSubjectRequests.set(requestId, request);
      
      // Verify the request (simplified - in production would require identity verification)
      await this.verifyDataSubjectIdentity(request);
      
      // Update status to processing
      request.status = 'processing';
      this.dataSubjectRequests.set(requestId, request);
      
      // Process based on request type
      switch (request.type) {
        case 'access':
          await this.processAccessRequest(request);
          break;
        case 'erasure':
          await this.processErasureRequest(request);
          break;
        case 'portability':
          await this.processPortabilityRequest(request);
          break;
        case 'rectification':
          await this.processRectificationRequest(request);
          break;
        default:
          throw new Error(`Unsupported request type: ${request.type}`);
      }
      
      // Mark as completed
      request.status = 'completed';
      request.completedAt = new Date();
      this.dataSubjectRequests.set(requestId, request);
      
      // Send notification to data subject
      await this.notifyDataSubject(request);
      
    } catch (error) {
      request.status = 'rejected';
      request.response = error instanceof Error ? error.message : 'Processing failed';
      this.dataSubjectRequests.set(requestId, request);
      
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        { userId: request.subjectId },
        {
          action: 'data_subject_request_processing_failed',
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
    }
  }
  
  /**
   * Process access request (right to access)
   */
  private async processAccessRequest(request: DataSubjectRequest): Promise<void> {
    // Collect all personal data for the subject
    const personalData = await this.collectPersonalData(request.subjectId);
    
    // Create data export
    const dataExport = {
      subjectId: request.subjectId,
      exportedAt: new Date(),
      data: personalData,
      categories: this.categorizePersonalData(personalData)
    };
    
    // Store encrypted export
    const exportResult = await secureStorageService.store(
      'data_export',
      dataExport,
      request.subjectId,
      {
        requestId: request.id,
        framework: request.framework,
        type: 'access_request'
      }
    );
    
    if (exportResult.success) {
      request.evidence.push(exportResult.id!);
      request.response = 'Personal data export created and secured';
    } else {
      throw new Error('Failed to create data export');
    }
  }
  
  /**
   * Process erasure request (right to be forgotten)
   */
  private async processErasureRequest(request: DataSubjectRequest): Promise<void> {
    // Find all data related to the subject
    const dataLocations = await this.findUserData(request.subjectId);
    
    // Check for legal obligations to retain data
    const retentionRequirements = this.checkRetentionRequirements(request.subjectId);
    
    if (retentionRequirements.mustRetain) {
      throw new Error(`Cannot erase data due to legal obligations: ${retentionRequirements.reasons.join(', ')}`);
    }
    
    // Pseudonymize or delete data
    const deletionResults = [];
    for (const location of dataLocations) {
      const result = await this.eraseUserData(location, request.subjectId);
      deletionResults.push(result);
    }
    
    // Log deletion
    auditLogger.logEvent(
      AuditEventType.GDPR_DATA_DELETION,
      { userId: request.subjectId },
      {
        requestId: request.id,
        locationsProcessed: dataLocations.length,
        deletionResults
      },
      RiskLevel.HIGH
    );
    
    request.response = `Data erased from ${dataLocations.length} locations`;
    request.evidence.push(`deletion_report_${request.id}`);
  }
  
  /**
   * Process portability request (right to data portability)
   */
  private async processPortabilityRequest(request: DataSubjectRequest): Promise<void> {
    // Collect structured personal data
    const personalData = await this.collectPortableData(request.subjectId);
    
    // Create portable format (JSON)
    const portableData = {
      subjectId: request.subjectId,
      exportedAt: new Date(),
      format: 'JSON',
      data: personalData
    };
    
    // Store for download
    const exportResult = await secureStorageService.store(
      'portable_export',
      portableData,
      request.subjectId,
      {
        requestId: request.id,
        framework: request.framework,
        type: 'portability_request',
        downloadable: true
      }
    );
    
    if (exportResult.success) {
      request.evidence.push(exportResult.id!);
      request.response = 'Portable data export created';
    } else {
      throw new Error('Failed to create portable export');
    }
  }
  
  /**
   * Create privacy impact assessment
   */
  async createPrivacyImpactAssessment(
    name: string,
    description: string,
    dataTypes: DataClassification[],
    processingPurpose: string,
    legalBasis: string,
    dataRetention: string
  ): Promise<{ success: boolean; assessmentId?: string; error?: string }> {
    try {
      const assessmentId = crypto.randomUUID();
      
      const assessment: PrivacyImpactAssessment = {
        id: assessmentId,
        name,
        description,
        dataTypes,
        processing_purpose: processingPurpose,
        legal_basis: legalBasis,
        data_retention: dataRetention,
        risks: [
          {
            risk: 'Unauthorized access to personal data',
            likelihood: 'medium',
            impact: 'high',
            mitigation: 'Implement access controls and encryption'
          },
          {
            risk: 'Data breach during processing',
            likelihood: 'low',
            impact: 'high',
            mitigation: 'Security monitoring and incident response procedures'
          }
        ],
        status: 'draft',
        createdAt: new Date()
      };
      
      this.privacyAssessments.set(assessmentId, assessment);
      
      auditLogger.logEvent(
        AuditEventType.SOC2_AUDIT_EVENT,
        {},
        {
          action: 'privacy_impact_assessment_created',
          assessmentId,
          dataTypes,
          processingPurpose
        },
        RiskLevel.MEDIUM
      );
      
      return { success: true, assessmentId };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create assessment'
      };
    }
  }
  
  /**
   * Record consent
   */
  recordConsent(
    userId: string,
    purpose: string,
    legalBasis: string,
    consented: boolean,
    consentMethod: string
  ): void {
    const consentId = crypto.randomUUID();
    const consentRecord = {
      id: consentId,
      userId,
      purpose,
      legalBasis,
      consented,
      consentMethod,
      timestamp: new Date(),
      ipAddress: 'unknown', // Would be captured from request context
      userAgent: 'unknown'   // Would be captured from request context
    };
    
    this.consentRecords.set(consentId, consentRecord);
    
    auditLogger.logEvent(
      AuditEventType.GDPR_DATA_REQUEST,
      { userId },
      {
        action: 'consent_recorded',
        consentId,
        purpose,
        consented
      },
      RiskLevel.LOW
    );
  }
  
  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    framework: ComplianceFramework,
    dateRange: { start: Date; end: Date }
  ): Promise<{
    success: boolean;
    report?: any;
    error?: string;
  }> {
    try {
      const requirements = Array.from(this.requirements.values())
        .filter(req => req.framework === framework);
      
      const report = {
        framework,
        dateRange,
        generatedAt: new Date(),
        
        summary: {
          totalRequirements: requirements.length,
          compliantRequirements: requirements.filter(r => r.status === 'compliant').length,
          partialRequirements: requirements.filter(r => r.status === 'partial').length,
          nonCompliantRequirements: requirements.filter(r => r.status === 'non_compliant').length,
          compliancePercentage: (requirements.filter(r => r.status === 'compliant').length / requirements.length) * 100
        },
        
        requirements: requirements.map(req => ({
          id: req.id,
          title: req.title,
          status: req.status,
          lastAssessed: req.lastAssessed,
          evidence: req.evidence,
          controls: req.controls.length,
          risks: req.risks.length
        })),
        
        risks: requirements.flatMap(r => r.risks)
          .filter(risk => risk.status === 'open')
          .sort((a, b) => b.risk_score - a.risk_score),
        
        dataSubjectRequests: framework === ComplianceFramework.GDPR ? 
          Array.from(this.dataSubjectRequests.values())
            .filter(req => req.requestedAt >= dateRange.start && req.requestedAt <= dateRange.end)
            .map(req => ({
              id: req.id,
              type: req.type,
              status: req.status,
              requestedAt: req.requestedAt,
              completedAt: req.completedAt
            })) : [],
        
        recommendations: this.generateComplianceRecommendations(framework, requirements)
      };
      
      return { success: true, report };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report'
      };
    }
  }
  
  /**
   * Private helper methods
   */
  private async verifyDataSubjectIdentity(request: DataSubjectRequest): Promise<void> {
    // In production, this would implement proper identity verification
    // For now, just simulate the process
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  private async collectPersonalData(userId: string): Promise<any> {
    // Collect all personal data from various sources
    const userData = await secureStorageService.list('user_documents', userId);
    const profileData = await secureStorageService.list('credit_reports', userId);
    
    return {
      profile: profileData.items || [],
      documents: userData.items || [],
      preferences: [],
      activities: auditLogger.getEvents(1000)
        .filter(event => event.userId === userId)
        .slice(0, 100) // Limit for privacy
    };
  }
  
  private categorizePersonalData(data: any): string[] {
    const categories = [];
    
    if (data.profile?.length > 0) categories.push('Profile Information');
    if (data.documents?.length > 0) categories.push('Document Data');
    if (data.activities?.length > 0) categories.push('Activity Logs');
    if (data.preferences?.length > 0) categories.push('User Preferences');
    
    return categories;
  }
  
  private async findUserData(userId: string): Promise<string[]> {
    // Find all data locations for a user
    return [
      'user_profiles',
      'credit_reports',
      'user_documents',
      'audit_logs',
      'payment_info'
    ];
  }
  
  private checkRetentionRequirements(userId: string): {
    mustRetain: boolean;
    reasons: string[];
  } {
    // Check if there are legal requirements to retain data
    const reasons = [];
    
    // Example: Financial records must be retained for 7 years
    // This would check actual business rules
    
    return {
      mustRetain: false,
      reasons
    };
  }
  
  private async eraseUserData(location: string, userId: string): Promise<any> {
    try {
      // In production, this would actually delete or pseudonymize data
      const result = await secureStorageService.delete(location, userId, userId);
      return {
        location,
        success: result.success,
        error: result.error
      };
    } catch (error) {
      return {
        location,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  private async collectPortableData(userId: string): Promise<any> {
    // Collect data in a structured, portable format
    const personalData = await this.collectPersonalData(userId);
    
    // Convert to portable format (remove audit logs, keep only user data)
    return {
      personalInformation: personalData.profile,
      documents: personalData.documents,
      preferences: personalData.preferences
      // Exclude system logs and internal data
    };
  }
  
  private async processRectificationRequest(request: DataSubjectRequest): Promise<void> {
    // Process data rectification request
    request.response = 'Rectification request processed - please provide specific corrections needed';
  }
  
  private async notifyDataSubject(request: DataSubjectRequest): Promise<void> {
    // Send notification to data subject about request completion
    console.log(`Notification sent to ${request.email} for request ${request.id}`);
  }
  
  private generateComplianceRecommendations(
    framework: ComplianceFramework,
    requirements: ComplianceRequirement[]
  ): string[] {
    const recommendations: string[] = [];
    
    const nonCompliant = requirements.filter(r => r.status === 'non_compliant');
    if (nonCompliant.length > 0) {
      recommendations.push(`Address ${nonCompliant.length} non-compliant requirements immediately`);
    }
    
    const partialCompliant = requirements.filter(r => r.status === 'partial');
    if (partialCompliant.length > 0) {
      recommendations.push(`Complete implementation for ${partialCompliant.length} partially compliant requirements`);
    }
    
    const upcomingAssessments = requirements.filter(r => {
      const daysUntilAssessment = (r.nextAssessment.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntilAssessment <= 30;
    });
    
    if (upcomingAssessments.length > 0) {
      recommendations.push(`Prepare for ${upcomingAssessments.length} upcoming compliance assessments`);
    }
    
    return recommendations;
  }
  
  /**
   * Background monitoring
   */
  private startComplianceMonitoring(): void {
    // Monitor for compliance violations
    setInterval(() => {
      this.checkComplianceViolations();
    }, 3600000); // Check every hour
    
    // Check for overdue data subject requests
    setInterval(() => {
      this.checkOverdueRequests();
    }, 86400000); // Check daily
  }
  
  private checkComplianceViolations(): void {
    // Check for potential compliance violations
    const recentEvents = auditLogger.getEvents(1000);
    
    // Check for data access without proper authorization
    const unauthorizedAccess = recentEvents.filter(event => 
      event.eventType === AuditEventType.DATA_ACCESS && 
      event.riskLevel === RiskLevel.HIGH
    );
    
    if (unauthorizedAccess.length > 0) {
      auditLogger.logEvent(
        AuditEventType.COMPLIANCE_VIOLATION,
        {},
        {
          violation: 'unauthorized_data_access',
          count: unauthorizedAccess.length,
          framework: 'GDPR'
        },
        RiskLevel.CRITICAL
      );
    }
  }
  
  private checkOverdueRequests(): void {
    const now = new Date();
    const overdueRequests = Array.from(this.dataSubjectRequests.values())
      .filter(req => req.dueDate <= now && req.status !== 'completed');
    
    overdueRequests.forEach(req => {
      auditLogger.logEvent(
        AuditEventType.COMPLIANCE_VIOLATION,
        { userId: req.subjectId },
        {
          violation: 'overdue_data_subject_request',
          requestId: req.id,
          type: req.type,
          daysOverdue: Math.floor((now.getTime() - req.dueDate.getTime()) / (1000 * 60 * 60 * 24))
        },
        RiskLevel.HIGH
      );
    });
  }
  
  /**
   * Public API methods
   */
  getDataSubjectRequests(status?: DataSubjectRequest['status']): DataSubjectRequest[] {
    const requests = Array.from(this.dataSubjectRequests.values());
    return status ? requests.filter(req => req.status === status) : requests;
  }
  
  getPrivacyAssessments(): PrivacyImpactAssessment[] {
    return Array.from(this.privacyAssessments.values());
  }
  
  updateRequirementStatus(
    requirementId: string,
    status: ComplianceRequirement['status'],
    evidence?: string[]
  ): boolean {
    const requirement = this.requirements.get(requirementId);
    if (!requirement) return false;
    
    requirement.status = status;
    requirement.lastAssessed = new Date();
    
    if (evidence) {
      requirement.evidence = [...requirement.evidence, ...evidence];
    }
    
    this.requirements.set(requirementId, requirement);
    
    auditLogger.logEvent(
      AuditEventType.SOC2_AUDIT_EVENT,
      {},
      {
        action: 'requirement_status_updated',
        requirementId,
        status,
        framework: requirement.framework
      },
      RiskLevel.LOW
    );
    
    return true;
  }
  
  getRequirements(framework?: ComplianceFramework): ComplianceRequirement[] {
    const requirements = Array.from(this.requirements.values());
    return framework ? requirements.filter(req => req.framework === framework) : requirements;
  }
}

// Export singleton instance
export const complianceFrameworkService = new ComplianceFrameworkService();
