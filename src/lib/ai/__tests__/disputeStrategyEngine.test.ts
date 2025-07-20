/**
 * Unit tests for DisputeStrategyEngine
 * Tests dispute strategy recommendations and legal basis generation
 */

import { DisputeStrategyEngine, DisputeStrategy, LegalBasis } from '../disputeStrategyEngine'
import { EnhancedCreditReportData } from '@/types/enhanced-credit'

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              dispute_type: 'late_payment',
              success_rate: 0.75,
              avg_resolution_days: 30,
              factors: ['account_age', 'amount']
            }
          ],
          error: null
        })
      })
    })
  }
}))

describe('DisputeStrategyEngine', () => {
  let strategyEngine: DisputeStrategyEngine
  
  const mockCreditData: EnhancedCreditReportData = {
    personalInfo: {
      name: 'John Doe',
      address: '123 Main St',
      nameConfidence: 0.9,
      addressConfidence: 0.8,
      ssnValidated: true,
      dobValidated: true
    },
    creditScores: {
      experian: {
        score: 650,
        bureau: 'experian',
        date: '2024-01-15',
        scoreRange: { min: 300, max: 850 },
        confidence: 0.9,
        dataQuality: 0.9,
        lastUpdated: '2024-01-15T00:00:00Z'
      }
    },
    accounts: [{
      id: 'acc_1',
      creditorName: 'Test Bank',
      standardizedCreditorName: 'Test Bank',
      accountNumber: '1234',
      accountType: 'credit_card',
      balance: 2000,
      creditLimit: 5000,
      paymentHistory: [],
      status: 'open',
      openDate: '2020-01-01',
      lastReported: '2024-01-01',
      bureaus: ['experian'],
      dataQuality: 0.9,
      confidence: 0.9,
      lastValidated: '2024-01-15T00:00:00Z'
    }],
    negativeItems: [
      {
        id: 'neg_1',
        type: 'late_payment',
        creditorName: 'Test Bank',
        standardizedCreditorName: 'Test Bank',
        amount: 50,
        date: '2023-06-01',
        status: 'active',
        description: '30 days late payment',
        disputeReasons: [],
        impactScore: 40,
        bureauReporting: ['experian'],
        ageInYears: 0.7,
        confidence: 0.8,
        verified: false,
        lastValidated: '2024-01-15T00:00:00Z'
      },
      {
        id: 'neg_2',
        type: 'collection',
        creditorName: 'Collection Agency',
        standardizedCreditorName: 'Collection Agency',
        amount: 1500,
        date: '2022-03-01',
        status: 'active',
        description: 'Collection account',
        disputeReasons: [],
        impactScore: 80,
        bureauReporting: ['experian'],
        ageInYears: 2.1,
        confidence: 0.9,
        verified: false,
        lastValidated: '2024-01-15T00:00:00Z'
      },
      {
        id: 'neg_3',
        type: 'charge_off',
        creditorName: 'Credit Card Co',
        standardizedCreditorName: 'Credit Card Co',
        amount: 3000,
        date: '2021-08-01',
        status: 'active',
        description: 'Charged off account',
        disputeReasons: [],
        impactScore: 90,
        bureauReporting: ['experian'],
        ageInYears: 2.5,
        confidence: 0.9,
        verified: false,
        lastValidated: '2024-01-15T00:00:00Z'
      }
    ],
    inquiries: [],
    publicRecords: [],
    extractionMetadata: {
      extractionTimestamp: new Date(),
      aiModelsUsed: ['gemini'],
      confidenceScores: { gemini: 0.9 },
      consensusScore: 0.9,
      processingTime: 1000,
      documentQuality: {
        textClarity: 0.9,
        completeness: 0.8,
        structureScore: 0.8,
        overallQuality: 0.85,
        issues: []
      },
      providerDetected: 'experian',
      extractionMethod: 'ai'
    },
    validationResults: [],
    qualityMetrics: {
      dataCompleteness: 0.9,
      dataAccuracy: 0.9,
      consistencyScore: 0.8,
      validationScore: 0.8,
      overallQuality: 0.85,
      extractionQuality: 0.9,
      crossValidationScore: 0.8,
      bureauConsistency: 0.8,
      temporalConsistency: 0.8
    },
    providerSpecificData: {
      provider: 'experian',
      processingNotes: []
    },
    crossReferenceData: {
      duplicateAccounts: [],
      inconsistentData: [],
      missingData: [],
      correlationScore: 0.9,
      verificationStatus: {}
    }
  }

  beforeEach(() => {
    strategyEngine = new DisputeStrategyEngine()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('generateDisputeStrategy', () => {
    it('should generate comprehensive dispute strategy', async () => {
      const strategy = await strategyEngine.generateDisputeStrategy(mockCreditData)

      expect(strategy).toBeDefined()
      expect(strategy.overallStrategy).toBeDefined()
      expect(strategy.prioritizedItems).toBeDefined()
      expect(strategy.timeline).toBeDefined()
      expect(strategy.expectedOutcome).toBeDefined()
      expect(Array.isArray(strategy.prioritizedItems)).toBe(true)
    })

    it('should prioritize items by impact and success probability', async () => {
      const strategy = await strategyEngine.generateDisputeStrategy(mockCreditData)

      expect(strategy.prioritizedItems.length).toBe(3)
      
      // Should be sorted by priority score (impact * success probability)
      for (let i = 0; i < strategy.prioritizedItems.length - 1; i++) {
        const current = strategy.prioritizedItems[i]
        const next = strategy.prioritizedItems[i + 1]
        expect(current.priorityScore).toBeGreaterThanOrEqual(next.priorityScore)
      }
    })

    it('should calculate success probabilities correctly', async () => {
      const strategy = await strategyEngine.generateDisputeStrategy(mockCreditData)

      strategy.prioritizedItems.forEach(item => {
        expect(item.successProbability).toBeGreaterThanOrEqual(0)
        expect(item.successProbability).toBeLessThanOrEqual(1)
      })
    })

    it('should generate appropriate legal basis for each item', async () => {
      const strategy = await strategyEngine.generateDisputeStrategy(mockCreditData)

      strategy.prioritizedItems.forEach(item => {
        expect(item.legalBasis).toBeDefined()
        expect(item.legalBasis.primaryLaw).toBeDefined()
        expect(item.legalBasis.sections).toBeDefined()
        expect(Array.isArray(item.legalBasis.sections)).toBe(true)
        expect(item.legalBasis.caseReferences).toBeDefined()
        expect(Array.isArray(item.legalBasis.caseReferences)).toBe(true)
      })
    })

    it('should recommend optimal dispute timing', async () => {
      const strategy = await strategyEngine.generateDisputeStrategy(mockCreditData)

      expect(strategy.timeline).toMatchObject({
        phase1: expect.objectContaining({
          items: expect.any(Array),
          timeframe: expect.any(String),
          rationale: expect.any(String)
        }),
        phase2: expect.objectContaining({
          items: expect.any(Array),
          timeframe: expect.any(String),
          rationale: expect.any(String)
        }),
        phase3: expect.objectContaining({
          items: expect.any(Array),
          timeframe: expect.any(String),
          rationale: expect.any(String)
        })
      })
    })

    it('should calculate expected score improvement', async () => {
      const strategy = await strategyEngine.generateDisputeStrategy(mockCreditData)

      expect(strategy.expectedOutcome).toMatchObject({
        scoreImprovement: expect.objectContaining({
          minimum: expect.any(Number),
          expected: expect.any(Number),
          maximum: expect.any(Number)
        }),
        timeframe: expect.any(String),
        confidence: expect.any(Number)
      })

      expect(strategy.expectedOutcome.scoreImprovement.minimum).toBeLessThanOrEqual(
        strategy.expectedOutcome.scoreImprovement.expected
      )
      expect(strategy.expectedOutcome.scoreImprovement.expected).toBeLessThanOrEqual(
        strategy.expectedOutcome.scoreImprovement.maximum
      )
    })
  })

  describe('calculateSuccessProbability', () => {
    it('should calculate higher probability for older items', async () => {
      const oldItem = { ...mockCreditData.negativeItems[2], ageInYears: 5 }
      const newItem = { ...mockCreditData.negativeItems[0], ageInYears: 0.5 }

      const oldProbability = await strategyEngine.calculateSuccessProbability(oldItem, mockCreditData)
      const newProbability = await strategyEngine.calculateSuccessProbability(newItem, mockCreditData)

      expect(oldProbability).toBeGreaterThan(newProbability)
    })

    it('should consider dispute type in probability calculation', async () => {
      const latePayment = mockCreditData.negativeItems[0] // late_payment
      const collection = mockCreditData.negativeItems[1] // collection

      const latePaymentProb = await strategyEngine.calculateSuccessProbability(latePayment, mockCreditData)
      const collectionProb = await strategyEngine.calculateSuccessProbability(collection, mockCreditData)

      // Late payments typically have higher success rates than collections
      expect(latePaymentProb).toBeGreaterThan(collectionProb)
    })

    it('should factor in amount for probability calculation', async () => {
      const smallAmount = { ...mockCreditData.negativeItems[0], amount: 25 }
      const largeAmount = { ...mockCreditData.negativeItems[0], amount: 5000 }

      const smallProb = await strategyEngine.calculateSuccessProbability(smallAmount, mockCreditData)
      const largeProb = await strategyEngine.calculateSuccessProbability(largeAmount, mockCreditData)

      // Smaller amounts typically have higher success rates
      expect(smallProb).toBeGreaterThan(largeProb)
    })

    it('should return probability between 0 and 1', async () => {
      for (const item of mockCreditData.negativeItems) {
        const probability = await strategyEngine.calculateSuccessProbability(item, mockCreditData)
        expect(probability).toBeGreaterThanOrEqual(0)
        expect(probability).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('generateLegalBasis', () => {
    it('should generate appropriate legal basis for late payments', async () => {
      const latePaymentItem = mockCreditData.negativeItems[0]
      const legalBasis = await strategyEngine.generateLegalBasis(latePaymentItem)

      expect(legalBasis.primaryLaw).toBe('Fair Credit Reporting Act (FCRA)')
      expect(legalBasis.sections).toContain('Section 611')
      expect(legalBasis.applicableRights).toContain('Right to dispute inaccurate information')
    })

    it('should generate appropriate legal basis for collections', async () => {
      const collectionItem = mockCreditData.negativeItems[1]
      const legalBasis = await strategyEngine.generateLegalBasis(collectionItem)

      expect(legalBasis.primaryLaw).toBe('Fair Credit Reporting Act (FCRA)')
      expect(legalBasis.sections).toContain('Section 611')
      expect(legalBasis.sections).toContain('Section 623')
    })

    it('should include relevant case references', async () => {
      const item = mockCreditData.negativeItems[0]
      const legalBasis = await strategyEngine.generateLegalBasis(item)

      expect(Array.isArray(legalBasis.caseReferences)).toBe(true)
      expect(legalBasis.caseReferences.length).toBeGreaterThan(0)
      
      legalBasis.caseReferences.forEach(caseRef => {
        expect(caseRef).toMatchObject({
          caseName: expect.any(String),
          citation: expect.any(String),
          relevance: expect.any(String)
        })
      })
    })

    it('should provide enforcement mechanisms', async () => {
      const item = mockCreditData.negativeItems[0]
      const legalBasis = await strategyEngine.generateLegalBasis(item)

      expect(Array.isArray(legalBasis.enforcementMechanisms)).toBe(true)
      expect(legalBasis.enforcementMechanisms.length).toBeGreaterThan(0)
    })
  })

  describe('optimizeDisputeTiming', () => {
    it('should create phased approach for multiple items', async () => {
      const timeline = await strategyEngine.optimizeDisputeTiming(mockCreditData.negativeItems)

      expect(timeline.phase1.items.length).toBeGreaterThan(0)
      expect(timeline.phase1.timeframe).toBeDefined()
      expect(timeline.phase1.rationale).toBeDefined()

      // Should not exceed recommended items per phase
      expect(timeline.phase1.items.length).toBeLessThanOrEqual(3)
      expect(timeline.phase2.items.length).toBeLessThanOrEqual(3)
      expect(timeline.phase3.items.length).toBeLessThanOrEqual(3)
    })

    it('should prioritize high-impact items in early phases', async () => {
      const timeline = await strategyEngine.optimizeDisputeTiming(mockCreditData.negativeItems)

      if (timeline.phase1.items.length > 0) {
        const phase1AvgImpact = timeline.phase1.items.reduce((sum, item) => 
          sum + item.impactScore, 0) / timeline.phase1.items.length

        if (timeline.phase2.items.length > 0) {
          const phase2AvgImpact = timeline.phase2.items.reduce((sum, item) => 
            sum + item.impactScore, 0) / timeline.phase2.items.length

          expect(phase1AvgImpact).toBeGreaterThanOrEqual(phase2AvgImpact)
        }
      }
    })

    it('should provide appropriate timeframes', async () => {
      const timeline = await strategyEngine.optimizeDisputeTiming(mockCreditData.negativeItems)

      expect(timeline.phase1.timeframe).toMatch(/\d+(-\d+)?\s+(days|weeks|months)/i)
      expect(timeline.phase2.timeframe).toMatch(/\d+(-\d+)?\s+(days|weeks|months)/i)
      expect(timeline.phase3.timeframe).toMatch(/\d+(-\d+)?\s+(days|weeks|months)/i)
    })
  })

  describe('calculateExpectedOutcome', () => {
    it('should calculate realistic score improvements', async () => {
      const outcome = await strategyEngine.calculateExpectedOutcome(
        mockCreditData.negativeItems,
        mockCreditData.creditScores.experian?.score || 650
      )

      expect(outcome.scoreImprovement.minimum).toBeGreaterThan(0)
      expect(outcome.scoreImprovement.maximum).toBeLessThan(200) // Realistic maximum
      expect(outcome.confidence).toBeGreaterThanOrEqual(0)
      expect(outcome.confidence).toBeLessThanOrEqual(1)
    })

    it('should provide reasonable timeframe estimates', async () => {
      const outcome = await strategyEngine.calculateExpectedOutcome(
        mockCreditData.negativeItems,
        650
      )

      expect(outcome.timeframe).toMatch(/\d+(-\d+)?\s+(months|weeks)/i)
    })

    it('should factor in item impact scores', async () => {
      const highImpactItems = mockCreditData.negativeItems.map(item => ({
        ...item,
        impactScore: 90
      }))

      const lowImpactItems = mockCreditData.negativeItems.map(item => ({
        ...item,
        impactScore: 20
      }))

      const highImpactOutcome = await strategyEngine.calculateExpectedOutcome(highImpactItems, 650)
      const lowImpactOutcome = await strategyEngine.calculateExpectedOutcome(lowImpactItems, 650)

      expect(highImpactOutcome.scoreImprovement.expected).toBeGreaterThan(
        lowImpactOutcome.scoreImprovement.expected
      )
    })
  })

  describe('error handling', () => {
    it('should handle empty negative items array', async () => {
      const emptyData = {
        ...mockCreditData,
        negativeItems: []
      }

      const strategy = await strategyEngine.generateDisputeStrategy(emptyData)

      expect(strategy.prioritizedItems).toHaveLength(0)
      expect(strategy.overallStrategy).toContain('no negative items')
    })

    it('should handle missing credit scores', async () => {
      const noScoreData = {
        ...mockCreditData,
        creditScores: {}
      }

      const strategy = await strategyEngine.generateDisputeStrategy(noScoreData)

      expect(strategy).toBeDefined()
      expect(strategy.expectedOutcome.scoreImprovement.expected).toBeGreaterThan(0)
    })

    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      const { supabase } = require('@/lib/supabase/client')
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Database connection failed')
          })
        })
      })

      const strategy = await strategyEngine.generateDisputeStrategy(mockCreditData)

      expect(strategy).toBeDefined()
      // Should still work with default success rates
    })
  })

  describe('performance', () => {
    it('should complete strategy generation within reasonable time', async () => {
      const startTime = Date.now()
      
      await strategyEngine.generateDisputeStrategy(mockCreditData)
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(5000) // 5 seconds max
    })

    it('should handle large numbers of negative items efficiently', async () => {
      const manyItems = Array(20).fill(null).map((_, index) => ({
        ...mockCreditData.negativeItems[0],
        id: `neg_${index}`,
        amount: Math.random() * 1000,
        impactScore: Math.random() * 100
      }))

      const largeData = {
        ...mockCreditData,
        negativeItems: manyItems
      }

      const startTime = Date.now()
      const strategy = await strategyEngine.generateDisputeStrategy(largeData)
      const duration = Date.now() - startTime

      expect(strategy.prioritizedItems.length).toBe(20)
      expect(duration).toBeLessThan(10000) // 10 seconds max for large dataset
    })
  })
})