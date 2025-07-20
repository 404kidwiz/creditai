/**
 * Security Initialization Module
 * Sets up all security components during application startup
 */

import { initializePIIMaskingSystem } from './piiAuditIntegration';
import { auditLogger } from './auditLogger';
import { AuditEventType } from './auditLogger';

/**
 * Initialize all security systems
 */
export async function initializeSecurity(): Promise<void> {
  try {
    // Initialize PII masking system with audit logging
    initializePIIMaskingSystem();
    
    // Log successful initialization
    auditLogger.logSystemEvent(
      AuditEventType.SYSTEM_ERROR,
      'success',
      { component: 'security', action: 'initialization' }
    );
    
    console.log('Security systems initialized successfully');
  } catch (error) {
    // Log initialization failure
    auditLogger.logSystemEvent(
      AuditEventType.SYSTEM_ERROR,
      'failure',
      { 
        component: 'security', 
        action: 'initialization',
        error: error instanceof Error ? error.message : String(error)
      }
    );
    
    console.error('Failed to initialize security systems:', error);
    
    // Re-throw the error to allow the application to handle it
    throw error;
  }
}

/**
 * Validate security configuration
 */
export async function validateSecurityConfig(): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  
  // Check PII masking configuration
  try {
    const piiStats = await import('./piiAuditIntegration').then(
      module => module.getPIIMaskingStats()
    );
    
    if (piiStats.patternCount < 5) {
      issues.push('PII masking has insufficient patterns configured');
    }
  } catch (error) {
    issues.push('Failed to validate PII masking configuration');
  }
  
  // Check audit logger configuration
  try {
    const events = auditLogger.getEvents(1);
    if (events.length === 0) {
      // Create a test event to verify logging works
      auditLogger.logSystemEvent(
        AuditEventType.SYSTEM_ERROR,
        'success',
        { component: 'security', action: 'validation' }
      );
      
      const eventsAfter = auditLogger.getEvents(1);
      if (eventsAfter.length === 0) {
        issues.push('Audit logging is not functioning correctly');
      }
    }
  } catch (error) {
    issues.push('Failed to validate audit logging configuration');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}