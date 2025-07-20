import { NextRequest, NextResponse } from 'next/server'
import { CreditAnalyzer } from '@/lib/ai/creditAnalyzer'
import { MultiProviderCreditAnalyzer } from '@/lib/ai/multiProviderCreditAnalyzer'
import { textExtractor } from '@/lib/ocr/textExtractor'
import { createRouteHandlerClient } from '@/lib/supabase/route'

interface TestStep {
  step: string
  status: 'running' | 'success' | 'error' | 'skipped'
  message: string
  data?: any
  duration?: number
  confidence?: number
  errors?: string[]
}

interface DiagnosticReport {
  testId: string
  timestamp: string
  steps: TestStep[]
  summary: {
    totalSteps: number
    successful: number
    failed: number
    skipped: number
    totalDuration: number
    overallStatus: 'success' | 'partial' | 'failed'
    recommendations: string[]
  }
  sampleCreditReport: string
  environment: {
    googleAiApiKey: boolean
    server: boolean
    geminiModel: boolean
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const testId = `test-${Date.now()}`
  
  let steps: TestStep[] = []
  
  const addStep = (step: string, status: TestStep['status'], message: string, data?: any, errors?: string[]) => {
    const stepObj: TestStep = {
      step,
      status,
      message,
      data,
      duration: Date.now() - startTime,
      errors
    }
    
    if (data?.confidence !== undefined) {
      stepObj.confidence = data.confidence
    }
    
    steps.push(stepObj)
    console.log(`[${testId}] ${step}: ${status} - ${message}`)
  }

  try {
    console.log(`[${testId}] Starting comprehensive credit report analysis test`)
    
    // Environment Check
    addStep('environment_check', 'running', 'Checking environment configuration...')
    
    const environment = {
      googleAiApiKey: !!(process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== 'your_actual_gemini_api_key_here'),
      server: typeof window === 'undefined',
      geminiModel: false
    }
    
    try {
      const analyzer = new CreditAnalyzer()
      environment.geminiModel = !!(analyzer as any).model
    } catch (error) {
      console.error('Error checking Gemini model:', error)
    }
    
    addStep('environment_check', 'success', 
      `Environment: API Key: ${environment.googleAiApiKey}, Server: ${environment.server}, Model: ${environment.geminiModel}`,
      environment
    )

    // Create comprehensive sample credit report
    addStep('sample_creation', 'running', 'Creating comprehensive sample credit report...')
    
    const sampleCreditReport = `
CREDIT REPORT - EXPERIAN CONFIDENTIAL

Personal Information:
Name: JOHN MICHAEL SMITH
Address: 123 MAIN STREET, ANYTOWN, CA 90210
SSN: ***-**-5678
Date of Birth: 01/15/1985
Phone: (555) 123-4567

Credit Score Information:
Current FICO Score: 720
Score Date: 12/15/2024
Score Range: 300-850
Bureau: Experian

CREDIT ACCOUNTS

Account #1:
Creditor: CHASE BANK
Account Number: 4532********1234
Account Type: Credit Card
Balance: $2,850.00
Credit Limit: $8,500.00
Payment Status: Current
Date Opened: 03/2019
Last Reported: 12/2024
Payment History: OK OK OK OK OK OK OK OK OK OK OK OK

Account #2:
Creditor: WELLS FARGO AUTO
Account Number: 7845********9876
Account Type: Auto Loan
Balance: $18,450.00
Original Amount: $25,000.00
Payment Status: Current
Date Opened: 06/2022
Last Reported: 12/2024
Payment History: OK OK OK OK OK OK OK OK 30 OK OK OK

Account #3:
Creditor: DISCOVER CARD
Account Number: 6011********5555
Account Type: Credit Card
Balance: $1,200.00
Credit Limit: $3,000.00
Payment Status: Current
Date Opened: 01/2020
Last Reported: 12/2024
Payment History: OK OK OK OK OK OK OK OK OK OK OK OK

NEGATIVE ITEMS

Negative Item #1:
Type: Late Payment
Creditor: WELLS FARGO AUTO
Account: 7845********9876
Date of Delinquency: 09/2024
Status: 30 days late payment reported
Amount: $385.00
Description: Payment was 30 days late in September 2024

Negative Item #2:
Type: Collection Account
Creditor: ABC COLLECTIONS (Original: MEDICAL CENTER)
Account: COL123456789
Amount: $245.00
Date First Reported: 08/2024
Status: Open/Unpaid
Description: Medical collection account from Emergency Room visit

CREDIT INQUIRIES

Hard Inquiry #1:
Creditor: CHASE BANK
Date: 03/15/2024
Purpose: Credit Card Application

Hard Inquiry #2:
Creditor: AUTO DEALERS FINANCE
Date: 06/10/2024
Purpose: Auto Loan Application

Soft Inquiry #1:
Creditor: CREDIT KARMA
Date: 11/20/2024
Purpose: Account Review

PUBLIC RECORDS
No public records found.

Account Summary:
Total Accounts: 3
Open Accounts: 3
Closed Accounts: 0
Total Credit Limit: $11,500.00
Total Current Balance: $4,050.00
Credit Utilization: 35.2%

Payment History Summary:
Total Accounts with Payment History: 3
Accounts Currently Paid as Agreed: 3
Accounts 30+ Days Past Due: 1 (Historical)
Accounts 60+ Days Past Due: 0
Accounts 90+ Days Past Due: 0

Report Generated: December 15, 2024
Report Source: Experian Consumer Credit Report
Report Number: EXP-2024-CR-123456789
`

    addStep('sample_creation', 'success', 
      `Created comprehensive sample credit report (${sampleCreditReport.length} characters)`,
      { textLength: sampleCreditReport.length, accounts: 3, negativeItems: 2, inquiries: 3 }
    )

    // Test 1: Basic Text Processing
    addStep('basic_text_processing', 'running', 'Testing basic text processing and parsing...')
    
    try {
      const lines = sampleCreditReport.split('\n').filter(line => line.trim().length > 0)
      const scoreMatch = sampleCreditReport.match(/FICO Score:\s*(\d{3})/i)
      const accountMatches = sampleCreditReport.match(/Account #\d+:/g)
      const negativeMatches = sampleCreditReport.match(/Negative Item #\d+:/g)
      
      const basicResults = {
        totalLines: lines.length,
        extractedScore: scoreMatch ? parseInt(scoreMatch[1]) : null,
        accountsFound: accountMatches?.length || 0,
        negativeItemsFound: negativeMatches?.length || 0,
        hasPersonalInfo: sampleCreditReport.includes('JOHN MICHAEL SMITH'),
        hasPaymentHistory: sampleCreditReport.includes('Payment History'),
        hasInquiries: sampleCreditReport.includes('Hard Inquiry')
      }
      
      addStep('basic_text_processing', 'success', 
        `Text processing successful: ${basicResults.accountsFound} accounts, ${basicResults.negativeItemsFound} negative items, score: ${basicResults.extractedScore}`,
        basicResults
      )
    } catch (error) {
      addStep('basic_text_processing', 'error', 
        `Basic text processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        null,
        [error instanceof Error ? error.message : 'Unknown error']
      )
    }

    // Test 2: Original CreditAnalyzer
    addStep('original_analyzer', 'running', 'Testing original CreditAnalyzer...')
    
    try {
      const originalAnalyzer = new CreditAnalyzer()
      const originalResult = await originalAnalyzer.analyzeReport(sampleCreditReport, 'test-user-id')
      
      const originalMetrics = {
        confidence: originalResult.confidence,
        processingTime: originalResult.processingTime,
        accountsExtracted: originalResult.extractedData.accounts.length,
        negativeItemsExtracted: originalResult.extractedData.negativeItems.length,
        inquiriesExtracted: originalResult.extractedData.inquiries.length,
        creditScore: originalResult.extractedData.creditScores.experian?.score,
        recommendationsGenerated: originalResult.recommendations.length,
        personalInfoExtracted: originalResult.extractedData.personalInfo.name !== 'Unknown',
        summaryLength: originalResult.summary.length
      }
      
      addStep('original_analyzer', 'success', 
        `Original analyzer completed with ${originalMetrics.confidence}% confidence in ${originalMetrics.processingTime}ms`,
        { ...originalMetrics, fullResult: originalResult },
        originalResult.confidence < 50 ? ['Low confidence analysis'] : undefined
      )
    } catch (error) {
      addStep('original_analyzer', 'error', 
        `Original analyzer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        null,
        [error instanceof Error ? error.message : 'Unknown error']
      )
    }

    // Test 3: Multi-Provider Analyzer
    addStep('multi_provider_analyzer', 'running', 'Testing MultiProviderCreditAnalyzer...')
    
    try {
      const multiAnalyzer = new MultiProviderCreditAnalyzer()
      const multiResult = await multiAnalyzer.analyzeReport(sampleCreditReport, 'test-user-id')
      
      const multiMetrics = {
        provider: multiResult.provider,
        confidence: multiResult.confidence,
        accountsExtracted: multiResult.extractedData.accounts.length,
        negativeItemsExtracted: multiResult.extractedData.negativeItems.length,
        inquiriesExtracted: multiResult.extractedData.inquiries.length,
        creditScore: multiResult.extractedData.creditScore?.score,
        recommendationsGenerated: multiResult.recommendations.length,
        personalInfoExtracted: multiResult.extractedData.personalInfo.name !== 'Unable to extract',
        summaryLength: multiResult.summary.length,
        scoreFactors: multiResult.scoreAnalysis.factors.length
      }
      
      addStep('multi_provider_analyzer', 'success', 
        `Multi-provider analyzer completed: Provider: ${multiMetrics.provider}, Confidence: ${multiMetrics.confidence}%`,
        { ...multiMetrics, fullResult: multiResult },
        multiResult.confidence < 50 ? ['Low confidence analysis'] : undefined
      )
    } catch (error) {
      addStep('multi_provider_analyzer', 'error', 
        `Multi-provider analyzer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        null,
        [error instanceof Error ? error.message : 'Unknown error']
      )
    }

    // Test 4: API Endpoint Test
    addStep('api_endpoint_test', 'running', 'Testing credit analysis API endpoint...')
    
    try {
      const apiResponse = await fetch(`${request.url.split('/test-credit-analysis')[0]}/credit/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentText: sampleCreditReport,
          userId: 'test-user-id'
        })
      })
      
      if (apiResponse.ok) {
        const apiResult = await apiResponse.json()
        
        const apiMetrics = {
          responseStatus: apiResponse.status,
          hasAnalysis: !!apiResult.analysis,
          confidence: apiResult.analysis?.confidence,
          provider: apiResult.analysis?.provider,
          accountsExtracted: apiResult.analysis?.extractedData?.accounts?.length || 0,
          negativeItemsExtracted: apiResult.analysis?.extractedData?.negativeItems?.length || 0,
          recommendationsGenerated: apiResult.analysis?.recommendations?.length || 0,
          responseSize: JSON.stringify(apiResult).length
        }
        
        addStep('api_endpoint_test', 'success', 
          `API endpoint test successful: ${apiMetrics.provider} provider, ${apiMetrics.confidence}% confidence`,
          { ...apiMetrics, fullResponse: apiResult },
          apiResult.analysis?.confidence < 50 ? ['Low confidence from API'] : undefined
        )
      } else {
        const errorText = await apiResponse.text()
        addStep('api_endpoint_test', 'error', 
          `API endpoint returned ${apiResponse.status}: ${errorText}`,
          { responseStatus: apiResponse.status, errorText },
          [`HTTP ${apiResponse.status}: ${errorText}`]
        )
      }
    } catch (error) {
      addStep('api_endpoint_test', 'error', 
        `API endpoint test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        null,
        [error instanceof Error ? error.message : 'Unknown error']
      )
    }

    // Test 5: OCR Text Extraction Simulation
    addStep('ocr_simulation', 'running', 'Testing OCR text extraction accuracy...')
    
    try {
      // Simulate OCR extraction with some noise
      const noisyText = sampleCreditReport
        .replace(/FICO Score: 720/g, 'FICO Score: 72O') // O instead of 0
        .replace(/CHASE BANK/g, 'CFIASE BANK') // Common OCR errors
        .replace(/Credit Limit: \$8,500\.00/g, 'Credit Limit: $8,5OO.OO')
        .replace(/\$2,850\.00/g, '$2,85O.OO')
      
      // Test how well the system handles OCR errors
      const ocrAnalyzer = new CreditAnalyzer()
      const ocrResult = await ocrAnalyzer.analyzeReport(noisyText, 'test-user-id')
      
      const ocrMetrics = {
        originalTextLength: sampleCreditReport.length,
        noisyTextLength: noisyText.length,
        confidence: ocrResult.confidence,
        scoreExtracted: ocrResult.extractedData.creditScores.experian?.score,
        accountsExtracted: ocrResult.extractedData.accounts.length,
        creditorNamesExtracted: ocrResult.extractedData.accounts.map(acc => acc.creditorName),
        negativeItemsExtracted: ocrResult.extractedData.negativeItems.length,
        handledOCRErrors: ocrResult.confidence > 40 // Reasonable confidence despite OCR errors
      }
      
      addStep('ocr_simulation', 'success', 
        `OCR simulation completed: ${ocrMetrics.confidence}% confidence with noisy text`,
        ocrMetrics,
        ocrResult.confidence < 40 ? ['Poor OCR error handling'] : undefined
      )
    } catch (error) {
      addStep('ocr_simulation', 'error', 
        `OCR simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        null,
        [error instanceof Error ? error.message : 'Unknown error']
      )
    }

    // Test 6: Edge Cases
    addStep('edge_cases', 'running', 'Testing edge cases and malformed data...')
    
    try {
      const edgeCases = [
        {
          name: 'Empty document',
          text: '',
          expectation: 'Should handle gracefully'
        },
        {
          name: 'Very short text',
          text: 'Credit Score: 750',
          expectation: 'Should extract score only'
        },
        {
          name: 'No credit data',
          text: 'This is not a credit report. It contains no financial information.',
          expectation: 'Should return low confidence'
        },
        {
          name: 'Malformed score',
          text: 'Credit Score: ABC Credit Score: 999 Credit Score: 12',
          expectation: 'Should handle invalid scores'
        }
      ]
      
      const edgeResults = []
      
      for (const testCase of edgeCases) {
        try {
          const edgeAnalyzer = new CreditAnalyzer()
          const result = await edgeAnalyzer.analyzeReport(testCase.text, 'test-user-id')
          edgeResults.push({
            name: testCase.name,
            success: true,
            confidence: result.confidence,
            extractedData: {
              accounts: result.extractedData.accounts.length,
              negativeItems: result.extractedData.negativeItems.length,
              score: result.extractedData.creditScores.experian?.score
            }
          })
        } catch (error) {
          edgeResults.push({
            name: testCase.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      
      addStep('edge_cases', 'success', 
        `Tested ${edgeCases.length} edge cases, ${edgeResults.filter(r => r.success).length} handled successfully`,
        edgeResults
      )
    } catch (error) {
      addStep('edge_cases', 'error', 
        `Edge case testing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        null,
        [error instanceof Error ? error.message : 'Unknown error']
      )
    }

    // Test 7: Performance Test
    addStep('performance_test', 'running', 'Testing performance with multiple analyses...')
    
    try {
      const performanceResults = []
      const iterations = 3
      
      for (let i = 0; i < iterations; i++) {
        const perfStart = Date.now()
        const perfAnalyzer = new CreditAnalyzer()
        const perfResult = await perfAnalyzer.analyzeReport(sampleCreditReport, 'test-user-id')
        const perfDuration = Date.now() - perfStart
        
        performanceResults.push({
          iteration: i + 1,
          duration: perfDuration,
          confidence: perfResult.confidence,
          accountsExtracted: perfResult.extractedData.accounts.length
        })
      }
      
      const avgDuration = performanceResults.reduce((sum, r) => sum + r.duration, 0) / iterations
      const avgConfidence = performanceResults.reduce((sum, r) => sum + r.confidence, 0) / iterations
      
      addStep('performance_test', 'success', 
        `Performance test completed: Average ${avgDuration.toFixed(0)}ms, ${avgConfidence.toFixed(1)}% confidence`,
        {
          iterations,
          averageDuration: avgDuration,
          averageConfidence: avgConfidence,
          results: performanceResults,
          consistentResults: Math.max(...performanceResults.map(r => r.confidence)) - Math.min(...performanceResults.map(r => r.confidence)) < 10
        },
        avgDuration > 10000 ? ['Slow analysis performance'] : undefined
      )
    } catch (error) {
      addStep('performance_test', 'error', 
        `Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        null,
        [error instanceof Error ? error.message : 'Unknown error']
      )
    }

    // Generate final summary and recommendations
    const successful = steps.filter(s => s.status === 'success').length
    const failed = steps.filter(s => s.status === 'error').length
    const skipped = steps.filter(s => s.status === 'skipped').length
    const totalDuration = Date.now() - startTime
    
    const recommendations = []
    
    // Analyze results and generate recommendations
    if (!environment.googleAiApiKey) {
      recommendations.push('🔑 Configure Google AI API Key: Set GOOGLE_AI_API_KEY environment variable')
    }
    
    if (failed > 0) {
      recommendations.push('🔧 Review failed tests and fix underlying issues')
    }
    
    if (steps.some(s => s.confidence !== undefined && s.confidence < 70)) {
      recommendations.push('📊 Low confidence detected: Review AI prompts and data extraction logic')
    }
    
    if (steps.some(s => s.duration && s.duration > 8000)) {
      recommendations.push('⚡ Performance optimization needed: Analysis taking too long')
    }
    
    const environmentStep = steps.find(s => s.step === 'environment_check')
    if (environmentStep?.data && !environmentStep.data.geminiModel) {
      recommendations.push('🤖 AI Model initialization failed: Check API key and network connectivity')
    }
    
    if (successful === steps.length) {
      recommendations.push('✅ All tests passed: System is functioning correctly')
    } else if (successful > failed) {
      recommendations.push('⚠️ Partial success: Some components need attention')
    } else {
      recommendations.push('❌ Major issues detected: System requires immediate attention')
    }

    const report: DiagnosticReport = {
      testId,
      timestamp: new Date().toISOString(),
      steps,
      summary: {
        totalSteps: steps.length,
        successful,
        failed,
        skipped,
        totalDuration,
        overallStatus: failed === 0 ? 'success' : successful > failed ? 'partial' : 'failed',
        recommendations
      },
      sampleCreditReport,
      environment
    }

    console.log(`[${testId}] Test completed: ${successful}/${steps.length} successful in ${totalDuration}ms`)
    
    return NextResponse.json(report, { status: 200 })

  } catch (error) {
    console.error('Test suite error:', error)
    
    const errorReport: DiagnosticReport = {
      testId,
      timestamp: new Date().toISOString(),
      steps: [
        ...steps,
        {
          step: 'test_suite_error',
          status: 'error',
          message: `Test suite crashed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        }
      ],
      summary: {
        totalSteps: steps.length + 1,
        successful: steps.filter(s => s.status === 'success').length,
        failed: steps.filter(s => s.status === 'error').length + 1,
        skipped: steps.filter(s => s.status === 'skipped').length,
        totalDuration: Date.now() - startTime,
        overallStatus: 'failed',
        recommendations: [
          '🚨 Critical error: Test suite failed to complete',
          '🔍 Check server logs for detailed error information',
          '🛠️ Verify all dependencies are properly installed'
        ]
      },
      sampleCreditReport: '',
      environment: {
        googleAiApiKey: false,
        server: typeof window === 'undefined',
        geminiModel: false
      }
    }

    return NextResponse.json(errorReport, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Credit Analysis Test Suite',
    description: 'POST to this endpoint to run comprehensive credit report analysis tests',
    endpoints: {
      'POST /api/test-credit-analysis': 'Run comprehensive diagnostic tests',
    },
    testingFeatures: [
      'Environment configuration check',
      'Sample credit report generation',
      'Basic text processing validation',
      'Original CreditAnalyzer testing',
      'Multi-provider analyzer testing',
      'API endpoint validation',
      'OCR error simulation',
      'Edge case handling',
      'Performance benchmarking',
      'Detailed diagnostic reporting'
    ]
  })
}