import { NextRequest, NextResponse } from 'next/server'
import { EnhancedCreditAnalyzer } from '@/lib/ai/enhancedCreditAnalyzer'
import { createRouteHandlerClient } from '@/lib/supabase/route'

const enhancedAnalyzer = new EnhancedCreditAnalyzer()

export async function POST(request: NextRequest) {
  try {
    console.log('Enhanced multi-model analysis API called')
    const { documentText, userId, options } = await request.json()

    console.log('Request params:', { 
      textLength: documentText?.length, 
      userId: userId,
      options: options
    })

    if (!documentText || !userId) {
      console.log('Missing required parameters')
      return NextResponse.json(
        { error: 'Missing required parameters: documentText and userId are required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Verify user exists and is authenticated (skip for test users)
    let user = null
    if (userId === 'test-user-id') {
      console.log('Test user detected, skipping verification')
      user = { id: userId }
    } else {
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
      user = userData
    }

    console.log('User verified, starting enhanced multi-model analysis...')
    
    // Perform enhanced analysis with multi-model consensus
    const enhancedResult = await enhancedAnalyzer.analyzeReport(
      documentText,
      userId,
      supabase
    )

    console.log('Enhanced analysis completed:', {
      confidence: enhancedResult.confidence,
      processingTime: enhancedResult.processingTime,
      modelsUsed: enhancedResult.consensusResult?.consensusMetadata?.modelsUsed?.length || 0,
      qualityScore: enhancedResult.qualityMetrics?.overallQuality,
      recommendationsCount: enhancedResult.recommendations?.length || 0
    })

    // Structure response for API consumers
    const response = {
      success: true,
      data: {
        // Core analysis results
        extractedData: enhancedResult.extractedData,
        confidence: enhancedResult.confidence,
        processingTime: enhancedResult.processingTime,
        
        // Enhanced features
        consensusResult: {
          overallConfidence: enhancedResult.consensusResult.overallConfidence,
          modelsUsed: enhancedResult.consensusResult.consensusMetadata.modelsUsed,
          agreementScore: enhancedResult.consensusResult.consensusMetadata.agreementScore,
          consensusMethod: enhancedResult.consensusResult.consensusMetadata.consensusMethod
        },
        
        // Quality metrics
        qualityMetrics: enhancedResult.qualityMetrics,
        
        // Validation results summary
        validationSummary: {
          totalChecks: enhancedResult.validationResults.length,
          passedChecks: enhancedResult.validationResults.filter(v => v.overallScore >= 80).length,
          averageScore: enhancedResult.validationResults.length > 0 
            ? enhancedResult.validationResults.reduce((sum, v) => sum + v.overallScore, 0) / enhancedResult.validationResults.length
            : 0
        },
        
        // Enhanced recommendations
        recommendations: enhancedResult.recommendations,
        
        // Enhanced score analysis
        scoreAnalysis: enhancedResult.scoreAnalysis,
        
        // Summary
        summary: enhancedResult.summary
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '2.0',
        apiEndpoint: '/api/analysis/enhanced'
      }
    }

    console.log('Returning enhanced analysis response')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in enhanced analysis:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to perform enhanced analysis', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/analysis/enhanced',
    description: 'Enhanced multi-model credit report analysis with consensus engine',
    version: '2.0',
    methods: ['POST'],
    parameters: {
      documentText: 'string (required) - Credit report text content',
      userId: 'string (required) - User identifier',
      options: 'object (optional) - Analysis options and preferences'
    },
    features: [
      'Multi-model AI consensus analysis',
      'Comprehensive data validation',
      'Quality metrics calculation',
      'Enhanced dispute recommendations',
      'Confidence scoring with model agreement',
      'Processing time optimization'
    ]
  })
}