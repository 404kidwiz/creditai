import { aiFeedbackIntegration } from '../feedbackIntegration'
import { CreditReportData } from '../creditAnalyzer'
import { DisputeRecommendation } from '../disputeLetterGenerator'

describe('AIFeedbackIntegration', () => {
  describe('Feedback Session Management', () => {
    it('should start a new feedback session', async () => {
      const session = await aiFeedbackIntegration.startFeedbackSession(
        'user123',
        'analysis456',
        'experian_standard'
      )

      expect(session.id).toBeDefined()
      expect(session.userId).toBe('user123')
      expect(session.analysisId).toBe('analysis456')
      expect(session.reportType).toBe('experian_standard')
      expect(session.startedAt).toBeInstanceOf(Date)
      expect(session.feedbackItems).toEqual([])
    })
  })

  describe('Extraction Feedback Collection', () => {
    it('should collect feedback on personal info corrections', async () => {
      const extractedData: Partial<CreditReportData> = {
        personalInfo: {
          name: 'John Do', // Typo
          address: '123 Main St'
        }
      }

      const corrections: Partial<CreditReportData> = {
        personalInfo: {
          name: 'John Doe', // Corrected
          address: '123 Main St'
        }
      }

      const feedbackItems = await aiFeedbackIntegration.collectExtractionFeedback(
        'session123',
        extractedData as CreditReportData,
        corrections
      )

      expect(feedbackItems.length).toBe(1)
      expect(feedbackItems[0].type).toBe('personal_info_accuracy')
      expect(feedbackItems[0].targetField).toBe('personalInfo.name')
      expect(feedbackItems[0].originalValue).toBe('John Do')
      expect(feedbackItems[0].correctedValue).toBe('John Doe')
      expect(feedbackItems[0].feedback).toBe('partial') // Similar names
    })

    it('should collect feedback on credit score corrections', async () => {
      const extractedData: Partial<CreditReportData> = {
        creditScores: {
          experian: {
            score: 750,
            bureau: 'experian',
            date: '2025-01-20',
            scoreRange: { min: 300, max: 850 }
          }
        }
      }

      const corrections: Partial<CreditReportData> = {
        creditScores: {
          experian: {
            score: 780, // 30 point difference
            bureau: 'experian',
            date: '2025-01-20',
            scoreRange: { min: 300, max: 850 }
          }
        }
      }

      const feedbackItems = await aiFeedbackIntegration.collectExtractionFeedback(
        'session123',
        extractedData as CreditReportData,
        corrections
      )

      expect(feedbackItems.length).toBe(1)
      expect(feedbackItems[0].type).toBe('score_accuracy')
      expect(feedbackItems[0].originalValue).toBe(750)
      expect(feedbackItems[0].correctedValue).toBe(780)
      expect(feedbackItems[0].feedback).toBe('incorrect')
      expect(feedbackItems[0].severity).toBe('moderate') // 30 point difference
    })

    it('should collect feedback on missing accounts', async () => {
      const extractedData: Partial<CreditReportData> = {
        accounts: [
          {
            id: 'acc1',
            creditorName: 'Bank A',
            accountNumber: '****1234',
            accountType: 'credit_card',
            balance: 1000,
            status: 'open',
            openDate: '2020-01-01',
            lastReported: '2025-01-01',
            paymentHistory: [],
            bureaus: ['experian']
          }
        ]
      }

      const corrections: Partial<CreditReportData> = {
        accounts: [
          {
            id: 'acc1',
            creditorName: 'Bank A',
            accountNumber: '****1234',
            accountType: 'credit_card',
            balance: 1000,
            status: 'open',
            openDate: '2020-01-01',
            lastReported: '2025-01-01',
            paymentHistory: [],
            bureaus: ['experian']
          },
          {
            id: 'acc2',
            creditorName: 'Bank B',
            accountNumber: '****5678',
            accountType: 'auto_loan',
            balance: 15000,
            status: 'open',
            openDate: '2021-01-01',
            lastReported: '2025-01-01',
            paymentHistory: [],
            bureaus: ['experian']
          }
        ]
      }

      const feedbackItems = await aiFeedbackIntegration.collectExtractionFeedback(
        'session123',
        extractedData as CreditReportData,
        corrections
      )

      expect(feedbackItems.some(item => 
        item.type === 'account_detection' && 
        item.feedback === 'incorrect' &&
        item.severity === 'major'
      )).toBe(true)
    })

    it('should collect feedback on creditor name corrections', async () => {
      const extractedData: Partial<CreditReportData> = {
        accounts: [
          {
            id: 'acc1',
            creditorName: 'BOA', // Abbreviation
            accountNumber: '****1234',
            accountType: 'credit_card',
            balance: 1000,
            status: 'open',
            openDate: '2020-01-01',
            lastReported: '2025-01-01',
            paymentHistory: [],
            bureaus: ['experian']
          }
        ]
      }

      const corrections: Partial<CreditReportData> = {
        accounts: [
          {
            id: 'acc1',
            creditorName: 'Bank of America', // Full name
            accountNumber: '****1234',
            accountType: 'credit_card',
            balance: 1000,
            status: 'open',
            openDate: '2020-01-01',
            lastReported: '2025-01-01',
            paymentHistory: [],
            bureaus: ['experian']
          }
        ]
      }

      const feedbackItems = await aiFeedbackIntegration.collectExtractionFeedback(
        'session123',
        extractedData as CreditReportData,
        corrections
      )

      expect(feedbackItems.some(item => 
        item.type === 'creditor_name_accuracy' && 
        item.feedback === 'partial' // Should recognize as similar
      )).toBe(true)
    })
  })

  describe('Dispute Feedback Collection', () => {
    it('should collect feedback on accepted recommendations', async () => {
      const recommendations: DisputeRecommendation[] = [
        {
          negativeItemId: 'neg1',
          priority: 'high',
          disputeReason: 'Inaccurate balance',
          legalBasis: 'FCRA Section 611',
          expectedImpact: '50 point improvement',
          letterTemplate: 'Template 1',
          successProbability: 80
        }
      ]

      const userActions = [
        {
          itemId: 'neg1',
          accepted: true,
          rejected: false,
          modified: false,
          comments: 'Perfect recommendation'
        }
      ]

      const feedbackItems = await aiFeedbackIntegration.collectDisputeFeedback(
        'session123',
        recommendations,
        userActions
      )

      expect(feedbackItems.length).toBe(1)
      expect(feedbackItems[0].type).toBe('dispute_recommendation')
      expect(feedbackItems[0].feedback).toBe('correct')
      expect(feedbackItems[0].confidence).toBe(100)
    })

    it('should collect feedback on modified recommendations', async () => {
      const recommendations: DisputeRecommendation[] = [
        {
          negativeItemId: 'neg1',
          priority: 'high',
          disputeReason: 'Inaccurate balance',
          legalBasis: 'FCRA Section 611',
          expectedImpact: '50 point improvement',
          letterTemplate: 'Template 1',
          successProbability: 80
        }
      ]

      const userActions = [
        {
          itemId: 'neg1',
          accepted: false,
          rejected: false,
          modified: true,
          significantChanges: true,
          comments: 'Changed dispute reason to identity theft',
          alternativeStrategy: 'Identity theft dispute'
        }
      ]

      const feedbackItems = await aiFeedbackIntegration.collectDisputeFeedback(
        'session123',
        recommendations,
        userActions
      )

      expect(feedbackItems.length).toBe(1)
      expect(feedbackItems[0].feedback).toBe('partial')
      expect(feedbackItems[0].severity).toBe('moderate')
    })

    it('should collect feedback on rejected recommendations', async () => {
      const recommendations: DisputeRecommendation[] = [
        {
          negativeItemId: 'neg1',
          priority: 'high',
          disputeReason: 'Inaccurate balance',
          legalBasis: 'FCRA Section 611',
          expectedImpact: '50 point improvement',
          letterTemplate: 'Template 1',
          successProbability: 80
        }
      ]

      const userActions = [
        {
          itemId: 'neg1',
          accepted: false,
          rejected: true,
          modified: false,
          comments: 'This account is actually correct'
        }
      ]

      const feedbackItems = await aiFeedbackIntegration.collectDisputeFeedback(
        'session123',
        recommendations,
        userActions
      )

      expect(feedbackItems.length).toBe(1)
      expect(feedbackItems[0].feedback).toBe('incorrect')
      expect(feedbackItems[0].severity).toBe('major')
      expect(feedbackItems[0].confidence).toBe(0)
    })
  })

  describe('Pattern Recognition and Learning', () => {
    it('should train pattern recognition from feedback', async () => {
      const feedbackItems = [
        // Multiple similar errors
        ...Array(6).fill(null).map((_, i) => ({
          id: `fb${i}`,
          type: 'creditor_name_accuracy' as const,
          category: 'data_extraction' as const,
          targetField: `accounts.acc${i}.creditorName`,
          originalValue: 'AMEX',
          correctedValue: 'American Express',
          confidence: 70,
          feedback: 'incorrect' as const,
          severity: 'minor' as const,
          timestamp: new Date()
        }))
      ]

      const patterns = await aiFeedbackIntegration.trainPatternRecognition(feedbackItems, 0.5)

      expect(patterns.length).toBeGreaterThan(0)
      expect(patterns[0].confidence).toBeGreaterThanOrEqual(0.5)
      expect(patterns[0].examples).toBe(6)
    })

    it('should not create patterns with insufficient examples', async () => {
      const feedbackItems = [
        // Only 2 examples (minimum is 5)
        ...Array(2).fill(null).map((_, i) => ({
          id: `fb${i}`,
          type: 'score_accuracy' as const,
          category: 'data_extraction' as const,
          targetField: 'creditScores.experian.score',
          originalValue: 700 + i,
          correctedValue: 720 + i,
          confidence: 80,
          feedback: 'incorrect' as const,
          severity: 'minor' as const,
          timestamp: new Date()
        }))
      ]

      const patterns = await aiFeedbackIntegration.trainPatternRecognition(feedbackItems)

      expect(patterns.length).toBe(0)
    })
  })

  describe('Feedback Application', () => {
    it('should apply feedback corrections to extraction', async () => {
      const originalExtraction: CreditReportData = {
        personalInfo: {
          name: 'John Do', // Typo
          address: '123 Main St'
        },
        creditScores: {
          experian: {
            score: 750,
            bureau: 'experian',
            date: '2025-01-20',
            scoreRange: { min: 300, max: 850 }
          }
        },
        accounts: [],
        negativeItems: [],
        inquiries: [],
        publicRecords: []
      }

      const feedbackItems = [
        {
          id: 'fb1',
          type: 'personal_info_accuracy' as const,
          category: 'data_extraction' as const,
          targetField: 'personalInfo.name',
          originalValue: 'John Do',
          correctedValue: 'John Doe',
          confidence: 90,
          feedback: 'incorrect' as const,
          severity: 'minor' as const,
          timestamp: new Date()
        },
        {
          id: 'fb2',
          type: 'score_accuracy' as const,
          category: 'data_extraction' as const,
          targetField: 'creditScores.experian.score',
          originalValue: 750,
          correctedValue: 780,
          confidence: 95,
          feedback: 'incorrect' as const,
          severity: 'moderate' as const,
          timestamp: new Date()
        }
      ]

      const improvedExtraction = await aiFeedbackIntegration.applyFeedbackToExtraction(
        originalExtraction,
        feedbackItems
      )

      expect(improvedExtraction.personalInfo.name).toBe('John Doe')
      expect(improvedExtraction.creditScores.experian?.score).toBe(780)
    })
  })

  describe('Feedback Metrics', () => {
    it('should calculate feedback metrics', async () => {
      const metrics = await aiFeedbackIntegration.getFeedbackMetrics('30d')

      expect(metrics).toHaveProperty('totalFeedback')
      expect(metrics).toHaveProperty('accuracyRate')
      expect(metrics).toHaveProperty('commonErrors')
      expect(metrics).toHaveProperty('improvementTrends')
      expect(metrics).toHaveProperty('userSatisfaction')
      expect(metrics).toHaveProperty('processingTime')
    })
  })

  describe('Learning Patterns', () => {
    it('should get applied learning patterns', () => {
      const patterns = aiFeedbackIntegration.getAppliedPatterns()
      
      expect(Array.isArray(patterns)).toBe(true)
    })

    it('should check if pattern applies to extraction', () => {
      // First, no pattern should apply
      let pattern = aiFeedbackIntegration.doesPatternApply('creditor_name_accuracy', 'accounts.acc1.creditorName')
      expect(pattern).toBeNull()

      // After training, pattern might apply (would need to train first in real scenario)
    })
  })

  describe('Continuous Learning', () => {
    it('should process feedback for learning when threshold is met', async () => {
      // This would require sufficient feedback in the queue
      const update = await aiFeedbackIntegration.processFeedbackForLearning(100)
      
      // With empty queue, should return null
      expect(update).toBeNull()
    })
  })
})