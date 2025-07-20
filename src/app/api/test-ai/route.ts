import { NextRequest, NextResponse } from 'next/server'
import { creditAnalyzer } from '@/lib/ai/creditAnalyzer'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [API TEST] Testing AI functionality...')
    
    // Test AI initialization
    const testResult = await creditAnalyzer.testAI()
    
    if (!testResult.success) {
      return NextResponse.json({
        success: false,
        error: testResult.error,
        message: 'AI model initialization test failed'
      }, { status: 500 })
    }
    
    // Test with sample credit report data
    const sampleText = `
Credit Report for John Doe
Current Address: 123 Main St, Anytown, ST 12345
Social Security Number: XXX-XX-XXXX
Date of Birth: 01/01/1990

CREDIT SCORES:
Experian: 720 (Range: 300-850) - Date: ${new Date().toISOString().split('T')[0]}

ACCOUNTS:
TRUIST BANK
Account Number: 451336****1234
Account Type: Credit Card
Current Balance: $1,250
Credit Limit: $5,000
Status: Open - Current
Date Opened: 01/15/2020
Last Reported: ${new Date().toISOString().split('T')[0]}

CHASE BANK
Account Number: 789123****5678
Account Type: Auto Loan  
Current Balance: $15,500
Original Amount: $25,000
Monthly Payment: $285
Status: Open - Current
Date Opened: 06/01/2022
Last Reported: ${new Date().toISOString().split('T')[0]}

NEGATIVE ITEMS:
Collection Account
Original Creditor: Medical Services Inc
Collection Agency: ABC Collections
Account Number: COL****9876
Amount: $125
Date of First Delinquency: 01/15/2023
Date Reported: 01/30/2023
Status: Unpaid

INQUIRIES:
Capital One - Hard Inquiry - Date: 12/01/2023 - Purpose: Credit Card Application
Wells Fargo - Hard Inquiry - Date: 11/15/2023 - Purpose: Auto Loan
    `
    
    console.log('🧪 [API TEST] Running credit analysis with sample data...')
    const analysisResult = await creditAnalyzer.analyzeReport(sampleText)
    
    return NextResponse.json({
      success: true,
      aiTest: testResult,
      sampleAnalysis: {
        confidence: analysisResult.confidence,
        processingTime: analysisResult.processingTime,
        extractedData: {
          personalInfoName: analysisResult.extractedData.personalInfo.name,
          accountsCount: analysisResult.extractedData.accounts.length,
          negativeItemsCount: analysisResult.extractedData.negativeItems.length,
          inquiriesCount: analysisResult.extractedData.inquiries.length,
          creditScore: analysisResult.extractedData.creditScores.experian?.score,
          accounts: analysisResult.extractedData.accounts.map(acc => ({
            creditorName: acc.creditorName,
            accountType: acc.accountType,
            balance: acc.balance,
            status: acc.status
          })),
          negativeItems: analysisResult.extractedData.negativeItems.map(item => ({
            type: item.type,
            creditorName: item.creditorName,
            amount: item.amount,
            description: item.description
          }))
        },
        recommendationsCount: analysisResult.recommendations.length,
        scoreAnalysis: {
          currentScore: analysisResult.scoreAnalysis.currentScore,
          factorsCount: analysisResult.scoreAnalysis.factors.length
        },
        summaryLength: analysisResult.summary.length
      }
    })
    
  } catch (error) {
    console.error('❌ [API TEST] AI test failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}