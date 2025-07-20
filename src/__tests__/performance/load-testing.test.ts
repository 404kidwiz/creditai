/**
 * Performance and Load Testing
 * Tests system performance under various load conditions
 */

import { EnhancedCreditAnalyzer } from '@/lib/ai/enhancedCreditAnalyzer'
import { EOSCARFormatter } from '@/lib/eoscar/eoscarFormatter'
import { DisputeTracker } from '@/lib/disputes/disputeTracker'
import { EnhancedValidationSystem } from '@/lib/validation/enhancedValidationSystem'

// Mock external dependencies for performance testing
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      }),
      insert: jest.fn().mockResolvedValue({
        data: [{ id: 'test_id' }],
        error: null
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 'test_id' }],
          error: null
        })
      })
    })
  }
}))

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockImplementation(async () => {
        // Simulate AI processing time
        await new Promise(resolve => setTimeout(resolve, 100))
        return {
          response: {
            text: () => JSON.stringify({
              personalInfo: {
                name: 'John Doe',
                address: '123 Main St, Anytown, CA 12345'
              },
              creditScores: {
                experian: { score: 720, date: '2024-01-15', bureau: 'experian' }
              },
              accounts: [{
                id: 'acc_1',
                creditorName: 'Test Bank',
                accountNumber: '1234',
                accountType: 'credit_card',
                balance: 1000,
                creditLimit: 5000,
                status: 'open'
              }],
              negativeItems: [{
                id: 'neg_1',
                type: 'late_payment',
                creditorName: 'Test Bank',
                amount: 50,
                date: '2023-12-01',
                impactScore: 30
              }],
              inquiries: [],
              publicRecords: []
            })
          }
        }
      })
    })
  }))
}))

describe('Performance and Load Testing', () => {
  let analyzer: EnhancedCreditAnalyzer
  let formatter: EOSCARFormatter
  let tracker: DisputeTracker
  let validator: EnhancedValidationSystem

  const mockCreditReportText = `
    CREDIT REPORT
    Name: John Doe
    Address: 123 Main St, Anytown, CA 12345
    SSN: 123-45-6789
    
    CREDIT SCORES:
    Experian: 720 (as of 01/15/2024)
    
    ACCOUNTS:
    Test Bank - Credit Card
    Account: ****1234
    Balance: $1,000
    Credit Limit: $5,000
    Status: Open
    
    NEGATIVE ITEMS:
    Late Payment - Test Bank - $50 (12/01/2023)
  `

  const generateLargeCreditReport = (accountCount: number, negativeItemCount: number): string => {
    let report = mockCreditReportText

    // Add multiple accounts
    for (let i = 0; i < accountCount; i++) {
      report += `
        Account ${i + 1} - Credit Card Company ${i + 1}
        Account: ****${String(1000 + i).padStart(4, '0')}
        Balance: $${(Math.random() * 5000).toFixed(2)}
        Credit Limit: $${(5000 + Math.random() * 10000).toFixed(2)}
        Status: Open
        Date Opened: 01/01/${2020 + (i % 4)}
      `
    }

    // Add multiple negative items
    for (let i = 0; i < negativeItemCount; i++) {
      report += `
        Negative Item ${i + 1} - Creditor ${i + 1}
        Amount: $${(Math.random() * 1000).toFixed(2)}
        Date: ${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}/01/2023
        Type: Late Payment
      `
    }

    return report
  }

  beforeEach(() => {
    process.env.GOOGLE_AI_API_KEY = 'test-api-key'
    
    analyzer = new EnhancedCreditAnalyzer()
    formatter = new EOSCARFormatter()
    tracker = new DisputeTracker()
    validator = new EnhancedValidationSystem()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Single Document Performance', () => {
    it('should process small credit report within 5 seconds', async () => {
      const startTime = Date.now()
      
      const result = await analyzer.analyzeReport(mockCreditReportText, 'user_123')
      
      const duration = Date.now() - startTime
      
      expect(result).toBeDefined()
      expect(duration).toBeLessThan(5000) // 5 seconds
    })

    it('should process medium credit report (10 accounts, 5 negative items) within 10 seconds', async () => {
      const largeCreditReport = generateLargeCreditReport(10, 5)
      const startTime = Date.now()
      
      const result = await analyzer.analyzeReport(largeCreditReport, 'user_123')
      
      const duration = Date.now() - startTime
      
      expect(result).toBeDefined()
      expect(duration).toBeLessThan(10000) // 10 seconds
    })

    it('should process large credit report (50 accounts, 20 negative items) within 30 seconds', async () => {
      const largeCreditReport = generateLargeCreditReport(50, 20)
      const startTime = Date.now()
      
      const result = await analyzer.analyzeReport(largeCreditReport, 'user_123')
      
      const duration = Date.now() - startTime
      
      expect(result).toBeDefined()
      expect(duration).toBeLessThan(30000) // 30 seconds
    }, 35000) // 35 second timeout

    it('should maintain accuracy with large documents', async () => {
      const largeCreditReport = generateLargeCreditReport(25, 10)
      
      const result = await analyzer.analyzeReport(largeCreditReport, 'user_123')
      
      expect(result.confidence).toBeGreaterThan(70)
      expect(result.qualityMetrics.overallQuality).toBeGreaterThan(0.7)
    })
  })

  describe('Concurrent Processing Performance', () => {
    it('should handle 5 concurrent analysis requests within 15 seconds', async () => {
      const startTime = Date.now()
      
      const promises = Array(5).fill(null).map((_, index) => 
        analyzer.analyzeReport(mockCreditReportText, `user_${index}`)
      )
      
      const results = await Promise.all(promises)
      
      const duration = Date.now() - startTime
      
      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.confidence).toBeGreaterThan(0)
      })
      expect(duration).toBeLessThan(15000) // 15 seconds
    })

    it('should handle 10 concurrent EOSCAR letter generations within 10 seconds', async () => {
      const disputeRequest = {
        consumerInfo: {
          firstName: 'John',
          lastName: 'Doe',
          ssn: '123-45-6789',
          dateOfBirth: new Date('1980-01-15'),
          currentAddress: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zipCode: '12345',
            addressType: 'current' as const
          },
          phoneNumbers: [{
            number: '555-123-4567',
            type: 'home' as const,
            isPrimary: true
          }]
        },
        disputeItems: [{
          itemType: 'TRADELINE' as any,
          creditorName: 'Test Bank',
          accountNumber: '1234567890',
          disputeReasonCode: '03' as any,
          disputeDescription: 'Inaccurate payment history',
          requestedAction: 'UPDATE' as any
        }],
        submitterInfo: {
          name: 'John Doe',
          organizationType: 'Individual',
          address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zipCode: '12345'
          },
          phone: '555-123-4567',
          email: 'john.doe@email.com'
        },
        bureau: 'experian' as const
      }

      const startTime = Date.now()
      
      const promises = Array(10).fill(null).map(() => 
        formatter.generateEOSCARLetter(disputeRequest)
      )
      
      const results = await Promise.all(promises)
      
      const duration = Date.now() - startTime
      
      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.complianceStatus.isCompliant).toBe(true)
      })
      expect(duration).toBeLessThan(10000) // 10 seconds
    })

    it('should handle mixed concurrent operations efficiently', async () => {
      const startTime = Date.now()
      
      // Mix of different operations
      const analysisPromises = Array(3).fill(null).map((_, index) => 
        analyzer.analyzeReport(mockCreditReportText, `user_${index}`)
      )
      
      const validationPromises = Array(3).fill(null).map(() => 
        validator.validateCreditReportData({
          personalInfo: {
            name: 'John Doe',
            address: '123 Main St',
            nameConfidence: 0.9,
            addressConfidence: 0.8,
            ssnValidated: true,
            dobValidated: true
          },
          creditScores: {},
          accounts: [],
          negativeItems: [],
          inquiries: [],
          publicRecords: []
        } as any)
      )
      
      const trackingPromises = Array(2).fill(null).map((_, index) => 
        tracker.createTrackingRecord({
          id: `dispute_${index}`,
          userId: `user_${index}`,
          disputeItems: [],
          bureauSubmissions: [{
            bureau: 'experian',
            submissionDate: new Date(),
            submissionMethod: 'online',
            trackingNumber: `TRK${index}`,
            confirmationReceived: true
          }],
          status: 'submitted' as any,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      )
      
      const allResults = await Promise.all([
        ...analysisPromises,
        ...validationPromises,
        ...trackingPromises
      ])
      
      const duration = Date.now() - startTime
      
      expect(allResults).toHaveLength(8)
      expect(duration).toBeLessThan(20000) // 20 seconds
    })
  })

  describe('Memory Usage Performance', () => {
    it('should not cause memory leaks with repeated operations', async () => {
      const initialMemory = process.memoryUsage()
      
      // Perform many operations
      for (let i = 0; i < 20; i++) {
        await analyzer.analyzeReport(mockCreditReportText, `user_${i}`)
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
      }
      
      const finalMemory = process.memoryUsage()
      
      // Memory usage should not increase dramatically
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100
      
      expect(memoryIncreasePercent).toBeLessThan(200) // Less than 200% increase
    })

    it('should handle large data structures efficiently', async () => {
      const largeData = {
        personalInfo: {
          name: 'John Doe',
          address: '123 Main St',
          nameConfidence: 0.9,
          addressConfidence: 0.8,
          ssnValidated: true,
          dobValidated: true
        },
        creditScores: {
          experian: { score: 720, bureau: 'experian' as const, date: '2024-01-15', scoreRange: { min: 300, max: 850 }, confidence: 0.9, dataQuality: 0.9, lastUpdated: '2024-01-15T00:00:00Z' }
        },
        accounts: Array(100).fill(null).map((_, i) => ({
          id: `acc_${i}`,
          creditorName: `Creditor ${i}`,
          standardizedCreditorName: `Creditor ${i}`,
          accountNumber: `****${i.toString().padStart(4, '0')}`,
          accountType: 'credit_card' as const,
          balance: Math.random() * 5000,
          creditLimit: 5000 + Math.random() * 10000,
          paymentHistory: [],
          status: 'open' as const,
          openDate: '2020-01-01',
          lastReported: '2024-01-01',
          bureaus: ['experian'] as const,
          dataQuality: 0.9,
          confidence: 0.9,
          lastValidated: '2024-01-15T00:00:00Z'
        })),
        negativeItems: Array(50).fill(null).map((_, i) => ({
          id: `neg_${i}`,
          type: 'late_payment' as const,
          creditorName: `Creditor ${i}`,
          standardizedCreditorName: `Creditor ${i}`,
          amount: Math.random() * 1000,
          date: '2023-01-01',
          status: 'active',
          description: `Negative item ${i}`,
          disputeReasons: [],
          impactScore: Math.random() * 100,
          bureauReporting: ['experian'] as const,
          ageInYears: 1,
          confidence: 0.8,
          verified: false,
          lastValidated: '2024-01-15T00:00:00Z'
        })),
        inquiries: [],
        publicRecords: []
      } as any

      const startTime = Date.now()
      const initialMemory = process.memoryUsage()
      
      const result = await validator.validateCreditReportData(largeData)
      
      const duration = Date.now() - startTime
      const finalMemory = process.memoryUsage()
      
      expect(result).toBeDefined()
      expect(duration).toBeLessThan(5000) // 5 seconds
      
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // Less than 100MB increase
    })
  })

  describe('Database Performance', () => {
    it('should handle batch database operations efficiently', async () => {
      const startTime = Date.now()
      
      // Simulate batch tracking record creation
      const promises = Array(20).fill(null).map((_, index) => 
        tracker.createTrackingRecord({
          id: `dispute_${index}`,
          userId: `user_${index}`,
          disputeItems: [{
            id: `item_${index}`,
            creditorName: `Creditor ${index}`,
            accountNumber: `****${index.toString().padStart(4, '0')}`,
            disputeReason: 'Test dispute',
            requestedAction: 'Update'
          }],
          bureauSubmissions: [{
            bureau: 'experian',
            submissionDate: new Date(),
            submissionMethod: 'online',
            trackingNumber: `TRK${index}`,
            confirmationReceived: true
          }],
          status: 'submitted' as any,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      )
      
      const results = await Promise.all(promises)
      
      const duration = Date.now() - startTime
      
      expect(results).toHaveLength(20)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.disputeId).toBeDefined()
      })
      expect(duration).toBeLessThan(10000) // 10 seconds
    })
  })

  describe('Stress Testing', () => {
    it('should handle high load without crashing', async () => {
      const promises: Promise<any>[] = []
      
      // Create high load with mixed operations
      for (let i = 0; i < 50; i++) {
        if (i % 3 === 0) {
          promises.push(analyzer.analyzeReport(mockCreditReportText, `user_${i}`))
        } else if (i % 3 === 1) {
          promises.push(validator.validateCreditReportData({
            personalInfo: { name: 'Test User', address: 'Test Address', nameConfidence: 0.9, addressConfidence: 0.8, ssnValidated: true, dobValidated: true },
            creditScores: {},
            accounts: [],
            negativeItems: [],
            inquiries: [],
            publicRecords: []
          } as any))
        } else {
          promises.push(formatter.generateEOSCARLetter({
            consumerInfo: {
              firstName: 'John',
              lastName: 'Doe',
              ssn: '123-45-6789',
              dateOfBirth: new Date('1980-01-15'),
              currentAddress: {
                street: '123 Main St',
                city: 'Anytown',
                state: 'CA',
                zipCode: '12345',
                addressType: 'current'
              },
              phoneNumbers: [{
                number: '555-123-4567',
                type: 'home',
                isPrimary: true
              }]
            },
            disputeItems: [{
              itemType: 'TRADELINE' as any,
              creditorName: 'Test Bank',
              accountNumber: '1234567890',
              disputeReasonCode: '03' as any,
              disputeDescription: 'Test dispute',
              requestedAction: 'UPDATE' as any
            }],
            submitterInfo: {
              name: 'John Doe',
              organizationType: 'Individual',
              address: {
                street: '123 Main St',
                city: 'Anytown',
                state: 'CA',
                zipCode: '12345'
              },
              phone: '555-123-4567',
              email: 'john.doe@email.com'
            },
            bureau: 'experian'
          }))
        }
      }
      
      const startTime = Date.now()
      
      // Use allSettled to handle any failures gracefully
      const results = await Promise.allSettled(promises)
      
      const duration = Date.now() - startTime
      
      const successful = results.filter(r => r.status === 'fulfilled')
      const failed = results.filter(r => r.status === 'rejected')
      
      // At least 80% should succeed under stress
      expect(successful.length / results.length).toBeGreaterThan(0.8)
      expect(duration).toBeLessThan(60000) // 60 seconds max
      
      console.log(`Stress test: ${successful.length}/${results.length} operations succeeded in ${duration}ms`)
    }, 70000) // 70 second timeout

    it('should recover gracefully from failures', async () => {
      // Mock some failures
      const originalGenerateContent = require('@google/generative-ai').GoogleGenerativeAI().getGenerativeModel().generateContent
      
      let callCount = 0
      require('@google/generative-ai').GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockImplementation(async () => {
            callCount++
            if (callCount % 5 === 0) {
              throw new Error('Simulated AI failure')
            }
            return originalGenerateContent()
          })
        })
      }))
      
      const promises = Array(20).fill(null).map((_, index) => 
        analyzer.analyzeReport(mockCreditReportText, `user_${index}`)
          .catch(error => ({ error: error.message }))
      )
      
      const results = await Promise.all(promises)
      
      const successful = results.filter(r => !r.error)
      const failed = results.filter(r => r.error)
      
      expect(successful.length).toBeGreaterThan(0)
      expect(failed.length).toBeGreaterThan(0)
      
      // System should handle failures gracefully
      expect(successful.length + failed.length).toBe(20)
    })
  })

  describe('Scalability Testing', () => {
    it('should scale linearly with input size', async () => {
      const sizes = [1, 5, 10, 20]
      const times: number[] = []
      
      for (const size of sizes) {
        const largeCreditReport = generateLargeCreditReport(size, Math.floor(size / 2))
        
        const startTime = Date.now()
        await analyzer.analyzeReport(largeCreditReport, `user_${size}`)
        const duration = Date.now() - startTime
        
        times.push(duration)
      }
      
      // Processing time should scale roughly linearly
      // (allowing for some variance due to AI processing)
      for (let i = 1; i < times.length; i++) {
        const ratio = times[i] / times[0]
        const sizeRatio = sizes[i] / sizes[0]
        
        // Time ratio should not exceed size ratio by more than 2x
        expect(ratio).toBeLessThan(sizeRatio * 2)
      }
    })

    it('should maintain performance with increasing concurrent users', async () => {
      const concurrencyLevels = [1, 5, 10]
      const avgTimes: number[] = []
      
      for (const concurrency of concurrencyLevels) {
        const startTime = Date.now()
        
        const promises = Array(concurrency).fill(null).map((_, index) => 
          analyzer.analyzeReport(mockCreditReportText, `user_${index}`)
        )
        
        await Promise.all(promises)
        
        const totalTime = Date.now() - startTime
        const avgTime = totalTime / concurrency
        
        avgTimes.push(avgTime)
      }
      
      // Average time per request should not increase dramatically with concurrency
      const baseTime = avgTimes[0]
      avgTimes.forEach(time => {
        expect(time).toBeLessThan(baseTime * 3) // No more than 3x slower
      })
    })
  })
})