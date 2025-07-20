import { NextRequest, NextResponse } from 'next/server'
// import { disputeStrategyEngine } from '@/lib/ai/disputeStrategyEngine'
import { successProbabilityEngine } from '@/lib/ai/successProbabilityEngine'
import { disputePrioritizer } from '@/lib/ai/disputePrioritizer'
import { createRouteHandlerClient } from '@/lib/supabase/route'

export async function POST(request: NextRequest) {
  try {
    console.log('Strategic recommendations API called')
    const { creditReportData, userId, preferences, options } = await request.json()

    console.log('Strategic recommendations request:', { 
      hasData: !!creditReportData,
      userId: userId,
      preferences: preferences,
      options: options
    })

    if (!creditReportData || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: creditReportData and userId' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Verify user exists (skip for test users)
    if (userId !== 'test-user-id') {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (userError || !userData) {
        console.log('User verification failed:', userError)
        return NextResponse.json(
          { error: 'User not found or unauthorized' },
          { status: 404 }
        )
      }
    }

    console.log('Generating strategic dispute recommendations...')

    // Generate comprehensive strategic recommendations
    const strategicRecommendations = await generateStrategicRecommendations({
      creditReportData,
      userId,
      preferences: preferences || {},
      options: options || {}
    })

    console.log('Strategic recommendations generated:', {
      totalRecommendations: strategicRecommendations.recommendations.length,
      highPriorityCount: strategicRecommendations.recommendations.filter(r => r.priority === 'high').length,
      estimatedImpact: strategicRecommendations.overallStrategy.estimatedScoreImprovement
    })

    const response = {
      success: true,
      data: strategicRecommendations,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '2.0',
        apiEndpoint: '/api/recommendations/strategic'
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error generating strategic recommendations:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate strategic recommendations', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Generate comprehensive strategic recommendations
 */
async function generateStrategicRecommendations(params: {
  creditReportData: any
  userId: string
  preferences: any
  options: any
}): Promise<any> {
  const { creditReportData, userId, preferences, options } = params

  // 1. Analyze negative items and calculate success probabilities
  const negativeItems = creditReportData.negativeItems || []
  const itemAnalysis = await Promise.all(
    negativeItems.map(async (item: any) => {
      const successProbability = await calculateSuccessProbability(item, {
        userHistory: await getUserDisputeHistory(userId),
        itemDetails: item,
        marketConditions: await getMarketConditions()
      })

      const strategy = await generateDisputeStrategy(item, {
        successProbability,
        userPreferences: preferences,
        legalBasis: await getLegalBasis(item)
      })

      return {
        item,
        successProbability,
        strategy,
        priority: calculatePriority(item, successProbability, strategy)
      }
    })
  )

  // 2. Prioritize disputes using the prioritizer
  const prioritizedItems = await prioritizeDisputes(itemAnalysis, {
    userGoals: preferences.goals || 'score_improvement',
    timeframe: preferences.timeframe || 'medium',
    riskTolerance: preferences.riskTolerance || 'moderate'
  })

  // 3. Generate strategic batching recommendations
  const batchingStrategy = await generateBatchingStrategy(prioritizedItems, preferences)

  // 4. Create timeline and sequencing recommendations
  const timeline = await generateDisputeTimeline(prioritizedItems, batchingStrategy)

  // 5. Calculate overall strategy metrics
  const overallStrategy = await calculateOverallStrategy(prioritizedItems, timeline)

  // 6. Generate specific recommendations
  const recommendations = prioritizedItems.map((analysis: any, index: number) => ({
    id: `rec_${index + 1}`,
    negativeItemId: analysis.item.id,
    priority: analysis.priority,
    
    // Core recommendation details
    disputeReason: analysis.strategy.primaryReason,
    legalBasis: analysis.strategy.legalBasis,
    eoscarReasonCode: analysis.strategy.eoscarReasonCode,
    
    // Success metrics
    successProbability: analysis.successProbability.probability,
    estimatedImpact: analysis.successProbability.estimatedScoreImpact,
    confidenceLevel: analysis.successProbability.confidence,
    
    // Strategic details
    recommendedTiming: analysis.strategy.timing,
    supportingEvidence: analysis.strategy.requiredEvidence,
    alternativeStrategies: analysis.strategy.alternatives,
    riskFactors: analysis.strategy.risks,
    
    // Timeline information
    estimatedDuration: analysis.strategy.estimatedDuration,
    followUpActions: analysis.strategy.followUpActions,
    
    // Batching information
    batchGroup: getBatchGroup(analysis.item, batchingStrategy),
    sequenceOrder: index + 1,
    
    // Additional strategic insights
    marketFactors: analysis.strategy.marketFactors,
    bureauSpecificNotes: analysis.strategy.bureauNotes,
    successFactors: analysis.strategy.successFactors
  }))

  return {
    recommendations,
    overallStrategy,
    batchingStrategy,
    timeline,
    strategicInsights: await generateStrategicInsights(recommendations, overallStrategy),
    metadata: {
      analysisDate: new Date().toISOString(),
      totalItems: negativeItems.length,
      recommendedActions: recommendations.length,
      estimatedTimeframe: timeline.totalDuration,
      confidenceScore: overallStrategy.overallConfidence
    }
  }
}

// Helper functions
async function calculateSuccessProbability(item: any, context: any): Promise<any> {
  let probability = 50 // Base probability

  // Age factor - older items are easier to dispute
  if (item.ageInYears > 5) probability += 20
  else if (item.ageInYears > 2) probability += 10

  // Type factor
  switch (item.type) {
    case 'late_payment':
      probability += 15
      break
    case 'collection':
      probability += 10
      break
    case 'charge_off':
      probability += 5
      break
    case 'bankruptcy':
      probability -= 10
      break
  }

  // Amount factor - smaller amounts are easier to dispute
  if (item.amount < 500) probability += 10
  else if (item.amount > 5000) probability -= 5

  return {
    probability: Math.min(95, Math.max(10, probability)),
    estimatedScoreImpact: calculateScoreImpact(item),
    confidence: 0.8
  }
}

function calculateScoreImpact(item: any): number {
  const impactScore = item.impactScore || 50
  
  if (impactScore > 80) return 50
  if (impactScore > 60) return 30
  if (impactScore > 40) return 20
  return 10
}

async function generateDisputeStrategy(item: any, context: any): Promise<any> {
  return {
    primaryReason: generateDisputeReason(item),
    legalBasis: 'Fair Credit Reporting Act Section 611',
    eoscarReasonCode: determineEOSCARReasonCode(item),
    timing: 'immediate',
    requiredEvidence: generateSupportingEvidence(item),
    alternatives: ['Direct creditor negotiation', 'Goodwill letter'],
    risks: identifyRiskFactors(item),
    estimatedDuration: '30-45 days',
    followUpActions: ['Monitor bureau responses', 'Prepare escalation if needed'],
    marketFactors: ['Normal bureau response times'],
    bureauNotes: ['Standard dispute process'],
    successFactors: ['Age of item', 'Documentation quality']
  }
}

function generateDisputeReason(item: any): string {
  switch (item.type) {
    case 'late_payment':
      return 'Inaccurate payment history reporting'
    case 'collection':
      return 'Unverified collection account'
    case 'charge_off':
      return 'Inaccurate charge-off status'
    case 'bankruptcy':
      return 'Outdated bankruptcy information'
    default:
      return 'Inaccurate account information'
  }
}

function determineEOSCARReasonCode(item: any): string {
  switch (item.type) {
    case 'late_payment':
      return '03' // Inaccurate payment history
    case 'collection':
      return '01' // Not mine
    case 'charge_off':
      return '02' // Inaccurate balance
    case 'bankruptcy':
      return '13' // Bankruptcy discharged
    default:
      return '01' // Not mine (default)
  }
}

function generateSupportingEvidence(item: any): string[] {
  const evidence: string[] = []

  switch (item.type) {
    case 'late_payment':
      evidence.push('Bank statements showing on-time payments')
      evidence.push('Payment confirmation receipts')
      break
    case 'collection':
      evidence.push('Proof of payment to original creditor')
      evidence.push('Debt validation request response')
      break
    case 'charge_off':
      evidence.push('Payment history documentation')
      evidence.push('Account closure confirmation')
      break
  }

  evidence.push('Copy of government-issued ID')
  evidence.push('Proof of current address')

  return evidence
}

function identifyRiskFactors(item: any): string[] {
  const risks: string[] = []

  if (item.amount > 10000) {
    risks.push('High dollar amount may require additional documentation')
  }

  if (item.ageInYears < 1) {
    risks.push('Recent item may be harder to dispute')
  }

  if (item.type === 'bankruptcy') {
    risks.push('Bankruptcy records are typically well-documented')
  }

  return risks
}

function calculatePriority(item: any, successProbability: any, strategy: any): 'high' | 'medium' | 'low' {
  const impactScore = successProbability.estimatedScoreImpact || 0
  const probability = successProbability.probability || 0
  const urgency = calculateUrgency(item)

  const priorityScore = (impactScore * 0.4) + (probability * 0.4) + (urgency * 0.2)

  if (priorityScore >= 75) return 'high'
  if (priorityScore >= 50) return 'medium'
  return 'low'
}

function calculateUrgency(item: any): number {
  let urgency = 50 // Base urgency

  // Age factor - older items are more urgent to dispute
  if (item.ageInYears > 6) urgency += 30
  else if (item.ageInYears > 3) urgency += 15

  // Type factor
  switch (item.type) {
    case 'bankruptcy':
      urgency += 20 // High urgency due to major impact
      break
    case 'collection':
      urgency += 15
      break
    case 'charge_off':
      urgency += 10
      break
    case 'late_payment':
      urgency += 5
      break
  }

  return Math.min(100, Math.max(0, urgency))
}

async function prioritizeDisputes(itemAnalysis: any[], preferences: any): Promise<any[]> {
  // Sort by priority and success probability
  return itemAnalysis.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
    if (priorityDiff !== 0) return priorityDiff
    return b.successProbability.probability - a.successProbability.probability
  })
}

async function generateBatchingStrategy(prioritizedItems: any[], preferences: any): Promise<any> {
  const batches = []
  const itemsPerBatch = preferences.batchSize || 3
  const timeBetweenBatches = preferences.batchInterval || 30 // days

  // Group items into strategic batches
  for (let i = 0; i < prioritizedItems.length; i += itemsPerBatch) {
    const batchItems = prioritizedItems.slice(i, i + itemsPerBatch)
    const batchNumber = Math.floor(i / itemsPerBatch) + 1

    batches.push({
      batchNumber,
      items: batchItems,
      submissionDate: calculateBatchSubmissionDate(batchNumber, timeBetweenBatches),
      strategy: getBatchStrategy(batchItems),
      estimatedResponseDate: calculateResponseDate(batchNumber, timeBetweenBatches),
      bureauCoordination: getBureauCoordination(batchItems)
    })
  }

  return {
    batches,
    totalBatches: batches.length,
    estimatedDuration: batches.length * timeBetweenBatches + 30, // +30 for final responses
    batchingRationale: getBatchingRationale(batches, preferences)
  }
}

async function generateDisputeTimeline(prioritizedItems: any[], batchingStrategy: any): Promise<any> {
  const milestones = []
  let currentDate = new Date()

  // Add batching milestones
  batchingStrategy.batches.forEach((batch: any, index: number) => {
    milestones.push({
      date: batch.submissionDate,
      type: 'submission',
      description: `Submit Batch ${batch.batchNumber} (${batch.items.length} disputes)`,
      items: batch.items.map((item: any) => item.item.id)
    })

    milestones.push({
      date: batch.estimatedResponseDate,
      type: 'response_expected',
      description: `Expected responses for Batch ${batch.batchNumber}`,
      items: batch.items.map((item: any) => item.item.id)
    })
  })

  return {
    milestones: milestones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    totalDuration: batchingStrategy.estimatedDuration + 60, // +60 for follow-up period
    phases: generateTimelinePhases(milestones)
  }
}

async function calculateOverallStrategy(prioritizedItems: any[], timeline: any): Promise<any> {
  const totalItems = prioritizedItems.length
  const highPriorityItems = prioritizedItems.filter(item => item.priority === 'high').length
  
  const averageSuccessProbability = prioritizedItems.reduce(
    (sum, item) => sum + item.successProbability.probability, 0
  ) / totalItems

  const estimatedScoreImprovement = prioritizedItems.reduce(
    (sum, item) => sum + (item.successProbability.estimatedScoreImpact * item.successProbability.probability / 100), 0
  )

  const overallConfidence = calculateOverallConfidence(prioritizedItems)

  return {
    totalDisputeItems: totalItems,
    highPriorityItems,
    averageSuccessProbability: Math.round(averageSuccessProbability),
    estimatedScoreImprovement: Math.round(estimatedScoreImprovement),
    overallConfidence,
    estimatedTimeframe: timeline.totalDuration,
    strategicApproach: determineStrategicApproach(prioritizedItems),
    riskAssessment: calculateRiskAssessment(prioritizedItems),
    successFactors: identifySuccessFactors(prioritizedItems)
  }
}

async function generateStrategicInsights(recommendations: any[], overallStrategy: any): Promise<string[]> {
  const insights = []

  // Score improvement insights
  if (overallStrategy.estimatedScoreImprovement > 50) {
    insights.push(`Significant score improvement potential: ${overallStrategy.estimatedScoreImprovement} points`)
  }

  // Priority insights
  if (overallStrategy.highPriorityItems > 0) {
    insights.push(`${overallStrategy.highPriorityItems} high-priority items identified for immediate action`)
  }

  // Success probability insights
  if (overallStrategy.averageSuccessProbability > 70) {
    insights.push('High overall success probability - favorable conditions for disputes')
  } else if (overallStrategy.averageSuccessProbability < 50) {
    insights.push('Lower success probability - consider strengthening evidence and strategy')
  }

  // Timeline insights
  if (overallStrategy.estimatedTimeframe > 180) {
    insights.push('Extended timeline recommended for optimal results - patience will be key')
  }

  // Strategic approach insights
  insights.push(`Recommended approach: ${overallStrategy.strategicApproach}`)

  return insights
}

// Additional helper functions
async function getUserDisputeHistory(userId: string): Promise<any> {
  return { previousDisputes: 0, successRate: 0.7 }
}

async function getMarketConditions(): Promise<any> {
  return { bureauResponseTimes: 'normal', successRates: 'average' }
}

async function getLegalBasis(item: any): Promise<string> {
  return 'FCRA Section 611 - Right to dispute inaccurate information'
}

function getBatchGroup(item: any, batchingStrategy: any): number {
  for (const batch of batchingStrategy.batches) {
    if (batch.items.some((batchItem: any) => batchItem.item.id === item.id)) {
      return batch.batchNumber
    }
  }
  return 1
}

function calculateBatchSubmissionDate(batchNumber: number, interval: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + (batchNumber - 1) * interval)
  return date
}

function calculateResponseDate(batchNumber: number, interval: number): Date {
  const submissionDate = calculateBatchSubmissionDate(batchNumber, interval)
  submissionDate.setDate(submissionDate.getDate() + 30) // 30-day response time
  return submissionDate
}

function getBatchStrategy(items: any[]): string {
  const types = new Set(items.map(item => item.item.type))
  if (types.size === 1) {
    return `Focused ${Array.from(types)[0]} dispute batch`
  }
  return 'Mixed dispute type batch for comprehensive approach'
}

function getBureauCoordination(items: any[]): any {
  return {
    experian: items.some(item => item.item.bureaus?.includes('experian')),
    equifax: items.some(item => item.item.bureaus?.includes('equifax')),
    transunion: items.some(item => item.item.bureaus?.includes('transunion'))
  }
}

function getBatchingRationale(batches: any[], preferences: any): string {
  return `Strategic batching to avoid bureau fatigue while maintaining momentum. ${batches.length} batches over ${batches.length * 30} days.`
}

function generateTimelinePhases(milestones: any[]): any[] {
  return [
    { phase: 'Preparation', duration: '1-2 weeks', description: 'Gather evidence and prepare disputes' },
    { phase: 'Submission', duration: '2-3 months', description: 'Submit disputes in strategic batches' },
    { phase: 'Response', duration: '1-2 months', description: 'Monitor and analyze bureau responses' },
    { phase: 'Follow-up', duration: '1-2 months', description: 'Execute follow-up actions and escalations' }
  ]
}

function calculateOverallConfidence(items: any[]): number {
  const confidenceScores = items.map(item => item.successProbability.confidence || 70)
  return Math.round(confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length)
}

function determineStrategicApproach(items: any[]): string {
  const highPriorityCount = items.filter(item => item.priority === 'high').length
  const totalCount = items.length

  if (highPriorityCount / totalCount > 0.6) {
    return 'Aggressive - Focus on high-impact items first'
  } else if (highPriorityCount / totalCount > 0.3) {
    return 'Balanced - Mix of high and medium priority items'
  } else {
    return 'Conservative - Gradual approach with lower-risk items'
  }
}

function calculateRiskAssessment(items: any[]): string {
  const avgSuccessProb = items.reduce((sum, item) => sum + item.successProbability.probability, 0) / items.length
  
  if (avgSuccessProb > 75) return 'Low risk - High probability of success'
  if (avgSuccessProb > 50) return 'Medium risk - Moderate success probability'
  return 'High risk - Lower success probability, consider strengthening strategy'
}

function identifySuccessFactors(items: any[]): string[] {
  const factors = []
  
  const oldItems = items.filter(item => item.item.ageInYears > 5).length
  if (oldItems > 0) factors.push(`${oldItems} older items with higher dispute success rates`)
  
  const smallAmounts = items.filter(item => item.item.amount < 1000).length
  if (smallAmounts > 0) factors.push(`${smallAmounts} smaller amounts easier to dispute`)
  
  const latePayments = items.filter(item => item.item.type === 'late_payment').length
  if (latePayments > 0) factors.push(`${latePayments} payment history disputes with good success rates`)
  
  return factors
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/recommendations/strategic',
    description: 'Generate strategic dispute recommendations with success probability analysis',
    version: '2.0',
    methods: ['POST'],
    parameters: {
      creditReportData: 'object (required) - Credit report data with negative items',
      userId: 'string (required) - User identifier',
      preferences: 'object (optional) - User preferences for dispute strategy',
      options: 'object (optional) - Additional options and settings'
    },
    preferences: {
      goals: 'string - score_improvement, debt_removal, credit_building',
      timeframe: 'string - short, medium, long',
      riskTolerance: 'string - conservative, moderate, aggressive',
      batchSize: 'number - items per batch (default: 3)',
      batchInterval: 'number - days between batches (default: 30)'
    },
    features: [
      'Success probability calculation',
      'Strategic dispute prioritization',
      'Batching strategy optimization',
      'Timeline and sequencing recommendations',
      'Legal basis and EOSCAR compliance',
      'Multi-bureau coordination',
      'Risk assessment and mitigation',
      'Follow-up action planning'
    ]
  })
}