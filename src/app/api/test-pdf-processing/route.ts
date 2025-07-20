import { NextRequest, NextResponse } from 'next/server'
import { creditAnalyzer } from '@/lib/ai/creditAnalyzer'
import { isGoogleCloudConfigured } from '@/lib/google-cloud/config'

export async function GET(request: NextRequest) {
  try {
    // Check Google Cloud configuration
    const isConfigured = isGoogleCloudConfigured()
    
    const diagnostics = {
      googleCloudConfigured: isConfigured,
      visionApiEnabled: process.env.GOOGLE_CLOUD_VISION_API_ENABLED === 'true',
      documentAiEnabled: process.env.GOOGLE_CLOUD_DOCUMENT_AI_ENABLED === 'true',
      hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
      hasProcessorId: !!process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID,
      hasCredentials: !!process.env.GOOGLE_CLOUD_CREDENTIALS,
      hasApiKey: !!process.env.GOOGLE_AI_API_KEY
    }

    // Test the PDF processor
    let processingTest = null
    try {
      const { pdfProcessor } = await import('@/lib/google-cloud/pdfProcessor')
      
      // Create a mock file for testing
      const testFileContent = 'Credit Report Test File'
      const blob = new Blob([testFileContent], { type: 'application/pdf' })
      const testFile = new File([blob], 'test-credit-report.pdf', { type: 'application/pdf' })
      
      const result = await pdfProcessor.processPDF(testFile, null, 'test-user')
      
      processingTest = {
        success: true,
        processingMethod: result.processingMethod,
        confidence: result.confidence,
        extractedText: result.text.substring(0, 200) + '...',
        textLength: result.text.length,
        hasAiAnalysis: !!result.aiAnalysis,
        accountsFound: result.extractedData.accounts.length,
        negativeItemsFound: result.extractedData.negativeItems.length
      }
    } catch (error) {
      processingTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test if we get mock vs real data
    const testAnalysis = await creditAnalyzer.analyzeReport(
      `CREDIT REPORT
Name: Test User
Credit Score: 720
Chase Bank Credit Card
Balance: $1,500
Status: Current`,
      'test-user',
      null
    )

    const analysisTest = {
      isRealAi: testAnalysis.confidence > 50 && testAnalysis.extractedData.personalInfo.name !== 'Extracted from document',
      confidence: testAnalysis.confidence,
      extractedName: testAnalysis.extractedData.personalInfo.name,
      recommendationsCount: testAnalysis.recommendations.length,
      processingTime: testAnalysis.processingTime
    }

    return NextResponse.json({
      diagnostics,
      processingTest,
      analysisTest,
      recommendations: [
        !diagnostics.visionApiEnabled && 'Enable Google Cloud Vision API',
        !diagnostics.documentAiEnabled && 'Enable Google Cloud Document AI', 
        !diagnostics.googleCloudConfigured && 'Fix Google Cloud configuration',
        processingTest?.processingMethod === 'fallback' && 'PDF processing is using fallback instead of real OCR'
      ].filter(Boolean)
    })

  } catch (error) {
    console.error('PDF processing test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendation: 'Check server logs for detailed error information'
    }, { status: 500 })
  }
}