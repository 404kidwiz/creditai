/**
 * Integration Tests for End-to-End PDF Processing Pipeline
 * Tests the complete flow from PDF upload to analysis results
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null
      })
    },
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [{ id: 'test-record-123' }],
        error: null
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })
    })
  }))
}))

// Mock Google Cloud services
jest.mock('@google-cloud/documentai', () => ({
  DocumentProcessorServiceClient: jest.fn().mockImplementation(() => ({
    processDocument: jest.fn().mockResolvedValue([{
      document: {
        text: `CREDIT REPORT
Personal Information:
Name: John Doe
Address: 123 Main Street, Anytown, CA 90210
SSN: ***-**-1234
Date of Birth: 01/15/1985

Credit Scores:
Experian: 720 (as of 01/15/2024)
Equifax: 715 (as of 01/10/2024)
TransUnion: 718 (as of 01/12/2024)

Account Summary:
Total Accounts: 5
Open Accounts: 4
Closed Accounts: 1

Account Details:
1. Bank of America - Credit Card
   Account Number: ****1234
   Balance: $2,450
   Credit Limit: $5,000
   Payment Status: Current
   Open Date: 03/2018

2. Wells Fargo - Auto Loan
   Account Number: ****5678
   Balance: $18,500
   Original Amount: $25,000
   Payment Status: Current
   Open Date: 06/2020

Negative Items:
1. Late Payment - Capital One
   Date Reported: 12/2022
   Balance: $150
   Status: Paid
   Impact: Minor

Credit Inquiries:
1. Bank of America - 03/2023
2. Wells Fargo - 06/2020

Public Records:
No public records found.`,
        pages: [{ pageNumber: 1 }]
      }
    }])
  }))
}))

// Mock Google AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            personalInfo: {
              name: 'John Doe',
              address: '123 Main Street, Anytown, CA 90210',
              ssn: '***-**-1234',
              dateOfBirth: '1985-01-15'
            },
            creditScores: {
              experian: {
                score: 720,
                bureau: 'experian',
                date: '2024-01-15',
                scoreRange: { min: 300, max: 850 },
                confidence: 95,
                dataQuality: 90
              },
              equifax: {
                score: 715,
                bureau: 'equifax',
                date: '2024-01-10',
                scoreRange: { min: 300, max: 850 },
                confidence: 93,
                dataQuality: 88
              }
            },
            accounts: [{
              id: 'acc_1',
              creditorName: 'Bank of America',
              accountNumber: '****1234',
              accountType: 'credit_card',
              balance: 2450,
              creditLimit: 5000,
              status: 'open',
              openDate: '2018-03-01',
              lastReported: '2024-01-15',
              confidence: 90
            }, {
              id: 'acc_2',
              creditorName: 'Wells Fargo',
              accountNumber: '****5678',
              accountType: 'auto_loan',
              balance: 18500,
              status: 'open',
              openDate: '2020-06-01',
              lastReported: '2024-01-15',
              confidence: 88
            }],
            negativeItems: [{
              id: 'neg_1',
              type: 'late_payment',
              creditorName: 'Capital One',
              amount: 150,
              date: '2022-12-01',
              status: 'Paid',
              impactScore: 30,
              confidence: 85
            }],
            inquiries: [{
              id: 'inq_1',
              creditorName: 'Bank of America',
              date: '2023-03-01',
              type: 'hard',
              confidence: 80
            }],
            publicRecords: []
          })
        }
      })
    })
  }))
}))

// Mock PII Masker
jest.mock('@/lib/security/piiMasker', () => ({
  PIIMasker: {
    maskPII: jest.fn().mockReturnValue({
      maskedText: 'Masked credit report text with PII protected',
      maskingApplied: true,
      detectedPII: {
        ssn: ['***-**-1234'],
        accountNumbers: ['****1234', '****5678'],
        phoneNumbers: [],
        dob: ['01/15/1985'],
        driversLicense: [],
        passportNumbers: [],
        emailAddresses: []
      },
      sensitivityScore: 75
    }),
    maskCreditReportData: jest.fn().mockImplementation((data) => ({
      ...data,
      personalInfo: {
        ...data.personalInfo,
        ssn: '***-**-****'
      }
    })),
    getPIISummary: jest.fn().mockReturnValue({
      totalPIIItems: 3,
      highRiskItems: 1,
      mediumRiskItems: 2,
      lowRiskItems: 0
    })
  }
}))

// Mock Data Encryption
jest.mock('@/lib/security/encryption', () => ({
  DataEncryption: {
    encryptCreditReportData: jest.fn().mockReturnValue({
      encryptedData: 'encrypted-data-string',
      iv: 'initialization-vector',
      authTag: 'auth-tag',
      version: '1.0',
      checksum: 'checksum-hash'
    }),
    hashIdentifier: jest.fn().mockReturnValue('hashed-user-id')
  }
}))

// Mock File Cleanup
jest.mock('@/lib/security/fileCleanup', () => ({
  FileCleanup: {
    cleanupUserSession: jest.fn().mockResolvedValue(true)
  }
}))

describe('End-to-End PDF Processing Pipeline Integration Tests', () => {
  beforeEach(() => {
    process.env.GOOGLE_AI_API_KEY = 'test-api-key'
    process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project'
    process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID = 'test-processor'
    jest.clearAllMocks()
  })

  describe('Complete PDF Processing Flow', () => {
    it('should process PDF from upload to final analysis results', async () => {
      const { POST } = await import('@/app/api/process-pdf/route')
      
      // Create mock PDF file
      const mockPdfContent = Buffer.from('Mock PDF content with credit report data')
      const formData = new FormData()
      const file = new File([mockPdfContent], 'credit-report.pdf', {
        type: 'application/pdf'
      })
      formData.append('file', file)

      const mockRequest = new NextRequest('http://localhost:3000/api/process-pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.extractedText).toBeDefined()
      expect(data.analysis).toBeDefined()
      expect(data.confidence).toBeGreaterThan(0)
      expect(data.processingMethod).toBeDefined()
      expect(data.securityInfo).toBeDefined()
      expect(data.aiAnalysis).toBeDefined()
    })

    it('should handle image upload and processing', async () => {
      const { POST } = await import('@/app/api/process-pdf/route')
      
      // Create mock image data
      const mockImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      const base64Data = mockImageData.split(',')[1]

      const mockRequest = new NextRequest('http://localhost:3000/api/process-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageData: base64Data,
          fileName: 'credit-report.png',
          fileType: 'image'
        })
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.extractedText).toBeDefined()
      expect(data.analysis).toBeDefined()
    })

    it('should extract and structure credit report data correctly', async () => {
      const { POST } = await import('@/app/api/process-pdf/route')
      
      const mockPdfContent = Buffer.from('Credit report with structured data')
      const formData = new FormData()
      const file = new File([mockPdfContent], 'structured-report.pdf', {
        type: 'application/pdf'
      })
      formData.append('file', file)

      const mockRequest = new NextRequest('http://localhost:3000/api/process-pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analysis.personalInfo).toBeDefined()
      expect(data.analysis.personalInfo.name).toBe('John Doe')
      expect(data.analysis.creditScore).toBeDefined()
      expect(data.analysis.creditScore.score).toBe(720)
      expect(data.analysis.accounts).toBeDefined()
      expect(Array.isArray(data.analysis.accounts)).toBe(true)
      expect(data.analysis.accounts.length).toBeGreaterThan(0)
      expect(data.analysis.negativeItems).toBeDefined()
      expect(Array.isArray(data.analysis.negativeItems)).toBe(true)
    })

    it('should apply security measures throughout the pipeline', async () => {
      const { POST } = await import('@/app/api/process-pdf/route')
      const { PIIMasker } = require('@/lib/security/piiMasker')
      const { DataEncryption } = require('@/lib/security/encryption')
      
      const mockPdfContent = Buffer.from('Credit report with PII data')
      const formData = new FormData()
      const file = new File([mockPdfContent], 'secure-report.pdf', {
        type: 'application/pdf'
      })
      formData.append('file', file)

      const mockRequest = new NextRequest('http://localhost:3000/api/process-pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(PIIMasker.maskPII).toHaveBeenCalled()
      expect(PIIMasker.maskCreditReportData).toHaveBeenCalled()
      expect(DataEncryption.encryptCreditReportData).toHaveBeenCalled()
      expect(data.securityInfo.piiMasked).toBe(true)
      expect(data.securityInfo.dataEncrypted).toBe(true)
    })

    it('should store processed data in database with encryption', async () => {
      const { POST } = await import('@/app/api/process-pdf/route')
      const { createClient } = require('@/lib/supabase/server')
      
      const mockPdfContent = Buffer.from('Credit report for database storage')
      const formData = new FormData()
      const file = new File([mockPdfContent], 'database-test.pdf', {
        type: 'application/pdf'
      })
      formData.append('file', file)

      const mockRequest = new NextRequest('http://localhost:3000/api/process-pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      
      const mockSupabase = createClient()
      expect(mockSupabase.from).toHaveBeenCalledWith('credit_reports')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-123',
          encrypted_data: 'encrypted-data-string',
          processing_method: expect.any(String),
          confidence_score: expect.any(Number)
        })
      )
    })
  })

  describe('Error Handling in Pipeline', () => {
    it('should handle Google Cloud service failures gracefully', async () => {
      // Mock Google Cloud failure
      const { DocumentProcessorServiceClient } = require('@google-cloud/documentai')
      DocumentProcessorServiceClient.mockImplementation(() => ({
        processDocument: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      }))

      const { POST } = await import('@/app/api/process-pdf/route')
      
      const mockPdfContent = Buffer.from('PDF for error testing')
      const formData = new FormData()
      const file = new File([mockPdfContent], 'error-test.pdf', {
        type: 'application/pdf'
      })
      formData.append('file', file)

      const mockRequest = new NextRequest('http://localhost:3000/api/process-pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200) // Should still succeed with fallback
      expect(data.success).toBe(true)
      expect(data.processingMethod).toBe('fallback')
    })

    it('should handle AI analysis failures', async () => {
      // Mock AI failure
      const { GoogleGenerativeAI } = require('@google/generative-ai')
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockRejectedValue(new Error('AI service failed'))
        })
      }))

      const { POST } = await import('@/app/api/process-pdf/route')
      
      const mockPdfContent = Buffer.from('PDF for AI error testing')
      const formData = new FormData()
      const file = new File([mockPdfContent], 'ai-error-test.pdf', {
        type: 'application/pdf'
      })
      formData.append('file', file)

      const mockRequest = new NextRequest('http://localhost:3000/api/process-pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.aiAnalysis).toBeDefined() // Should provide fallback analysis
    })

    it('should handle database connection failures', async () => {
      // Mock database failure
      const { createClient } = require('@/lib/supabase/server')
      createClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user-123' } },
            error: null
          })
        },
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Database connection failed')
          })
        })
      })

      const { POST } = await import('@/app/api/process-pdf/route')
      
      const mockPdfContent = Buffer.from('PDF for database error testing')
      const formData = new FormData()
      const file = new File([mockPdfContent], 'db-error-test.pdf', {
        type: 'application/pdf'
      })
      formData.append('file', file)

      const mockRequest = new NextRequest('http://localhost:3000/api/process-pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200) // Should still process the file
      expect(data.success).toBe(true)
      expect(data.securityInfo.dataEncrypted).toBe(false) // Encryption failed due to DB error
    })

    it('should handle malformed file uploads', async () => {
      const { POST } = await import('@/app/api/process-pdf/route')
      
      const mockRequest = new NextRequest('http://localhost:3000/api/process-pdf', {
        method: 'POST',
        body: new FormData() // Empty form data
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No file provided')
    })

    it('should handle unsupported file types', async () => {
      const { POST } = await import('@/app/api/process-pdf/route')
      
      const mockTextContent = Buffer.from('This is a text file, not a PDF')
      const formData = new FormData()
      const file = new File([mockTextContent], 'not-a-pdf.txt', {
        type: 'text/plain'
      })
      formData.append('file', file)

      const mockRequest = new NextRequest('http://localhost:3000/api/process-pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('File must be a PDF or image')
    })
  })

  describe('Performance and Scalability', () => {
    it('should process multiple files concurrently', async () => {
      const { POST } = await import('@/app/api/process-pdf/route')
      
      const promises = Array(3).fill(null).map((_, index) => {
        const mockPdfContent = Buffer.from(`PDF content ${index}`)
        const formData = new FormData()
        const file = new File([mockPdfContent], `report-${index}.pdf`, {
          type: 'application/pdf'
        })
        formData.append('file', file)

        return POST(new NextRequest('http://localhost:3000/api/process-pdf', {
          method: 'POST',
          body: formData
        }))
      })

      const responses = await Promise.all(promises)
      
      responses.forEach(async (response) => {
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
      })
    })

    it('should complete processing within acceptable time limits', async () => {
      const { POST } = await import('@/app/api/process-pdf/route')
      
      const mockPdfContent = Buffer.from('Large PDF content for performance testing')
      const formData = new FormData()
      const file = new File([mockPdfContent], 'performance-test.pdf', {
        type: 'application/pdf'
      })
      formData.append('file', file)

      const startTime = Date.now()
      
      const mockRequest = new NextRequest('http://localhost:3000/api/process-pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(mockRequest)
      const processingTime = Date.now() - startTime
      
      expect(response.status).toBe(200)
      expect(processingTime).toBeLessThan(30000) // 30 seconds max
    })
  })

  describe('Data Quality and Validation', () => {
    it('should validate extracted data quality', async () => {
      const { POST } = await import('@/app/api/process-pdf/route')
      
      const mockPdfContent = Buffer.from('High quality credit report data')
      const formData = new FormData()
      const file = new File([mockPdfContent], 'quality-test.pdf', {
        type: 'application/pdf'
      })
      formData.append('file', file)

      const mockRequest = new NextRequest('http://localhost:3000/api/process-pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.confidence).toBeGreaterThan(70)
      expect(data.analysis.personalInfo.name).toBeTruthy()
      expect(data.analysis.creditScore.score).toBeGreaterThan(0)
      expect(data.analysis.accounts.length).toBeGreaterThan(0)
    })

    it('should handle low-quality document processing', async () => {
      // Mock low-quality document processing
      const { DocumentProcessorServiceClient } = require('@google-cloud/documentai')
      DocumentProcessorServiceClient.mockImplementation(() => ({
        processDocument: jest.fn().mockResolvedValue([{
          document: {
            text: 'Poor quality text with OCR errors: Cr3d1t R3p0rt\nN@me: J0hn D03\nSc0r3: 7?0',
            pages: [{ pageNumber: 1 }]
          }
        }])
      }))

      const { POST } = await import('@/app/api/process-pdf/route')
      
      const mockPdfContent = Buffer.from('Poor quality scanned document')
      const formData = new FormData()
      const file = new File([mockPdfContent], 'poor-quality.pdf', {
        type: 'application/pdf'
      })
      formData.append('file', file)

      const mockRequest = new NextRequest('http://localhost:3000/api/process-pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.confidence).toBeLessThan(90) // Lower confidence for poor quality
    })
  })

  describe('Security Integration', () => {
    it('should mask PII throughout the entire pipeline', async () => {
      const { POST } = await import('@/app/api/process-pdf/route')
      const { PIIMasker } = require('@/lib/security/piiMasker')
      
      const mockPdfContent = Buffer.from('Credit report with SSN: 123-45-6789')
      const formData = new FormData()
      const file = new File([mockPdfContent], 'pii-test.pdf', {
        type: 'application/pdf'
      })
      formData.append('file', file)

      const mockRequest = new NextRequest('http://localhost:3000/api/process-pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(PIIMasker.maskPII).toHaveBeenCalled()
      expect(data.extractedText).not.toContain('123-45-6789')
      expect(data.securityInfo.piiMasked).toBe(true)
    })

    it('should encrypt sensitive data before storage', async () => {
      const { POST } = await import('@/app/api/process-pdf/route')
      const { DataEncryption } = require('@/lib/security/encryption')
      
      const mockPdfContent = Buffer.from('Sensitive credit report data')
      const formData = new FormData()
      const file = new File([mockPdfContent], 'encryption-test.pdf', {
        type: 'application/pdf'
      })
      formData.append('file', file)

      const mockRequest = new NextRequest('http://localhost:3000/api/process-pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(DataEncryption.encryptCreditReportData).toHaveBeenCalled()
      expect(data.securityInfo.dataEncrypted).toBe(true)
    })

    it('should clean up temporary files after processing', async () => {
      const { POST } = await import('@/app/api/process-pdf/route')
      const { FileCleanup } = require('@/lib/security/fileCleanup')
      
      const mockPdfContent = Buffer.from('Temporary file cleanup test')
      const formData = new FormData()
      const file = new File([mockPdfContent], 'cleanup-test.pdf', {
        type: 'application/pdf'
      })
      formData.append('file', file)

      const mockRequest = new NextRequest('http://localhost:3000/api/process-pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(mockRequest)
      
      expect(response.status).toBe(200)
      
      // Wait for cleanup timeout
      await new Promise(resolve => setTimeout(resolve, 6000))
      
      expect(FileCleanup.cleanupUserSession).toHaveBeenCalledWith('test-user-123')
    }, 10000)
  })
})