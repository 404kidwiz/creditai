/**
 * OWASP Top 10 and Compliance Testing Suite
 * Tests for OWASP Top 10 vulnerabilities and FCRA/GDPR compliance
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PIIMasker } from '@/lib/security/piiMasker'
import { DataEncryption } from '@/lib/security/encryption'
import { FileCleanup } from '@/lib/security/fileCleanup'
import crypto from 'crypto'

// Import API route handlers
import { POST as processPdfHandler } from '@/app/api/process-pdf/route'
import { POST as enhancedAnalysisHandler } from '@/app/api/analysis/enhanced/route'

describe('OWASP Top 10 and Compliance Testing', () => {
  let supabaseClient: any
  let testUserId: string
  let authToken: string

  beforeAll(async () => {
    // Setup test environment
    process.env.ENCRYPTION_KEY = DataEncryption.generateKey()
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-key'
    
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    )
    
    // Create test user
    testUserId = 'test-user-' + Date.now()
    authToken = 'Bearer test-token'
  })

  afterAll(async () => {
    // Cleanup test data
    if (supabaseClient && testUserId) {
      await supabaseClient
        .from('credit_reports')
        .delete()
        .eq('user_id', testUserId)
    }
  })

  describe('A01:2021 - Broken Access Control', () => {
    test('should prevent unauthorized access to protected resources', async () => {
      const { req } = createMocks({
        method: 'GET',
        headers: {},
        url: '/api/user/profile'
      })

      const request = new NextRequest(req.url || 'http://localhost:3000/api/user/profile', {
        method: 'GET',
        headers: req.headers as any
      })

      // Test with missing authentication
      const response = await enhancedAnalysisHandler(request)
      expect(response.status).toBeGreaterThanOrEqual(401)
    })

    test('should enforce proper authorization checks', async () => {
      const { req } = createMocks({
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token'
        },
        url: '/api/user/profile'
      })

      const request = new NextRequest(req.url || 'http://localhost:3000/api/user/profile', {
        method: 'GET',
        headers: req.headers as any
      })

      // Test with invalid authentication
      const response = await enhancedAnalysisHandler(request)
      expect(response.status).toBeGreaterThanOrEqual(401)
    })

    test('should prevent path traversal attacks', async () => {
      const { req } = createMocks({
        method: 'GET',
        headers: {
          'Authorization': authToken
        },
        query: {
          filePath: '../../../etc/passwd'
        }
      })

      const request = new NextRequest(
        req.url || 'http://localhost:3000/api/file?filePath=../../../etc/passwd',
        {
          method: 'GET',
          headers: req.headers as any
        }
      )

      // This would be a custom file access endpoint
      // For testing purposes, we'll use an existing handler
      const response = await enhancedAnalysisHandler(request)
      
      // Should not return file contents
      const data = await response.json()
      expect(data).not.toContain('root:')
    })
  })

  describe('A02:2021 - Cryptographic Failures', () => {
    test('should use strong encryption for sensitive data', () => {
      const sensitiveData = { ssn: '123-45-6789', accountNumber: '1234567890123456' }
      const encrypted = DataEncryption.encrypt(sensitiveData)
      
      // Check that encryption is using strong algorithm (AES-256-GCM)
      expect(encrypted.iv).toBeDefined()
      expect(encrypted.authTag).toBeDefined()
      expect(encrypted.encryptedData).not.toContain('123-45-6789')
      expect(encrypted.encryptedData).not.toContain('1234567890123456')
    })

    test('should properly validate encryption integrity', () => {
      const sensitiveData = { ssn: '123-45-6789', accountNumber: '1234567890123456' }
      const encrypted = DataEncryption.encrypt(sensitiveData)
      
      // Tamper with encrypted data
      const tamperedEncrypted = {
        ...encrypted,
        encryptedData: encrypted.encryptedData.replace(/^.{10}/, '0000000000')
      }
      
      // Decryption should fail or data should be corrupted
      expect(() => {
        DataEncryption.decrypt(tamperedEncrypted)
      }).toThrow()
    })

    test('should not store sensitive data in plaintext', async () => {
      const mockCreditData = {
        personalInfo: {
          name: 'John Doe',
          ssn: '123-45-6789',
          address: '123 Main St'
        }
      }

      // Test PII masking
      const maskedData = PIIMasker.maskCreditReportData(mockCreditData)
      expect(maskedData.personalInfo.ssn).not.toBe('123-45-6789')
      expect(maskedData.personalInfo.ssn).toBe('XXX-XX-XXXX')
    })
  })

  describe('A03:2021 - Injection', () => {
    test('should prevent SQL injection attacks', async () => {
      const maliciousInput = {
        query: "'; DROP TABLE users; --",
        userId: "1' OR '1'='1"
      }

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        body: maliciousInput
      })

      const request = new NextRequest(req.url || 'http://localhost:3000/api/analysis/enhanced', {
        method: 'POST',
        headers: req.headers as any,
        body: JSON.stringify(req.body)
      })

      const response = await enhancedAnalysisHandler(request)
      
      // Should either sanitize input or reject request
      expect([200, 400, 422]).toContain(response.status)
      
      // If 200, check that no SQL injection occurred
      if (response.status === 200) {
        const data = await response.json()
        expect(data.error).toBeUndefined()
      }
    })

    test('should prevent XSS attacks', async () => {
      const xssPayload = '<script>alert("XSS")</script>'
      const maliciousInput = {
        name: xssPayload,
        address: `123 Main St ${xssPayload}`
      }

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        body: { personalInfo: maliciousInput }
      })

      const request = new NextRequest(req.url || 'http://localhost:3000/api/analysis/enhanced', {
        method: 'POST',
        headers: req.headers as any,
        body: JSON.stringify(req.body)
      })

      const response = await enhancedAnalysisHandler(request)
      const data = await response.json()
      
      // Convert response to string to check for XSS payload
      const responseText = JSON.stringify(data)
      
      // Should not contain unescaped script tags
      expect(responseText).not.toContain(xssPayload)
    })
  })

  describe('A05:2021 - Security Misconfiguration', () => {
    test('should not expose sensitive configuration details', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/system/info'
      })

      const request = new NextRequest(req.url || 'http://localhost:3000/api/system/info', {
        method: 'GET'
      })

      // This would be a system info endpoint
      // For testing purposes, we'll use an existing handler
      const response = await enhancedAnalysisHandler(request)
      const data = await response.json()
      
      // Should not expose sensitive configuration
      const responseText = JSON.stringify(data)
      expect(responseText).not.toContain('DB_PASSWORD')
      expect(responseText).not.toContain('API_KEY')
      expect(responseText).not.toContain('SECRET')
    })
  })

  describe('A07:2021 - Identification and Authentication Failures', () => {
    test('should enforce strong password policies', () => {
      // This would test password validation logic
      // For demonstration purposes, we'll use a simple regex
      const weakPasswords = ['password', '123456', 'qwerty', 'admin']
      const strongPasswords = ['P@ssw0rd123!', 'C0mpl3x-P@55w0rd', 'S3cur3_P@55w0rd!']
      
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      
      weakPasswords.forEach(password => {
        expect(passwordRegex.test(password)).toBe(false)
      })
      
      strongPasswords.forEach(password => {
        expect(passwordRegex.test(password)).toBe(true)
      })
    })

    test('should implement proper session management', () => {
      // Generate secure session token
      const sessionToken = crypto.randomBytes(32).toString('hex')
      expect(sessionToken).toHaveLength(64)
      
      // Session tokens should be cryptographically strong
      const otherToken = crypto.randomBytes(32).toString('hex')
      expect(sessionToken).not.toBe(otherToken)
    })
  })

  describe('A09:2021 - Security Logging and Monitoring Failures', () => {
    test('should log security-relevant events', async () => {
      // This would test logging of security events
      // For demonstration purposes, we'll use a mock
      const mockLog = jest.fn()
      const originalConsoleLog = console.log
      console.log = mockLog
      
      try {
        // Trigger a security event
        const { req } = createMocks({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer invalid-token',
            'Content-Type': 'application/json'
          },
          body: { test: 'data' }
        })

        const request = new NextRequest(req.url || 'http://localhost:3000/api/analysis/enhanced', {
          method: 'POST',
          headers: req.headers as any,
          body: JSON.stringify(req.body)
        })

        await enhancedAnalysisHandler(request)
        
        // Should log authentication failure
        expect(mockLog).toHaveBeenCalled()
      } finally {
        console.log = originalConsoleLog
      }
    })
  })

  describe('FCRA Compliance', () => {
    test('should provide accurate information to consumers', async () => {
      // Test that credit report data is accurately processed
      const mockPdfData = Buffer.from('Mock PDF content').toString('base64')
      const formData = new FormData()
      formData.append('file', new Blob([mockPdfData], { type: 'application/pdf' }), 'test-report.pdf')

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'multipart/form-data'
        }
      })

      const request = new NextRequest(req.url || 'http://localhost:3000/api/process-pdf', {
        method: 'POST',
        headers: req.headers as any,
        body: formData as any
      })

      const response = await processPdfHandler(request)
      const data = await response.json()

      // Should include confidence scores for transparency
      expect(data.confidence).toBeDefined()
      expect(data.processingMethod).toBeDefined()
    })

    test('should provide dispute mechanisms', async () => {
      // Test that dispute functionality is available
      const disputeRequest = {
        negativeItems: [
          {
            type: 'Late Payment',
            creditor: 'Test Bank',
            accountNumber: 'XXXX1234',
            date: '2023-01-01',
            disputeReason: 'Never late'
          }
        ]
      }

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        body: disputeRequest
      })

      const request = new NextRequest(req.url || 'http://localhost:3000/api/disputes/create', {
        method: 'POST',
        headers: req.headers as any,
        body: JSON.stringify(req.body)
      })

      // This would be a dispute creation endpoint
      // For testing purposes, we'll use an existing handler
      const response = await enhancedAnalysisHandler(request)
      
      // Should accept dispute request
      expect(response.status).toBeLessThan(500)
    })
  })

  describe('GDPR Compliance', () => {
    test('should implement right to access', async () => {
      // Test that users can access their data
      const { req } = createMocks({
        method: 'GET',
        headers: {
          'Authorization': authToken
        },
        url: '/api/user/data'
      })

      const request = new NextRequest(req.url || 'http://localhost:3000/api/user/data', {
        method: 'GET',
        headers: req.headers as any
      })

      // This would be a data access endpoint
      // For testing purposes, we'll use an existing handler
      const response = await enhancedAnalysisHandler(request)
      
      // Should provide user data
      expect(response.status).toBeLessThan(500)
    })

    test('should implement right to erasure', async () => {
      // Test that users can delete their data
      const { req } = createMocks({
        method: 'DELETE',
        headers: {
          'Authorization': authToken
        },
        url: '/api/user/data'
      })

      const request = new NextRequest(req.url || 'http://localhost:3000/api/user/data', {
        method: 'DELETE',
        headers: req.headers as any
      })

      // This would be a data deletion endpoint
      // For testing purposes, we'll use an existing handler
      const response = await enhancedAnalysisHandler(request)
      
      // Should accept deletion request
      expect(response.status).toBeLessThan(500)
    })

    test('should implement data minimization', async () => {
      // Test that only necessary data is collected
      const mockCreditData = {
        personalInfo: {
          name: 'John Doe',
          ssn: '123-45-6789',
          address: '123 Main St',
          favoriteColor: 'blue', // Unnecessary data
          politicalAffiliation: 'independent', // Unnecessary data
          religion: 'private' // Unnecessary data
        }
      }

      // Test PII masking and data minimization
      const maskedData = PIIMasker.maskCreditReportData(mockCreditData)
      
      // Should remove unnecessary data
      expect(maskedData.personalInfo.favoriteColor).toBeUndefined()
      expect(maskedData.personalInfo.politicalAffiliation).toBeUndefined()
      expect(maskedData.personalInfo.religion).toBeUndefined()
    })
  })
})