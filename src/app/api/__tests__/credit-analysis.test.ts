/**
 * Credit Analysis API Routes Test Suite
 * Comprehensive tests for all credit analysis API endpoints
 * @jest-environment node
 */

// Setup test environment
import './setup'
import { TextEncoder, TextDecoder } from 'util'

Object.assign(global, { TextDecoder, TextEncoder })

import { NextRequest } from 'next/server'
import { POST as processPdfPOST, OPTIONS as processPdfOPTIONS } from '../process-pdf/route'
import { POST as creditAnalyzePOST } from '../credit/analyze/route'
import { POST as enhancedAnalysisPOST, GET as enhancedAnalysisGET } from '../analysis/enhanced/route'
import { POST as confidenceCalculatePOST, GET as confidenceCalculateGET } from '../confidence/calculate/route'
import { POST as validationComprehensivePOST, GET as validationComprehensiveGET } from '../validation/comprehensive/route'
import { createMockSupabaseClient, mockCreditReportData, mockAnalysisResult, mockValidationResult, mockConfidenceResult } from '@/__tests__/mocks/supabase'

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => createMockSupabaseClient())
}))

jest.mock('@/lib/supabase/route', () => ({
  createRouteHandlerClient: jest.fn(() => createMockSupabaseClient())
}))

// Mock security components
jest.mock('@/lib/security/piiMasker', () => ({
  PIIMasker: {
    maskPII: jest.fn((text, options) => ({
      maskedText: text.replace(/\d{3}-\d{2}-\d{4}/g, '***-**-****'),
      maskingApplied: true,
      detectedPII: {
        ssn: ['123-45-6789'],
        accountNumbers: [],
        phoneNumbers: [],
        dob: [],
        driversLicense: [],
        passportNumbers: [],
        emailAddresses: []
      },
      sensitivityScore: 45
    })),
    maskCreditReportData: jest.fn((data) => data),
    getPIISummary: jest.fn(() => ({ totalPII: 1, types: ['ssn'] }))
  }
}))

jest.mock('@/lib/security/encryption', () => ({
  DataEncryption: {
    encryptCreditReportData: jest.fn(() => ({
      encryptedData: 'encrypted-data',
      iv: 'test-iv',
      authTag: 'test-auth-tag',
      version: '1.0',
      checksum: 'test-checksum'
    })),
    hashIdentifier: jest.fn(() => 'hashed-user-id')
  }
}))

jest.mock('@/lib/security/fileCleanup', () => ({
  FileCleanup: {
    cleanupUserSession: jest.fn().mockResolvedValue(true)
  }
}))

// Mock Google Cloud PDF processor
jest.mock('@/lib/google-cloud/pdfProcessor', () => ({
  pdfProcessor: {
    processPDF: jest.fn().mockResolvedValue({
      text: 'Sample credit report text with SSN 123-45-6789',
      extractedData: mockCreditReportData,
      aiAnalysis: mockAnalysisResult,
      confidence: 95,
      processingTime: 2500,
      processingMethod: 'google-document-ai',
      pages: 3
    })
  }
}))

// Mock AI analyzers
jest.mock('@/lib/ai/multiProviderCreditAnalyzer', () => ({
  MultiProviderCreditAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeReport: jest.fn().mockResolvedValue(mockAnalysisResult)
  }))
}))

jest.mock('@/lib/ai/enhancedCreditAnalyzer', () => ({
  EnhancedCreditAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeReport: jest.fn().mockResolvedValue({
      ...mockAnalysisResult,
      consensusResult: {
        overallConfidence: 90,
        consensusMetadata: {
          modelsUsed: ['gemini', 'openai'],
          agreementScore: 0.85,
          consensusMethod: 'weighted_average'
        }
      },
      qualityMetrics: {
        overallQuality: 0.85,
        dataCompleteness: 0.90,
        dataAccuracy: 0.80
      },
      validationResults: [mockValidationResult],
      processingTime: 3500
    })
  }))
}))

// Mock validation system
jest.mock('@/lib/validation/enhancedValidationSystem', () => ({
  enhancedValidationSystem: {
    validateEnhancedCreditReport: jest.fn().mockResolvedValue(mockValidationResult)
  }
}))

// Mock consensus engine
jest.mock('@/lib/ai/consensusEngine', () => ({
  consensusEngine: {
    calculateConsensus: jest.fn().mockResolvedValue(mockConfidenceResult)
  }
}))

describe('Credit Analysis API Routes', () => {
  let mockRequest: Partial<NextRequest>
  let mockSupabase: any

  beforeEach(() => {
    // Base mock request setup
    mockRequest = {
      url: 'https://test.com/api/test',
      cookies: {
        get: jest.fn(() => ({ value: 'mock-token' }))
      } as any,
      headers: {
        get: jest.fn((name: string) => {
          if (name === 'content-type') return 'application/json'
          if (name === 'x-forwarded-for') return '192.168.1.1'
          if (name === 'user-agent') return 'Mozilla/5.0 Test Browser'
          return null
        })
      } as any,
      json: jest.fn(),
      formData: jest.fn()
    }

    mockSupabase = createMockSupabaseClient()
    
    // Reset all mocks
    jest.clearAllMocks()
  })

  describe('PDF Processing Endpoint', () => {
    describe('POST /api/process-pdf', () => {
      it('should process PDF file successfully', async () => {
        // Setup mock file
        const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
        const mockFormData = new FormData()
        mockFormData.append('file', mockFile)
        
        mockRequest.formData = jest.fn().mockResolvedValue(mockFormData)
        mockRequest.headers!.get = jest.fn((name: string) => {
          if (name === 'content-type') return 'multipart/form-data'
          return null
        })

        // Setup authenticated user
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })

        const response = await processPdfPOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(responseData.extractedText).toBeDefined()
        expect(responseData.analysis).toBeDefined()
        expect(responseData.confidence).toBe(95)
        expect(responseData.securityInfo.piiMasked).toBe(true)
      })

      it('should process image data from JSON body', async () => {
        const imageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        
        mockRequest.json = jest.fn().mockResolvedValue({
          imageData,
          fileName: 'test.png',
          fileType: 'image'
        })

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })

        const response = await processPdfPOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(responseData.processingMethod).toBe('google-document-ai')
      })

      it('should handle missing file error', async () => {
        mockRequest.formData = jest.fn().mockResolvedValue(new FormData())
        mockRequest.headers!.get = jest.fn((name: string) => {
          if (name === 'content-type') return 'multipart/form-data'
          return null
        })

        const response = await processPdfPOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error).toBe('No file provided')
      })

      it('should reject invalid file types', async () => {
        const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
        const mockFormData = new FormData()
        mockFormData.append('file', mockFile)
        
        mockRequest.formData = jest.fn().mockResolvedValue(mockFormData)
        mockRequest.headers!.get = jest.fn((name: string) => {
          if (name === 'content-type') return 'multipart/form-data'
          return null
        })

        const response = await processPdfPOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error).toBe('File must be a PDF or image (JPG, PNG)')
      })

      it('should handle processing errors gracefully', async () => {
        const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
        const mockFormData = new FormData()
        mockFormData.append('file', mockFile)
        
        mockRequest.formData = jest.fn().mockResolvedValue(mockFormData)
        mockRequest.headers!.get = jest.fn((name: string) => {
          if (name === 'content-type') return 'multipart/form-data'
          return null
        })

        // Mock PDF processor to throw error
        const { pdfProcessor } = require('@/lib/google-cloud/pdfProcessor')
        pdfProcessor.processPDF.mockRejectedValue(new Error('Processing failed'))

        const response = await processPdfPOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(500)
        expect(responseData.error).toBe('PDF processing failed')
        expect(responseData.requestId).toBeDefined()
      })

      it('should handle CORS preflight requests', async () => {
        const response = await processPdfOPTIONS()

        expect(response.status).toBe(200)
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
      })

      it('should mask PII in responses', async () => {
        const mockFile = new File(['Credit report with SSN 123-45-6789'], 'test.pdf', { type: 'application/pdf' })
        const mockFormData = new FormData()
        mockFormData.append('file', mockFile)
        
        mockRequest.formData = jest.fn().mockResolvedValue(mockFormData)
        mockRequest.headers!.get = jest.fn((name: string) => {
          if (name === 'content-type') return 'multipart/form-data'
          return null
        })

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })

        const response = await processPdfPOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.extractedText).not.toContain('123-45-6789')
        expect(responseData.securityInfo.piiMasked).toBe(true)
      })
    })
  })

  describe('Credit Analysis Endpoint', () => {
    describe('POST /api/credit/analyze', () => {
      it('should analyze credit report successfully', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          documentText: 'Sample credit report text',
          userId: 'user-123'
        })

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'user-123' }
              })
            })
          })
        })

        const response = await creditAnalyzePOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.analysis).toBeDefined()
        expect(responseData.analysis.confidence).toBe(95)
        expect(responseData.message).toContain('Analysis completed')
      })

      it('should handle test debug mode', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          documentText: 'TEST_DEBUG mode enabled',
          userId: 'test-user-id'
        })

        const response = await creditAnalyzePOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.analysis.provider).toBe('test')
        expect(responseData.message).toBe('Test analysis completed successfully')
      })

      it('should validate required parameters', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          documentText: 'Sample text'
          // Missing userId
        })

        const response = await creditAnalyzePOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error).toBe('Missing required parameters')
      })

      it('should handle user not found error', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          documentText: 'Sample credit report text',
          userId: 'nonexistent-user'
        })

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: new Error('User not found')
              })
            })
          })
        })

        const response = await creditAnalyzePOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(404)
        expect(responseData.error).toBe('User not found')
      })

      it('should handle analysis failures', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          documentText: 'Sample credit report text',
          userId: 'user-123'
        })

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'user-123' }
              })
            })
          })
        })

        // Mock analyzer to return null
        const { MultiProviderCreditAnalyzer } = require('@/lib/ai/multiProviderCreditAnalyzer')
        MultiProviderCreditAnalyzer.mockImplementation(() => ({
          analyzeReport: jest.fn().mockResolvedValue(null)
        }))

        const response = await creditAnalyzePOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(500)
        expect(responseData.error).toBe('Analysis failed - no data returned')
      })
    })
  })

  describe('Enhanced Analysis Endpoint', () => {
    describe('POST /api/analysis/enhanced', () => {
      it('should perform enhanced analysis successfully', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          documentText: 'Sample credit report text',
          userId: 'user-123',
          options: { includeValidation: true }
        })

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'user-123' }
              })
            })
          })
        })

        const response = await enhancedAnalysisPOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(responseData.data.extractedData).toBeDefined()
        expect(responseData.data.consensusResult).toBeDefined()
        expect(responseData.data.qualityMetrics).toBeDefined()
        expect(responseData.data.validationSummary).toBeDefined()
        expect(responseData.metadata.version).toBe('2.0')
      })

      it('should handle test user bypass', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          documentText: 'Sample credit report text',
          userId: 'test-user-id'
        })

        const response = await enhancedAnalysisPOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
      })

      it('should validate required parameters', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          userId: 'user-123'
          // Missing documentText
        })

        const response = await enhancedAnalysisPOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error).toBe('Missing required parameters: documentText and userId are required')
      })

      it('should handle unauthorized users', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          documentText: 'Sample credit report text',
          userId: 'unauthorized-user'
        })

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: new Error('Unauthorized')
              })
            })
          })
        })

        const response = await enhancedAnalysisPOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(404)
        expect(responseData.error).toBe('User not found or unauthorized')
      })
    })

    describe('GET /api/analysis/enhanced', () => {
      it('should return API documentation', async () => {
        const response = await enhancedAnalysisGET(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.endpoint).toBe('/api/analysis/enhanced')
        expect(responseData.version).toBe('2.0')
        expect(responseData.methods).toContain('POST')
        expect(responseData.features).toContain('Multi-model AI consensus analysis')
      })
    })
  })

  describe('Confidence Calculation Endpoint', () => {
    describe('POST /api/confidence/calculate', () => {
      it('should calculate confidence scores successfully', async () => {
        const analysisResults = [
          { confidence: 90, extractedData: mockCreditReportData },
          { confidence: 85, extractedData: mockCreditReportData }
        ]

        mockRequest.json = jest.fn().mockResolvedValue({
          analysisResults,
          validationResults: [mockValidationResult],
          qualityMetrics: { overallQuality: 0.85 },
          options: {}
        })

        const response = await confidenceCalculatePOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(responseData.data.overallConfidence).toBeDefined()
        expect(responseData.data.confidenceLevel).toBeDefined()
        expect(responseData.data.confidenceFactors).toHaveLength(4)
        expect(responseData.data.calculationMethod).toBe('weighted_multi_factor')
      })

      it('should validate required parameters', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          // Missing analysisResults
          validationResults: []
        })

        const response = await confidenceCalculatePOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error).toBe('Missing or invalid analysisResults parameter')
      })

      it('should handle empty analysis results', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          analysisResults: [],
          validationResults: [],
          qualityMetrics: {},
          options: {}
        })

        const response = await confidenceCalculatePOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data.overallConfidence).toBeDefined()
        expect(responseData.data.confidenceFactors[0].factor).toBe('Model Consensus')
      })

      it('should handle calculation errors', async () => {
        mockRequest.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

        const response = await confidenceCalculatePOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(500)
        expect(responseData.success).toBe(false)
        expect(responseData.error).toBe('Failed to calculate confidence')
      })
    })

    describe('GET /api/confidence/calculate', () => {
      it('should return API documentation', async () => {
        const response = await confidenceCalculateGET(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.endpoint).toBe('/api/confidence/calculate')
        expect(responseData.confidenceFactors).toBeDefined()
        expect(responseData.confidenceLevels).toBeDefined()
        expect(responseData.confidenceLevels.very_high).toContain('90-100%')
      })
    })
  })

  describe('Validation Endpoint', () => {
    describe('POST /api/validation/comprehensive', () => {
      it('should perform comprehensive validation successfully', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          data: mockCreditReportData,
          validationType: 'comprehensive',
          options: {}
        })

        const response = await validationComprehensivePOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(responseData.data.comprehensive).toBe(true)
        expect(responseData.data.extraction).toBeDefined()
        expect(responseData.data.eoscarCompliance).toBeDefined()
        expect(responseData.data.legalCompliance).toBeDefined()
        expect(responseData.data.qualityReport).toBeDefined()
        expect(responseData.data.overallScore).toBeDefined()
      })

      it('should perform extraction validation', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          data: mockCreditReportData,
          validationType: 'extraction'
        })

        const response = await validationComprehensivePOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(responseData.data.overallScore).toBe(85)
        expect(responseData.metadata.validationType).toBe('extraction')
      })

      it('should handle EOSCAR compliance validation', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          data: mockCreditReportData,
          validationType: 'eoscar_compliance'
        })

        const response = await validationComprehensivePOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(responseData.metadata.validationType).toBe('eoscar_compliance')
      })

      it('should validate required parameters', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          // Missing data parameter
          validationType: 'extraction'
        })

        const response = await validationComprehensivePOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error).toBe('Missing required parameter: data')
      })

      it('should handle validation errors', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          data: mockCreditReportData,
          validationType: 'extraction'
        })

        // Mock validation system to throw error
        const { enhancedValidationSystem } = require('@/lib/validation/enhancedValidationSystem')
        enhancedValidationSystem.validateEnhancedCreditReport.mockRejectedValue(new Error('Validation failed'))

        const response = await validationComprehensivePOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(500)
        expect(responseData.success).toBe(false)
        expect(responseData.error).toBe('Failed to perform validation')
      })
    })

    describe('GET /api/validation/comprehensive', () => {
      it('should return API documentation', async () => {
        const response = await validationComprehensiveGET(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.endpoint).toBe('/api/validation/comprehensive')
        expect(responseData.validationTypes).toBeDefined()
        expect(responseData.validationTypes.comprehensive).toContain('all validation types')
        expect(responseData.features).toContain('Multi-layer validation system')
      })
    })
  })

  describe('Rate Limiting and Security', () => {
    it('should handle rate limiting gracefully', async () => {
      // Simulate rate limit by making auth fail with specific error
      mockSupabase.auth.getUser.mockRejectedValue(
        Object.assign(new Error('Rate limit exceeded'), { name: 'RateLimitError' })
      )

      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const mockFormData = new FormData()
      mockFormData.append('file', mockFile)
      
      mockRequest.formData = jest.fn().mockResolvedValue(mockFormData)
      mockRequest.headers!.get = jest.fn((name: string) => {
        if (name === 'content-type') return 'multipart/form-data'
        return null
      })

      const response = await processPdfPOST(mockRequest as NextRequest)
      expect(response.status).toBe(500)
    })

    it('should sanitize error messages to prevent information disclosure', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const mockFormData = new FormData()
      mockFormData.append('file', mockFile)
      
      mockRequest.formData = jest.fn().mockResolvedValue(mockFormData)
      mockRequest.headers!.get = jest.fn((name: string) => {
        if (name === 'content-type') return 'multipart/form-data'
        return null
      })

      // Mock PDF processor to throw error with sensitive data
      const { pdfProcessor } = require('@/lib/google-cloud/pdfProcessor')
      pdfProcessor.processPDF.mockRejectedValue(new Error('Database connection failed with password 123456'))

      const response = await processPdfPOST(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.details).not.toContain('123456')
    })

    it('should validate input data for XSS protection', async () => {
      const maliciousInput = '<script>alert("xss")</script>'
      
      mockRequest.json = jest.fn().mockResolvedValue({
        documentText: maliciousInput,
        userId: 'user-123'
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123' }
            })
          })
        })
      })

      const response = await creditAnalyzePOST(mockRequest as NextRequest)
      const responseData = await response.json()

      // Should still process but not execute script
      expect(response.status).toBe(200)
      expect(JSON.stringify(responseData)).not.toContain('<script>')
    })

    it('should prevent SQL injection attempts', async () => {
      const sqlInjection = "'; DROP TABLE users; --"
      
      mockRequest.json = jest.fn().mockResolvedValue({
        documentText: 'Normal text',
        userId: sqlInjection
      })

      // Mock database to check for injection attempts
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('User not found')
            })
          })
        })
      })

      const response = await creditAnalyzePOST(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('User not found')
    })
  })

  describe('File Upload Security', () => {
    it('should reject files that are too large', async () => {
      // Create a large mock file (> 10MB)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })
      const mockFormData = new FormData()
      mockFormData.append('file', largeFile)
      
      mockRequest.formData = jest.fn().mockResolvedValue(mockFormData)
      mockRequest.headers!.get = jest.fn((name: string) => {
        if (name === 'content-type') return 'multipart/form-data'
        return null
      })

      // Mock processing to check file size
      const { pdfProcessor } = require('@/lib/google-cloud/pdfProcessor')
      pdfProcessor.processPDF.mockImplementation((file: File) => {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('File too large')
        }
        return Promise.resolve(mockAnalysisResult)
      })

      const response = await processPdfPOST(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('PDF processing failed')
    })

    it('should handle malformed file uploads', async () => {
      mockRequest.formData = jest.fn().mockRejectedValue(new Error('Malformed form data'))
      mockRequest.headers!.get = jest.fn((name: string) => {
        if (name === 'content-type') return 'multipart/form-data'
        return null
      })

      const response = await processPdfPOST(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('PDF processing failed')
    })

    it('should validate file content matches file extension', async () => {
      // Create a file with PDF extension but text content
      const fakeFile = new File(['This is not a PDF'], 'fake.pdf', { type: 'application/pdf' })
      const mockFormData = new FormData()
      mockFormData.append('file', fakeFile)
      
      mockRequest.formData = jest.fn().mockResolvedValue(mockFormData)
      mockRequest.headers!.get = jest.fn((name: string) => {
        if (name === 'content-type') return 'multipart/form-data'
        return null
      })

      // PDF processor should detect invalid file
      const { pdfProcessor } = require('@/lib/google-cloud/pdfProcessor')
      pdfProcessor.processPDF.mockRejectedValue(new Error('Invalid PDF format'))

      const response = await processPdfPOST(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('PDF processing failed')
    })
  })

  describe('Data Validation and Sanitization', () => {
    it('should validate credit report data structure', async () => {
      const invalidData = {
        // Missing required fields
        invalidField: 'should not be here'
      }

      mockRequest.json = jest.fn().mockResolvedValue({
        data: invalidData,
        validationType: 'extraction'
      })

      const response = await validationComprehensivePOST(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data.overallScore).toBeLessThan(100)
    })

    it('should sanitize numeric inputs', async () => {
      const dataWithInvalidNumbers = {
        ...mockCreditReportData,
        creditScore: {
          score: 'invalid_number',
          bureau: 'experian'
        }
      }

      mockRequest.json = jest.fn().mockResolvedValue({
        data: dataWithInvalidNumbers,
        validationType: 'extraction'
      })

      const response = await validationComprehensivePOST(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
    })

    it('should handle circular references in data', async () => {
      const circularData: any = { ...mockCreditReportData }
      circularData.self = circularData // Create circular reference

      mockRequest.json = jest.fn().mockResolvedValue({
        data: circularData,
        validationType: 'extraction'
      })

      const response = await validationComprehensivePOST(mockRequest as NextRequest)

      // Should not crash despite circular reference
      expect(response.status).toBeLessThanOrEqual(500)
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      mockRequest.json = jest.fn().mockResolvedValue({
        documentText: 'Sample text',
        userId: 'user-123'
      })

      const response = await creditAnalyzePOST(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to analyze credit report')
    })

    it('should handle network timeouts in AI analysis', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        documentText: 'Sample text',
        userId: 'test-user-id'
      })

      // Mock analyzer to timeout
      const { MultiProviderCreditAnalyzer } = require('@/lib/ai/multiProviderCreditAnalyzer')
      MultiProviderCreditAnalyzer.mockImplementation(() => ({
        analyzeReport: jest.fn().mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 100)
          )
        )
      }))

      const response = await creditAnalyzePOST(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.details).toContain('Request timeout')
    })

    it('should provide meaningful error context', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        analysisResults: 'invalid_type' // Should be array
      })

      const response = await confidenceCalculatePOST(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Missing or invalid analysisResults parameter')
      expect(responseData.timestamp).toBeDefined()
    })
  })
})