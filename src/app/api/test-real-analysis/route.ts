import { NextRequest, NextResponse } from 'next/server'
import { creditAnalyzer } from '@/lib/ai/creditAnalyzer'

export async function POST(request: NextRequest) {
  try {
    // Test with realistic credit report text that simulates what OCR might extract
    const realisticCreditReportText = `
EXPERIAN CREDIT REPORT
Report Date: July 19, 2025
Consumer: JOHN MICHAEL SMITH
Address: 1234 MAIN STREET
         ANYTOWN, CA 90210
SSN: ***-**-1234
DOB: 03/15/1985

CREDIT SCORE SUMMARY
FICO Score 8: 720
Score Range: 300-850
Date: 07/19/2025
Previous Score: 695 (04/19/2025)

ACCOUNT INFORMATION

BANK OF AMERICA
Account #: ****1234
Account Type: Revolving Credit
Date Opened: 01/2018
Credit Limit: $8,500
Balance: $2,150
Payment Status: CURRENT
Last Payment: $125 on 07/01/2025
Payment History: 24 months - no late payments

CHASE AUTO FINANCE
Account #: ****5678
Account Type: Installment Loan
Date Opened: 06/2020
Original Amount: $28,000
Balance: $16,750
Payment Status: CURRENT
Monthly Payment: $485
Last Payment: $485 on 07/01/2025

CAPITAL ONE CREDIT CARD
Account #: ****9012
Account Type: Revolving Credit
Date Opened: 09/2019
Credit Limit: $3,500
Balance: $875
Payment Status: CURRENT
Last Payment: $50 on 06/28/2025

NEGATIVE ITEMS

COLLECTIONS - MEDICAL SERVICES INC
Original Creditor: ST. MARY'S HOSPITAL
Account #: ****3456
Date Reported: 03/2023
Balance: $385
Status: PAID COLLECTION
Date Paid: 05/2023

LATE PAYMENT - DISCOVER CARD
Account #: ****7890
Date of Late Payment: 11/2022
Days Late: 30 DAYS
Amount Past Due: $75
Current Status: ACCOUNT CLOSED

CREDIT INQUIRIES

HARD INQUIRIES (Last 24 Months)
Capital One - 09/15/2023 (Credit Card Application)
Wells Fargo - 03/22/2023 (Auto Loan Application)
Experian - 01/10/2023 (Consumer Inquiry)

SOFT INQUIRIES (Last 12 Months)
Credit Karma - 07/01/2025
Bank of America - 06/15/2025
Discover - 05/20/2025

PUBLIC RECORDS
No bankruptcies, tax liens, or judgments found.

CREDIT UTILIZATION
Total Credit Limit: $12,000
Total Balance: $3,025
Overall Utilization: 25.2%

ACCOUNT SUMMARY
Total Accounts: 5
Open Accounts: 3
Closed Accounts: 2
Never Late: 3
Currently Late: 0
Collection Accounts: 1 (PAID)
    `

    console.log('🧪 [TEST] Starting real credit analysis test...')
    console.log('🧪 [TEST] Sample text length:', realisticCreditReportText.length, 'characters')

    const startTime = Date.now()
    
    // Test the complete AI analysis pipeline
    const analysisResult = await creditAnalyzer.analyzeReport(
      realisticCreditReportText,
      'test-user-real-analysis',
      null
    )
    
    const processingTime = Date.now() - startTime
    
    console.log('🧪 [TEST] Analysis completed in', processingTime, 'ms')
    console.log('🧪 [TEST] Analysis confidence:', analysisResult.confidence)
    console.log('🧪 [TEST] Extracted name:', analysisResult.extractedData.personalInfo.name)
    console.log('🧪 [TEST] Credit score:', analysisResult.extractedData.creditScores.experian?.score)
    console.log('🧪 [TEST] Accounts found:', analysisResult.extractedData.accounts.length)
    console.log('🧪 [TEST] Negative items:', analysisResult.extractedData.negativeItems.length)
    console.log('🧪 [TEST] Recommendations:', analysisResult.recommendations.length)

    // Detailed accuracy analysis
    const accuracyMetrics = {
      personalInfoAccuracy: {
        nameExtracted: analysisResult.extractedData.personalInfo.name !== 'Extracted from document',
        actualName: analysisResult.extractedData.personalInfo.name,
        expectedContains: 'JOHN'
      },
      creditScoreAccuracy: {
        scoreExtracted: !!analysisResult.extractedData.creditScores.experian?.score,
        extractedScore: analysisResult.extractedData.creditScores.experian?.score,
        expectedScore: 720,
        scoreMatch: analysisResult.extractedData.creditScores.experian?.score === 720
      },
      accountsAccuracy: {
        accountsFound: analysisResult.extractedData.accounts.length,
        expectedAccounts: 4, // Bank of America, Chase, Capital One, Discover (closed)
        hasSpecificCreditors: {
          bankOfAmerica: analysisResult.extractedData.accounts.some(acc => 
            acc.creditorName.toLowerCase().includes('bank of america')),
          chase: analysisResult.extractedData.accounts.some(acc => 
            acc.creditorName.toLowerCase().includes('chase')),
          capitalOne: analysisResult.extractedData.accounts.some(acc => 
            acc.creditorName.toLowerCase().includes('capital one'))
        }
      },
      negativeItemsAccuracy: {
        negativeItemsFound: analysisResult.extractedData.negativeItems.length,
        expectedNegativeItems: 2, // Collection + Late payment
        hasCollection: analysisResult.extractedData.negativeItems.some(item => 
          item.type === 'collection'),
        hasLatePayment: analysisResult.extractedData.negativeItems.some(item => 
          item.type === 'late_payment')
      },
      inquiriesAccuracy: {
        inquiriesFound: analysisResult.extractedData.inquiries.length,
        expectedInquiries: 3, // Capital One, Wells Fargo, Experian
        hasHardInquiries: analysisResult.extractedData.inquiries.some(inq => 
          inq.type === 'hard')
      }
    }

    // Calculate overall accuracy score
    let accuracyPoints = 0
    let totalPoints = 0

    // Personal info accuracy (20 points)
    totalPoints += 20
    if (accuracyMetrics.personalInfoAccuracy.nameExtracted && 
        accuracyMetrics.personalInfoAccuracy.actualName.includes('JOHN')) {
      accuracyPoints += 20
    }

    // Credit score accuracy (25 points)
    totalPoints += 25
    if (accuracyMetrics.creditScoreAccuracy.scoreMatch) {
      accuracyPoints += 25
    } else if (accuracyMetrics.creditScoreAccuracy.scoreExtracted) {
      accuracyPoints += 15 // Partial credit for extracting a score
    }

    // Accounts accuracy (25 points)
    totalPoints += 25
    const accountsFound = accuracyMetrics.accountsAccuracy.accountsFound
    if (accountsFound >= 3) accuracyPoints += 25
    else if (accountsFound >= 2) accuracyPoints += 15
    else if (accountsFound >= 1) accuracyPoints += 10

    // Negative items accuracy (20 points)
    totalPoints += 20
    const negativeItemsFound = accuracyMetrics.negativeItemsAccuracy.negativeItemsFound
    if (negativeItemsFound >= 2) accuracyPoints += 20
    else if (negativeItemsFound >= 1) accuracyPoints += 12

    // Inquiries accuracy (10 points)
    totalPoints += 10
    const inquiriesFound = accuracyMetrics.inquiriesAccuracy.inquiriesFound
    if (inquiriesFound >= 2) accuracyPoints += 10
    else if (inquiriesFound >= 1) accuracyPoints += 6

    const overallAccuracyScore = Math.round((accuracyPoints / totalPoints) * 100)

    return NextResponse.json({
      testResult: 'SUCCESS',
      processingTime,
      confidence: analysisResult.confidence,
      accuracyScore: overallAccuracyScore,
      accuracyMetrics,
      analysisQuality: {
        isRealAI: analysisResult.confidence > 70,
        hasRealData: analysisResult.extractedData.personalInfo.name !== 'Extracted from document',
        recommendationsCount: analysisResult.recommendations.length,
        summaryLength: analysisResult.summary.length
      },
      extractedData: {
        personalInfo: analysisResult.extractedData.personalInfo,
        creditScore: analysisResult.extractedData.creditScores.experian?.score,
        accountsCount: analysisResult.extractedData.accounts.length,
        negativeItemsCount: analysisResult.extractedData.negativeItems.length,
        inquiriesCount: analysisResult.extractedData.inquiries.length,
        accounts: analysisResult.extractedData.accounts.map(acc => ({
          creditor: acc.creditorName,
          type: acc.accountType,
          balance: acc.balance
        })),
        negativeItems: analysisResult.extractedData.negativeItems.map(item => ({
          type: item.type,
          creditor: item.creditorName,
          amount: item.amount
        })),
        recommendations: analysisResult.recommendations.map(rec => ({
          priority: rec.priority,
          reason: rec.disputeReason,
          probability: rec.successProbability
        }))
      },
      summary: analysisResult.summary,
      diagnosis: overallAccuracyScore >= 80 
        ? 'EXCELLENT - AI analysis is highly accurate'
        : overallAccuracyScore >= 60 
        ? 'GOOD - AI analysis is mostly accurate with minor issues'
        : overallAccuracyScore >= 40
        ? 'FAIR - AI analysis has some accuracy issues'
        : 'POOR - AI analysis has significant accuracy problems'
    })

  } catch (error) {
    console.error('🧪 [TEST] Real analysis test failed:', error)
    
    return NextResponse.json({
      testResult: 'FAILED',
      error: error instanceof Error ? error.message : 'Unknown error',
      diagnosis: 'AI analysis system is not functioning properly'
    }, { status: 500 })
  }
}