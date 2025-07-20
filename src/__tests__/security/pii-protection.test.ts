/**
 * Security Tests for PII Protection
 * Tests the system's ability to protect personally identifiable information
 */

import { PIIMasker } from '@/lib/security/piiMasker'
import { DataEncryption } from '@/lib/security/encryption'
import { FileCleanup } from '@/lib/security/fileCleanup'
import { NextRequest } from 'next/server'

// Mock crypto for consistent testing
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn().mockReturnValue(Buffer.from('mock-random-bytes-16')),
  randomUUID: jest.fn().mockReturnValue('mock-uuid-1234-5678-9012')
}))

// Mock Supabase for security audit logging
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
        data: [{ id: 'audit-log-123' }],
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

describe('PII Protection Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('PII Detection and Masking', () => {
    it('should detect and mask Social Security Numbers', () => {
      const testTexts = [
        'SSN: 123-45-6789',
        'Social Security Number: 987-65-4321',
        'SS#: 555-44-3333',
        'My SSN is 111-22-3333',
        'SSN 999-88-7777 on file'
      ]

      testTexts.forEach(text => {
        const result = PIIMasker.maskPII(text, { maskSSN: true })
        
        expect(result.maskingApplied).toBe(true)
        expect(result.detectedPII.ssn.length).toBeGreaterThan(0)
        expect(result.maskedText).not.toMatch(/\d{3}-\d{2}-\d{4}/)
        expect(result.maskedText).toContain('***-**-****')
      })
    })

    it('should detect and mask account numbers', () => {
      const testTexts = [
        'Account Number: 1234567890123456',
        'Acct #: 9876543210',
        'Account: ****1234',
        'Card ending in 5678',
        'Account 4111-1111-1111-1111'
      ]

      testTexts.forEach(text => {
        const result = PIIMasker.maskPII(text, { maskAccountNumbers: true })
        
        expect(result.maskingApplied).toBe(true)
        expect(result.detectedPII.accountNumbers.length).toBeGreaterThan(0)
        expect(result.maskedText).toMatch(/\*{4,}/)
      })
    })

    it('should detect and mask phone numbers', () => {
      const testTexts = [
        'Phone: (555) 123-4567',
        'Tel: 555-123-4567',
        'Call 5551234567',
        'Phone number: +1 (555) 987-6543',
        'Contact: 555.123.4567'
      ]

      testTexts.forEach(text => {
        const result = PIIMasker.maskPII(text, { maskPhoneNumbers: true })
        
        expect(result.maskingApplied).toBe(true)
        expect(result.detectedPII.phoneNumbers.length).toBeGreaterThan(0)
        expect(result.maskedText).toContain('***-***-****')
      })
    })

    it('should detect and mask dates of birth', () => {
      const testTexts = [
        'DOB: 01/15/1985',
        'Date of Birth: 03/22/1990',
        'Born: 12/05/1978',
        'Birth Date: 1985-01-15',
        'DOB 06-30-1992'
      ]

      testTexts.forEach(text => {
        const result = PIIMasker.maskPII(text, { maskDOB: true })
        
        expect(result.maskingApplied).toBe(true)
        expect(result.detectedPII.dob.length).toBeGreaterThan(0)
        expect(result.maskedText).toContain('**/**/****')
      })
    })

    it('should detect and mask email addresses', () => {
      const testTexts = [
        'Email: john.doe@example.com',
        'Contact: jane_smith@company.org',
        'Send to: user123@domain.net',
        'Email address: test.email+tag@subdomain.example.co.uk'
      ]

      testTexts.forEach(text => {
        const result = PIIMasker.maskPII(text, { maskEmailAddresses: true })
        
        expect(result.maskingApplied).toBe(true)
        expect(result.detectedPII.emailAddresses.length).toBeGreaterThan(0)
        expect(result.maskedText).toContain('***@***.***')
      })
    })

    it('should detect and mask driver license numbers', () => {
      const testTexts = [
        'Driver License: D1234567',
        'DL#: A123456789',
        'License Number: 12345678',
        'DL: B987654321'
      ]

      testTexts.forEach(text => {
        const result = PIIMasker.maskPII(text, { maskDriversLicense: true })
        
        expect(result.maskingApplied).toBe(true)
        expect(result.detectedPII.driversLicense.length).toBeGreaterThan(0)
        expect(result.maskedText).toMatch(/\*+/)
      })
    })

    it('should calculate sensitivity scores accurately', () => {
      const testCases = [
        {
          text: 'Name: John Doe, Address: 123 Main St',
          expectedScore: 20 // Low sensitivity
        },
        {
          text: 'SSN: 123-45-6789, Phone: 555-123-4567',
          expectedScore: 70 // Medium-high sensitivity
        },
        {
          text: 'SSN: 123-45-6789, Account: 1234567890, DOB: 01/15/1985, Email: john@example.com',
          expectedScore: 90 // High sensitivity
        }
      ]

      testCases.forEach(testCase => {
        const result = PIIMasker.maskPII(testCase.text)
        
        expect(result.sensitivityScore).toBeCloseTo(testCase.expectedScore, -1) // Within 10 points
      })
    })
  })

  describe('Credit Report Data Masking', () => {
    it('should mask PII in credit report data structures', () => {
      const creditReportData = {
        personalInfo: {
          name: 'John Doe',
          address: '123 Main St, Anytown, CA 90210',
          ssn: '123-45-6789',
          dateOfBirth: '1985-01-15',
          phone: '555-123-4567'
        },
        accounts: [{
          creditorName: 'Bank of America',
          accountNumber: '1234567890123456',
          balance: 1000
        }],
        negativeItems: [{
          creditorName: 'Collection Agency',
          accountNumber: '9876543210',
          amount: 500
        }]
      }

      const maskedData = PIIMasker.maskCreditReportData(creditReportData)

      expect(maskedData.personalInfo.ssn).toBe('***-**-****')
      expect(maskedData.personalInfo.phone).toBe('***-***-****')
      expect(maskedData.accounts[0].accountNumber).toMatch(/\*+\d{4}/)
      expect(maskedData.negativeItems[0].accountNumber).toMatch(/\*+\d{4}/)
      
      // Non-PII data should remain unchanged
      expect(maskedData.personalInfo.name).toBe('John Doe')
      expect(maskedData.accounts[0].creditorName).toBe('Bank of America')
      expect(maskedData.accounts[0].balance).toBe(1000)
    })

    it('should handle missing or null PII fields gracefully', () => {
      const incompleteData = {
        personalInfo: {
          name: 'John Doe',
          address: '123 Main St',
          ssn: null,
          dateOfBirth: undefined,
          phone: ''
        },
        accounts: [{
          creditorName: 'Bank',
          accountNumber: null,
          balance: 1000
        }]
      }

      const maskedData = PIIMasker.maskCreditReportData(incompleteData)

      expect(maskedData.personalInfo.name).toBe('John Doe')
      expect(maskedData.personalInfo.ssn).toBeNull()
      expect(maskedData.personalInfo.dateOfBirth).toBeUndefined()
      expect(maskedData.personalInfo.phone).toBe('')
      expect(maskedData.accounts[0].accountNumber).toBeNull()
    })
  })

  describe('Data Encryption', () => {
    it('should encrypt credit report data with user-specific keys', () => {
      const creditReportData = {
        personalInfo: {
          name: 'John Doe',
          ssn: '***-**-****'
        },
        accounts: [{
          creditorName: 'Bank of America',
          balance: 1000
        }]
      }

      const userId = 'user-123'
      const encryptionResult = DataEncryption.encryptCreditReportData(creditReportData, userId)

      expect(encryptionResult).toBeDefined()
      expect(encryptionResult.encryptedData).toBeDefined()
      expect(encryptionResult.iv).toBeDefined()
      expect(encryptionResult.authTag).toBeDefined()
      expect(encryptionResult.version).toBe('1.0')
      expect(encryptionResult.checksum).toBeDefined()
      
      // Encrypted data should not contain original text
      expect(encryptionResult.encryptedData).not.toContain('John Doe')
      expect(encryptionResult.encryptedData).not.toContain('Bank of America')
    })

    it('should decrypt data correctly with proper keys', () => {
      const originalData = {
        personalInfo: { name: 'John Doe' },
        accounts: [{ creditorName: 'Bank', balance: 1000 }]
      }

      const userId = 'user-123'
      const encrypted = DataEncryption.encryptCreditReportData(originalData, userId)
      const decrypted = DataEncryption.decryptCreditReportData(encrypted, userId)

      expect(decrypted).toEqual(originalData)
    })

    it('should fail to decrypt with wrong user ID', () => {
      const originalData = {
        personalInfo: { name: 'John Doe' }
      }

      const correctUserId = 'user-123'
      const wrongUserId = 'user-456'
      
      const encrypted = DataEncryption.encryptCreditReportData(originalData, correctUserId)
      
      expect(() => {
        DataEncryption.decryptCreditReportData(encrypted, wrongUserId)
      }).toThrow()
    })

    it('should generate consistent user hashes', () => {
      const userId = 'user-123'
      
      const hash1 = DataEncryption.hashIdentifier(userId)
      const hash2 = DataEncryption.hashIdentifier(userId)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toBeDefined()
      expect(hash1.length).toBeGreaterThan(0)
    })

    it('should generate different hashes for different users', () => {
      const userId1 = 'user-123'
      const userId2 = 'user-456'
      
      const hash1 = DataEncryption.hashIdentifier(userId1)
      const hash2 = DataEncryption.hashIdentifier(userId2)
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('File Cleanup Security', () => {
    it('should clean up temporary files after processing', async () => {
      const userId = 'user-123'
      
      const cleanupResult = await FileCleanup.cleanupUserSession(userId)
      
      expect(cleanupResult).toBe(true)
    })

    it('should handle cleanup errors gracefully', async () => {
      // Mock cleanup failure
      const originalCleanup = FileCleanup.cleanupUserSession
      FileCleanup.cleanupUserSession = jest.fn().mockRejectedValue(new Error('Cleanup failed'))
      
      const userId = 'user-123'
      
      await expect(FileCleanup.cleanupUserSession(userId)).rejects.toThrow('Cleanup failed')
      
      // Restore original function
      FileCleanup.cleanupUserSession = originalCleanup
    })

    it('should clean up files for multiple users independently', async () => {
      const userIds = ['user-123', 'user-456', 'user-789']
      
      const cleanupPromises = userIds.map(userId => FileCleanup.cleanupUserSession(userId))
      const results = await Promise.all(cleanupPromises)
      
      results.forEach(result => {
        expect(result).toBe(true)
      })
    })
  })

  describe('End-to-End PII Protection in API', () => {
    it('should protect PII throughout the PDF processing pipeline', async () => {
      const { POST } = await import('@/app/api/process-pdf/route')
      
      // Create mock PDF with PII
      const pdfWithPII = `
        CREDIT REPORT
        Name: John Doe
        SSN: 123-45-6789
        Phone: (555) 123-4567
        Email: john.doe@email.com
        Account: 1234567890123456
        DOB: 01/15/1985
      `
      
      const mockPdfContent = Buffer.from(pdfWithPII)
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
      expect(data.success).toBe(true)
      
      // Check that PII is masked in response
      expect(data.extractedText).not.toContain('123-45-6789')
      expect(data.extractedText).not.toContain('555-123-4567')
      expect(data.extractedText).not.toContain('john.doe@email.com')
      expect(data.extractedText).not.toContain('1234567890123456')
      
      // Check security info
      expect(data.securityInfo.piiMasked).toBe(true)
      expect(data.securityInfo.dataEncrypted).toBe(true)
      expect(data.securityInfo.piiSummary).toBeDefined()
    })

    it('should log high-sensitivity document processing', async () => {
      const { POST } = await import('@/app/api/process-pdf/route')
      const { createClient } = require('@/lib/supabase/server')
      
      // Create high-sensitivity document
      const highSensitivityPDF = `
        CREDIT REPORT
        Name: Jane Smith
        SSN: 987-65-4321
        Phone: (555) 987-6543
        Email: jane.smith@email.com
        Account: 9876543210987654
        DOB: 03/22/1990
        Driver License: D1234567
        Passport: 123456789
      `
      
      const mockPdfContent = Buffer.from(highSensitivityPDF)
      const formData = new FormData()
      const file = new File([mockPdfContent], 'high-sensitivity.pdf', {
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
      
      // Check that security audit log was called
      const mockSupabase = createClient()
      expect(mockSupabase.from).toHaveBeenCalledWith('security_audit_log')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-123',
          event_type: 'high_sensitivity_document_processed',
          event_details: expect.objectContaining({
            sensitivityScore: expect.any(Number),
            piiTypes: expect.any(Array)
          })
        })
      )
    })

    it('should handle PII masking errors gracefully', async () => {
      // Mock PII masker to throw error
      const originalMaskPII = PIIMasker.maskPII
      PIIMasker.maskPII = jest.fn().mockImplementation(() => {
        throw new Error('PII masking failed')
      })

      const { POST } = await import('@/app/api/process-pdf/route')
      
      const mockPdfContent = Buffer.from('Test PDF content')
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
      
      // Should still return error but not expose sensitive data
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBeDefined()
      expect(data.error).not.toContain('PII masking failed') // Error should be sanitized
      
      // Restore original function
      PIIMasker.maskPII = originalMaskPII
    })
  })

  describe('Security Configuration Validation', () => {
    it('should validate PII masking configuration options', () => {
      const testConfigs = [
        { maskSSN: true, maskAccountNumbers: false },
        { maskPhoneNumbers: true, maskEmailAddresses: true },
        { preserveFormat: true, maskNames: false },
        {} // Default config
      ]

      testConfigs.forEach(config => {
        const testText = 'SSN: 123-45-6789, Phone: 555-123-4567, Email: test@example.com'
        const result = PIIMasker.maskPII(testText, config)
        
        expect(result).toBeDefined()
        expect(result.maskedText).toBeDefined()
        expect(result.detectedPII).toBeDefined()
        expect(typeof result.sensitivityScore).toBe('number')
      })
    })

    it('should handle invalid configuration gracefully', () => {
      const invalidConfigs = [
        null,
        undefined,
        { invalidOption: true },
        { maskSSN: 'invalid' }
      ]

      invalidConfigs.forEach(config => {
        const testText = 'SSN: 123-45-6789'
        
        expect(() => {
          PIIMasker.maskPII(testText, config as any)
        }).not.toThrow()
      })
    })
  })

  describe('Performance Impact of Security Measures', () => {
    it('should complete PII masking within acceptable time limits', () => {
      const largeText = Array(1000).fill('SSN: 123-45-6789, Phone: 555-123-4567, Email: test@example.com').join('\n')
      
      const startTime = Date.now()
      const result = PIIMasker.maskPII(largeText)
      const processingTime = Date.now() - startTime
      
      expect(result.maskingApplied).toBe(true)
      expect(processingTime).toBeLessThan(1000) // 1 second max
    })

    it('should complete encryption within acceptable time limits', () => {
      const largeData = {
        personalInfo: { name: 'John Doe' },
        accounts: Array(100).fill({
          creditorName: 'Bank',
          accountNumber: '****1234',
          balance: 1000
        })
      }
      
      const startTime = Date.now()
      const encrypted = DataEncryption.encryptCreditReportData(largeData, 'user-123')
      const encryptionTime = Date.now() - startTime
      
      expect(encrypted).toBeDefined()
      expect(encryptionTime).toBeLessThan(500) // 500ms max
    })
  })

  describe('Compliance and Audit Trail', () => {
    it('should maintain audit trail for PII processing', () => {
      const testText = 'SSN: 123-45-6789, Account: 1234567890'
      const result = PIIMasker.maskPII(testText)
      
      expect(result.detectedPII).toBeDefined()
      expect(result.detectedPII.ssn).toHaveLength(1)
      expect(result.detectedPII.accountNumbers).toHaveLength(1)
      expect(result.sensitivityScore).toBeGreaterThan(0)
    })

    it('should provide PII summary for compliance reporting', () => {
      const testText = 'SSN: 123-45-6789, Phone: 555-123-4567, Email: test@example.com'
      const summary = PIIMasker.getPIISummary(testText)
      
      expect(summary).toBeDefined()
      expect(summary.totalPIIItems).toBeGreaterThan(0)
      expect(summary.highRiskItems).toBeGreaterThan(0)
      expect(typeof summary.mediumRiskItems).toBe('number')
      expect(typeof summary.lowRiskItems).toBe('number')
    })
  })
})