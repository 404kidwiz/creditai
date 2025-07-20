import { NextRequest, NextResponse } from 'next/server'
import { MultiProviderCreditAnalyzer } from '@/lib/ai/multiProviderCreditAnalyzer'
import { createRouteHandlerClient } from '@/lib/supabase/route'

export async function POST(request: NextRequest) {
  try {
    console.log('Multi-provider AI analysis API called')
    const { documentText, userId } = await request.json()

    console.log('Request params:', { 
      textLength: documentText?.length, 
      userId: userId 
    })

    if (!documentText || !userId) {
      console.log('Missing required parameters')
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Simple test response for debugging
    if (documentText.includes('TEST_DEBUG')) {
      console.log('Debug test detected, returning test response')
      return NextResponse.json({
        analysis: {
          extractedData: {
            personalInfo: { name: 'Test User', address: 'Test Address' },
            creditScore: { score: 750, bureau: 'experian', date: '2024-01-01', scoreRange: { min: 300, max: 850 } },
            accounts: [],
            negativeItems: [],
            inquiries: [],
            publicRecords: []
          },
          recommendations: [],
          scoreAnalysis: { currentScore: 750, factors: [], improvementPotential: 50, timelineEstimate: '3-6 months' },
          summary: 'Test analysis completed successfully',
          provider: 'test',
          confidence: 95
        },
        message: 'Test analysis completed successfully'
      })
    }

    const supabase = createRouteHandlerClient(request)

    // For test users, skip user verification
    let user = null
    if (userId === 'test-user-id') {
      console.log('Test user detected, skipping verification')
      user = { id: userId }
    } else {
      // Verify user exists and is authenticated
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (userError || !userData) {
        console.log('User verification failed:', userError)
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      user = userData
    }

    console.log('User verified, starting multi-provider AI analysis...')
    
    // Analyze credit report using multi-provider AI
    const analyzer = new MultiProviderCreditAnalyzer()
    const analysis = await analyzer.analyzeReport(documentText, userId, supabase)

    console.log('Multi-provider AI analysis completed:', {
      provider: analysis?.provider,
      confidence: analysis?.confidence,
      score: analysis?.extractedData?.creditScore?.score,
      negativeItems: analysis?.extractedData?.negativeItems?.length,
      recommendations: analysis?.recommendations?.length
    })

    // Ensure we have valid data before returning
    if (!analysis) {
      console.error('Analysis returned undefined or null')
      return NextResponse.json(
        { error: 'Analysis failed - no data returned' },
        { status: 500 }
      )
    }
    
    const response = { 
      analysis,
      message: `Analysis completed for ${analysis.provider} credit report with ${analysis.confidence}% confidence`
    }

    console.log('Returning response:', JSON.stringify(response, null, 2))
    console.log('Response type:', typeof response)
    console.log('Analysis type:', typeof analysis)
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error analyzing credit report:', error)
    return NextResponse.json(
      { error: 'Failed to analyze credit report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}