/**
 * Unit tests for EnhancedCreditAnalyzer
 * Tests enhanced analysis with validation pipeline
 */

import { EnhancedCreditAnalyzer, EnhancedAnalysisResult } from '../enhancedCreditAnalyzer'
import { ConsensusResult } from '../consensusEngine'
import { EnhancedCreditReportData } from '@/types/enhanced-credit'

// Mock dependencies
jest.mock('../consensusEngine', () => ({
  consensusEngine: {
    analyzeWithConsensus: jest.fn()
  }
}))

jest.mock('../validationSystem', () => ({
  validationSystem: {
    validateAnalysis: jest.fn()
  }
}))

jest.mock('../creditAnalyzer', () => ({
  CreditAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeReport: jest.fn()
  }))
}))

describe('EnhancedCreditAnalyzer', () => {
  let analyzer: EnhancedCreditAnalyzer
  const mockDocumentText = 'Mock credit report text'
  const mockUserId = 'user123'

  const mockConsensusResult: ConsensusResult = {
    consensusData: {
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
          score: 720,
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
        balance: 1000,
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
      negativeItems: [{
        id: 'neg_1',
        type: 'late_payment',
        creditorName: 'Test Bank',
        standardizedCreditorName: 'Test Bank',
        amount: 50,
        date: '2023-12-01',
        status: 'active',
        description: 'Late payment',
        disputeReasons: [],
        impactScore: 30,
        bureauReporting: ['experian'],
        ageInYears: 0.2,
        confidence: 0.8,
        verified: false,
        lastValidated: '2024-01-15T00:00:00Z'
      }],
      inquiries: [],
      publicRecords: [],
      extractionMetadata: {
        extractionTimestamp: new Date(),
        aiModelsUsed: ['gemini-primary'],
        confidenceScores: { 'gemini-primary': 0.9 },
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
        provider: 'consensus',
        processingNotes: []
      },
      crossReferenceData: {
        duplicateAccounts: [],
        inconsistentData: [],
        missingData: [],
        correlationScore: 0.9,
        verificationStatus: {}
      }
    },
    overallConfidence: 85,
    modelResults: [],
    consensusMetadata: {
      modelsUsed: ['gemini-primary'],
      consensusMethod: 'confidence_weighted',
      agreementScore: 0.9,
      conflictResolution: [],
      totalProcessingTime: 1000,
      timestamp: new Date()
    },
    validationResults: []
  }

  const mockValidationResults = [{
    overallScore: 85,
    extractionQuality: 0.9,
    formatCompliance: 0.8,
    legalCompliance: 0.9,
    issues: [],
    recommendations: []
  }]

  beforeEach(() => {
    analyzer = new EnhancedCreditAnalyzer()
    
    // Setup mocks
    const { consensusEngine } = require('../consensusEngine')
    const { validationSystem } = require('../validationSystem')
    
    consensusEngine.analyzeWithConsensus.mockResolvedValue(mockConsensusResult)
    validationSystem.validateAnalysis.mockResolvedValue(mockValidationResults)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('analyzeReport', () => {
    it('should perform enhanced analysis successfully', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      expect(result).toBeDefined()
      expect(result.extractedData).toBeDefined()
      expect(result.consensusResult).toBeDefined()
      expect(result.validationResults).toBeDefined()
      expect(result.qualityMetrics).toBeDefined()
      expect(result.recommendations).toBeDefined()
      expect(result.scoreAnalysis).toBeDefined()
      expect(result.summary).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.processingTime).toBeGreaterThan(0)
    })

    it('should calculate quality metrics correctly', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      expect(result.qualityMetrics).toMatchObject({
        dataCompleteness: expect.any(Number),
        dataAccuracy: expect.any(Number),
        consistencyScore: expect.any(Number),
        validationScore: expect.any(Number),
        overallQuality: expect.any(Number),
        extractionQuality: expect.any(Number),
        crossValidationScore: expect.any(Number),
        bureauConsistency: expect.any(Number),
        temporalConsistency: expect.any(Number)
      })

      // All metrics should be between 0 and 1
      Object.values(result.qualityMetrics).forEach(metric => {
        expect(metric).toBeGreaterThanOrEqual(0)
        expect(metric).toBeLessThanOrEqual(1)
      })
    })

    it('should generate enhanced recommendations', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      expect(result.recommendations).toBeDefined()
      expect(Array.isArray(result.recommendations)).toBe(true)
      
      if (result.recommendations.length > 0) {
        const recommendation = result.recommendations[0]
        expect(recommendation).toMatchObject({
          negativeItemId: expect.any(String),
          priority: expect.stringMatching(/^(high|medium|low)$/),
          disputeReason: expect.any(String),
          legalBasis: expect.any(String),
          expectedImpact: expect.any(String),
          letterTemplate: expect.any(String),
          successProbability: expect.any(Number),
          eoscarReasonCode: expect.any(String),
          supportingEvidence: expect.any(Array),
          timelineEstimate: expect.any(String),
          alternativeStrategies: expect.any(Array),
          riskFactors: expect.any(Array)
        })
      }
    })

    it('should perform enhanced score analysis', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      expect(result.scoreAnalysis).toMatchObject({
        currentScore: expect.any(Number),
        factors: expect.any(Array),
        improvementPotential: expect.any(Number),
        timelineEstimate: expect.any(String),
        scoreRange: expect.stringMatching(/^(excellent|good|fair|poor|very_poor)$/),
        bureauComparison: expect.any(Object),
        historicalTrend: expect.any(Object),
        impactProjections: expect.any(Array)
      })

      // Validate score factors
      result.scoreAnalysis.factors.forEach(factor => {
        expect(factor).toMatchObject({
          factor: expect.any(String),
          impact: expect.stringMatching(/^(positive|negative|neutral)$/),
          weight: expect.any(Number),
          description: expect.any(String),
          currentValue: expect.any(String),
          optimalValue: expect.any(String),
          improvementActions: expect.any(Array),
          timeToImprove: expect.any(String)
        })
      })
    })

    it('should generate comprehensive summary', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      expect(result.summary).toBeDefined()
      expect(typeof result.summary).toBe('string')
      expect(result.summary.length).toBeGreaterThan(50)
    })

    it('should calculate final confidence score', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(100)
    })

    it('should create legacy compatibility result', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      expect(result.legacyResult).toBeDefined()
      expect(result.legacyResult).toMatchObject({
        extractedData: expect.any(Object),
        recommendations: expect.any(Array),
        scoreAnalysis: expect.any(Object),
        summary: expect.any(String),
        confidence: expect.any(Number),
        processingTime: expect.any(Number)
      })
    })

    it('should fallback to legacy analyzer on failure', async () => {
      const { consensusEngine } = require('../consensusEngine')
      const { CreditAnalyzer } = require('../creditAnalyzer')
      
      // Mock consensus engine to fail
      consensusEngine.analyzeWithConsensus.mockRejectedValue(new Error('Consensus failed'))
      
      // Mock legacy analyzer
      const mockLegacyResult = {
        extractedData: { personalInfo: { name: 'John Doe' } },
        recommendations: [],
        scoreAnalysis: { currentScore: 720 },
        summary: 'Legacy analysis',
        confidence: 80,
        processingTime: 500
      }
      
      CreditAnalyzer.mockImplementation(() => ({
        analyzeReport: jest.fn().mockResolvedValue(mockLegacyResult)
      }))

      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      expect(result).toBeDefined()
      expect(result.legacyResult).toMatchObject(mockLegacyResult)
    })
  })

  describe('recommendation generation', () => {
    it('should prioritize recommendations correctly', async () => {
      // Add multiple negative items with different impact scores
      const enhancedConsensusResult = {
        ...mockConsensusResult,
        consensusData: {
          ...mockConsensusResult.consensusData,
          negativeItems: [
            {
              ...mockConsensusResult.consensusData.negativeItems[0],
              id: 'neg_1',
              impactScore: 80,
              type: 'charge_off'
            },
            {
              ...mockConsensusResult.consensusData.negativeItems[0],
              id: 'neg_2',
              impactScore: 30,
              type: 'late_payment'
            },
            {
              ...mockConsensusResult.consensusData.negativeItems[0],
              id: 'neg_3',
              impactScore: 60,
              type: 'collection'
            }
          ]
        }
      }

      const { consensusEngine } = require('../consensusEngine')
      consensusEngine.analyzeWithConsensus.mockResolvedValue(enhancedConsensusResult)

      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      expect(result.recommendations.length).toBe(3)
      
      // Should be sorted by priority and success probability
      const priorities = result.recommendations.map(r => r.priority)
      const highPriorityCount = priorities.filter(p => p === 'high').length
      const mediumPriorityCount = priorities.filter(p => p === 'medium').length
      const lowPriorityCount = priorities.filter(p => p === 'low').length
      
      expect(highPriorityCount + mediumPriorityCount + lowPriorityCount).toBe(3)
    })

    it('should generate EOSCAR reason codes', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      if (result.recommendations.length > 0) {
        result.recommendations.forEach(rec => {
          expect(rec.eoscarReasonCode).toBeDefined()
          expect(rec.eoscarReasonCode).toMatch(/^\d{2}$/) // Two digit code
        })
      }
    })

    it('should calculate success probabilities', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      if (result.recommendations.length > 0) {
        result.recommendations.forEach(rec => {
          expect(rec.successProbability).toBeGreaterThanOrEqual(10)
          expect(rec.successProbability).toBeLessThanOrEqual(95)
        })
      }
    })

    it('should generate supporting evidence', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      if (result.recommendations.length > 0) {
        result.recommendations.forEach(rec => {
          expect(rec.supportingEvidence).toBeDefined()
          expect(Array.isArray(rec.supportingEvidence)).toBe(true)
          expect(rec.supportingEvidence.length).toBeGreaterThan(0)
        })
      }
    })
  })

  describe('score analysis', () => {
    it('should analyze payment history factor', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      const paymentHistoryFactor = result.scoreAnalysis.factors.find(f => f.factor === 'Payment History')
      expect(paymentHistoryFactor).toBeDefined()
      expect(paymentHistoryFactor?.weight).toBe(35)
      expect(paymentHistoryFactor?.impact).toMatch(/^(positive|negative|neutral)$/)
    })

    it('should analyze credit utilization factor', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      const utilizationFactor = result.scoreAnalysis.factors.find(f => f.factor === 'Credit Utilization')
      expect(utilizationFactor).toBeDefined()
      expect(utilizationFactor?.weight).toBe(30)
    })

    it('should calculate improvement potential', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      expect(result.scoreAnalysis.improvementPotential).toBeGreaterThanOrEqual(0)
      expect(result.scoreAnalysis.improvementPotential).toBeLessThanOrEqual(150) // Max realistic improvement
    })

    it('should determine score range correctly', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      const validRanges = ['excellent', 'good', 'fair', 'poor', 'very_poor']
      expect(validRanges).toContain(result.scoreAnalysis.scoreRange)
    })

    it('should generate bureau comparison', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      expect(result.scoreAnalysis.bureauComparison).toBeDefined()
      expect(result.scoreAnalysis.bureauComparison.variance).toBeGreaterThanOrEqual(0)
      expect(['high', 'medium', 'low']).toContain(result.scoreAnalysis.bureauComparison.consistency)
    })
  })

  describe('error handling', () => {
    it('should handle validation system failure', async () => {
      const { validationSystem } = require('../validationSystem')
      validationSystem.validateAnalysis.mockRejectedValue(new Error('Validation failed'))

      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      expect(result).toBeDefined()
      expect(result.validationResults).toBeDefined()
    })

    it('should handle empty document text', async () => {
      await expect(analyzer.analyzeReport('', mockUserId))
        .rejects.toThrow()
    })

    it('should handle missing user ID', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText)

      expect(result).toBeDefined()
      // Should still work without user ID
    })
  })

  describe('performance', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now()
      
      await analyzer.analyzeReport(mockDocumentText, mockUserId)
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(10000) // 10 seconds max for unit test
    })

    it('should track processing time accurately', async () => {
      const result = await analyzer.analyzeReport(mockDocumentText, mockUserId)

      expect(result.processingTime).toBeGreaterThan(0)
      expect(result.processingTime).toBeLessThan(10000)
    })
  })
})