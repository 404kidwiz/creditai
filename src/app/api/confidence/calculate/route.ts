import { NextRequest, NextResponse } from 'next/server'
import { consensusEngine } from '@/lib/ai/consensusEngine'
import { createRouteHandlerClient } from '@/lib/supabase/route'

export async function POST(request: NextRequest) {
  try {
    console.log('Confidence calculation API called')
    const { analysisResults, validationResults, qualityMetrics, options } = await request.json()

    console.log('Confidence calculation request:', { 
      analysisResultsCount: analysisResults?.length || 0,
      validationResultsCount: validationResults?.length || 0,
      hasQualityMetrics: !!qualityMetrics,
      options: options
    })

    if (!analysisResults || !Array.isArray(analysisResults)) {
      return NextResponse.json(
        { error: 'Missing or invalid analysisResults parameter' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Calculate confidence scores using multiple methods
    const confidenceCalculation = await calculateComprehensiveConfidence({
      analysisResults,
      validationResults: validationResults || [],
      qualityMetrics: qualityMetrics || {},
      options: options || {}
    })

    console.log('Confidence calculation completed:', {
      overallConfidence: confidenceCalculation.overallConfidence,
      method: confidenceCalculation.calculationMethod,
      factorsCount: confidenceCalculation.confidenceFactors.length
    })

    const response = {
      success: true,
      data: confidenceCalculation,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '2.0',
        apiEndpoint: '/api/confidence/calculate'
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in confidence calculation:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to calculate confidence', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Calculate comprehensive confidence score
 */
async function calculateComprehensiveConfidence(params: {
  analysisResults: any[]
  validationResults: any[]
  qualityMetrics: any
  options: any
}): Promise<any> {
  const { analysisResults, validationResults, qualityMetrics, options } = params

  // 1. Model Consensus Confidence (40% weight)
  const consensusConfidence = calculateConsensusConfidence(analysisResults)
  
  // 2. Validation Confidence (30% weight)
  const validationConfidence = calculateValidationConfidence(validationResults)
  
  // 3. Quality Metrics Confidence (20% weight)
  const qualityConfidence = calculateQualityConfidence(qualityMetrics)
  
  // 4. Data Completeness Confidence (10% weight)
  const completenessConfidence = calculateCompletenessConfidence(analysisResults)

  // Calculate weighted overall confidence
  const overallConfidence = Math.round(
    consensusConfidence * 0.4 +
    validationConfidence * 0.3 +
    qualityConfidence * 0.2 +
    completenessConfidence * 0.1
  )

  // Generate confidence factors breakdown
  const confidenceFactors = [
    {
      factor: 'Model Consensus',
      score: consensusConfidence,
      weight: 40,
      description: 'Agreement between multiple AI models',
      details: getConsensusDetails(analysisResults)
    },
    {
      factor: 'Validation Results',
      score: validationConfidence,
      weight: 30,
      description: 'Data validation and quality checks',
      details: getValidationDetails(validationResults)
    },
    {
      factor: 'Quality Metrics',
      score: qualityConfidence,
      weight: 20,
      description: 'Overall data quality assessment',
      details: getQualityDetails(qualityMetrics)
    },
    {
      factor: 'Data Completeness',
      score: completenessConfidence,
      weight: 10,
      description: 'Completeness of extracted information',
      details: getCompletenessDetails(analysisResults)
    }
  ]

  // Determine confidence level
  const confidenceLevel = determineConfidenceLevel(overallConfidence)
  
  // Generate recommendations based on confidence
  const recommendations = generateConfidenceRecommendations(
    overallConfidence,
    confidenceFactors
  )

  return {
    overallConfidence,
    confidenceLevel,
    calculationMethod: 'weighted_multi_factor',
    confidenceFactors,
    recommendations,
    breakdown: {
      consensusConfidence,
      validationConfidence,
      qualityConfidence,
      completenessConfidence
    },
    metadata: {
      calculatedAt: new Date().toISOString(),
      modelCount: analysisResults.length,
      validationCount: validationResults.length,
      hasQualityMetrics: !!qualityMetrics
    }
  }
}

/**
 * Calculate consensus confidence from multiple model results
 */
function calculateConsensusConfidence(analysisResults: any[]): number {
  if (analysisResults.length === 0) return 0
  if (analysisResults.length === 1) return analysisResults[0].confidence || 50

  // Calculate agreement score between models
  const confidenceScores = analysisResults.map(r => r.confidence || 50)
  const avgConfidence = confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length
  
  // Calculate variance to measure agreement
  const variance = confidenceScores.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) / confidenceScores.length
  const standardDeviation = Math.sqrt(variance)
  
  // Lower standard deviation = higher agreement = higher confidence
  const agreementBonus = Math.max(0, 20 - standardDeviation)
  
  return Math.min(100, Math.max(0, avgConfidence + agreementBonus))
}

/**
 * Calculate validation confidence from validation results
 */
function calculateValidationConfidence(validationResults: any[]): number {
  if (validationResults.length === 0) return 70 // Default if no validation

  const validationScores = validationResults
    .filter(r => typeof r.overallScore === 'number')
    .map(r => r.overallScore)

  if (validationScores.length === 0) return 70

  return validationScores.reduce((sum, score) => sum + score, 0) / validationScores.length
}

/**
 * Calculate quality confidence from quality metrics
 */
function calculateQualityConfidence(qualityMetrics: any): number {
  if (!qualityMetrics || typeof qualityMetrics.overallQuality !== 'number') {
    return 75 // Default if no quality metrics
  }

  return qualityMetrics.overallQuality * 100
}

/**
 * Calculate completeness confidence
 */
function calculateCompletenessConfidence(analysisResults: any[]): number {
  if (analysisResults.length === 0) return 0

  // Use the first result's completeness or calculate from available data
  const firstResult = analysisResults[0]
  if (firstResult.extractedData) {
    return calculateDataCompleteness(firstResult.extractedData) * 100
  }

  return 60 // Default completeness score
}

/**
 * Calculate data completeness score
 */
function calculateDataCompleteness(data: any): number {
  let completeness = 0
  const checks = [
    { field: 'personalInfo', weight: 0.15 },
    { field: 'creditScores', weight: 0.25 },
    { field: 'accounts', weight: 0.25 },
    { field: 'negativeItems', weight: 0.15 },
    { field: 'inquiries', weight: 0.1 },
    { field: 'publicRecords', weight: 0.1 }
  ]

  checks.forEach(check => {
    if (data[check.field]) {
      if (Array.isArray(data[check.field])) {
        completeness += data[check.field].length > 0 ? check.weight : 0
      } else if (typeof data[check.field] === 'object') {
        completeness += Object.keys(data[check.field]).length > 0 ? check.weight : 0
      } else {
        completeness += check.weight
      }
    }
  })

  return Math.min(1.0, completeness)
}

/**
 * Determine confidence level category
 */
function determineConfidenceLevel(confidence: number): string {
  if (confidence >= 90) return 'very_high'
  if (confidence >= 80) return 'high'
  if (confidence >= 70) return 'medium'
  if (confidence >= 60) return 'low'
  return 'very_low'
}

/**
 * Generate recommendations based on confidence score
 */
function generateConfidenceRecommendations(
  overallConfidence: number,
  confidenceFactors: any[]
): string[] {
  const recommendations: string[] = []

  if (overallConfidence < 70) {
    recommendations.push('Consider manual review of extracted data')
    recommendations.push('Verify critical information before proceeding with disputes')
  }

  // Check individual factors for specific recommendations
  confidenceFactors.forEach(factor => {
    if (factor.score < 60) {
      switch (factor.factor) {
        case 'Model Consensus':
          recommendations.push('Models showed significant disagreement - manual verification recommended')
          break
        case 'Validation Results':
          recommendations.push('Data validation found issues - review flagged items')
          break
        case 'Quality Metrics':
          recommendations.push('Data quality is below optimal - consider re-processing document')
          break
        case 'Data Completeness':
          recommendations.push('Some data sections may be incomplete - verify document quality')
          break
      }
    }
  })

  if (overallConfidence >= 85) {
    recommendations.push('High confidence analysis - proceed with recommended actions')
  }

  return recommendations
}

// Helper functions for details
function getConsensusDetails(analysisResults: any[]): any {
  return {
    modelCount: analysisResults.length,
    averageConfidence: analysisResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / analysisResults.length,
    confidenceRange: {
      min: Math.min(...analysisResults.map(r => r.confidence || 0)),
      max: Math.max(...analysisResults.map(r => r.confidence || 0))
    }
  }
}

function getValidationDetails(validationResults: any[]): any {
  return {
    checkCount: validationResults.length,
    passedChecks: validationResults.filter(r => r.overallScore >= 80).length,
    averageScore: validationResults.length > 0 
      ? validationResults.reduce((sum, r) => sum + (r.overallScore || 0), 0) / validationResults.length
      : 0
  }
}

function getQualityDetails(qualityMetrics: any): any {
  return {
    hasMetrics: !!qualityMetrics,
    overallQuality: qualityMetrics?.overallQuality || 0,
    dataCompleteness: qualityMetrics?.dataCompleteness || 0,
    dataAccuracy: qualityMetrics?.dataAccuracy || 0
  }
}

function getCompletenessDetails(analysisResults: any[]): any {
  const firstResult = analysisResults[0]
  return {
    hasPersonalInfo: !!firstResult?.extractedData?.personalInfo,
    hasCreditScores: !!firstResult?.extractedData?.creditScores,
    hasAccounts: !!firstResult?.extractedData?.accounts?.length,
    hasNegativeItems: !!firstResult?.extractedData?.negativeItems?.length
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/confidence/calculate',
    description: 'Calculate comprehensive confidence scores for credit report analysis',
    version: '2.0',
    methods: ['POST'],
    parameters: {
      analysisResults: 'array (required) - Array of analysis results from different models',
      validationResults: 'array (optional) - Array of validation results',
      qualityMetrics: 'object (optional) - Quality metrics object',
      options: 'object (optional) - Calculation options and preferences'
    },
    confidenceFactors: {
      modelConsensus: 'Agreement between multiple AI models (40% weight)',
      validationResults: 'Data validation and quality checks (30% weight)',
      qualityMetrics: 'Overall data quality assessment (20% weight)',
      dataCompleteness: 'Completeness of extracted information (10% weight)'
    },
    confidenceLevels: {
      very_high: '90-100% - Excellent confidence, proceed with full automation',
      high: '80-89% - Good confidence, minimal manual review needed',
      medium: '70-79% - Moderate confidence, some manual verification recommended',
      low: '60-69% - Low confidence, significant manual review required',
      very_low: '0-59% - Very low confidence, manual processing recommended'
    }
  })
}