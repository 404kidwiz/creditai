import { integratedDisputePrioritization } from '../integratedDisputePrioritization'
import { CreditReportData } from '../creditAnalyzer'

describe('IntegratedDisputePrioritization', () => {
  const mockCreditReport: CreditReportData = {
    personalInfo: {
      name: 'John Doe',
      address: '123 Main St, Anytown, USA'
    },
    creditScores: {
      experian: { score: 620, bureau: 'experian', date: '2025-01-20', scoreRange: { min: 300, max: 850 } },
      equifax: { score: 615, bureau: 'equifax', date: '2025-01-20', scoreRange: { min: 300, max: 850 } },
      transunion: { score: 625, bureau: 'transunion', date: '2025-01-20', scoreRange: { min: 300, max: 850 } }
    },
    accounts: [],
    negativeItems: [
      {
        id: 'neg1',
        type: 'collection',
        creditorName: 'ABC Collections',
        amount: 1500,
        date: '2023-01-15',
        status: 'Active',
        description: 'Medical debt collection',
        disputeReasons: ['not_mine', 'inaccurate_balance'],
        impactScore: 75
      },
      {
        id: 'neg2',
        type: 'late_payment',
        creditorName: 'Credit Card Co',
        accountNumber: '****1234',
        amount: 0,
        date: '2024-06-01',
        status: '90 days late',
        description: 'Late payment on credit card',
        disputeReasons: ['inaccurate_payment_history'],
        impactScore: 45
      },
      {
        id: 'neg3',
        type: 'charge_off',
        creditorName: 'Auto Lender',
        accountNumber: '****5678',
        amount: 5000,
        date: '2022-03-01',
        status: 'Charged Off',
        description: 'Auto loan charge-off',
        disputeReasons: ['paid_in_full'],
        impactScore: 90
      },
      {
        id: 'neg4',
        type: 'judgment',
        creditorName: 'County Court',
        amount: 2500,
        date: '2021-01-01',
        status: 'Satisfied',
        description: 'Civil judgment - satisfied',
        disputeReasons: ['outdated', 'satisfied'],
        impactScore: 60
      }
    ],
    inquiries: [],
    publicRecords: []
  }

  const mockUserProfile = {
    userId: 'user123',
    targetScore: 700,
    urgentNeed: false,
    timeHorizon: 'medium_term' as const,
    riskTolerance: 'moderate' as const,
    timeAvailable: 'moderate' as const,
    budget: 1000,
    followUpCapacity: 'moderate' as const,
    organizationLevel: 'medium' as const,
    techSavvy: true
  }

  describe('Dispute Strategy Creation', () => {
    it('should create comprehensive dispute strategy', async () => {
      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        mockUserProfile
      )

      expect(strategy).toHaveProperty('prioritizedDisputes')
      expect(strategy).toHaveProperty('strategyMetrics')
      expect(strategy).toHaveProperty('timeline')
      expect(strategy).toHaveProperty('resourceAllocation')
      expect(strategy).toHaveProperty('expectedOutcomes')
      expect(strategy).toHaveProperty('riskAssessment')
      expect(strategy).toHaveProperty('alternativeStrategies')

      expect(strategy.prioritizedDisputes.length).toBe(4)
      expect(strategy.strategyMetrics.totalDisputes).toBe(4)
    })

    it('should prioritize disputes correctly', async () => {
      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        mockUserProfile
      )

      // Check that disputes are prioritized
      const priorities = strategy.prioritizedDisputes.map(d => d.priorityRank)
      expect(priorities).toEqual([1, 2, 3, 4])

      // High impact items should have higher priority
      const highImpactItem = strategy.prioritizedDisputes.find(
        d => d.negativeItem.id === 'neg3' // Auto loan charge-off with 90 impact
      )
      expect(highImpactItem?.priorityTier).toMatch(/critical|high/)
    })

    it('should create timeline with phases', async () => {
      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        mockUserProfile
      )

      expect(strategy.timeline.phases.length).toBeGreaterThan(0)
      expect(strategy.timeline.phases[0]).toHaveProperty('phase')
      expect(strategy.timeline.phases[0]).toHaveProperty('startWeek')
      expect(strategy.timeline.phases[0]).toHaveProperty('duration')
      expect(strategy.timeline.phases[0]).toHaveProperty('disputes')

      // Should have milestones
      expect(strategy.timeline.milestones.length).toBeGreaterThan(0)
      expect(strategy.timeline.milestones[0]).toHaveProperty('name')
      expect(strategy.timeline.milestones[0]).toHaveProperty('targetDate')
    })

    it('should calculate resource allocation', async () => {
      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        mockUserProfile
      )

      const resources = strategy.resourceAllocation

      expect(resources.timeRequired.totalHours).toBeGreaterThan(0)
      expect(resources.timeRequired.weeklyHours).toBe(8) // moderate availability
      expect(resources.documentationNeeded).toBeInstanceOf(Array)
      expect(resources.budgetEstimate).toHaveProperty('expected')
      expect(resources.budgetEstimate.expected).toBeGreaterThan(0)
      expect(resources.effortDistribution.research).toBe(25)
      expect(resources.effortDistribution.documentation).toBe(35)
    })

    it('should project expected outcomes', async () => {
      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        mockUserProfile
      )

      const outcomes = strategy.expectedOutcomes

      expect(outcomes.bestCase.successfulDisputes).toBeGreaterThan(outcomes.worstCase.successfulDisputes)
      expect(outcomes.bestCase.scoreImprovement).toBeGreaterThan(outcomes.worstCase.scoreImprovement)
      expect(outcomes.likelyCase.confidence).toBe(0.60)
      expect(outcomes.probabilityDistribution).toBeInstanceOf(Array)
      expect(outcomes.probabilityDistribution.length).toBeGreaterThan(0)
    })

    it('should assess risks', async () => {
      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        mockUserProfile
      )

      const risks = strategy.riskAssessment

      expect(risks.overallRisk).toMatch(/low|medium|high/)
      expect(risks.riskFactors).toBeInstanceOf(Array)
      expect(risks.mitigationStrategies).toBeInstanceOf(Array)
      expect(risks.contingencyPlans).toBeInstanceOf(Array)
    })

    it('should generate alternative strategies', async () => {
      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        mockUserProfile
      )

      expect(strategy.alternativeStrategies.length).toBeGreaterThan(0)
      
      const quickWins = strategy.alternativeStrategies.find(s => s.name === 'Quick Wins First')
      expect(quickWins).toBeDefined()
      expect(quickWins?.effectiveness).toBeGreaterThan(0)
      expect(quickWins?.tradeoffs).toBeInstanceOf(Array)
    })
  })

  describe('Strategy Customization', () => {
    it('should prioritize speed when requested', async () => {
      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        mockUserProfile,
        { prioritizeSpeed: true }
      )

      // Should focus on quicker disputes
      const immediateDisputes = strategy.prioritizedDisputes.filter(
        d => d.timing.priority === 'immediate'
      )
      expect(immediateDisputes.length).toBeGreaterThan(0)
    })

    it('should maximize impact when requested', async () => {
      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        mockUserProfile,
        { maximizeImpact: true }
      )

      // High impact disputes should be prioritized
      const highImpactFirst = strategy.prioritizedDisputes[0]
      expect(highImpactFirst.estimatedImpact.oneYear).toBeGreaterThanOrEqual(60)
    })

    it('should minimize risk when requested', async () => {
      const riskAverseProfile = {
        ...mockUserProfile,
        riskTolerance: 'conservative' as const
      }

      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        riskAverseProfile,
        { minimizeRisk: true }
      )

      // Should prefer disputes with higher success probability
      const topDisputes = strategy.prioritizedDisputes.slice(0, 2)
      topDisputes.forEach(dispute => {
        expect(dispute.successProbability).toBeGreaterThan(0.5)
      })
    })
  })

  describe('Budget Considerations', () => {
    it('should adjust strategy for low budget', async () => {
      const lowBudgetProfile = {
        ...mockUserProfile,
        budget: 200
      }

      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        lowBudgetProfile
      )

      expect(strategy.resourceAllocation.budgetEstimate.expected).toBeLessThan(500)
      
      // Should not include pay-for-delete strategy
      const payForDelete = strategy.alternativeStrategies.find(
        s => s.name.includes('Pay-for-Delete')
      )
      expect(payForDelete).toBeUndefined()
    })

    it('should include advanced strategies for high budget', async () => {
      const highBudgetProfile = {
        ...mockUserProfile,
        budget: 5000
      }

      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        highBudgetProfile
      )

      // Should include professional legal representation option
      const legalOption = strategy.alternativeStrategies.find(
        s => s.name.includes('Legal Representation')
      )
      expect(legalOption).toBeDefined()
      expect(legalOption?.effectiveness).toBeGreaterThan(0.9)
    })
  })

  describe('Timeline Management', () => {
    it('should create appropriate timeline for urgent needs', async () => {
      const urgentProfile = {
        ...mockUserProfile,
        urgentNeed: true,
        timeHorizon: 'immediate' as const
      }

      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        urgentProfile
      )

      // First phase should start immediately
      expect(strategy.timeline.phases[0].startWeek).toBe(0)
      
      // More disputes should be marked as immediate
      const immediateDisputes = strategy.prioritizedDisputes.filter(
        d => d.timing.priority === 'immediate'
      )
      expect(immediateDisputes.length).toBeGreaterThan(1)
    })

    it('should space out disputes for non-urgent needs', async () => {
      const relaxedProfile = {
        ...mockUserProfile,
        urgentNeed: false,
        timeHorizon: 'long_term' as const
      }

      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        relaxedProfile
      )

      // Phases should be spread out
      expect(strategy.timeline.phases.length).toBeGreaterThanOrEqual(2)
      if (strategy.timeline.phases.length > 1) {
        expect(strategy.timeline.phases[1].startWeek).toBeGreaterThan(0)
      }
    })
  })

  describe('Success Metrics', () => {
    it('should calculate realistic success metrics', async () => {
      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        mockUserProfile
      )

      const metrics = strategy.strategyMetrics

      expect(metrics.expectedSuccessRate).toBeGreaterThan(0)
      expect(metrics.expectedSuccessRate).toBeLessThanOrEqual(1)
      expect(metrics.estimatedScoreImprovement).toBeGreaterThan(0)
      expect(metrics.confidenceLevel).toBeGreaterThan(0)
      expect(metrics.confidenceLevel).toBeLessThanOrEqual(1)
      expect(metrics.resourceEfficiency).toBeGreaterThan(0)
      expect(metrics.timeToCompletion).toBeGreaterThan(0)
    })
  })

  describe('Required Evidence', () => {
    it('should identify required evidence for each dispute', async () => {
      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        mockUserProfile
      )

      strategy.prioritizedDisputes.forEach(dispute => {
        expect(dispute.requiredEvidence).toBeInstanceOf(Array)
        expect(dispute.requiredEvidence.length).toBeGreaterThan(0)
        
        // Should always require identity verification
        const identityEvidence = dispute.requiredEvidence.find(
          e => e.type === 'Identity Verification'
        )
        expect(identityEvidence).toBeDefined()
      })
    })

    it('should identify specific evidence for collection disputes', async () => {
      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        mockUserProfile
      )

      const collectionDispute = strategy.prioritizedDisputes.find(
        d => d.negativeItem.type === 'collection'
      )

      expect(collectionDispute).toBeDefined()
      
      const debtValidation = collectionDispute?.requiredEvidence.find(
        e => e.type === 'Debt Validation'
      )
      expect(debtValidation).toBeDefined()
    })
  })

  describe('Dispute Approaches', () => {
    it('should recommend appropriate dispute approaches', async () => {
      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        mockUserProfile
      )

      strategy.prioritizedDisputes.forEach(dispute => {
        expect(dispute.recommendedApproach).toHaveProperty('method')
        expect(dispute.recommendedApproach).toHaveProperty('bureaus')
        expect(dispute.recommendedApproach).toHaveProperty('template')
        expect(dispute.recommendedApproach).toHaveProperty('customization')
        expect(dispute.recommendedApproach).toHaveProperty('followUpStrategy')

        // Bureaus should be valid
        dispute.recommendedApproach.bureaus.forEach(bureau => {
          expect(['experian', 'equifax', 'transunion']).toContain(bureau)
        })
      })
    })

    it('should use validation approach for collections with low success probability', async () => {
      const strategy = await integratedDisputePrioritization.createDisputeStrategy(
        mockCreditReport,
        mockUserProfile
      )

      const collectionDispute = strategy.prioritizedDisputes.find(
        d => d.negativeItem.type === 'collection'
      )

      // If success probability is low, might recommend validation
      if (collectionDispute && collectionDispute.successProbability < 0.5) {
        expect(collectionDispute.recommendedApproach.method).toBe('validation')
      }
    })
  })
})