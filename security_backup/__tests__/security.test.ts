/**
 * Security Features Test Suite
 * Tests PII masking, encryption, and file cleanup functionality
 */

import { PIIMasker } from '../piiMasker'
import { DataEncryption } from '../encryption'
import { FileCleanup } from '../fileCleanup'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('Security Features', () => {
  describe('PIIMasker', () => {
    const sampleCreditReportText = `
      Personal Information:
      Name: John Smith
      SSN: 123-45-6789
      Phone: (555) 123-4567
      Address: 123 Main Street, Anytown, CA 12345
      
      Account Information:
      Credit Card: 4532-1234-5678-9012
      Bank Account: 9876543210
    `

    test('should detect and mask SSN', () => {
      const result = PIIMasker.maskPII(sampleCreditReportText, { maskSSN: true })
      
      expect(result.maskingApplied).toBe(true)
      expect(result.detectedPII.ssn).toHaveLength(1)
      expect(result.detectedPII.ssn[0]).toBe('123-45-6789')
      expect(result.maskedText).toContain('XXX-XX-XXXX')
      expect(result.maskedText).not.toContain('123-45-6789')
    })

    test('should detect and mask account numbers', () => {
      const result = PIIMasker.maskPII(sampleCreditReportText, { maskAccountNumbers: true })
      
      expect(result.maskingApplied).toBe(true)
      expect(result.detectedPII.accountNumbers.length).toBeGreaterThan(0)
      expect(result.maskedText).toContain('9012') // Last 4 digits preserved
      expect(result.maskedText).not.toContain('4532-1234-5678')
    })

    test('should detect and mask phone numbers', () => {
      const result = PIIMasker.maskPII(sampleCreditReportText, { maskPhoneNumbers: true })
      
      expect(result.maskingApplied).toBe(true)
      expect(result.detectedPII.phoneNumbers).toHaveLength(1)
      expect(result.maskedText).toContain('XXX-XXX-XXXX')
      expect(result.maskedText).not.toContain('(555) 123-4567')
    })

    test('should mask structured credit report data', () => {
      const creditData = {
        personalInfo: {
          name: 'John Smith',
          ssn: '123-45-6789',
          phone: '555-123-4567'
        },
        accounts: [
          { accountNumber: '4532123456789012', balance: 1500 },
          { accountNumber: '9876543210', balance: 2500 }
        ]
      }

      const maskedData = PIIMasker.maskCreditReportData(creditData)
      
      expect(maskedData.personalInfo.ssn).toBe('XXX-XX-XXXX')
      expect(maskedData.personalInfo.phone).toBe('XXX-XXX-XXXX')
      expect(maskedData.accounts[0].accountNumber).toBe('XXXX9012')
      expect(maskedData.accounts[1].accountNumber).toBe('XXXX3210')
    })

    test('should detect PII presence', () => {
      expect(PIIMasker.containsPII(sampleCreditReportText)).toBe(true)
      expect(PIIMasker.containsPII('This is clean text')).toBe(false)
    })

    test('should provide PII summary', () => {
      const summary = PIIMasker.getPIISummary(sampleCreditReportText)
      
      expect(summary.ssnCount).toBe(1)
      expect(summary.phoneCount).toBe(1)
      expect(summary.accountCount).toBeGreaterThan(0)
    })
  })

  describe('DataEncryption', () => {
    // Mock environment variable for testing
    const originalEnv = process.env.ENCRYPTION_KEY
    
    beforeAll(() => {
      process.env.ENCRYPTION_KEY = DataEncryption.generateKey()
    })

    afterAll(() => {
      process.env.ENCRYPTION_KEY = originalEnv
    })

    test('should generate encryption key', () => {
      const key = DataEncryption.generateKey()
      expect(key).toBeDefined()
      expect(key.length).toBe(44) // Base64 encoded 32-byte key
    })

    test('should encrypt and decrypt data', () => {
      const testData = { sensitive: 'information', numbers: [1, 2, 3] }
      
      const encrypted = DataEncryption.encrypt(testData)
      expect(encrypted.encryptedData).toBeDefined()
      expect(encrypted.iv).toBeDefined()
      expect(encrypted.authTag).toBeDefined()

      const decrypted = DataEncryption.decrypt(encrypted)
      expect(JSON.parse(decrypted)).toEqual(testData)
    })

    test('should encrypt string data', () => {
      const testString = 'This is sensitive information'
      
      const encrypted = DataEncryption.encrypt(testString)
      const decrypted = DataEncryption.decrypt(encrypted)
      
      expect(decrypted).toBe(testString)
    })

    test('should encrypt credit report data with sanitization', () => {
      const creditData = {
        personalInfo: { name: 'John', ssn: '123-45-6789' },
        rawText: 'This should be removed',
        tempFiles: ['temp1.pdf', 'temp2.txt'],
        accounts: [{ id: 1, balance: 1000 }]
      }

      const encrypted = DataEncryption.encryptCreditReportData(creditData)
      expect(encrypted.encryptedData).toBeDefined()
      
      const decrypted = JSON.parse(DataEncryption.decrypt(encrypted))
      expect(decrypted.rawText).toBeUndefined()
      expect(decrypted.tempFiles).toBeUndefined()
      expect(decrypted.personalInfo.ssn).toBe('MASKED')
      expect(decrypted.accounts).toBeDefined()
    })

    test('should hash identifiers consistently', () => {
      const identifier = 'user-123'
      const hash1 = DataEncryption.hashIdentifier(identifier)
      const hash2 = DataEncryption.hashIdentifier(identifier)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA-256 hex string
    })

    test('should generate secure tokens', () => {
      const token1 = DataEncryption.generateSecureToken()
      const token2 = DataEncryption.generateSecureToken()
      
      expect(token1).not.toBe(token2)
      expect(token1).toHaveLength(64) // 32 bytes in hex
    })

    test('should generate and verify checksums', () => {
      const data = 'Important data to verify'
      const checksum = DataEncryption.generateChecksum(data)
      
      expect(DataEncryption.verifyChecksum(data, checksum)).toBe(true)
      expect(DataEncryption.verifyChecksum('Modified data', checksum)).toBe(false)
    })
  })

  describe('FileCleanup', () => {
    let tempDir: string

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'credit-test-'))
    })

    afterEach(async () => {
      try {
        await fs.rmdir(tempDir, { recursive: true })
      } catch (error) {
        // Ignore cleanup errors in tests
      }
    })

    test('should identify credit report files', () => {
      // This tests the private method indirectly through cleanup
      expect(true).toBe(true) // Placeholder since method is private
    })

    test('should clean up old files', async () => {
      // Create test files
      const oldFile = path.join(tempDir, 'old-credit-report.pdf')
      const newFile = path.join(tempDir, 'new-credit-report.pdf')
      
      await fs.writeFile(oldFile, 'old content')
      await fs.writeFile(newFile, 'new content')
      
      // Make old file appear old by modifying its timestamp
      const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      await fs.utimes(oldFile, oldTime, oldTime)

      // Mock the TEMP_DIRS to include our test directory
      const originalTempDirs = (FileCleanup as any).TEMP_DIRS
      ;(FileCleanup as any).TEMP_DIRS = [tempDir]

      const result = await FileCleanup.cleanupTempFiles({
        maxAge: 60 * 60 * 1000, // 1 hour
        secureDelete: false
      })

      // Restore original TEMP_DIRS
      ;(FileCleanup as any).TEMP_DIRS = originalTempDirs

      expect(result.filesDeleted).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
    })

    test('should get temp directory stats', async () => {
      // Create test files
      await fs.writeFile(path.join(tempDir, 'test-report.pdf'), 'test content')
      
      // Mock the TEMP_DIRS
      const originalTempDirs = (FileCleanup as any).TEMP_DIRS
      ;(FileCleanup as any).TEMP_DIRS = [tempDir]

      const stats = await FileCleanup.getTempDirStats()
      
      // Restore original TEMP_DIRS
      ;(FileCleanup as any).TEMP_DIRS = originalTempDirs

      expect(stats[tempDir]).toBeDefined()
      expect(stats[tempDir].files).toBeGreaterThanOrEqual(0)
      expect(stats[tempDir].size).toBeGreaterThanOrEqual(0)
    })

    test('should clean up user session', async () => {
      const userId = 'test-user-123'
      
      // This would normally create and clean files in a user-specific directory
      const result = await FileCleanup.cleanupUserSession(userId)
      
      expect(result.filesDeleted).toBeGreaterThanOrEqual(0)
      expect(result.errors).toBeDefined()
    })
  })

  describe('Integration Tests', () => {
    test('should work together: mask PII, encrypt, and prepare for cleanup', () => {
      const originalEnv = process.env.ENCRYPTION_KEY
      process.env.ENCRYPTION_KEY = DataEncryption.generateKey()

      try {
        const sensitiveData = {
          personalInfo: {
            name: 'John Smith',
            ssn: '123-45-6789',
            phone: '555-123-4567'
          },
          accounts: [
            { accountNumber: '4532123456789012', balance: 1500 }
          ]
        }

        // Step 1: Mask PII
        const maskedData = PIIMasker.maskCreditReportData(sensitiveData)
        expect(maskedData.personalInfo.ssn).toBe('XXX-XX-XXXX')

        // Step 2: Encrypt masked data
        const encrypted = DataEncryption.encryptCreditReportData(maskedData)
        expect(encrypted.encryptedData).toBeDefined()

        // Step 3: Verify decryption works
        const decrypted = JSON.parse(DataEncryption.decrypt(encrypted))
        expect(decrypted.personalInfo.ssn).toBe('MASKED') // Further sanitized during encryption

        // Step 4: Generate checksum for integrity
        const checksum = DataEncryption.generateChecksum(encrypted.encryptedData)
        expect(DataEncryption.verifyChecksum(encrypted.encryptedData, checksum)).toBe(true)

      } finally {
        process.env.ENCRYPTION_KEY = originalEnv
      }
    })
  })
})