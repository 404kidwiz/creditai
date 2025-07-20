/**
 * Unit tests for ConsensusEngine
 * Tests multi-model AI analysis and consensus generation
 */

import { ConsensusEngine, ModelAnalysisResult, ConsensusResult } from '../consensusEngine'
import { EnhancedCreditReportData } from '@/types/enhanced-credit'

// Mock Google AI
const mockGenerateContent = jest.fn()
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent
    })
  }))
}))

// Mock validation system
jest.mock('../validationSystem', () => ({
  validationSystem: {
    validateAnalysis: jest.fn().mockResolvedValue([{
      overallScore: 85,
      accuracy: {
        textExtraction: 85,
        dataParsing: 90,
        aiAnalysis: 88,
        providerDetection: 80
      },
      dataQuality: {
        personalInfo: 90,
        creditScore: 50,
        accounts: 60,
        negativeItems: 80,
        inquiries: 75,
        publicRecords: 70
      },
      issues: [],
      recommendations: [
        'Consensus analysis completed successfully',
        'Used 2 AI models for cross-validation',
        'High confidence in extracted data due to multi-model agreement'
      ],
      validatedAt: new Date(),
      validatedBy: 'ConsensusEngine'
    }])
  }
}))

describe('ConsensusEngine', () => {
  let consensusEngine: ConsensusEngine
  const mockDocumentText = `
    CREDIT REPORT
    Name: John Doe
    Address: 123 Main St, Anytown, ST 12345
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

  beforeEach(() => {
    // Mock environment variable
    process.env.GOOGLE_AI_API_KEY = 'test-api-key'
    
    // Setup default mock response
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          personalInfo: {
            name: 'John Doe',
            address: '123 Main St, Anytown, ST 12345'
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
    })
    
    consensusEngine = new ConsensusEngine()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('analyzeWithConsensus', () => {
    it('should analyze document with multiple models and generate consensus', async () => {
      const result = await consensusEngine.analyzeWithConsensus(mockDocumentText)

      expect(result).toBeDefined()
      expect(result.consensusData).toBeDefined()
      expect(result.overallConfidence).toBeGreaterThan(0)
      expect(result.modelResults).toHaveLength(3) // Primary, secondary, validator
      expect(result.consensusMetadata).toBeDefined()
      expect(result.validationResults).toBeDefined()
    })

    it('should handle single model failure gracefully', async () => {
      // Mock one model to fail
      const mockError = new Error('Model timeout')
      const originalGenerateContent = jest.fn()
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify({ personalInfo: { name: 'John Doe' } }) }
        })
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify({ personalInfo: { name: 'John Doe' } }) }
        })

      require('@google/generative-ai').GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: originalGenerateContent
        })
      }))

      const result = await consensusEngine.analyzeWithConsensus(mockDocumentText)

      expect(result).toBeDefined()
      expect(result.modelResults.some(r => r.errors.length > 0)).toBe(true)
      expect(result.overallConfidence).toBeGreaterThan(0)
    })

    it('should throw error when all models fail', async () => {
      // Mock all models to fail
      require('@google/generative-ai').GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockRejectedValue(new Error('All models failed'))
        })
      }))

      await expect(consensusEngine.analyzeWithConsensus(mockDocumentText))
        .rejects.toThrow('All AI models failed to analyze the document')
    })

    it('should calculate confidence scores correctly', async () => {
      const result = await consensusEngine.analyzeWithConsensus(mockDocumentText)

      expect(result.overallConfidence).toBeGreaterThanOrEqual(0)
      expect(result.overallConfidence).toBeLessThanOrEqual(100)
      expect(result.consensusMetadata.agreementScore).toBeGreaterThanOrEqual(0)
      expect(result.consensusMetadata.agreementScore).toBeLessThanOrEqual(1)
    })

    it('should generate consensus metadata', async () => {
      const result = await consensusEngine.analyzeWithConsensus(mockDocumentText)

      expect(result.consensusMetadata).toMatchObject({
        modelsUsed: expect.any(Array),
        consensusMethod: 'confidence_weighted',
        agreementScore: expect.any(Number),
        conflictResolution: expect.any(Array),
        totalProcessingTime: expect.any(Number),
        timestamp: expect.any(Date)
      })
    })
  })

  describe('consensus generation', () => {
    it('should merge personal info from multiple models', async () => {
      const result = await consensusEngine.analyzeWithConsensus(mockDocumentText)

      expect(result.consensusData.personalInfo).toBeDefined()
      expect(result.consensusData.personalInfo.name).toBe('John Doe')
      expect(result.consensusData.personalInfo.nameConfidence).toBeGreaterThan(0)
    })

    it('should average credit scores from multiple models', async () => {
      const result = await consensusEngine.analyzeWithConsensus(mockDocumentText)

      expect(result.consensusData.creditScores).toBeDefined()
      if (result.consensusData.creditScores.experian) {
        expect(result.consensusData.creditScores.experian.score).toBe(720)
        expect(result.consensusData.creditScores.experian.confidence).toBeGreaterThan(0)
      }
    })

    it('should deduplicate accounts across models', async () => {
      const result = await consensusEngine.analyzeWithConsensus(mockDocumentText)

      expect(result.consensusData.accounts).toBeDefined()
      expect(Array.isArray(result.consensusData.accounts)).toBe(true)
      
      // Should not have duplicate accounts with same creditor and account number
      const accountKeys = result.consensusData.accounts.map(acc => 
        `${acc.creditorName.toLowerCase()}_${acc.accountNumber}`
      )
      const uniqueKeys = new Set(accountKeys)
      expect(accountKeys.length).toBe(uniqueKeys.size)
    })

    it('should handle conflicting data appropriately', async () => {
      // Mock models returning different data
      const mockResponses = [
        JSON.stringify({ personalInfo: { name: 'John Doe' } }),
        JSON.stringify({ personalInfo: { name: 'John Smith' } }),
        JSON.stringify({ personalInfo: { name: 'John Doe' } })
      ]

      let callCount = 0
      require('@google/generative-ai').GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockImplementation(() => 
            Promise.resolve({
              response: { text: () => mockResponses[callCount++] || mockResponses[0] }
            })
          )
        })
      }))

      const result = await consensusEngine.analyzeWithConsensus(mockDocumentText)

      // Should resolve to most frequent value
      expect(result.consensusData.personalInfo.name).toBe('John Doe')
    })
  })

  describe('validation', () => {
    it('should validate consensus results', async () => {
      const result = await consensusEngine.analyzeWithConsensus(mockDocumentText)

      expect(result.validationResults).toBeDefined()
      expect(Array.isArray(result.validationResults)).toBe(true)
    })

    it('should calculate quality metrics', async () => {
      const result = await consensusEngine.analyzeWithConsensus(mockDocumentText)

      expect(result.consensusData.qualityMetrics).toBeDefined()
      expect(result.consensusData.qualityMetrics.dataCompleteness).toBeGreaterThanOrEqual(0)
      expect(result.consensusData.qualityMetrics.dataAccuracy).toBeGreaterThanOrEqual(0)
      expect(result.consensusData.qualityMetrics.overallQuality).toBeGreaterThanOrEqual(0)
    })
  })

  describe('error handling', () => {
    it('should handle malformed JSON responses', async () => {
      require('@google/generative-ai').GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockResolvedValue({
            response: { text: () => 'Invalid JSON response' }
          })
        })
      }))

      const result = await consensusEngine.analyzeWithConsensus(mockDocumentText)

      expect(result.modelResults.every(r => r.confidence === 0)).toBe(true)
    })

    it('should handle empty document text', async () => {
      await expect(consensusEngine.analyzeWithConsensus(''))
        .rejects.toThrow()
    })

    it('should handle missing API key', async () => {
      delete process.env.GOOGLE_AI_API_KEY
      
      const newEngine = new ConsensusEngine()
      
      await expect(newEngine.analyzeWithConsensus(mockDocumentText))
        .rejects.toThrow('No AI models are enabled for consensus analysis')
    })
  })

  describe('performance', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now()
      
      await consensusEngine.analyzeWithConsensus(mockDocumentText)
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(30000) // 30 seconds max
    })

    it('should process models in parallel', async () => {
      const callTimes: number[] = []
      
      require('@google/generative-ai').GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockImplementation(async () => {
            callTimes.push(Date.now())
            await new Promise(resolve => setTimeout(resolve, 100)) // Simulate processing time
            return {
              response: { text: () => JSON.stringify({ personalInfo: { name: 'John Doe' } }) }
            }
          })
        })
      }))

      await consensusEngine.analyzeWithConsensus(mockDocumentText)

      // All calls should start within a short time window (parallel execution)
      const timeSpread = Math.max(...callTimes) - Math.min(...callTimes)
      expect(timeSpread).toBeLessThan(500) // 500ms window
    })
  })
})