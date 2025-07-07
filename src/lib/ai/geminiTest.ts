import { creditAnalyzer } from './creditAnalyzer'

/**
 * Test Gemini AI integration with sample credit report data
 */
export async function testGeminiIntegration(): Promise<void> {
  const sampleCreditReportText = `
CREDIT REPORT - EQUIFAX

Personal Information:
Name: John Smith
Address: 123 Main St, Anytown, CA 90210
SSN: XXX-XX-1234
Date of Birth: 01/15/1985

Credit Score: 680 (Range: 300-850)
Report Date: 2024-01-07

CREDIT ACCOUNTS:
1. Chase Credit Card
   Account: XXXX-XXXX-XXXX-5678
   Balance: $2,350
   Credit Limit: $5,000
   Status: Open
   Payment History: 30 days late (2 times in last 12 months)
   Opened: 03/2020
   Last Reported: 12/2023

2. Wells Fargo Auto Loan
   Account: XXXX-XXXX-4567
   Balance: $15,600
   Original Amount: $25,000
   Status: Open
   Payment History: Current
   Opened: 06/2022
   Last Reported: 12/2023

NEGATIVE ITEMS:
1. Capital One Collection
   Account: XXXX-7890
   Original Creditor: Capital One
   Balance: $850
   Date Opened: 09/2023
   Status: Collection Account
   
2. Medical Collection - ABC Medical Center
   Account: MED-5432
   Balance: $425
   Date: 05/2023
   Status: Paid Collection

INQUIRIES (Last 24 months):
1. Chase Bank - Hard Inquiry - 03/15/2023 - Credit Card Application
2. CarMax Auto - Hard Inquiry - 06/10/2022 - Auto Loan

PUBLIC RECORDS:
None reported
`

  try {
    console.log('Testing Gemini AI integration...')
    
    const analysis = await creditAnalyzer.analyzeReport(sampleCreditReportText, 'test-user-id')
    
    console.log('✅ Gemini AI integration successful!')
    console.log('Credit Score:', analysis.extractedData.creditScore.score)
    console.log('Negative Items:', analysis.extractedData.negativeItems.length)
    console.log('Recommendations:', analysis.recommendations.length)
    console.log('Summary:', analysis.summary.substring(0, 100) + '...')
    
    return analysis
  } catch (error) {
    console.error('❌ Gemini AI integration failed:', error)
    throw error
  }
}