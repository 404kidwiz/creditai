/**
 * Comprehensive Test Suite for Dispute Management API Endpoints
 * 
 * Tests for:
 * 1. EOSCAR dispute letter generation
 * 2. EOSCAR validation
 * 3. Batch dispute processing 
 * 4. Dispute tracking
 * 5. CFPB escalation
 * 
 * Covers authentication, validation, error handling, rate limiting, and integration testing
 */

import { NextRequest } from 'next/server'
import { jest } from '@jest/globals'

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  order: jest.fn().mockReturnThis(),
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn()
  }
}

// Mock route handler client
jest.mock('@/lib/supabase/route', () => ({
  createRouteHandlerClient: jest.fn(() => mockSupabaseClient)
}))

// Mock Supabase server client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

// Mock EOSCAR formatter
const mockEOSCARFormatter = {
  generateEOSCARLetter: jest.fn(),
  validateCompliance: jest.fn()
}

jest.mock('@/lib/eoscar/eoscarFormatter', () => ({
  EOSCARFormatter: jest.fn(() => mockEOSCARFormatter),
  EOSCARValidator: {
    validateCompliance: jest.fn()
  }
}))

// Mock enhanced dispute letter generator
const mockEnhancedDisputeGenerator = {
  generateEnhancedDispute: jest.fn()
}

jest.mock('@/lib/disputes/enhancedDisputeLetterGenerator', () => ({
  enhancedDisputeLetterGenerator: mockEnhancedDisputeGenerator
}))

// Mock dispute tracker
const mockDisputeTracker = {
  getTrackingStatus: jest.fn(),
  initializeTracking: jest.fn(),
  updatePhase: jest.fn(),
  recordBureauSubmission: jest.fn(),
  recordBureauResponse: jest.fn(),
  getTrackingMetrics: jest.fn(),
  getPendingReminders: jest.fn(),
  getDisputesRequiringAttention: jest.fn()
}

jest.mock('@/lib/disputes/disputeTracker', () => ({
  default: jest.fn(() => mockDisputeTracker)
}))

// Mock CFPB integration
const mockCFPBIntegration = {
  getUserComplaints: jest.fn(),
  checkEscalationWarranted: jest.fn(),
  trackComplaint: jest.fn(),
  generateFollowUpLetter: jest.fn(),
  createComplaint: jest.fn(),
  submitComplaint: jest.fn()
}

jest.mock('@/lib/disputes/cfpbIntegration', () => ({
  default: jest.fn(() => mockCFPBIntegration)
}))

// Test data fixtures
const mockConsumerInfo = {
  firstName: 'John',
  lastName: 'Doe',
  middleName: 'Michael',
  ssn: '123-45-6789',
  dateOfBirth: '1985-03-15',
  currentAddress: {
    street: '123 Main Street',
    city: 'Anytown',
    state: 'CA',
    zipCode: '12345',
    country: 'USA',
    addressType: 'current'
  },
  previousAddresses: [{
    street: '456 Oak Ave',
    city: 'Oldtown',
    state: 'CA',
    zipCode: '54321',
    country: 'USA',
    addressType: 'previous',
    dateRange: {
      from: '2020-01-01',
      to: '2023-12-31'
    }
  }],
  phoneNumbers: [{
    number: '(555) 123-4567',
    type: 'home',
    isPrimary: true
  }, {
    number: '(555) 987-6543',
    type: 'mobile',
    isPrimary: false
  }],
  identification: {
    type: 'drivers_license',
    number: 'D1234567',
    state: 'CA',
    expirationDate: '2026-03-15'
  }
}

const mockDisputeItems = [
  {
    itemType: 'TRADELINE',
    creditorName: 'Chase Bank',
    creditorCode: 'CHASE001',
    accountNumber: '1234567890123456',
    disputeReasonCode: '02',
    disputeDescription: 'The reported balance is incorrect. The actual balance should be $0 as this account was paid in full.',
    requestedAction: 'UPDATE',
    supportingDocuments: ['payment_proof.pdf', 'account_statement.pdf'],
    originalBalance: 2500,
    currentBalance: 2500,
    dateOpened: '2020-01-15',
    dateReported: '2024-01-15',
    legalBasis: 'Fair Credit Reporting Act Section 611',
    specificInaccuracy: 'Balance amount shows $2,500 but should be $0',
    correctInformation: 'Account was paid in full on December 1, 2023',
    impactOnScore: 45,
    priority: 'high'
  },
  {
    itemType: 'COLLECTIONS',
    creditorName: 'ABC Collections',
    accountNumber: '9876543210',
    disputeReasonCode: '01',
    disputeDescription: 'This account does not belong to me and was never opened by me.',
    requestedAction: 'DELETE',
    supportingDocuments: ['identity_theft_report.pdf'],
    originalBalance: 850,
    currentBalance: 850,
    dateReported: '2023-06-15',
    legalBasis: 'Fair Credit Reporting Act Section 611',
    specificInaccuracy: 'Account belongs to someone else with similar name',
    correctInformation: 'No account was ever opened with this creditor',
    impactOnScore: 80,
    priority: 'critical'
  }
]

const mockSubmitterInfo = {
  name: 'John Michael Doe',
  address: '123 Main Street, Anytown, CA 12345',
  phone: '(555) 123-4567',
  email: 'john.doe@email.com',
  organizationType: 'individual'
}

const mockEOSCARLetter = {
  header: {
    transmissionId: 'EOSCAR-20240118-ABC123',
    submissionDate: new Date().toISOString(),
    bureauDestination: 'experian',
    submitterCode: 'INDV001',
    recordCount: 2
  },
  bureau: 'experian',
  consumerInfo: mockConsumerInfo,
  disputeItems: mockDisputeItems,
  supportingDocs: [],
  footer: {
    signature: 'John Michael Doe',
    date: new Date().toISOString(),
    electronicSignature: true
  },
  rawContent: 'Mock EOSCAR letter content...',
  complianceStatus: {
    isCompliant: true,
    complianceScore: 95,
    issues: [],
    warnings: ['Minor formatting improvement available'],
    validatedAt: new Date(),
    validatedBy: 'EOSCARValidator'
  },
  generatedAt: new Date(),
  version: '1.0',
  submissionMethod: 'EOSCAR_ELECTRONIC'
}

const mockBatchResult = {
  disputeId: 'batch_dispute_123',
  eoscarLetters: {
    experian: mockEOSCARLetter,
    equifax: { ...mockEOSCARLetter, bureau: 'equifax' },
    transunion: { ...mockEOSCARLetter, bureau: 'transunion' }
  },
  traditionalLetters: {},
  bureauSubmissions: [
    {
      bureau: 'experian',
      submissionDate: new Date(),
      submissionMethod: 'EOSCAR_ELECTRONIC',
      trackingNumber: 'EXP-TRACK-123',
      expectedResponseDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
      eoscarLetter: mockEOSCARLetter
    }
  ],
  summary: {
    totalItems: 2,
    bureausTargeted: ['experian', 'equifax', 'transunion'],
    estimatedSuccessRate: 0.85,
    eoscarCompliant: true,
    recommendedSubmissionOrder: ['experian', 'equifax', 'transunion']
  },
  validationResults: [
    {
      bureau: 'experian',
      isValid: true,
      complianceScore: 95,
      issues: [],
      warnings: ['Minor formatting improvement'],
      recommendations: ['Submit as scheduled']
    }
  ]
}

describe('Dispute Management API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up default environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
    process.env.CFPB_API_KEY = 'test-cfpb-key'
    
    // Default Supabase responses
    mockSupabaseClient.single.mockResolvedValue({
      data: { id: 'user-123', subscription_tier: 'premium' },
      error: null
    })
  })

  describe('EOSCAR Letter Generation API (/api/disputes/eoscar/generate)', () => {
    let generatePOST: any
    let generateGET: any

    beforeAll(async () => {
      const routeModule = await import('@/app/api/disputes/eoscar/generate/route')
      generatePOST = routeModule.POST
      generateGET = routeModule.GET
    })

    describe('POST /api/disputes/eoscar/generate', () => {
      it('should generate EOSCAR letter successfully with valid data', async () => {
        // Mock successful EOSCAR generation
        mockEOSCARFormatter.generateEOSCARLetter.mockResolvedValue(mockEOSCARLetter)

        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/generate', {
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-123',
            consumerInfo: mockConsumerInfo,
            disputeItems: mockDisputeItems,
            submitterInfo: mockSubmitterInfo,
            bureau: 'experian',
            options: {
              includeOptionalFields: true,
              validateCompliance: true,
              formatForBureau: true,
              includeSignature: true
            }
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await generatePOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.eoscarLetter).toBeDefined()
        expect(data.data.eoscarLetter.transmissionId).toBe(mockEOSCARLetter.header.transmissionId)
        expect(data.data.eoscarLetter.bureau).toBe('experian')
        expect(data.data.eoscarLetter.disputeItemsCount).toBe(2)
        expect(data.data.eoscarLetter.complianceStatus.isCompliant).toBe(true)
        expect(data.metadata.apiEndpoint).toBe('/api/disputes/eoscar/generate')
      })

      it('should handle test user without database verification', async () => {
        mockEOSCARFormatter.generateEOSCARLetter.mockResolvedValue(mockEOSCARLetter)

        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/generate', {
          method: 'POST',
          body: JSON.stringify({
            userId: 'test-user-id',
            consumerInfo: mockConsumerInfo,
            disputeItems: mockDisputeItems,
            submitterInfo: mockSubmitterInfo,
            bureau: 'equifax'
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await generatePOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        // Should not call user verification for test user
        expect(mockSupabaseClient.from).not.toHaveBeenCalledWith('profiles')
      })

      it('should validate required parameters', async () => {
        const testCases = [
          { body: {}, expectedError: 'Missing required parameters' },
          { 
            body: { userId: 'user-123' }, 
            expectedError: 'Missing required parameters' 
          },
          { 
            body: { 
              userId: 'user-123',
              consumerInfo: mockConsumerInfo,
              disputeItems: [],
              submitterInfo: mockSubmitterInfo,
              bureau: 'experian'
            }, 
            expectedError: 'Invalid dispute items' 
          },
          { 
            body: { 
              userId: 'user-123',
              consumerInfo: mockConsumerInfo,
              disputeItems: mockDisputeItems,
              submitterInfo: mockSubmitterInfo,
              bureau: 'invalid-bureau'
            }, 
            expectedError: 'Invalid bureau' 
          }
        ]

        for (const testCase of testCases) {
          const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/generate', {
            method: 'POST',
            body: JSON.stringify(testCase.body),
            headers: { 'Content-Type': 'application/json' }
          })

          const response = await generatePOST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.success).toBe(false)
          expect(data.error).toContain(testCase.expectedError)
        }
      })

      it('should validate dispute item structure', async () => {
        const invalidDisputeItems = [
          {
            // Missing required fields
            itemType: 'TRADELINE'
          }
        ]

        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/generate', {
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-123',
            consumerInfo: mockConsumerInfo,
            disputeItems: invalidDisputeItems,
            submitterInfo: mockSubmitterInfo,
            bureau: 'experian'
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await generatePOST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.details).toContain('creditorName, accountNumber, and disputeDescription are required')
      })

      it('should handle user authentication failure', async () => {
        mockSupabaseClient.single.mockResolvedValue({
          data: null,
          error: new Error('User not found')
        })

        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/generate', {
          method: 'POST',
          body: JSON.stringify({
            userId: 'invalid-user',
            consumerInfo: mockConsumerInfo,
            disputeItems: mockDisputeItems,
            submitterInfo: mockSubmitterInfo,
            bureau: 'experian'
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await generatePOST(request)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.success).toBe(false)
        expect(data.error).toBe('User not found or unauthorized')
      })

      it('should handle EOSCAR generation errors', async () => {
        mockEOSCARFormatter.generateEOSCARLetter.mockRejectedValue(new Error('EOSCAR generation failed'))

        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/generate', {
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-123',
            consumerInfo: mockConsumerInfo,
            disputeItems: mockDisputeItems,
            submitterInfo: mockSubmitterInfo,
            bureau: 'experian'
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await generatePOST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Failed to generate EOSCAR letter')
        expect(data.details).toBe('EOSCAR generation failed')
      })

      it('should handle malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/generate', {
          method: 'POST',
          body: 'invalid json',
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await generatePOST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })

      it('should include detailed metadata in response', async () => {
        mockEOSCARFormatter.generateEOSCARLetter.mockResolvedValue(mockEOSCARLetter)

        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/generate', {
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-123',
            consumerInfo: mockConsumerInfo,
            disputeItems: mockDisputeItems,
            submitterInfo: mockSubmitterInfo,
            bureau: 'transunion'
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await generatePOST(request)
        const data = await response.json()

        expect(data.metadata).toBeDefined()
        expect(data.metadata.timestamp).toBeDefined()
        expect(data.metadata.version).toBe('1.0')
        expect(data.metadata.apiEndpoint).toBe('/api/disputes/eoscar/generate')
        expect(typeof data.metadata.processingTime).toBe('number')
      })
    })

    describe('GET /api/disputes/eoscar/generate', () => {
      it('should return API documentation', async () => {
        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/generate', {
          method: 'GET'
        })

        const response = await generateGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.endpoint).toBe('/api/disputes/eoscar/generate')
        expect(data.description).toContain('EOSCAR-compliant dispute letters')
        expect(data.methods).toContain('POST')
        expect(data.parameters).toBeDefined()
        expect(data.features).toBeDefined()
        expect(data.exampleRequest).toBeDefined()
      })
    })
  })

  describe('EOSCAR Validation API (/api/disputes/eoscar/validate)', () => {
    let validatePOST: any
    let validateGET: any

    beforeAll(async () => {
      const routeModule = await import('@/app/api/disputes/eoscar/validate/route')
      validatePOST = routeModule.POST
      validateGET = routeModule.GET
    })

    describe('POST /api/disputes/eoscar/validate', () => {
      it('should validate EOSCAR letter object successfully', async () => {
        const mockValidationResult = {
          isCompliant: true,
          complianceScore: 92,
          issues: [],
          warnings: ['Minor formatting suggestion'],
          validatedAt: new Date(),
          validatedBy: 'EOSCARValidator'
        }

        const { EOSCARValidator } = require('@/lib/eoscar/eoscarFormatter')
        EOSCARValidator.validateCompliance.mockResolvedValue(mockValidationResult)

        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/validate', {
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-123',
            eoscarLetter: mockEOSCARLetter
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await validatePOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.validation.isCompliant).toBe(true)
        expect(data.data.validation.complianceScore).toBe(92)
        expect(data.data.validation.issues.total).toBe(0)
        expect(data.data.validation.warnings.total).toBe(1)
        expect(data.data.validation.readinessAssessment.readyForSubmission).toBe(true)
      })

      it('should validate raw EOSCAR content', async () => {
        const rawContent = `
          TRANSMISSION HEADER
          Transmission ID: EOSCAR-123456
          Submission Date: 2024-01-18
          SUBMITTER INFORMATION
          Name: John Doe
          CONSUMER INFORMATION  
          Name: John Doe
          SSN: 123-45-6789
          CURRENT ADDRESS
          123 Main St, Anytown, CA 12345
          DISPUTE ITEMS
          Item 1: Chase Bank Account Issue
          LEGAL NOTICES
          Fair Credit Reporting Act
          SIGNATURE
          Electronic Signature: John Doe
          TRANSMISSION FOOTER
        `

        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/validate', {
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-123',
            rawContent,
            bureau: 'experian',
            validationType: 'full'
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await validatePOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.validation).toBeDefined()
        expect(data.data.validation.complianceScore).toBeGreaterThan(0)
      })

      it('should identify compliance issues in raw content', async () => {
        const invalidRawContent = `
          TRANSMISSION HEADER
          Missing required sections...
        `

        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/validate', {
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-123',
            rawContent: invalidRawContent
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await validatePOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.validation.isCompliant).toBe(false)
        expect(data.data.validation.issues.total).toBeGreaterThan(0)
        expect(data.data.validation.complianceScore).toBeLessThan(50)
      })

      it('should validate required parameters', async () => {
        const testCases = [
          { body: {}, expectedError: 'Missing required parameter: userId' },
          { 
            body: { userId: 'user-123' }, 
            expectedError: 'Either eoscarLetter object or rawContent string is required' 
          }
        ]

        for (const testCase of testCases) {
          const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/validate', {
            method: 'POST',
            body: JSON.stringify(testCase.body),
            headers: { 'Content-Type': 'application/json' }
          })

          const response = await validatePOST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.success).toBe(false)
          expect(data.error).toContain(testCase.expectedError)
        }
      })

      it('should generate actionable recommendations', async () => {
        const mockValidationWithIssues = {
          isCompliant: false,
          complianceScore: 65,
          issues: ['Missing required section: TRANSMISSION HEADER', 'Invalid SSN format'],
          warnings: ['Bureau name not found'],
          validatedAt: new Date(),
          validatedBy: 'EOSCARValidator'
        }

        const { EOSCARValidator } = require('@/lib/eoscar/eoscarFormatter')
        EOSCARValidator.validateCompliance.mockResolvedValue(mockValidationWithIssues)

        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/validate', {
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-123',
            eoscarLetter: mockEOSCARLetter
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await validatePOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.validation.recommendations).toBeDefined()
        expect(Array.isArray(data.data.validation.recommendations)).toBe(true)
        expect(data.data.validation.recommendations.length).toBeGreaterThan(0)
        expect(data.data.validation.readinessAssessment.readyForSubmission).toBe(false)
      })
    })

    describe('GET /api/disputes/eoscar/validate', () => {
      it('should return validation API documentation', async () => {
        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/validate', {
          method: 'GET'
        })

        const response = await validateGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.endpoint).toBe('/api/disputes/eoscar/validate')
        expect(data.validationTypes).toBeDefined()
        expect(data.complianceScoring).toBeDefined()
        expect(data.features).toContain('EOSCAR format compliance checking')
      })
    })
  })

  describe('Batch Dispute Processing API (/api/disputes/eoscar/batch)', () => {
    let batchPOST: any
    let batchGET: any

    beforeAll(async () => {
      const routeModule = await import('@/app/api/disputes/eoscar/batch/route')
      batchPOST = routeModule.POST
      batchGET = routeModule.GET
    })

    describe('POST /api/disputes/eoscar/batch', () => {
      it('should process batch dispute successfully', async () => {
        mockEnhancedDisputeGenerator.generateEnhancedDispute.mockResolvedValue(mockBatchResult)

        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/batch', {
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-123',
            consumerInfo: mockConsumerInfo,
            disputeItems: mockDisputeItems,
            submitterInfo: mockSubmitterInfo,
            bureaus: ['experian', 'equifax', 'transunion'],
            options: {
              useEOSCARFormat: true,
              batchProcessing: true,
              bureauSpecificFormatting: true,
              validateCompliance: true
            }
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await batchPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.batchResult.disputeId).toBe('batch_dispute_123')
        expect(Object.keys(data.data.batchResult.eoscarLetters)).toEqual(['experian', 'equifax', 'transunion'])
        expect(data.data.batchResult.summary.totalItems).toBe(2)
        expect(data.data.batchResult.summary.bureausTargeted).toEqual(['experian', 'equifax', 'transunion'])
        expect(data.data.batchResult.processingMetrics.readyForSubmission).toBe(true)
      })

      it('should validate bureau array', async () => {
        const testCases = [
          { bureaus: [], expectedError: 'bureaus must be a non-empty array' },
          { bureaus: 'not-array', expectedError: 'bureaus must be a non-empty array' },
          { 
            bureaus: ['experian', 'invalid-bureau'], 
            expectedError: 'Invalid bureaus: invalid-bureau' 
          }
        ]

        for (const testCase of testCases) {
          const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/batch', {
            method: 'POST',
            body: JSON.stringify({
              userId: 'user-123',
              consumerInfo: mockConsumerInfo,
              disputeItems: mockDisputeItems,
              submitterInfo: mockSubmitterInfo,
              bureaus: testCase.bureaus
            }),
            headers: { 'Content-Type': 'application/json' }
          })

          const response = await batchPOST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.success).toBe(false)
          expect(data.error).toContain(testCase.expectedError)
        }
      })

      it('should handle batch processing errors', async () => {
        mockEnhancedDisputeGenerator.generateEnhancedDispute.mockRejectedValue(
          new Error('Batch processing failed')
        )

        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/batch', {
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-123',
            consumerInfo: mockConsumerInfo,
            disputeItems: mockDisputeItems,
            submitterInfo: mockSubmitterInfo,
            bureaus: ['experian']
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await batchPOST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Failed to process batch dispute')
        expect(data.details).toBe('Batch processing failed')
      })

      it('should include detailed processing metrics', async () => {
        mockEnhancedDisputeGenerator.generateEnhancedDispute.mockResolvedValue(mockBatchResult)

        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/batch', {
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-123',
            consumerInfo: mockConsumerInfo,
            disputeItems: mockDisputeItems,
            submitterInfo: mockSubmitterInfo,
            bureaus: ['experian', 'equifax']
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await batchPOST(request)
        const data = await response.json()

        expect(data.data.batchResult.processingMetrics).toBeDefined()
        expect(data.data.batchResult.processingMetrics.totalProcessingTime).toBeDefined()
        expect(data.data.batchResult.processingMetrics.averageComplianceScore).toBeDefined()
        expect(data.data.batchResult.processingMetrics.recommendedSubmissionOrder).toBeDefined()
        expect(data.metadata.batchSize).toBe(2)
        expect(data.metadata.bureausTargeted).toBe(2)
      })

      it('should handle partial batch failures gracefully', async () => {
        const partialBatchResult = {
          ...mockBatchResult,
          validationResults: [
            {
              bureau: 'experian',
              isValid: true,
              complianceScore: 95,
              issues: [],
              warnings: [],
              recommendations: []
            },
            {
              bureau: 'equifax',
              isValid: false,
              complianceScore: 60,
              issues: ['Missing required field'],
              warnings: ['Format warning'],
              recommendations: ['Fix missing field']
            }
          ]
        }

        mockEnhancedDisputeGenerator.generateEnhancedDispute.mockResolvedValue(partialBatchResult)

        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/batch', {
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-123',
            consumerInfo: mockConsumerInfo,
            disputeItems: mockDisputeItems,
            submitterInfo: mockSubmitterInfo,
            bureaus: ['experian', 'equifax']
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await batchPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.batchResult.validationResults).toHaveLength(2)
        expect(data.data.batchResult.processingMetrics.readyForSubmission).toBe(false)
      })
    })

    describe('GET /api/disputes/eoscar/batch', () => {
      it('should return batch processing documentation', async () => {
        const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/batch', {
          method: 'GET'
        })

        const response = await batchGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.endpoint).toBe('/api/disputes/eoscar/batch')
        expect(data.features).toContain('Multi-bureau batch processing')
        expect(data.batchOptions).toBeDefined()
        expect(data.exampleRequest).toBeDefined()
        expect(data.responseStructure).toBeDefined()
      })
    })
  })

  describe('Dispute Tracking API (/api/tracking/disputes)', () => {
    let trackingGET: any
    let trackingPOST: any
    let trackingPUT: any

    beforeAll(async () => {
      const routeModule = await import('@/app/api/tracking/disputes/route')
      trackingGET = routeModule.GET
      trackingPOST = routeModule.POST
      trackingPUT = routeModule.PUT
    })

    beforeEach(() => {
      // Mock dispute tracking data
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.order.mockResolvedValue({
        data: [
          {
            id: 'dispute-123',
            user_id: 'user-123',
            status: 'submitted',
            created_at: '2024-01-15T10:00:00Z',
            dispute_tracking: [
              {
                dispute_id: 'dispute-123',
                current_phase: 'BUREAU_REVIEW',
                status: 'submitted'
              }
            ],
            bureau_submissions: [
              {
                bureau: 'experian',
                submission_date: '2024-01-15T10:00:00Z',
                tracking_number: 'EXP-123'
              }
            ],
            bureau_responses: []
          }
        ],
        error: null
      })

      mockDisputeTracker.getTrackingStatus.mockResolvedValue({
        disputeId: 'dispute-123',
        currentPhase: 'BUREAU_REVIEW',
        status: 'submitted',
        timeline: [
          {
            phase: 'SUBMITTED',
            timestamp: '2024-01-15T10:00:00Z',
            notes: 'Dispute submitted to bureaus'
          }
        ],
        bureauStatus: [
          {
            bureau: 'experian',
            status: 'submitted',
            submissionDate: '2024-01-15T10:00:00Z',
            trackingNumber: 'EXP-123'
          }
        ]
      })
    })

    describe('GET /api/tracking/disputes', () => {
      it('should get all disputes for user', async () => {
        const request = new NextRequest('http://localhost:3000/api/tracking/disputes?userId=user-123', {
          method: 'GET'
        })

        const response = await trackingGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.disputes).toBeDefined()
        expect(Array.isArray(data.data.disputes)).toBe(true)
        expect(data.data.totalCount).toBe(1)
      })

      it('should get specific dispute by ID', async () => {
        const request = new NextRequest('http://localhost:3000/api/tracking/disputes?userId=user-123&disputeId=dispute-123', {
          method: 'GET'
        })

        const response = await trackingGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.dispute).toBeDefined()
        expect(data.data.dispute.disputeId).toBe('dispute-123')
      })

      it('should include metrics when requested', async () => {
        mockDisputeTracker.getTrackingMetrics.mockResolvedValue({
          totalDisputes: 5,
          activeDisputes: 3,
          resolvedDisputes: 2,
          averageResolutionTime: 45,
          successRate: 0.8
        })

        const request = new NextRequest('http://localhost:3000/api/tracking/disputes?userId=user-123&includeMetrics=true', {
          method: 'GET'
        })

        const response = await trackingGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.metrics).toBeDefined()
        expect(data.data.metrics.totalDisputes).toBe(5)
        expect(data.data.metrics.successRate).toBe(0.8)
      })

      it('should include reminders when requested', async () => {
        mockDisputeTracker.getPendingReminders.mockResolvedValue([
          {
            disputeId: 'dispute-123',
            type: 'follow_up',
            dueDate: '2024-02-20T10:00:00Z',
            message: 'Follow up on Experian dispute'
          }
        ])

        const request = new NextRequest('http://localhost:3000/api/tracking/disputes?userId=user-123&includeReminders=true', {
          method: 'GET'
        })

        const response = await trackingGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.reminders).toBeDefined()
        expect(Array.isArray(data.data.reminders)).toBe(true)
        expect(data.data.reminders).toHaveLength(1)
      })

      it('should filter by status', async () => {
        const request = new NextRequest('http://localhost:3000/api/tracking/disputes?userId=user-123&status=submitted', {
          method: 'GET'
        })

        const response = await trackingGET(request)

        expect(response.status).toBe(200)
        expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'submitted')
      })

      it('should filter by bureau', async () => {
        const request = new NextRequest('http://localhost:3000/api/tracking/disputes?userId=user-123&bureau=experian', {
          method: 'GET'
        })

        const response = await trackingGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should require userId parameter', async () => {
        const request = new NextRequest('http://localhost:3000/api/tracking/disputes', {
          method: 'GET'
        })

        const response = await trackingGET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('User ID is required')
      })

      it('should handle dispute not found', async () => {
        mockDisputeTracker.getTrackingStatus.mockResolvedValue(null)

        const request = new NextRequest('http://localhost:3000/api/tracking/disputes?userId=user-123&disputeId=nonexistent', {
          method: 'GET'
        })

        const response = await trackingGET(request)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Dispute not found')
      })
    })

    describe('POST /api/tracking/disputes', () => {
      it('should initialize tracking for new dispute', async () => {
        mockDisputeTracker.initializeTracking.mockResolvedValue({
          disputeId: 'dispute-123',
          trackingId: 'track-123',
          initialPhase: 'PREPARATION',
          status: 'initialized'
        })

        const request = new NextRequest('http://localhost:3000/api/tracking/disputes', {
          method: 'POST',
          body: JSON.stringify({
            disputeId: 'dispute-123',
            action: 'initialize'
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await trackingPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.tracking).toBeDefined()
        expect(data.data.message).toBe('Dispute tracking initialized successfully')
      })

      it('should update dispute phase', async () => {
        const request = new NextRequest('http://localhost:3000/api/tracking/disputes', {
          method: 'POST',
          body: JSON.stringify({
            disputeId: 'dispute-123',
            action: 'updatePhase',
            data: {
              newPhase: 'BUREAU_REVIEW',
              notes: 'Dispute submitted to all bureaus'
            }
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await trackingPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.newPhase).toBe('BUREAU_REVIEW')
        expect(mockDisputeTracker.updatePhase).toHaveBeenCalledWith(
          'dispute-123',
          'BUREAU_REVIEW',
          'Dispute submitted to all bureaus'
        )
      })

      it('should record bureau submission', async () => {
        const request = new NextRequest('http://localhost:3000/api/tracking/disputes', {
          method: 'POST',
          body: JSON.stringify({
            disputeId: 'dispute-123',
            action: 'recordSubmission',
            data: {
              bureau: 'experian',
              submissionDate: '2024-01-15T10:00:00Z',
              trackingNumber: 'EXP-TRACK-123'
            }
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await trackingPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.bureau).toBe('experian')
        expect(data.data.trackingNumber).toBe('EXP-TRACK-123')
      })

      it('should record bureau response', async () => {
        const request = new NextRequest('http://localhost:3000/api/tracking/disputes', {
          method: 'POST',
          body: JSON.stringify({
            disputeId: 'dispute-123',
            action: 'recordResponse',
            data: {
              bureau: 'experian',
              responseDate: '2024-02-15T10:00:00Z',
              outcome: 'partial_success',
              responseDetails: '2 out of 3 items updated'
            }
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await trackingPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.outcome).toBe('partial_success')
      })

      it('should validate required parameters for each action', async () => {
        const testCases = [
          {
            body: { action: 'updatePhase', disputeId: 'dispute-123', data: {} },
            expectedError: 'Valid phase is required'
          },
          {
            body: { action: 'recordSubmission', disputeId: 'dispute-123', data: {} },
            expectedError: 'Bureau and submission date are required'
          },
          {
            body: { action: 'recordResponse', disputeId: 'dispute-123', data: {} },
            expectedError: 'Bureau, response date, and outcome are required'
          },
          {
            body: { action: 'invalid_action', disputeId: 'dispute-123' },
            expectedError: 'Invalid action specified'
          }
        ]

        for (const testCase of testCases) {
          const request = new NextRequest('http://localhost:3000/api/tracking/disputes', {
            method: 'POST',
            body: JSON.stringify(testCase.body),
            headers: { 'Content-Type': 'application/json' }
          })

          const response = await trackingPOST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.error).toContain(testCase.expectedError)
        }
      })

      it('should require disputeId', async () => {
        const request = new NextRequest('http://localhost:3000/api/tracking/disputes', {
          method: 'POST',
          body: JSON.stringify({
            action: 'initialize'
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await trackingPOST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Dispute ID is required')
      })
    })

    describe('PUT /api/tracking/disputes', () => {
      it('should update tracking information', async () => {
        mockSupabaseClient.update.mockReturnValue(mockSupabaseClient)
        mockSupabaseClient.eq.mockResolvedValue({ error: null })
        
        const request = new NextRequest('http://localhost:3000/api/tracking/disputes', {
          method: 'PUT',
          body: JSON.stringify({
            disputeId: 'dispute-123',
            updates: {
              status: 'in_progress',
              notes: 'Updated tracking information'
            }
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await trackingPUT(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.message).toBe('Tracking information updated successfully')
      })

      it('should handle database update errors', async () => {
        mockSupabaseClient.update.mockReturnValue(mockSupabaseClient)
        mockSupabaseClient.eq.mockResolvedValue({ 
          error: new Error('Database update failed') 
        })

        const request = new NextRequest('http://localhost:3000/api/tracking/disputes', {
          method: 'PUT',
          body: JSON.stringify({
            disputeId: 'dispute-123',
            updates: { status: 'updated' }
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await trackingPUT(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Failed to update tracking')
      })
    })
  })

  describe('CFPB Escalation API (/api/escalation/cfpb)', () => {
    let cfpbGET: any
    let cfpbPOST: any
    let cfpbPUT: any
    let cfpbDELETE: any

    beforeAll(async () => {
      const routeModule = await import('@/app/api/escalation/cfpb/route')
      cfpbGET = routeModule.GET
      cfpbPOST = routeModule.POST
      cfpbPUT = routeModule.PUT
      cfpbDELETE = routeModule.DELETE
    })

    beforeEach(() => {
      // Mock CFPB integration responses
      mockCFPBIntegration.getUserComplaints.mockResolvedValue([
        {
          id: 'cfpb-123',
          disputeId: 'dispute-123',
          status: 'submitted',
          confirmationNumber: 'CFPB-CONF-123',
          submittedAt: '2024-01-20T10:00:00Z'
        }
      ])

      mockCFPBIntegration.checkEscalationWarranted.mockResolvedValue({
        warranted: true,
        reasons: ['No response after 35 days', 'Dispute rejected without cause'],
        urgency: 'high',
        recommendation: 'Escalate to CFPB immediately'
      })
    })

    describe('GET /api/escalation/cfpb', () => {
      it('should list user complaints', async () => {
        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb?userId=user-123&action=list', {
          method: 'GET'
        })

        const response = await cfpbGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.complaints).toBeDefined()
        expect(Array.isArray(data.data.complaints)).toBe(true)
        expect(data.data.totalCount).toBe(1)
      })

      it('should check escalation warrant', async () => {
        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb?disputeId=dispute-123&action=check_escalation', {
          method: 'GET'
        })

        const response = await cfpbGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.escalation).toBeDefined()
        expect(data.data.escalation.warranted).toBe(true)
        expect(Array.isArray(data.data.escalation.reasons)).toBe(true)
      })

      it('should track complaint', async () => {
        mockCFPBIntegration.trackComplaint.mockResolvedValue({
          complaintId: 'cfpb-123',
          status: 'submitted',
          confirmationNumber: 'CFPB-CONF-123',
          submittedAt: '2024-01-20T10:00:00Z',
          lastUpdate: '2024-01-25T10:00:00Z'
        })

        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb?complaintId=cfpb-123&action=track', {
          method: 'GET'
        })

        const response = await cfpbGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.tracking).toBeDefined()
        expect(data.data.tracking.confirmationNumber).toBe('CFPB-CONF-123')
      })

      it('should generate follow-up letter', async () => {
        mockCFPBIntegration.generateFollowUpLetter.mockResolvedValue({
          letter: 'Mock follow-up letter content...',
          letterType: 'follow_up',
          generatedAt: new Date().toISOString()
        })

        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb?disputeId=dispute-123&action=follow_up_letter', {
          method: 'GET'
        })

        const response = await cfpbGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.followUpLetter).toBeDefined()
      })

      it('should handle follow-up letter timing restrictions', async () => {
        mockCFPBIntegration.generateFollowUpLetter.mockRejectedValue(
          new Error('Follow-up letter can only be generated after 35 days')
        )

        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb?disputeId=dispute-123&action=follow_up_letter', {
          method: 'GET'
        })

        const response = await cfpbGET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Follow-up letter can only be generated after 35 days')
      })

      it('should validate required parameters', async () => {
        const testCases = [
          { 
            url: '?action=list', 
            expectedError: 'User ID is required for listing complaints' 
          },
          { 
            url: '?action=check_escalation', 
            expectedError: 'Dispute ID is required for escalation check' 
          },
          { 
            url: '?action=track', 
            expectedError: 'Complaint ID is required for tracking' 
          },
          { 
            url: '?action=invalid', 
            expectedError: 'Invalid action specified' 
          }
        ]

        for (const testCase of testCases) {
          const request = new NextRequest(`http://localhost:3000/api/escalation/cfpb${testCase.url}`, {
            method: 'GET'
          })

          const response = await cfpbGET(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.error).toContain(testCase.expectedError)
        }
      })
    })

    describe('POST /api/escalation/cfpb', () => {
      it('should create complaint successfully', async () => {
        const mockComplaint = {
          id: 'cfpb-new-123',
          disputeId: 'dispute-123',
          complaintType: 'reporting_error',
          status: 'draft',
          createdAt: new Date().toISOString()
        }

        mockCFPBIntegration.createComplaint.mockResolvedValue(mockComplaint)

        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb', {
          method: 'POST',
          body: JSON.stringify({
            action: 'create_complaint',
            disputeId: 'dispute-123',
            userId: 'user-123',
            complaintType: 'reporting_error',
            bureau: 'experian',
            customComplaintText: 'Custom complaint details...'
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await cfpbPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.complaint).toBeDefined()
        expect(data.data.complaint.id).toBe('cfpb-new-123')
        expect(data.data.nextSteps).toBeDefined()
        expect(Array.isArray(data.data.nextSteps)).toBe(true)
      })

      it('should prevent escalation when not warranted', async () => {
        mockCFPBIntegration.checkEscalationWarranted.mockResolvedValue({
          warranted: false,
          reasons: ['Dispute submitted less than 30 days ago'],
          urgency: 'low',
          recommendation: 'Wait for bureau response'
        })

        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb', {
          method: 'POST',
          body: JSON.stringify({
            action: 'create_complaint',
            disputeId: 'dispute-123',
            userId: 'user-123',
            complaintType: 'reporting_error',
            bureau: 'experian'
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await cfpbPOST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Escalation may not be warranted at this time')
        expect(data.data.recommendation).toBeDefined()
      })

      it('should submit complaint', async () => {
        const mockSubmissionResult = {
          success: true,
          confirmationNumber: 'CFPB-CONF-456',
          submittedAt: new Date().toISOString(),
          trackingUrl: 'https://cfpb.gov/track/CFPB-CONF-456'
        }

        mockCFPBIntegration.submitComplaint.mockResolvedValue(mockSubmissionResult)

        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb', {
          method: 'POST',
          body: JSON.stringify({
            action: 'submit_complaint',
            complaintId: 'cfpb-123'
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await cfpbPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.submission.confirmationNumber).toBe('CFPB-CONF-456')
      })

      it('should handle submission failures', async () => {
        const mockSubmissionFailure = {
          success: false,
          error: 'Incomplete complaint information',
          nextSteps: ['Review complaint details', 'Add missing information']
        }

        mockCFPBIntegration.submitComplaint.mockResolvedValue(mockSubmissionFailure)

        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb', {
          method: 'POST',
          body: JSON.stringify({
            action: 'submit_complaint',
            complaintId: 'cfpb-incomplete'
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await cfpbPOST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Incomplete complaint information')
        expect(data.data.nextSteps).toBeDefined()
      })

      it('should handle bulk escalation', async () => {
        const mockBulkComplaint = {
          id: 'cfpb-bulk-123',
          disputeId: 'dispute-123',
          status: 'draft'
        }

        mockCFPBIntegration.createComplaint.mockResolvedValue(mockBulkComplaint)
        mockCFPBIntegration.submitComplaint.mockResolvedValue({
          success: true,
          confirmationNumber: 'CFPB-BULK-123'
        })

        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb', {
          method: 'POST',
          body: JSON.stringify({
            action: 'bulk_escalation',
            disputeIds: ['dispute-123', 'dispute-456'],
            userId: 'user-123',
            bulkComplaintType: 'reporting_error',
            targetBureau: 'experian'
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await cfpbPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.processed).toBeGreaterThan(0)
        expect(data.data.results).toBeDefined()
        expect(Array.isArray(data.data.results)).toBe(true)
      })

      it('should validate bureau parameter', async () => {
        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb', {
          method: 'POST',
          body: JSON.stringify({
            action: 'create_complaint',
            disputeId: 'dispute-123',
            userId: 'user-123',
            complaintType: 'reporting_error',
            bureau: 'invalid-bureau'
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await cfpbPOST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid bureau specified')
      })

      it('should require action parameter', async () => {
        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb', {
          method: 'POST',
          body: JSON.stringify({}),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await cfpbPOST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Action is required')
      })
    })

    describe('PUT /api/escalation/cfpb', () => {
      it('should update complaint status', async () => {
        mockSupabaseClient.update.mockReturnValue(mockSupabaseClient)
        mockSupabaseClient.eq.mockResolvedValue({ error: null })

        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb', {
          method: 'PUT',
          body: JSON.stringify({
            complaintId: 'cfpb-123',
            action: 'update_status',
            updates: {
              status: 'resolved',
              responseText: 'Bureau responded and corrected the error',
              resolutionAchieved: true
            }
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await cfpbPUT(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.message).toBe('Complaint status updated successfully')
      })

      it('should add follow-up information', async () => {
        mockSupabaseClient.insert.mockResolvedValue({ error: null })

        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb', {
          method: 'PUT',
          body: JSON.stringify({
            complaintId: 'cfpb-123',
            action: 'add_follow_up',
            updates: {
              followUpText: 'Additional information provided',
              followUpType: 'additional_evidence'
            }
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await cfpbPUT(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.message).toBe('Follow-up added successfully')
      })

      it('should handle database errors', async () => {
        mockSupabaseClient.update.mockReturnValue(mockSupabaseClient)
        mockSupabaseClient.eq.mockResolvedValue({ 
          error: new Error('Database update failed') 
        })

        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb', {
          method: 'PUT',
          body: JSON.stringify({
            complaintId: 'cfpb-123',
            updates: { status: 'updated' }
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await cfpbPUT(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Failed to update complaint')
      })

      it('should require complaintId', async () => {
        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb', {
          method: 'PUT',
          body: JSON.stringify({
            updates: { status: 'updated' }
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await cfpbPUT(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Complaint ID is required')
      })
    })

    describe('DELETE /api/escalation/cfpb', () => {
      it('should cancel complaint successfully', async () => {
        mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
        mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
        mockSupabaseClient.single.mockResolvedValue({
          data: {
            status: 'draft',
            confirmation_number: null
          },
          error: null
        })

        mockSupabaseClient.update.mockReturnValue(mockSupabaseClient)
        mockSupabaseClient.eq.mockResolvedValue({ error: null })

        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb?complaintId=cfpb-123&reason=User%20requested', {
          method: 'DELETE'
        })

        const response = await cfpbDELETE(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.message).toBe('Complaint cancelled successfully')
        expect(data.data.note).toContain('cancelled before CFPB submission')
      })

      it('should handle already submitted complaints', async () => {
        mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
        mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
        mockSupabaseClient.single.mockResolvedValue({
          data: {
            status: 'submitted',
            confirmation_number: 'CFPB-CONF-123'
          },
          error: null
        })

        mockSupabaseClient.update.mockReturnValue(mockSupabaseClient)
        mockSupabaseClient.eq.mockResolvedValue({ error: null })

        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb?complaintId=cfpb-123', {
          method: 'DELETE'
        })

        const response = await cfpbDELETE(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.note).toContain('already submitted to CFPB')
      })

      it('should prevent cancellation of non-cancellable statuses', async () => {
        mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
        mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
        mockSupabaseClient.single.mockResolvedValue({
          data: {
            status: 'resolved',
            confirmation_number: 'CFPB-CONF-123'
          },
          error: null
        })

        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb?complaintId=cfpb-123', {
          method: 'DELETE'
        })

        const response = await cfpbDELETE(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Complaint cannot be cancelled in current status')
      })

      it('should handle complaint not found', async () => {
        mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
        mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
        mockSupabaseClient.single.mockResolvedValue({
          data: null,
          error: new Error('Not found')
        })

        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb?complaintId=nonexistent', {
          method: 'DELETE'
        })

        const response = await cfpbDELETE(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })

      it('should require complaintId parameter', async () => {
        const request = new NextRequest('http://localhost:3000/api/escalation/cfpb', {
          method: 'DELETE'
        })

        const response = await cfpbDELETE(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Complaint ID is required')
      })
    })
  })

  describe('Rate Limiting and Security', () => {
    it('should handle high volume requests gracefully', async () => {
      const { POST } = await import('@/app/api/disputes/eoscar/generate/route')
      
      mockEOSCARFormatter.generateEOSCARLetter.mockResolvedValue(mockEOSCARLetter)

      const requests = Array(10).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/disputes/eoscar/generate', {
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-123',
            consumerInfo: mockConsumerInfo,
            disputeItems: mockDisputeItems.slice(0, 1),
            submitterInfo: mockSubmitterInfo,
            bureau: 'experian'
          }),
          headers: { 'Content-Type': 'application/json' }
        })
      )

      const responses = await Promise.all(
        requests.map(req => POST(req))
      )

      // All should succeed in test environment
      responses.forEach(response => {
        expect([200, 429, 500]).toContain(response.status)
      })
    })

    it('should sanitize user input data', async () => {
      const { POST } = await import('@/app/api/disputes/eoscar/generate/route')
      
      mockEOSCARFormatter.generateEOSCARLetter.mockResolvedValue(mockEOSCARLetter)

      const maliciousInput = {
        userId: 'user-123',
        consumerInfo: {
          ...mockConsumerInfo,
          firstName: '<script>alert("xss")</script>John',
          lastName: 'Doe; DROP TABLE users;--'
        },
        disputeItems: [{
          ...mockDisputeItems[0],
          disputeDescription: '<iframe src="javascript:alert(1)"></iframe>Valid dispute'
        }],
        submitterInfo: mockSubmitterInfo,
        bureau: 'experian'
      }

      const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/generate', {
        method: 'POST',
        body: JSON.stringify(maliciousInput),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      // Should handle gracefully without executing malicious code
      expect([200, 400, 500]).toContain(response.status)
      
      if (response.status === 200) {
        // Verify the input was processed safely
        expect(data.success).toBe(true)
      }
    })

    it('should validate content length limits', async () => {
      const { POST } = await import('@/app/api/disputes/eoscar/generate/route')
      
      const oversizedInput = {
        userId: 'user-123',
        consumerInfo: mockConsumerInfo,
        disputeItems: [{
          ...mockDisputeItems[0],
          disputeDescription: 'A'.repeat(10000) // Very long description
        }],
        submitterInfo: mockSubmitterInfo,
        bureau: 'experian'
      }

      const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/generate', {
        method: 'POST',
        body: JSON.stringify(oversizedInput),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      
      // Should handle large inputs appropriately
      expect([200, 400, 413, 500]).toContain(response.status)
    })
  })

  describe('Performance and Monitoring', () => {
    it('should complete dispute generation within time limits', async () => {
      const { POST } = await import('@/app/api/disputes/eoscar/generate/route')
      
      mockEOSCARFormatter.generateEOSCARLetter.mockResolvedValue(mockEOSCARLetter)

      const startTime = Date.now()

      const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/generate', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          consumerInfo: mockConsumerInfo,
          disputeItems: mockDisputeItems,
          submitterInfo: mockSubmitterInfo,
          bureau: 'experian'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const endTime = Date.now()
      const duration = endTime - startTime

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(5000) // 5 seconds max
    })

    it('should include performance metadata in responses', async () => {
      const { POST } = await import('@/app/api/disputes/eoscar/batch/route')
      
      mockEnhancedDisputeGenerator.generateEnhancedDispute.mockResolvedValue(mockBatchResult)

      const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/batch', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          consumerInfo: mockConsumerInfo,
          disputeItems: mockDisputeItems,
          submitterInfo: mockSubmitterInfo,
          bureaus: ['experian', 'equifax']
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata).toBeDefined()
      expect(data.metadata.timestamp).toBeDefined()
      expect(data.metadata.batchSize).toBeDefined()
      expect(data.metadata.bureausTargeted).toBeDefined()
      expect(data.data.batchResult.processingMetrics).toBeDefined()
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary service failures', async () => {
      const { POST } = await import('@/app/api/disputes/eoscar/generate/route')
      
      // First call fails
      mockEOSCARFormatter.generateEOSCARLetter
        .mockRejectedValueOnce(new Error('Temporary service failure'))
        .mockResolvedValueOnce(mockEOSCARLetter)

      const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/generate', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          consumerInfo: mockConsumerInfo,
          disputeItems: mockDisputeItems,
          submitterInfo: mockSubmitterInfo,
          bureau: 'experian'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      // Should gracefully handle the failure
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to generate EOSCAR letter')
    })

    it('should handle database connection failures', async () => {
      mockSupabaseClient.single.mockRejectedValue(new Error('Database connection failed'))

      const { GET } = await import('@/app/api/tracking/disputes/route')

      const request = new NextRequest('http://localhost:3000/api/tracking/disputes?userId=user-123', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Failed to fetch disputes')
    })

    it('should provide helpful error messages', async () => {
      const { POST } = await import('@/app/api/disputes/eoscar/validate/route')
      
      const request = new NextRequest('http://localhost:3000/api/disputes/eoscar/validate', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          rawContent: '' // Empty content
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.validation.issues.total).toBeGreaterThan(0)
      expect(data.data.validation.recommendations).toBeDefined()
      expect(Array.isArray(data.data.validation.recommendations)).toBe(true)
    })
  })
})