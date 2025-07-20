import { NextRequest, NextResponse } from 'next/server'
import { enhancedValidationSystem } from '@/lib/validation/enhancedValidationSystem'
import { createRouteHandlerClient } from '@/lib/supabase/route'

export async function POST(request: NextRequest) {
  try {
    console.log('Comprehensive validation API called')
    const { data, validationType, options } = await request.json()

    console.log('Validation request:', { 
      dataType: typeof data,
      validationType: validationType,
      options: options
    })

    if (!data) {
      return NextResponse.json(
        { error: 'Missing required parameter: data' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)
    let validationResult

    // Perform different types of validation based on request
    switch (validationType) {
      case 'extraction':
        console.log('Performing extraction validation...')
        validationResult = await enhancedValidationSystem.validateEnhancedCreditReport(data)
        break
        
      case 'eoscar_compliance':
        console.log('Performing EOSCAR compliance validation...')
        validationResult = await enhancedValidationSystem.validateEnhancedCreditReport(data)
        break
        
      case 'legal_compliance':
        console.log('Performing legal compliance validation...')
        validationResult = await enhancedValidationSystem.validateEnhancedCreditReport(data)
        break
        
      case 'quality_report':
        console.log('Generating quality report...')
        validationResult = await enhancedValidationSystem.validateEnhancedCreditReport(data)
        break
        
      case 'comprehensive':
      default:
        console.log('Performing comprehensive validation...')
        // Run all validation types
        const [extraction, eoscar, legal, quality] = await Promise.all([
          enhancedValidationSystem.validateEnhancedCreditReport(data).catch(e => ({ error: e.message })),
          enhancedValidationSystem.validateEnhancedCreditReport(data).catch(e => ({ error: e.message })),
          enhancedValidationSystem.validateEnhancedCreditReport(data).catch(e => ({ error: e.message })),
          enhancedValidationSystem.validateEnhancedCreditReport(data).catch(e => ({ error: e.message }))
        ])
        
        validationResult = {
          comprehensive: true,
          extraction,
          eoscarCompliance: eoscar,
          legalCompliance: legal,
          qualityReport: quality,
          overallScore: calculateOverallScore([extraction, eoscar, legal, quality]),
          summary: generateValidationSummary([extraction, eoscar, legal, quality])
        }
        break
    }

    console.log('Validation completed:', {
      type: validationType,
      overallScore: validationResult.overallScore || 'N/A',
      issuesFound: validationResult.issues?.length || 0
    })

    const response = {
      success: true,
      data: validationResult,
      metadata: {
        validationType,
        timestamp: new Date().toISOString(),
        version: '2.0',
        apiEndpoint: '/api/validation/comprehensive'
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in comprehensive validation:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to perform validation', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Helper function to calculate overall score
function calculateOverallScore(results: any[]): number {
  const validResults = results.filter(r => r && !r.error && typeof r.overallScore === 'number')
  if (validResults.length === 0) return 0
  
  return validResults.reduce((sum, r) => sum + r.overallScore, 0) / validResults.length
}

// Helper function to generate validation summary
function generateValidationSummary(results: any[]): string {
  const validResults = results.filter(r => r && !r.error)
  const errorResults = results.filter(r => r && r.error)
  
  let summary = `Validation completed with ${validResults.length} successful checks`
  if (errorResults.length > 0) {
    summary += ` and ${errorResults.length} errors`
  }
  
  return summary
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/validation/comprehensive',
    description: 'Comprehensive validation service for credit report data and dispute letters',
    version: '2.0',
    methods: ['POST'],
    parameters: {
      data: 'object (required) - Data to validate (credit report data, EOSCAR letter, etc.)',
      validationType: 'string (optional) - Type of validation: extraction, eoscar_compliance, legal_compliance, quality_report, comprehensive',
      options: 'object (optional) - Validation options and preferences'
    },
    validationTypes: {
      extraction: 'Validates extracted credit report data accuracy and completeness',
      eoscar_compliance: 'Validates EOSCAR format compliance for dispute letters',
      legal_compliance: 'Validates legal references and FCRA compliance',
      quality_report: 'Generates comprehensive quality assessment report',
      comprehensive: 'Runs all validation types and provides combined results'
    },
    features: [
      'Multi-layer validation system',
      'Data quality assessment',
      'Format compliance checking',
      'Legal compliance verification',
      'Quality scoring and reporting',
      'Issue identification and recommendations'
    ]
  })
}