/**
 * Dispute Prioritizer
 * 
 * This module implements intelligent dispute prioritization based on impact analysis,
 * success probability, and strategic value to maximize credit score improvement.
 */

import { EOSCARReasonCode, EOSCARItemType, EnhancedNegativeItem } from '@/types/enhanced-credit'
import { successProbabilityEngine } from './successProbabilityEngine'
import { legalReferenceEngine } from './legalReferenceEngine'

// ===================================
// Prioritization Types
// ===================================

export interface PrioritizationRequest {
  disputeItems: PrioritizableItem[]
  consumerProfile: ConsumerPriorityProfile
  objectives: PrioritizationObjectives
  constraints: PrioritizationConstraints
}

export interface PrioritizableItem {
  id: string
  itemType: EOSCARItemType
  reasonCode: EOSCARReasonCode
  creditorName: string
  accountNumber: string
  originalBalance: number
  currentBalance: number
  dateOpened?: Date
  dateReported?: Date
  delinquencyAge: number
  accountAge: number
  hasDocumentation: boolean
  legalBasisStrength: 'weak' | 'moderate' | 'strong'
  previousAttempts: number
  bureauReporting: ('experian' | 'equifax' | 'transunion')[]
  estimatedScoreImpact: number
  userPriority?: 'high' | 'medium' | 'low'
}

export interface ConsumerPriorityProfile {
  currentCreditScore: number
  targetCreditScore?: number
  urgentNeed: boolean
  timeHorizon: 'immediate' | 'short_term' | 'long_term'
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  availableResources: ResourceAvailability
}

export interface ResourceAvailability {
  timeAvailable: 'limited' | 'moderate' | 'extensive'
  budgetForLegal: boolean
  documentationCapability: 'low' | 'medium' | 'high'
  followUpCapacity: 'limited' | 'moderate' | 'extensive'
}

export interface PrioritizationObjectives {
  primaryGoal: 'score_improvement' | 'specific_removal' | 'comprehensive_cleanup'
  secondaryGoals: string[]
  prioritizeSpeed: boolean
  prioritizeSuccessRate: boolean
  minimizeRisk: boolean
  maximizeImpact: boolean
}

export interface PrioritizationConstraints {
  maxSimultaneousDisputes: number
  timeConstraints: TimeConstraint[]
  budgetLimitations: BudgetConstraint[]
  legalConstraints: LegalConstraint[]
}

export interface TimeConstraint {
  type: 'deadline' | 'blackout_period' | 'preferred_completion'
  date: Date
  description: string
  flexibility: 'rigid' | 'flexible' | 'preferred'
}

export interface BudgetConstraint {
  type: 'legal_fees' | 'documentation_costs' | 'total_budget'
  amount: number
  currency: string
  timeframe: string
}

export interface LegalConstraint {
  type: 'statute_limitations' | 'bankruptcy_discharge' | 'settlement_agreement'
  description: string
  impact: string
  workaround?: string
}

export interface PrioritizationResult {
  prioritizedItems: PrioritizedItem[]
  prioritizationMetrics: PrioritizationMetrics
  recommendations: PriorityRecommendation[]
  alternativeRankings: AlternativeRanking[]
}

export interface PrioritizedItem {
  item: PrioritizableItem
  priorityScore: number
  priorityRank: number
  priorityTier: 'critical' | 'high' | 'medium' | 'low'
  impactAnalysis: ImpactAnalysis
  feasibilityAnalysis: FeasibilityAnalysis
  strategicValue: number
  recommendedTiming: 'immediate' | 'short_term' | 'medium_term' | 'long_term'
  dependencies: string[]
  riskFactors: string[]
}

export interface ImpactAnalysis {
  scoreImpactPotential: number
  financialImpact: number
  timeToImpact: number
  cascadeEffects: string[]
  longTermBenefits: string[]
}

export interface FeasibilityAnalysis {
  successProbability: number
  legalStrength: number
  documentationStrength: number
  complexityScore: number
  resourceRequirements: string[]
  estimatedTimeframe: string
}

export interface PrioritizationMetrics {
  totalItems: number
  criticalItems: number
  highPriorityItems: number
  averagePriorityScore: number
  estimatedTotalImpact: number
  feasibilityDistribution: { [tier: string]: number }
  riskDistribution: { [level: string]: number }
}

export interface PriorityRecommendation {
  type: 'sequencing' | 'timing' | 'resource_allocation' | 'risk_mitigation'
  recommendation: string
  rationale: string
  expectedBenefit: string
  implementationSteps: string[]
}

export interface AlternativeRanking {
  name: string
  description: string
  prioritizedItems: PrioritizedItem[]
  useCase: string
  tradeoffs: string[]
}

// ===================================
// Dispute Prioritizer Class
// ===================================

export class DisputePrioritizer {
  /**
   * Prioritize dispute items based on impact and feasibility
   */
  async prioritizeDisputes(request: PrioritizationRequest): Promise<PrioritizationResult> {
    console.log(`Prioritizing ${request.disputeItems.length} dispute items`)

    // Analyze each item
    const analyzedItems = await Promise.all(
      request.disputeItems.map(item => this.analyzeItem(item, request))
    )

    // Calculate priority scores
    const prioritizedItems = this.calculatePriorityScores(analyzedItems, request)

    // Sort by priority score
    const sortedItems = prioritizedItems.sort((a, b) => b.priorityScore - a.priorityScore)

    // Assign ranks and tiers
    const rankedItems = this.assignRanksAndTiers(sortedItems)

    // Generate metrics
    const metrics = this.calculateMetrics(rankedItems)

    // Generate recommendations
    const recommendations = this.generateRecommendations(rankedItems, request)

    // Create alternative rankings
    const alternativeRankings = this.createAlternativeRankings(analyzedItems, request)

    return {
      prioritizedItems: rankedItems,
      prioritizationMetrics: metrics,
      recommendations,
      alternativeRankings
    }
  }

  /**
   * Analyze individual dispute item
   */
  private async analyzeItem(
    item: PrioritizableItem,
    request: PrioritizationRequest
  ): Promise<AnalyzedItem> {
    // Get success probability
    const successProbability = await this.getSuccessProbability(item)

    // Analyze impact potential
    const impactAnalysis = this.analyzeImpact(item, request.consumerProfile)

    // Assess feasibility
    const feasibilityAnalysis = this.assessFeasibility(item, successProbability)

    // Calculate strategic value
    const strategicValue = this.calculateStrategicValue(item, impactAnalysis, feasibilityAnalysis)

    return {
      item,
      impactAnalysis,
      feasibilityAnalysis,
      strategicValue,
      successProbability
    }
  }  /**
   *
 Calculate priority scores for analyzed items
   */
  private calculatePriorityScores(
    analyzedItems: AnalyzedItem[],
    request: PrioritizationRequest
  ): PrioritizedItem[] {
    return analyzedItems.map(analyzed => {
      const weights = this.getWeights(request.objectives)
      
      let priorityScore = 0
      
      // Impact weight (40%)
      priorityScore += analyzed.impactAnalysis.scoreImpactPotential * weights.impact
      
      // Feasibility weight (30%)
      priorityScore += analyzed.feasibilityAnalysis.successProbability * weights.feasibility
      
      // Strategic value weight (20%)
      priorityScore += analyzed.strategicValue * weights.strategic
      
      // User priority weight (10%)
      const userPriorityScore = this.getUserPriorityScore(analyzed.item.userPriority)
      priorityScore += userPriorityScore * weights.userPriority

      return {
        item: analyzed.item,
        priorityScore,
        priorityRank: 0, // Will be set later
        priorityTier: 'medium', // Will be set later
        impactAnalysis: analyzed.impactAnalysis,
        feasibilityAnalysis: analyzed.feasibilityAnalysis,
        strategicValue: analyzed.strategicValue,
        recommendedTiming: this.getRecommendedTiming(analyzed, request),
        dependencies: this.identifyDependencies(analyzed.item),
        riskFactors: this.identifyRiskFactors(analyzed.item)
      }
    })
  }

  /**
   * Assign ranks and tiers to prioritized items
   */
  private assignRanksAndTiers(sortedItems: PrioritizedItem[]): PrioritizedItem[] {
    return sortedItems.map((item, index) => {
      item.priorityRank = index + 1
      
      // Assign tiers based on score percentiles
      const scorePercentile = (sortedItems.length - index) / sortedItems.length
      
      if (scorePercentile >= 0.9) {
        item.priorityTier = 'critical'
      } else if (scorePercentile >= 0.7) {
        item.priorityTier = 'high'
      } else if (scorePercentile >= 0.4) {
        item.priorityTier = 'medium'
      } else {
        item.priorityTier = 'low'
      }
      
      return item
    })
  }

  /**
   * Helper methods
   */
  private async getSuccessProbability(item: PrioritizableItem): Promise<number> {
    // Simplified success probability calculation
    // In production, would use the full success probability engine
    let probability = 0.5 // Base probability
    
    // Adjust based on legal strength
    if (item.legalBasisStrength === 'strong') probability += 0.3
    else if (item.legalBasisStrength === 'moderate') probability += 0.1
    else probability -= 0.1
    
    // Adjust based on documentation
    if (item.hasDocumentation) probability += 0.2
    
    // Adjust based on age
    if (item.delinquencyAge > 84) probability += 0.3 // > 7 years
    else if (item.delinquencyAge > 60) probability += 0.2 // > 5 years
    
    // Adjust based on previous attempts
    probability -= item.previousAttempts * 0.1
    
    return Math.max(0.1, Math.min(0.95, probability))
  }

  private analyzeImpact(
    item: PrioritizableItem,
    profile: ConsumerPriorityProfile
  ): ImpactAnalysis {
    return {
      scoreImpactPotential: item.estimatedScoreImpact / 100,
      financialImpact: this.calculateFinancialImpact(item),
      timeToImpact: this.estimateTimeToImpact(item),
      cascadeEffects: this.identifyCascadeEffects(item),
      longTermBenefits: this.identifyLongTermBenefits(item)
    }
  }

  private assessFeasibility(
    item: PrioritizableItem,
    successProbability: number
  ): FeasibilityAnalysis {
    const legalStrengthMap = { strong: 0.9, moderate: 0.6, weak: 0.3 }
    const docStrength = item.hasDocumentation ? 0.8 : 0.3
    const complexity = this.calculateComplexityScore(item)
    
    return {
      successProbability,
      legalStrength: legalStrengthMap[item.legalBasisStrength],
      documentationStrength: docStrength,
      complexityScore: complexity,
      resourceRequirements: this.getResourceRequirements(item),
      estimatedTimeframe: this.estimateTimeframe(item)
    }
  }

  private calculateStrategicValue(
    item: PrioritizableItem,
    impact: ImpactAnalysis,
    feasibility: FeasibilityAnalysis
  ): number {
    // Strategic value = Impact × Feasibility × Urgency factor
    const impactScore = impact.scoreImpactPotential
    const feasibilityScore = feasibility.successProbability
    const urgencyFactor = this.getUrgencyFactor(item)
    
    return impactScore * feasibilityScore * urgencyFactor
  }

  private getWeights(objectives: PrioritizationObjectives): any {
    const baseWeights = {
      impact: 0.4,
      feasibility: 0.3,
      strategic: 0.2,
      userPriority: 0.1
    }

    // Adjust weights based on objectives
    if (objectives.prioritizeSuccessRate) {
      baseWeights.feasibility += 0.1
      baseWeights.impact -= 0.1
    }

    if (objectives.maximizeImpact) {
      baseWeights.impact += 0.1
      baseWeights.strategic -= 0.1
    }

    return baseWeights
  }

  private getUserPriorityScore(userPriority?: string): number {
    const priorityMap = { high: 1.0, medium: 0.6, low: 0.3 }
    return priorityMap[userPriority || 'medium'] || 0.6
  }

  private getRecommendedTiming(
    analyzed: AnalyzedItem,
    request: PrioritizationRequest
  ): 'immediate' | 'short_term' | 'medium_term' | 'long_term' {
    if (analyzed.strategicValue > 0.8) return 'immediate'
    if (analyzed.feasibilityAnalysis.successProbability > 0.7) return 'short_term'
    if (analyzed.impactAnalysis.scoreImpactPotential > 0.6) return 'medium_term'
    return 'long_term'
  }

  private identifyDependencies(item: PrioritizableItem): string[] {
    const dependencies: string[] = []
    
    if (!item.hasDocumentation) {
      dependencies.push('Documentation gathering required')
    }
    
    if (item.legalBasisStrength === 'weak') {
      dependencies.push('Legal basis strengthening needed')
    }
    
    if (item.previousAttempts > 0) {
      dependencies.push('Previous attempt analysis required')
    }
    
    return dependencies
  }

  private identifyRiskFactors(item: PrioritizableItem): string[] {
    const risks: string[] = []
    
    if (item.previousAttempts > 2) {
      risks.push('High risk of frivolous dispute classification')
    }
    
    if (!item.hasDocumentation) {
      risks.push('Insufficient evidence risk')
    }
    
    if (item.legalBasisStrength === 'weak') {
      risks.push('Weak legal foundation risk')
    }
    
    return risks
  }

  // Additional helper methods
  private calculateFinancialImpact(item: PrioritizableItem): number {
    return item.currentBalance || item.originalBalance || 0
  }

  private estimateTimeToImpact(item: PrioritizableItem): number {
    // Estimate in days
    if (item.legalBasisStrength === 'strong') return 30
    if (item.legalBasisStrength === 'moderate') return 45
    return 60
  }

  private identifyCascadeEffects(item: PrioritizableItem): string[] {
    const effects: string[] = []
    
    if (item.itemType === EOSCARItemType.COLLECTION) {
      effects.push('May improve overall credit utilization')
    }
    
    if (item.estimatedScoreImpact > 50) {
      effects.push('Significant score improvement may unlock better rates')
    }
    
    return effects
  }

  private identifyLongTermBenefits(item: PrioritizableItem): string[] {
    return [
      'Improved credit profile',
      'Better loan qualification',
      'Lower interest rates'
    ]
  }

  private calculateComplexityScore(item: PrioritizableItem): number {
    let complexity = 0.3 // Base complexity
    
    if (item.previousAttempts > 0) complexity += 0.2
    if (!item.hasDocumentation) complexity += 0.2
    if (item.legalBasisStrength === 'weak') complexity += 0.3
    
    return Math.min(complexity, 1.0)
  }

  private getResourceRequirements(item: PrioritizableItem): string[] {
    const requirements: string[] = ['Time for follow-up']
    
    if (!item.hasDocumentation) {
      requirements.push('Documentation gathering')
    }
    
    if (item.legalBasisStrength === 'weak') {
      requirements.push('Legal consultation')
    }
    
    return requirements
  }

  private estimateTimeframe(item: PrioritizableItem): string {
    if (item.legalBasisStrength === 'strong' && item.hasDocumentation) {
      return '30-45 days'
    }
    if (item.legalBasisStrength === 'moderate') {
      return '45-60 days'
    }
    return '60-90 days'
  }

  private getUrgencyFactor(item: PrioritizableItem): number {
    if (item.userPriority === 'high') return 1.2
    if (item.estimatedScoreImpact > 50) return 1.1
    return 1.0
  }

  private calculateMetrics(items: PrioritizedItem[]): PrioritizationMetrics {
    return {
      totalItems: items.length,
      criticalItems: items.filter(i => i.priorityTier === 'critical').length,
      highPriorityItems: items.filter(i => i.priorityTier === 'high').length,
      averagePriorityScore: items.reduce((sum, i) => sum + i.priorityScore, 0) / items.length,
      estimatedTotalImpact: items.reduce((sum, i) => sum + i.impactAnalysis.scoreImpactPotential, 0),
      feasibilityDistribution: this.calculateDistribution(items, 'feasibility'),
      riskDistribution: this.calculateDistribution(items, 'risk')
    }
  }

  private calculateDistribution(items: PrioritizedItem[], type: string): { [key: string]: number } {
    // Simplified distribution calculation
    return {
      high: items.filter(i => i.priorityTier === 'critical' || i.priorityTier === 'high').length,
      medium: items.filter(i => i.priorityTier === 'medium').length,
      low: items.filter(i => i.priorityTier === 'low').length
    }
  }

  private generateRecommendations(
    items: PrioritizedItem[],
    request: PrioritizationRequest
  ): PriorityRecommendation[] {
    const recommendations: PriorityRecommendation[] = []

    // Sequencing recommendation
    recommendations.push({
      type: 'sequencing',
      recommendation: 'Address critical and high-priority items first',
      rationale: 'Maximize early impact and build momentum',
      expectedBenefit: 'Faster credit score improvement',
      implementationSteps: [
        'Start with critical tier items',
        'Follow with high-priority items',
        'Address medium and low priority items in parallel'
      ]
    })

    return recommendations
  }

  private createAlternativeRankings(
    analyzedItems: AnalyzedItem[],
    request: PrioritizationRequest
  ): AlternativeRanking[] {
    return [
      {
        name: 'Success-First Ranking',
        description: 'Prioritize by success probability',
        prioritizedItems: [], // Would implement full ranking
        useCase: 'When success rate is more important than impact',
        tradeoffs: ['May delay high-impact items', 'Lower overall score improvement']
      },
      {
        name: 'Impact-First Ranking',
        description: 'Prioritize by score impact potential',
        prioritizedItems: [], // Would implement full ranking
        useCase: 'When maximum score improvement is the goal',
        tradeoffs: ['Higher risk of failures', 'May require more resources']
      }
    ]
  }
}

// ===================================
// Supporting Types
// ===================================

interface AnalyzedItem {
  item: PrioritizableItem
  impactAnalysis: ImpactAnalysis
  feasibilityAnalysis: FeasibilityAnalysis
  strategicValue: number
  successProbability: number
}

// Singleton instance
export const disputePrioritizer = new DisputePrioritizer()