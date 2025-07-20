/**
 * Comprehensive unit tests for ImprovedConfidenceCalculator
 * Tests all confidence calculation scenarios, edge cases, and validation
 */

import { ImprovedConfidenceCalculator, CreditReportData, ConfidenceResult } from '../improvedConfidenceCalculator'

describe('ImprovedConfidenceCalculator', () => {
  describe('calculateConfidence', () => {
    it('should calculate confidence for high-quality credit report', () => {
      const mockData: CreditReportData = {
        personalInfo: {
          name: 'John Doe',
          address: '123 Main St, Anytown, ST 12345',
          ssn: '123-45-6789'
        },
        accounts: [
          {
            creditor: 'Chase Bank',
            accountNumber: '****1234',
            balance: 1500,
            status: 'Open'
          },
          {
            creditor: 'American Express',
            accountNumber: '****5678',
            balance: 2500,
            status: 'Open'
          }
        ],
        creditScores: [
          {
            bureau: 'Experian',
            score: 720,
            date: '2024-01-15'
          },
          {
            bureau: 'Equifax',
            score: 715,
            date: '2024-01-15'
          }
        ],
        negativeItems: [
          {
            type: 'Late Payment',
            creditor: 'Old Credit Card',
            amount: 50
          }
        ],
        inquiries: [
          {
            creditor: 'Auto Loan Company',
            date: '2024-01-10',
            type: 'hard'
          }
        ]
      }

      const highQualityText = `
        CREDIT REPORT
        Personal Information:
        Name: John Doe
        Address: 123 Main St, Anytown, ST 12345
        SSN: 123-45-6789
        
        Account Information:
        Chase Bank - Account ****1234 - Balance: $1,500 - Status: Open
        American Express - Account ****5678 - Balance: $2,500 - Status: Open
        
        Credit Scores:
        Experian: 720 (01/15/2024)
        Equifax: 715 (01/15/2024)
        
        Payment History:
        Late Payment - Old Credit Card - $50
        
        Recent Inquiries:
        Auto Loan Company - 01/10/2024 - Hard Inquiry
      `

      const result = ImprovedConfidenceCalculator.calculateConfidence(
        mockData,
        highQualityText,
        'document-ai'
      )

      expect(result.confidence).toBeGreaterThan(65)
      expect(result.confidence).toBeLessThanOrEqual(100)
      expect(result.method).toBe('document-ai')
      expect(result.breakdown.textQuality).toBeGreaterThan(70)
      expect(result.breakdown.dataExtraction).toBeGreaterThan(70)
      expect(result.breakdown.structureRecognition).toBeGreaterThan(60)
      expect(result.breakdown.contentValidation).toBeGreaterThan(60)
      expect(result.qualityIndicators).toHaveLength(4)
    })

    it('should handle poor quality text with minimum confidence threshold', () => {
      const mockData: CreditReportData = {
        personalInfo: {
          name: 'John'
        },
        accounts: [
          {
            creditor: 'Unknown Bank'
          }
        ]
      }

      const poorQualityText = '!@#$%^&*()_+{}|:"<>?[]\\;\',./'

      const result = ImprovedConfidenceCalculator.calculateConfidence(
        mockData,
        poorQualityText,
        'ocr-fallback'
      )

      expect(result.confidence).toBeGreaterThanOrEqual(20) // very-low-quality minimum
      expect(result.breakdown.textQuality).toBeLessThan(30)
      expect(result.qualityIndicators.some(qi => qi.impact === 'negative')).toBe(true)
    })

    it('should apply processing method bonuses correctly', () => {
      const mockData: CreditReportData = {
        personalInfo: { name: 'Test User' }
      }
      const mediumQualityText = 'Credit Report for Test User with some account information'

      const documentAIResult = ImprovedConfidenceCalculator.calculateConfidence(
        mockData,
        mediumQualityText,
        'document-ai'
      )

      const ocrResult = ImprovedConfidenceCalculator.calculateConfidence(
        mockData,
        mediumQualityText,
        'ocr-fallback'
      )

      const manualResult = ImprovedConfidenceCalculator.calculateConfidence(
        mockData,
        mediumQualityText,
        'manual-review'
      )

      // Manual review should have highest bonus (20), document-ai (15), ocr-fallback (5)
      expect(manualResult.confidence).toBeGreaterThan(documentAIResult.confidence)
      expect(documentAIResult.confidence).toBeGreaterThan(ocrResult.confidence)
    })

    it('should handle empty or null inputs gracefully', () => {
      const emptyResult = ImprovedConfidenceCalculator.calculateConfidence(
        {},
        '',
        'document-ai'
      )

      expect(emptyResult.confidence).toBeGreaterThanOrEqual(15)
      expect(emptyResult.breakdown.textQuality).toBe(0)
      expect(emptyResult.breakdown.dataExtraction).toBe(0)

      const nullResult = ImprovedConfidenceCalculator.calculateConfidence(
        null as any,
        null as any,
        'document-ai'
      )

      expect(nullResult.confidence).toBeGreaterThanOrEqual(15)
    })

    it('should validate credit scores within reasonable ranges', () => {
      const validScoreData: CreditReportData = {
        creditScores: [
          { bureau: 'Experian', score: 720, date: '2024-01-15' },
          { bureau: 'Equifax', score: 680, date: '2024-01-15' }
        ]
      }

      const invalidScoreData: CreditReportData = {
        creditScores: [
          { bureau: 'Experian', score: 950, date: '2024-01-15' }, // Invalid: too high
          { bureau: 'Equifax', score: 200, date: '2024-01-15' }  // Invalid: too low
        ]
      }

      const text = 'Credit scores: Experian 720, Equifax 680'

      const validResult = ImprovedConfidenceCalculator.calculateConfidence(
        validScoreData,
        text,
        'document-ai'
      )

      const invalidResult = ImprovedConfidenceCalculator.calculateConfidence(
        invalidScoreData,
        text,
        'document-ai'
      )

      expect(validResult.breakdown.contentValidation).toBeGreaterThan(
        invalidResult.breakdown.contentValidation
      )
    })
  })

  describe('Text Quality Assessment', () => {
    it('should score high-quality text highly', () => {
      const highQualityText = `
        EXPERIAN CREDIT REPORT
        Personal Information Section
        Name: John Michael Doe
        Address: 1234 Elm Street, Springfield, IL 62701
        Social Security Number: ***-**-1234
        Date of Birth: 01/15/1985
        
        Account Information
        Chase Bank Credit Card
        Account Number: ****1234
        Current Balance: $1,500.00
        Payment Status: Current
        Date Opened: 03/2020
        Credit Limit: $5,000.00
        
        Payment History: On-time payments for 24 months
      `

      const result = ImprovedConfidenceCalculator.calculateConfidence(
        { personalInfo: { name: 'John Michael Doe' } },
        highQualityText,
        'document-ai'
      )

      expect(result.breakdown.textQuality).toBeGreaterThan(70)
      expect(result.qualityIndicators.find(qi => qi.type === 'text')?.impact).toBe('positive')
    })

    it('should penalize noisy text', () => {
      const noisyText = '!@#$%^&*()_+{}|:"<>?[]\\;\',./~`1234567890-=qwertyuiop[]asdfghjkl;zxcvbnm,./'

      const result = ImprovedConfidenceCalculator.calculateConfidence(
        {},
        noisyText,
        'document-ai'
      )

      expect(result.breakdown.textQuality).toBeLessThan(30)
      expect(result.qualityIndicators.find(qi => qi.type === 'text')?.impact).toBe('negative')
    })

    it('should handle optimal text length', () => {
      const optimalText = 'A'.repeat(5000) // 5000 characters - within optimal range
      const tooShortText = 'Short'
      const tooLongText = 'A'.repeat(20000) // 20000 characters - too long

      const optimalResult = ImprovedConfidenceCalculator.calculateConfidence(
        {},
        optimalText,
        'document-ai'
      )

      const shortResult = ImprovedConfidenceCalculator.calculateConfidence(
        {},
        tooShortText,
        'document-ai'
      )

      const longResult = ImprovedConfidenceCalculator.calculateConfidence(
        {},
        tooLongText,
        'document-ai'
      )

      expect(optimalResult.breakdown.textQuality).toBeGreaterThan(shortResult.breakdown.textQuality)
      expect(optimalResult.breakdown.textQuality).toBeGreaterThan(longResult.breakdown.textQuality)
    })
  })

  describe('Data Extraction Assessment', () => {
    it('should score complete data extraction highly', () => {
      const completeData: CreditReportData = {
        personalInfo: {
          name: 'John Doe',
          address: '123 Main St',
          ssn: '123-45-6789'
        },
        accounts: [
          {
            creditor: 'Chase Bank',
            accountNumber: '****1234',
            balance: 1500,
            status: 'Open'
          }
        ],
        creditScores: [
          {
            bureau: 'Experian',
            score: 720,
            date: '2024-01-15'
          }
        ],
        negativeItems: [
          {
            type: 'Late Payment',
            creditor: 'Old Card'
          }
        ],
        inquiries: [
          {
            creditor: 'Auto Loan',
            date: '2024-01-10'
          }
        ]
      }

      const result = ImprovedConfidenceCalculator.calculateConfidence(
        completeData,
        'Sample credit report text',
        'document-ai'
      )

      expect(result.breakdown.dataExtraction).toBeGreaterThan(70)
    })

    it('should penalize incomplete data extraction', () => {
      const incompleteData: CreditReportData = {
        personalInfo: {
          name: 'John'
          // Missing address and SSN
        },
        accounts: [
          {
            creditor: 'Some Bank'
            // Missing account number, balance, status
          }
        ]
        // Missing credit scores, negative items, inquiries
      }

      const result = ImprovedConfidenceCalculator.calculateConfidence(
        incompleteData,
        'Sample credit report text',
        'document-ai'
      )

      expect(result.breakdown.dataExtraction).toBeLessThan(50)
    })

    it('should give bonus for multiple complete accounts', () => {
      const multipleAccountsData: CreditReportData = {
        accounts: [
          {
            creditor: 'Chase Bank',
            accountNumber: '****1234',
            balance: 1500,
            status: 'Open'
          },
          {
            creditor: 'American Express',
            accountNumber: '****5678',
            balance: 2500,
            status: 'Open'
          },
          {
            creditor: 'Capital One',
            accountNumber: '****9012',
            balance: 800,
            status: 'Closed'
          }
        ]
      }

      const singleAccountData: CreditReportData = {
        accounts: [
          {
            creditor: 'Chase Bank',
            accountNumber: '****1234',
            balance: 1500,
            status: 'Open'
          }
        ]
      }

      const multipleResult = ImprovedConfidenceCalculator.calculateConfidence(
        multipleAccountsData,
        'Sample text',
        'document-ai'
      )

      const singleResult = ImprovedConfidenceCalculator.calculateConfidence(
        singleAccountData,
        'Sample text',
        'document-ai'
      )

      expect(multipleResult.breakdown.dataExtraction).toBeGreaterThan(
        singleResult.breakdown.dataExtraction
      )
    })
  })

  describe('Structure Recognition Assessment', () => {
    it('should recognize credit report sections', () => {
      const structuredText = `
        PERSONAL INFORMATION
        Name: John Doe
        
        ACCOUNT INFORMATION
        Chase Bank - Account Details
        
        CREDIT HISTORY
        Payment history details
        
        PAYMENT HISTORY
        On-time payments
        
        PUBLIC RECORDS
        No records found
        
        INQUIRIES
        Recent credit inquiries
      `

      const result = ImprovedConfidenceCalculator.calculateConfidence(
        {},
        structuredText,
        'document-ai'
      )

      expect(result.breakdown.structureRecognition).toBeGreaterThan(35)
    })

    it('should recognize table structures', () => {
      const tableText = `
        Account | Balance | Status
        Chase   | $1,500  | Open
        Amex    | $2,500  | Open
        
        Date        Amount    Description
        01/15/2024  $150.00   Payment
        01/10/2024  $75.00    Purchase
      `

      const result = ImprovedConfidenceCalculator.calculateConfidence(
        {},
        tableText,
        'document-ai'
      )

      expect(result.breakdown.structureRecognition).toBeGreaterThan(25)
    })

    it('should recognize date patterns', () => {
      const dateText = `
        Account opened: 01/15/2020
        Last payment: 12-25-2023
        Report date: January 15, 2024
        Next due: Feb 1, 2024
      `

      const result = ImprovedConfidenceCalculator.calculateConfidence(
        {},
        dateText,
        'document-ai'
      )

      expect(result.breakdown.structureRecognition).toBeGreaterThan(15)
    })

    it('should recognize currency patterns', () => {
      const currencyText = `
        Current Balance: $1,500.00
        Credit Limit: $5,000
        Minimum Payment: $45.50
        Available Credit: $3,500.00
      `

      const result = ImprovedConfidenceCalculator.calculateConfidence(
        {},
        currencyText,
        'document-ai'
      )

      expect(result.breakdown.structureRecognition).toBeGreaterThan(5)
    })
  })

  describe('Content Validation Assessment', () => {
    it('should validate cross-referenced account information', () => {
      const data: CreditReportData = {
        accounts: [
          {
            creditor: 'Chase Bank',
            accountNumber: '****1234',
            balance: 1500
          }
        ]
      }

      const matchingText = 'Chase Bank account ****1234 with balance $1,500'
      const nonMatchingText = 'Wells Fargo account ****5678 with balance $2,000'

      const matchingResult = ImprovedConfidenceCalculator.calculateConfidence(
        data,
        matchingText,
        'document-ai'
      )

      const nonMatchingResult = ImprovedConfidenceCalculator.calculateConfidence(
        data,
        nonMatchingText,
        'document-ai'
      )

      expect(matchingResult.breakdown.contentValidation).toBeGreaterThan(
        nonMatchingResult.breakdown.contentValidation
      )
    })

    it('should validate reasonable inquiry dates', () => {
      const currentDate = new Date()
      const validDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate())
      const invalidDate = new Date(currentDate.getFullYear() - 5, currentDate.getMonth(), currentDate.getDate())

      const validData: CreditReportData = {
        inquiries: [
          {
            creditor: 'Auto Loan Company',
            date: validDate.toISOString().split('T')[0],
            type: 'hard'
          }
        ]
      }

      const invalidData: CreditReportData = {
        inquiries: [
          {
            creditor: 'Auto Loan Company',
            date: invalidDate.toISOString().split('T')[0],
            type: 'hard'
          }
        ]
      }

      const validResult = ImprovedConfidenceCalculator.calculateConfidence(
        validData,
        'Recent inquiry from Auto Loan Company',
        'document-ai'
      )

      const invalidResult = ImprovedConfidenceCalculator.calculateConfidence(
        invalidData,
        'Old inquiry from Auto Loan Company',
        'document-ai'
      )

      expect(validResult.breakdown.contentValidation).toBeGreaterThan(
        invalidResult.breakdown.contentValidation
      )
    })

    it('should check for duplicate accounts', () => {
      const uniqueAccountsData: CreditReportData = {
        accounts: [
          { creditor: 'Chase Bank' },
          { creditor: 'American Express' },
          { creditor: 'Capital One' }
        ]
      }

      const duplicateAccountsData: CreditReportData = {
        accounts: [
          { creditor: 'Chase Bank' },
          { creditor: 'Chase Bank' },
          { creditor: 'American Express' }
        ]
      }

      const uniqueResult = ImprovedConfidenceCalculator.calculateConfidence(
        uniqueAccountsData,
        'Sample text',
        'document-ai'
      )

      const duplicateResult = ImprovedConfidenceCalculator.calculateConfidence(
        duplicateAccountsData,
        'Sample text',
        'document-ai'
      )

      expect(uniqueResult.breakdown.contentValidation).toBeGreaterThan(
        duplicateResult.breakdown.contentValidation
      )
    })
  })

  describe('Quality Indicators', () => {
    it('should generate appropriate quality indicators', () => {
      const mockData: CreditReportData = {
        personalInfo: { name: 'John Doe' },
        accounts: [{ creditor: 'Chase Bank', balance: 1500 }]
      }

      const result = ImprovedConfidenceCalculator.calculateConfidence(
        mockData,
        'High quality credit report with clear structure',
        'document-ai'
      )

      expect(result.qualityIndicators).toHaveLength(4)
      expect(result.qualityIndicators.every(qi => 
        ['text', 'data', 'structure', 'validation'].includes(qi.type)
      )).toBe(true)
      expect(result.qualityIndicators.every(qi => 
        ['positive', 'negative', 'neutral'].includes(qi.impact)
      )).toBe(true)
      expect(result.qualityIndicators.every(qi => 
        typeof qi.score === 'number' && qi.score >= 0 && qi.score <= 100
      )).toBe(true)
    })

    it('should indicate negative impact for poor quality', () => {
      const result = ImprovedConfidenceCalculator.calculateConfidence(
        {},
        '!@#$%^&*()',
        'ocr-fallback'
      )

      const textIndicator = result.qualityIndicators.find(qi => qi.type === 'text')
      expect(textIndicator?.impact).toBe('negative')
      expect(textIndicator?.description).toContain('Poor text quality')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long text input', () => {
      const veryLongText = 'A'.repeat(100000) // 100k characters
      
      const result = ImprovedConfidenceCalculator.calculateConfidence(
        {},
        veryLongText,
        'document-ai'
      )

      expect(result.confidence).toBeGreaterThanOrEqual(15)
      expect(result.confidence).toBeLessThanOrEqual(100)
    })

    it('should handle special characters and unicode', () => {
      const unicodeText = 'Crédit Repört with spëcial chäractërs and émojis 🏦💳📊'
      
      const result = ImprovedConfidenceCalculator.calculateConfidence(
        { personalInfo: { name: 'José María' } },
        unicodeText,
        'document-ai'
      )

      expect(result.confidence).toBeGreaterThanOrEqual(15)
      expect(result.confidence).toBeLessThanOrEqual(100)
    })

    it('should handle malformed data gracefully', () => {
      const malformedData = {
        personalInfo: null,
        accounts: [null, undefined, { creditor: null }],
        creditScores: [{ score: 'invalid' as any }]
      } as any

      const result = ImprovedConfidenceCalculator.calculateConfidence(
        malformedData,
        'Sample text',
        'document-ai'
      )

      expect(result.confidence).toBeGreaterThanOrEqual(15)
      expect(result.confidence).toBeLessThanOrEqual(100)
    })

    it('should handle unknown processing methods', () => {
      const result = ImprovedConfidenceCalculator.calculateConfidence(
        { personalInfo: { name: 'Test' } },
        'Sample text',
        'unknown-method' as any
      )

      expect(result.confidence).toBeGreaterThanOrEqual(15)
      expect(result.method).toBe('unknown-method')
    })
  })

  describe('Performance', () => {
    it('should complete calculation within reasonable time', () => {
      const largeData: CreditReportData = {
        personalInfo: {
          name: 'John Doe',
          address: '123 Main St',
          ssn: '123-45-6789'
        },
        accounts: Array.from({ length: 50 }, (_, i) => ({
          creditor: `Creditor ${i}`,
          accountNumber: `****${i.toString().padStart(4, '0')}`,
          balance: Math.random() * 10000,
          status: i % 2 === 0 ? 'Open' : 'Closed'
        })),
        creditScores: [
          { bureau: 'Experian', score: 720, date: '2024-01-15' },
          { bureau: 'Equifax', score: 715, date: '2024-01-15' },
          { bureau: 'TransUnion', score: 710, date: '2024-01-15' }
        ],
        negativeItems: Array.from({ length: 20 }, (_, i) => ({
          type: 'Late Payment',
          creditor: `Creditor ${i}`,
          amount: Math.random() * 1000
        })),
        inquiries: Array.from({ length: 10 }, (_, i) => ({
          creditor: `Inquiry ${i}`,
          date: '2024-01-10',
          type: 'hard'
        }))
      }

      const largeText = 'Credit report text '.repeat(1000)

      const startTime = Date.now()
      const result = ImprovedConfidenceCalculator.calculateConfidence(
        largeData,
        largeText,
        'document-ai'
      )
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
      expect(result.confidence).toBeGreaterThanOrEqual(15)
      expect(result.confidence).toBeLessThanOrEqual(100)
    })
  })
})