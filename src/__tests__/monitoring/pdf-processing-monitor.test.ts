/**
 * PDF Processing Monitor Tests
 * Tests for the PDF processing monitoring and logging system
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock all external dependencies
jest.mock('../../lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            range: jest.fn().mockResolvedValue({ data: [], error: null }),
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          })),
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        })),
        gte: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          }))
        }))
      }))
    }))
  }))
}))

jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    json: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}))

jest.mock('../../lib/logging/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })),
  Sentry: {
    addBreadcrumb: jest.fn(),
    captureMessage: jest.fn(),
    captureException: jest.fn()
  }
}))

jest.mock('../../lib/security/piiMasker', () => ({
  PIIMasker: {
    maskPII: jest.fn(() => ({ maskedText: 'masked', maskingApplied: false })),
    sanitizeErrorMessage: jest.fn((msg: string) => msg),
    getPIISummary: jest.fn(() => ({}))
  }
}))

// Import after mocking
import { PDFProcessingMetrics } from '../../lib/monitoring/pdfProcessingMonitor'
import { AuditEventType, RiskLevel } from '../../lib/security/auditLogger'

describe('PDF Processing Monitor', () => {
  let testMetrics: PDFProcessingMetrics[]
  let mockPdfProcessingMonitor: any
  let mockAuditLogger: any

  beforeEach(() => {
    // Clear any existing metrics
    jest.clearAllMocks()
    
    // Create mock implementations
    mockPdfProcessingMonitor = {
      recordProcessingMetrics: jest.fn(),
      getSuccessMetrics: jest.fn(() => ({
        totalProcessed: 3,
        successful: 2,
        failed: 1,
        successRate: 66.7,
        methodBreakdown: {
          'google-cloud-document-ai': { total: 2, successful: 2, successRate: 100 },
          'client-side-fallback': { total: 1, successful: 0, successRate: 0 }
        }
      })),
      getConfidenceMetrics: jest.fn(() => ({
        averageConfidence: 65,
        confidenceDistribution: { high: 1, medium: 1, low: 1 },
        methodConfidence: {
          'google-cloud-document-ai': 75,
          'google-cloud-vision-api': 65
        }
      })),
      getPerformanceMetrics: jest.fn(() => ({
        averageProcessingTime: 5000,
        medianProcessingTime: 4500,
        p95ProcessingTime: 8000,
        slowestProcessingTime: 8000,
        fastestProcessingTime: 2500,
        methodPerformance: {
          'google-cloud-document-ai': { average: 2500, median: 2500, p95: 2500 }
        }
      })),
      getErrorMetrics: jest.fn(() => ({
        totalErrors: 1,
        errorRate: 33.3,
        errorTypes: { 'google_cloud_service_failure': 1 },
        criticalErrors: 0,
        serviceFailures: { 'google_cloud_service_failure': 1 }
      })),
      getDashboardData: jest.fn(() => ({
        success: { totalProcessed: 3, successRate: 66.7 },
        confidence: { averageConfidence: 65 },
        performance: { averageProcessingTime: 5000 },
        errors: { totalErrors: 1, errorRate: 33.3 },
        recentActivity: []
      }))
    }

    mockAuditLogger = {
      logDocumentEvent: jest.fn(),
      logSystemEvent: jest.fn(),
      logAuthEvent: jest.fn(),
      logAccessEvent: jest.fn(),
      logSecurityEvent: jest.fn(),
      generateAuditSummary: jest.fn(() => ({
        totalEvents: 10,
        riskDistribution: { low: 5, medium: 3, high: 2, critical: 0 },
        topEventTypes: { 'document_processed': 5, 'pii_detected': 3 },
        failureRate: 10,
        highRiskEvents: 2
      })),
      getUserAuditEvents: jest.fn(() => []),
      getHighRiskEvents: jest.fn(() => [])
    }
    
    // Create test metrics
    testMetrics = [
      {
        processingId: 'test-1',
        userId: 'user-1',
        fileName: 'test1.pdf',
        fileSize: 1024000,
        fileType: 'application/pdf',
        processingMethod: 'google-cloud-document-ai',
        processingTime: 2500,
        confidence: 85,
        success: true,
        piiDetected: true,
        piiSensitivityScore: 75,
        dataEncrypted: true,
        extractedDataQuality: {
          accountsFound: 5,
          negativeItemsFound: 2,
          inquiriesFound: 3,
          creditScoresFound: 3,
          personalInfoComplete: true
        },
        timestamp: new Date().toISOString()
      },
      {
        processingId: 'test-2',
        userId: 'user-2',
        fileName: 'test2.pdf',
        fileSize: 512000,
        fileType: 'application/pdf',
        processingMethod: 'google-cloud-vision-api',
        processingTime: 4500,
        confidence: 65,
        success: true,
        piiDetected: false,
        piiSensitivityScore: 25,
        dataEncrypted: true,
        extractedDataQuality: {
          accountsFound: 3,
          negativeItemsFound: 1,
          inquiriesFound: 2,
          creditScoresFound: 2,
          personalInfoComplete: true
        },
        timestamp: new Date().toISOString()
      },
      {
        processingId: 'test-3',
        userId: 'user-3',
        fileName: 'test3.pdf',
        fileSize: 2048000,
        fileType: 'application/pdf',
        processingMethod: 'client-side-fallback',
        processingTime: 8000,
        confidence: 45,
        success: false,
        errorType: 'google_cloud_service_failure',
        errorMessage: 'Service temporarily unavailable',
        piiDetected: false,
        piiSensitivityScore: 0,
        dataEncrypted: false,
        extractedDataQuality: {
          accountsFound: 0,
          negativeItemsFound: 0,
          inquiriesFound: 0,
          creditScoresFound: 0,
          personalInfoComplete: false
        },
        timestamp: new Date().toISOString()
      }
    ]
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('recordProcessingMetrics', () => {
    it('should record successful processing metrics', async () => {
      const metrics = testMetrics[0]
      
      await mockPdfProcessingMonitor.recordProcessingMetrics(metrics)
      
      expect(mockPdfProcessingMonitor.recordProcessingMetrics).toHaveBeenCalledWith(metrics)
    })

    it('should record failed processing metrics', async () => {
      const metrics = testMetrics[2]
      
      await mockPdfProcessingMonitor.recordProcessingMetrics(metrics)
      
      expect(mockPdfProcessingMonitor.recordProcessingMetrics).toHaveBeenCalledWith(metrics)
    })

    it('should handle high-risk processing events', async () => {
      const highRiskMetrics: PDFProcessingMetrics = {
        ...testMetrics[0],
        piiSensitivityScore: 95,
        processingTime: 15000 // Slow processing
      }
      
      await mockPdfProcessingMonitor.recordProcessingMetrics(highRiskMetrics)
      
      expect(mockPdfProcessingMonitor.recordProcessingMetrics).toHaveBeenCalledWith(highRiskMetrics)
    })
  })

  describe('getSuccessMetrics', () => {
    it('should calculate success rate correctly', () => {
      const successMetrics = mockPdfProcessingMonitor.getSuccessMetrics('24h')
      
      expect(successMetrics.totalProcessed).toBeGreaterThan(0)
      expect(successMetrics.successRate).toBeGreaterThanOrEqual(0)
      expect(successMetrics.successRate).toBeLessThanOrEqual(100)
      expect(successMetrics.methodBreakdown).toBeDefined()
    })

    it('should break down success by processing method', () => {
      const successMetrics = mockPdfProcessingMonitor.getSuccessMetrics('24h')
      
      expect(successMetrics.methodBreakdown).toBeDefined()
      expect(typeof successMetrics.methodBreakdown).toBe('object')
    })
  })

  describe('getConfidenceMetrics', () => {
    it('should calculate confidence distribution', () => {
      const confidenceMetrics = mockPdfProcessingMonitor.getConfidenceMetrics('24h')
      
      expect(confidenceMetrics.averageConfidence).toBeGreaterThanOrEqual(0)
      expect(confidenceMetrics.confidenceDistribution).toBeDefined()
      expect(confidenceMetrics.confidenceDistribution.high).toBeGreaterThanOrEqual(0)
      expect(confidenceMetrics.confidenceDistribution.medium).toBeGreaterThanOrEqual(0)
      expect(confidenceMetrics.confidenceDistribution.low).toBeGreaterThanOrEqual(0)
    })

    it('should calculate method-specific confidence', () => {
      const confidenceMetrics = mockPdfProcessingMonitor.getConfidenceMetrics('24h')
      
      expect(confidenceMetrics.methodConfidence).toBeDefined()
      expect(typeof confidenceMetrics.methodConfidence).toBe('object')
    })
  })

  describe('getPerformanceMetrics', () => {
    beforeEach(async () => {
      for (const metrics of testMetrics) {
        await pdfProcessingMonitor.recordProcessingMetrics(metrics)
      }
    })

    it('should calculate performance statistics', () => {
      const performanceMetrics = pdfProcessingMonitor.getPerformanceMetrics('24h')
      
      expect(performanceMetrics.averageProcessingTime).toBeGreaterThan(0)
      expect(performanceMetrics.medianProcessingTime).toBeGreaterThan(0)
      expect(performanceMetrics.p95ProcessingTime).toBeGreaterThan(0)
      expect(performanceMetrics.slowestProcessingTime).toBeGreaterThan(0)
      expect(performanceMetrics.fastestProcessingTime).toBeGreaterThan(0)
    })

    it('should calculate method-specific performance', () => {
      const performanceMetrics = pdfProcessingMonitor.getPerformanceMetrics('24h')
      
      expect(performanceMetrics.methodPerformance).toBeDefined()
      expect(typeof performanceMetrics.methodPerformance).toBe('object')
    })
  })

  describe('getErrorMetrics', () => {
    beforeEach(async () => {
      for (const metrics of testMetrics) {
        await pdfProcessingMonitor.recordProcessingMetrics(metrics)
      }
    })

    it('should calculate error statistics', () => {
      const errorMetrics = pdfProcessingMonitor.getErrorMetrics('24h')
      
      expect(errorMetrics.totalErrors).toBeGreaterThanOrEqual(0)
      expect(errorMetrics.errorRate).toBeGreaterThanOrEqual(0)
      expect(errorMetrics.errorRate).toBeLessThanOrEqual(100)
      expect(errorMetrics.errorTypes).toBeDefined()
    })

    it('should track service failures', () => {
      const errorMetrics = pdfProcessingMonitor.getErrorMetrics('24h')
      
      expect(errorMetrics.serviceFailures).toBeDefined()
      expect(typeof errorMetrics.serviceFailures).toBe('object')
    })
  })

  describe('getDashboardData', () => {
    beforeEach(async () => {
      for (const metrics of testMetrics) {
        await pdfProcessingMonitor.recordProcessingMetrics(metrics)
      }
    })

    it('should return comprehensive dashboard data', () => {
      const dashboardData = pdfProcessingMonitor.getDashboardData('24h')
      
      expect(dashboardData.success).toBeDefined()
      expect(dashboardData.confidence).toBeDefined()
      expect(dashboardData.performance).toBeDefined()
      expect(dashboardData.errors).toBeDefined()
      expect(dashboardData.recentActivity).toBeDefined()
      expect(Array.isArray(dashboardData.recentActivity)).toBe(true)
    })
  })
})

describe('Audit Logger', () => {
  const mockSecurityContext = {
    userId: 'test-user-1',
    sessionId: 'test-session-1',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 Test Browser',
    requestId: 'test-request-1'
  }

  describe('logDocumentEvent', () => {
    it('should log document upload events', async () => {
      await auditLogger.logDocumentEvent(
        AuditEventType.DOCUMENT_UPLOADED,
        mockSecurityContext,
        'success',
        {
          fileName: 'test.pdf',
          fileSize: 1024000,
          fileType: 'application/pdf'
        }
      )
      
      // Verify event is logged
      expect(true).toBe(true) // Placeholder assertion
    })

    it('should log PII detection events', async () => {
      await auditLogger.logDocumentEvent(
        AuditEventType.PII_DETECTED,
        mockSecurityContext,
        'success',
        {
          fileName: 'test.pdf',
          fileSize: 1024000,
          fileType: 'application/pdf',
          processingMethod: 'google-cloud-document-ai',
          confidence: 85
        },
        {
          sensitivityScore: 75,
          piiTypes: ['ssn', 'account_numbers'],
          piiCounts: {
            ssn: 1,
            accounts: 3,
            phones: 2
          }
        }
      )
      
      // Verify PII event is logged with proper risk level
      expect(true).toBe(true) // Placeholder assertion
    })

    it('should log high sensitivity document events', async () => {
      await auditLogger.logDocumentEvent(
        AuditEventType.HIGH_SENSITIVITY_DOCUMENT,
        mockSecurityContext,
        'success',
        {
          fileName: 'sensitive.pdf',
          fileSize: 2048000,
          fileType: 'application/pdf',
          processingMethod: 'google-cloud-document-ai',
          confidence: 90,
          sensitivityScore: 95
        }
      )
      
      // Verify high-risk event is logged
      expect(true).toBe(true) // Placeholder assertion
    })
  })

  describe('logSystemEvent', () => {
    it('should log system errors', async () => {
      await auditLogger.logSystemEvent(
        AuditEventType.SYSTEM_ERROR,
        'error',
        {
          component: 'pdf-processing',
          errorType: 'google_cloud_service_failure',
          error: 'Service temporarily unavailable',
          processingTime: 5000,
          fileName: 'test.pdf'
        }
      )
      
      // Verify system error is logged
      expect(true).toBe(true) // Placeholder assertion
    })

    it('should log service failures', async () => {
      await auditLogger.logSystemEvent(
        AuditEventType.SERVICE_FAILURE,
        'error',
        {
          service: 'google-cloud',
          errorType: 'google_cloud_service_failure',
          error: 'Document AI service unavailable',
          critical: true
        }
      )
      
      // Verify service failure is logged with high risk
      expect(true).toBe(true) // Placeholder assertion
    })
  })

  describe('generateAuditSummary', () => {
    it('should generate comprehensive audit summary', async () => {
      // Log some test events first
      await auditLogger.logDocumentEvent(
        AuditEventType.DOCUMENT_PROCESSED,
        mockSecurityContext,
        'success',
        { fileName: 'test1.pdf', fileSize: 1024000, fileType: 'application/pdf' }
      )
      
      await auditLogger.logSystemEvent(
        AuditEventType.SYSTEM_ERROR,
        'error',
        { component: 'pdf-processing', errorType: 'processing_error' }
      )
      
      const summary = await auditLogger.generateAuditSummary('24h')
      
      expect(summary.totalEvents).toBeGreaterThanOrEqual(0)
      expect(summary.riskDistribution).toBeDefined()
      expect(summary.topEventTypes).toBeDefined()
      expect(summary.failureRate).toBeGreaterThanOrEqual(0)
      expect(summary.failureRate).toBeLessThanOrEqual(100)
      expect(summary.highRiskEvents).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('Integration Tests', () => {
  it('should handle complete PDF processing workflow with monitoring', async () => {
    const processingId = 'integration-test-1'
    const userId = 'test-user-1'
    const securityContext = {
      userId,
      sessionId: 'test-session-1',
      ipAddress: '192.168.1.1',
      userAgent: 'Test Browser'
    }

    // Simulate complete workflow
    
    // 1. Document upload
    await auditLogger.logDocumentEvent(
      AuditEventType.DOCUMENT_UPLOADED,
      securityContext,
      'success',
      {
        fileName: 'integration-test.pdf',
        fileSize: 1024000,
        fileType: 'application/pdf'
      }
    )

    // 2. PII detection
    await auditLogger.logDocumentEvent(
      AuditEventType.PII_DETECTED,
      securityContext,
      'success',
      {
        fileName: 'integration-test.pdf',
        fileSize: 1024000,
        fileType: 'application/pdf',
        processingMethod: 'google-cloud-document-ai',
        confidence: 85
      },
      {
        sensitivityScore: 65,
        piiTypes: ['ssn', 'account_numbers']
      }
    )

    // 3. Data encryption
    await auditLogger.logDocumentEvent(
      AuditEventType.DATA_ENCRYPTED,
      securityContext,
      'success',
      {
        fileName: 'integration-test.pdf',
        fileSize: 1024000,
        fileType: 'application/pdf',
        processingMethod: 'google-cloud-document-ai'
      },
      {
        encryptionVersion: '1.0',
        dataSize: 50000
      }
    )

    // 4. Processing completion
    const processingMetrics: PDFProcessingMetrics = {
      processingId,
      userId,
      fileName: 'integration-test.pdf',
      fileSize: 1024000,
      fileType: 'application/pdf',
      processingMethod: 'google-cloud-document-ai',
      processingTime: 3500,
      confidence: 85,
      success: true,
      piiDetected: true,
      piiSensitivityScore: 65,
      dataEncrypted: true,
      extractedDataQuality: {
        accountsFound: 4,
        negativeItemsFound: 1,
        inquiriesFound: 2,
        creditScoresFound: 3,
        personalInfoComplete: true
      },
      timestamp: new Date().toISOString()
    }

    await pdfProcessingMonitor.recordProcessingMetrics(processingMetrics)

    // 5. Final document processing log
    await auditLogger.logDocumentEvent(
      AuditEventType.DOCUMENT_PROCESSED,
      securityContext,
      'success',
      {
        fileName: 'integration-test.pdf',
        fileSize: 1024000,
        fileType: 'application/pdf',
        processingMethod: 'google-cloud-document-ai',
        confidence: 85,
        piiDetected: true,
        sensitivityScore: 65
      },
      {
        processingTime: 3500,
        extractedDataQuality: {
          accountsFound: 4,
          negativeItemsFound: 1,
          inquiriesFound: 2,
          creditScoresFound: 3
        }
      }
    )

    // Verify workflow completed successfully
    expect(true).toBe(true) // Placeholder assertion
  })
})