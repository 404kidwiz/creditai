/**
 * Integration between EnhancedPIIMasker and AuditLogger
 * Provides comprehensive PII detection and audit logging
 */

import { EnhancedPIIMasker, AuditEvent as PIIAuditEvent, PIIType, PIISeverity } from './enhancedPIIMasker';
import { auditLogger, AuditEventType, RiskLevel, SecurityContext } from './auditLogger';

/**
 * Maps PII severity levels to audit risk levels
 */
const severityToRiskLevel: Record<PIISeverity, RiskLevel> = {
  [PIISeverity.LOW]: RiskLevel.LOW,
  [PIISeverity.MEDIUM]: RiskLevel.MEDIUM,
  [PIISeverity.HIGH]: RiskLevel.HIGH,
  [PIISeverity.CRITICAL]: RiskLevel.CRITICAL,
};

/**
 * Initialize the PII masking system with audit logging
 */
export function initializePIIMaskingSystem(): void {
  // Set up the audit logger for the enhanced PII masker
  EnhancedPIIMasker.setAuditLogger(async (event: PIIAuditEvent) => {
    const securityContext: SecurityContext = {
      userId: event.userId,
      sessionId: event.sessionId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    };

    // Map PII types to a readable format for the audit log
    const piiTypesDetected = event.detectedTypes.map(type => PIIType[type]).join(', ');

    // Log the PII detection event
    auditLogger.logEvent(
      AuditEventType.PII_DETECTED,
      securityContext,
      {
        detectedTypes: event.detectedTypes,
        detectionCount: event.detectionCount,
        context: event.context,
        timestamp: event.timestamp.toISOString(),
      },
      severityToRiskLevel[event.severity]
    );

    // For high severity or critical PII detections, log a security event
    if (event.severity === PIISeverity.HIGH || event.severity === PIISeverity.CRITICAL) {
      auditLogger.logSecurityEvent(
        AuditEventType.HIGH_SENSITIVITY_DOCUMENT,
        securityContext,
        'success',
        {
          severity: event.severity,
          detectedTypes: piiTypesDetected,
          detectionCount: event.detectionCount,
          context: event.context,
        }
      );
    }
  });
}

/**
 * Mask PII in text with audit logging
 */
export async function maskPIIWithAudit(
  text: string,
  userId?: string,
  context?: string,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }
): Promise<string> {
  const result = await EnhancedPIIMasker.maskWithAudit(text, userId, context, metadata);
  return result.maskedText;
}

/**
 * Mask PII in an object with audit logging
 */
export async function maskObjectWithAudit(
  data: any,
  userId?: string,
  context?: string,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }
): Promise<any> {
  if (typeof data === 'string') {
    return maskPIIWithAudit(data, userId, context, metadata);
  }

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    const maskedArray = [];
    for (const item of data) {
      maskedArray.push(await maskObjectWithAudit(item, userId, context, metadata));
    }
    return maskedArray;
  }

  // Handle objects
  const maskedObject = { ...data };
  for (const key of Object.keys(maskedObject)) {
    maskedObject[key] = await maskObjectWithAudit(maskedObject[key], userId, context, metadata);
  }

  return maskedObject;
}

/**
 * Sanitize error messages to remove PII
 */
export function sanitizeErrorMessage(message: string): string {
  const result = EnhancedPIIMasker.maskPII(message);
  return result.maskedText;
}

/**
 * Validate that PII masking was effective
 */
export function validatePIIMasking(originalText: string, maskedText: string): {
  isValid: boolean;
  remainingPII: PIIType[];
  confidence: number;
} {
  return EnhancedPIIMasker.validateMasking(originalText, maskedText);
}

/**
 * Get PII masking statistics
 */
export function getPIIMaskingStats(): {
  supportedPIITypes: PIIType[];
  patternCount: number;
  severityLevels: PIISeverity[];
} {
  return EnhancedPIIMasker.getMaskingStats();
}