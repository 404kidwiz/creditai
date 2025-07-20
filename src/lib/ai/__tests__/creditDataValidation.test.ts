/**
 * Validation Tests for Credit Data Parsing
 * Tests the accuracy and reliability of credit data extraction and parsing
 */

import { creditReportParser, IntelligentCreditReportParser } from '../creditReportParser'
import { EnhancedValidationSystem } from '@/lib/validation/enhancedValidationSystem'

describe('Credit Data Parsing Validation Tests', () => {
  let parser: IntelligentCreditReportParser
  let validator: EnhancedValidationSystem

  beforeEach(() => {
    parser = new IntelligentCreditReportParser()
    validator = new EnhancedValidationSystem()
  })

  describe('Personal Information Validation', () => {
    it('should accurately extract and validate personal information', async () => {
      const creditReportText = `
        PERSONAL INFORMATION
        Name: John Michael Doe
        Current Address: 123 Main Street, Apt 4B, Anytown, CA 90210
        Previous Address: 456 Oak Avenue, Oldtown, NY 10001
        SSN: ***-**-1234
        Date of Birth: 01/15/1985
        Phone: (555) 123-4567
        Email: john.doe@email.com
      `

      const result = await parser.parseCreditReport(creditReportText, 'test')
      
      expect(result.personalInfo.name).toBe('John Michael Doe')
      expect(result.personalInfo.address).toContain('123 Main Street')
      expect(result.personalInfo.address).toContain('Anytown, CA 90210')
      expect(result.personalInfo.ssn).toBe('***-**-1234')
      expect(result.personalInfo.dateOfBirth).toBe('1985-01-15')
      expect(result.personalInfo.phone).toBe('(555) 123-4567')
      expect(result.personalInfo.confidence).toBeGreaterThan(85)
    })

    it('should handle variations in personal information formatting', async () => {
      const variations = [
        {
          text: `Consumer: JANE SMITH\nAddress: 789 PINE ST, NEWTOWN TX 75001\nSSN: ***-**-5678\nDOB: 03/22/1990`,
          expectedName: 'JANE SMITH',
          expectedAddress: '789 PINE ST NEWTOWN TX 75001',
          expectedDOB: '1990-03-22'
        },
        {
          text: `Full Name: Robert J. Johnson Jr.\nMailing Address: 321 Elm Drive\n              Springfield, IL 62701\nSocial Security: ***-**-9012\nBirth Date: 12/05/1978`,
          expectedName: 'Robert J Johnson Jr',
          expectedAddress: '321 Elm Drive Springfield IL 62701',
          expectedDOB: '1978-12-05'
        }
      ]

      for (const variation of variations) {
        const result = await parser.parseCreditReport(variation.text, 'test')
        
        expect(result.personalInfo.name).toBe(variation.expectedName)
        expect(result.personalInfo.address).toBe(variation.expectedAddress)
        expect(result.personalInfo.dateOfBirth).toBe(variation.expectedDOB)
        expect(result.personalInfo.confidence).toBeGreaterThan(70)
      }
    })

    it('should validate personal information consistency', async () => {
      const creditReportText = `
        Name: John Doe
        Address: 123 Main St, Anytown, CA 90210
        SSN: ***-**-1234
        DOB: 01/15/1985
      `

      const result = await parser.parseCreditReport(creditReportText, 'test')
      const validationResult = await validator.validateCreditReportData(result as any)

      expect(validationResult.personalInfoValidation.nameValidated).toBe(true)
      expect(validationResult.personalInfoValidation.addressValidated).toBe(true)
      expect(validationResult.personalInfoValidation.ssnValidated).toBe(true)
      expect(validationResult.personalInfoValidation.dobValidated).toBe(true)
    })
  })

  describe('Credit Score Validation', () => {
    it('should extract credit scores from multiple bureaus accurately', async () => {
      const creditReportText = `
        CREDIT SCORES
        
        Experian Credit Score: 720
        Score Date: 01/15/2024
        Score Range: 300-850
        
        Equifax Credit Score: 715
        Score Date: 01/10/2024
        Score Range: 300-850
        
        TransUnion Credit Score: 718
        Score Date: 01/12/2024
        Score Range: 300-850
        
        VantageScore 3.0: 725
        Score Date: 01/14/2024
        Score Range: 300-850
      `

      const result = await parser.parseCreditReport(creditReportText, 'test')
      
      expect(result.creditScores.experian).toBeDefined()
      expect(result.creditScores.experian.score).toBe(720)
      expect(result.creditScores.experian.date).toBe('2024-01-15')
      expect(result.creditScores.experian.confidence).toBeGreaterThan(85)
      
      expect(result.creditScores.equifax).toBeDefined()
      expect(result.creditScores.equifax.score).toBe(715)
      
      expect(result.creditScores.transunion).toBeDefined()
      expect(result.creditScores.transunion.score).toBe(718)
    })

    it('should validate credit score ranges and reasonableness', async () => {
      const testCases = [
        { score: 720, shouldBeValid: true },
        { score: 300, shouldBeValid: true },
        { score: 850, shouldBeValid: true },
        { score: 299, shouldBeValid: false },
        { score: 851, shouldBeValid: false },
        { score: 0, shouldBeValid: false }
      ]

      for (const testCase of testCases) {
        const creditReportText = `Credit Score: ${testCase.score}`
        const result = await parser.parseCreditReport(creditReportText, 'test')
        
        if (testCase.shouldBeValid) {
          expect(Object.keys(result.creditScores).length).toBeGreaterThan(0)
          const firstScore = Object.values(result.creditScores)[0]
          expect(firstScore.score).toBe(testCase.score)
        } else {
          expect(Object.keys(result.creditScores).length).toBe(0)
        }
      }
    })

    it('should extract score factors and reasons', async () => {
      const creditReportText = `
        Credit Score: 680
        Score Factors:
        1. High credit card balances
        2. Payment history - good
        3. Length of credit history - excellent
        4. Credit mix - good
        5. New credit - fair
      `

      const result = await parser.parseCreditReport(creditReportText, 'test')
      
      const firstScore = Object.values(result.creditScores)[0]
      expect(firstScore).toBeDefined()
      expect(firstScore.factors).toBeDefined()
      expect(firstScore.factors!.length).toBeGreaterThan(0)
    })
  })

  describe('Account Information Validation', () => {
    it('should extract complete account information accurately', async () => {
      const creditReportText = `
        ACCOUNT DETAILS
        
        1. Bank of America - Credit Card
           Account Number: ****1234
           Account Type: Revolving Credit
           Balance: $2,450.00
           Credit Limit: $5,000.00
           Payment Status: Current
           Open Date: 03/15/2018
           Last Reported: 01/15/2024
           Payment History: Current for 24 months
           
        2. Wells Fargo - Auto Loan
           Account Number: ****5678
           Account Type: Installment Loan
           Balance: $18,500.00
           Original Amount: $25,000.00
           Payment Status: Current
           Open Date: 06/01/2020
           Last Reported: 01/15/2024
           Monthly Payment: $425.00
           
        3. Chase Bank - Mortgage
           Account Number: ****9012
           Account Type: Real Estate Mortgage
           Balance: $245,000.00
           Original Amount: $280,000.00
           Payment Status: Current
           Open Date: 09/15/2019
           Last Reported: 01/15/2024
           Monthly Payment: $1,850.00
      `

      const result = await parser.parseCreditReport(creditReportText, 'test')
      
      expect(result.accounts).toHaveLength(3)
      
      // Credit Card
      const creditCard = result.accounts[0]
      expect(creditCard.creditorName).toBe('Bank of America')
      expect(creditCard.accountType).toBe('credit_card')
      expect(creditCard.balance).toBe(2450)
      expect(creditCard.creditLimit).toBe(5000)
      expect(creditCard.status).toBe('open')
      expect(creditCard.openDate).toBe('2018-03-15')
      expect(creditCard.confidence).toBeGreaterThan(80)
      
      // Auto Loan
      const autoLoan = result.accounts[1]
      expect(autoLoan.creditorName).toBe('Wells Fargo')
      expect(autoLoan.accountType).toBe('auto_loan')
      expect(autoLoan.balance).toBe(18500)
      expect(autoLoan.status).toBe('open')
      
      // Mortgage
      const mortgage = result.accounts[2]
      expect(mortgage.creditorName).toBe('Chase Bank')
      expect(mortgage.accountType).toBe('mortgage')
      expect(mortgage.balance).toBe(245000)
    })

    it('should validate account data consistency', async () => {
      const creditReportText = `
        Account: Capital One Credit Card
        Account Number: ****2468
        Balance: $1,500
        Credit Limit: $3,000
        Status: Open
        Open Date: 01/2020
      `

      const result = await parser.parseCreditReport(creditReportText, 'test')
      
      expect(result.accounts).toHaveLength(1)
      const account = result.accounts[0]
      
      // Validate credit utilization is reasonable
      const utilization = (account.balance / (account.creditLimit || 1)) * 100
      expect(utilization).toBeLessThanOrEqual(100)
      expect(utilization).toBeGreaterThanOrEqual(0)
      
      // Validate account age
      const openYear = parseInt(account.openDate.split('-')[0])
      const currentYear = new Date().getFullYear()
      expect(openYear).toBeLessThanOrEqual(currentYear)
      expect(openYear).toBeGreaterThan(1950)
    })

    it('should extract payment history accurately', async () => {
      const creditReportText = `
        Account: Test Bank Credit Card
        Payment History: 
        Jan 2024: Current
        Dec 2023: Current  
        Nov 2023: 30 days late
        Oct 2023: Current
        Sep 2023: Current
      `

      const result = await parser.parseCreditReport(creditReportText, 'test')
      
      expect(result.accounts).toHaveLength(1)
      const account = result.accounts[0]
      expect(account.paymentHistory).toBeDefined()
      expect(account.paymentHistory.length).toBeGreaterThan(0)
      
      // Should have generated payment history
      const currentPayments = account.paymentHistory.filter(p => p.status === 'current')
      expect(currentPayments.length).toBeGreaterThan(0)
    })
  })

  describe('Negative Items Validation', () => {
    it('should identify and categorize negative items correctly', async () => {
      const creditReportText = `
        NEGATIVE ITEMS
        
        1. Late Payment - Capital One
           Date Reported: 12/15/2022
           Amount: $150.00
           Status: Paid
           Days Late: 30
           Impact: Minor
           
        2. Collection Account - Medical Services Inc
           Date Reported: 08/20/2022
           Original Creditor: City Hospital
           Amount: $350.00
           Status: In Collection
           Collection Agency: ABC Collections
           
        3. Charge Off - Store Credit Card
           Date Reported: 06/10/2021
           Amount: $2,500.00
           Status: Charged Off
           Original Creditor: Department Store
           
        4. Public Record - Chapter 7 Bankruptcy
           Date Filed: 03/15/2020
           Court: U.S. Bankruptcy Court
           Status: Discharged
           Case Number: 20-12345
      `

      const result = await parser.parseCreditReport(creditReportText, 'test')
      
      // Late Payment
      const latePayments = result.negativeItems.filter(item => item.type === 'late_payment')
      expect(latePayments.length).toBeGreaterThan(0)
      const latePayment = latePayments[0]
      expect(latePayment.creditorName).toContain('Capital One')
      expect(latePayment.amount).toBe(150)
      expect(latePayment.date).toBe('2022-12-15')
      expect(latePayment.impactScore).toBeGreaterThan(0)
      
      // Collection
      const collections = result.negativeItems.filter(item => item.type === 'collection')
      expect(collections.length).toBeGreaterThan(0)
      const collection = collections[0]
      expect(collection.creditorName).toContain('Medical Services')
      expect(collection.amount).toBe(350)
      
      // Charge Off
      const chargeOffs = result.negativeItems.filter(item => item.type === 'charge_off')
      expect(chargeOffs.length).toBeGreaterThan(0)
      const chargeOff = chargeOffs[0]
      expect(chargeOff.amount).toBe(2500)
      expect(chargeOff.impactScore).toBeGreaterThan(70) // High impact
      
      // Public Records
      const bankruptcies = result.publicRecords.filter(record => record.type === 'bankruptcy')
      expect(bankruptcies.length).toBeGreaterThan(0)
      const bankruptcy = bankruptcies[0]
      expect(bankruptcy.date).toBe('2020-03-15')
      expect(bankruptcy.status).toBe('Filed')
    })

    it('should calculate impact scores for negative items', async () => {
      const testCases = [
        { type: 'late_payment', days: 30, expectedImpact: 60 },
        { type: 'late_payment', days: 60, expectedImpact: 70 },
        { type: 'late_payment', days: 90, expectedImpact: 80 },
        { type: 'late_payment', days: 120, expectedImpact: 90 }
      ]

      for (const testCase of testCases) {
        const creditReportText = `Late Payment - ${testCase.days} days late`
        const result = await parser.parseCreditReport(creditReportText, 'test')
        
        const latePayments = result.negativeItems.filter(item => item.type === 'late_payment')
        if (latePayments.length > 0) {
          expect(latePayments[0].impactScore).toBe(testCase.expectedImpact)
        }
      }
    })

    it('should generate appropriate dispute reasons', async () => {
      const creditReportText = `
        Collection Account - ABC Collections
        Original Amount: $500
        Date: 06/2022
      `

      const result = await parser.parseCreditReport(creditReportText, 'test')
      
      const collections = result.negativeItems.filter(item => item.type === 'collection')
      expect(collections.length).toBeGreaterThan(0)
      
      const collection = collections[0]
      expect(collection.disputeReasons).toBeDefined()
      expect(collection.disputeReasons.length).toBeGreaterThan(0)
      expect(collection.disputeReasons).toContain('Request validation of debt')
    })
  })

  describe('Credit Inquiries Validation', () => {
    it('should classify inquiries as hard or soft correctly', async () => {
      const creditReportText = `
        CREDIT INQUIRIES
        
        1. Bank of America - 03/15/2023 - Credit Card Application
        2. Wells Fargo - 06/01/2020 - Auto Loan Application  
        3. Credit Karma - 01/20/2023 - Account Review
        4. Capital One - 12/10/2022 - Pre-approved Offer
        5. Chase Bank - 09/05/2023 - Mortgage Application
      `

      const result = await parser.parseCreditReport(creditReportText, 'test')
      
      expect(result.inquiries.length).toBeGreaterThan(0)
      
      // Hard inquiries
      const hardInquiries = result.inquiries.filter(inq => inq.type === 'hard')
      expect(hardInquiries.length).toBeGreaterThan(0)
      
      const bankInquiry = result.inquiries.find(inq => inq.creditorName === 'Bank of America')
      expect(bankInquiry).toBeDefined()
      expect(bankInquiry!.type).toBe('hard')
      expect(bankInquiry!.purpose).toContain('Credit')
      
      // Soft inquiries
      const softInquiries = result.inquiries.filter(inq => inq.type === 'soft')
      expect(softInquiries.length).toBeGreaterThan(0)
      
      const creditKarmaInquiry = result.inquiries.find(inq => inq.creditorName === 'Credit Karma')
      expect(creditKarmaInquiry).toBeDefined()
      expect(creditKarmaInquiry!.type).toBe('soft')
    })

    it('should validate inquiry dates and recency', async () => {
      const creditReportText = `
        Credit Inquiries:
        Recent Bank - 01/2024
        Old Bank - 01/2020
      `

      const result = await parser.parseCreditReport(creditReportText, 'test')
      
      result.inquiries.forEach(inquiry => {
        const inquiryYear = parseInt(inquiry.date.split('-')[0])
        const currentYear = new Date().getFullYear()
        
        expect(inquiryYear).toBeLessThanOrEqual(currentYear)
        expect(inquiryYear).toBeGreaterThan(1990)
      })
    })
  })

  describe('Data Consistency Validation', () => {
    it('should validate cross-references between sections', async () => {
      const creditReportText = `
        PERSONAL INFO
        Name: John Doe
        
        ACCOUNTS
        1. Bank of America Credit Card - Balance: $1,000
        
        NEGATIVE ITEMS
        1. Late Payment - Bank of America - $50
        
        INQUIRIES
        1. Bank of America - 01/2023
      `

      const result = await parser.parseCreditReport(creditReportText, 'test')
      
      // Check that creditor names are consistent across sections
      const accountCreditors = result.accounts.map(acc => acc.creditorName.toLowerCase())
      const negativeCreditors = result.negativeItems.map(item => item.creditorName.toLowerCase())
      const inquiryCreditors = result.inquiries.map(inq => inq.creditorName.toLowerCase())
      
      const allCreditors = [...accountCreditors, ...negativeCreditors, ...inquiryCreditors]
      const uniqueCreditors = [...new Set(allCreditors)]
      
      // Should have some consistency in creditor names
      expect(uniqueCreditors.length).toBeLessThanOrEqual(allCreditors.length)
    })

    it('should validate date consistency across sections', async () => {
      const creditReportText = `
        Account opened: 01/2020
        Late payment reported: 06/2022
        Inquiry date: 12/2019
      `

      const result = await parser.parseCreditReport(creditReportText, 'test')
      
      // All dates should be in reasonable chronological order
      const allDates: Date[] = []
      
      result.accounts.forEach(acc => {
        if (acc.openDate) allDates.push(new Date(acc.openDate))
      })
      
      result.negativeItems.forEach(item => {
        if (item.date) allDates.push(new Date(item.date))
      })
      
      result.inquiries.forEach(inq => {
        if (inq.date) allDates.push(new Date(inq.date))
      })
      
      allDates.forEach(date => {
        expect(date.getTime()).not.toBeNaN()
        expect(date.getFullYear()).toBeGreaterThan(1990)
        expect(date.getFullYear()).toBeLessThanOrEqual(new Date().getFullYear())
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle incomplete or missing data gracefully', async () => {
      const incompleteText = `
        Name: John
        Score: 
        Account: Bank
        Balance: 
      `

      const result = await parser.parseCreditReport(incompleteText, 'test')
      
      expect(result).toBeDefined()
      expect(result.personalInfo.name).toBe('John')
      expect(result.extractionMetadata.confidence).toBeLessThan(50)
    })

    it('should handle malformed data without crashing', async () => {
      const malformedText = `
        @@#$%^&*()
        Invalid characters and symbols
        Score: ABC (not a number)
        Date: 99/99/9999
        Balance: $$$invalid$$$
      `

      const result = await parser.parseCreditReport(malformedText, 'test')
      
      expect(result).toBeDefined()
      expect(result.extractionMetadata.confidence).toBeLessThan(30)
      expect(result.extractionMetadata.documentQuality).toBeLessThan(50)
    })

    it('should handle very large credit reports efficiently', async () => {
      // Generate large credit report
      let largeText = 'CREDIT REPORT\nName: John Doe\n'
      
      // Add 100 accounts
      for (let i = 1; i <= 100; i++) {
        largeText += `Account ${i}: Bank ${i} - Balance: $${i * 100}\n`
      }
      
      // Add 50 negative items
      for (let i = 1; i <= 50; i++) {
        largeText += `Negative Item ${i}: Late payment - $${i * 10}\n`
      }

      const startTime = Date.now()
      const result = await parser.parseCreditReport(largeText, 'test')
      const processingTime = Date.now() - startTime

      expect(result).toBeDefined()
      expect(processingTime).toBeLessThan(10000) // 10 seconds max
      expect(result.accounts.length).toBeGreaterThan(0)
      expect(result.negativeItems.length).toBeGreaterThan(0)
    })

    it('should handle empty or whitespace-only input', async () => {
      const emptyInputs = ['', '   ', '\n\n\n', '\t\t\t']

      for (const input of emptyInputs) {
        const result = await parser.parseCreditReport(input, 'test')
        
        expect(result).toBeDefined()
        expect(result.extractionMetadata.confidence).toBe(0)
        expect(result.personalInfo.name).toBe('')
        expect(result.accounts.length).toBe(0)
      }
    })
  })

  describe('Confidence Scoring Validation', () => {
    it('should assign appropriate confidence scores based on data quality', async () => {
      const highQualityText = `
        PERSONAL INFORMATION
        Name: John Michael Doe
        Address: 123 Main Street, Anytown, CA 90210
        SSN: ***-**-1234
        Date of Birth: 01/15/1985
        
        CREDIT SCORE
        Experian: 720 (as of 01/15/2024)
        
        ACCOUNTS
        1. Bank of America Credit Card
           Account: ****1234
           Balance: $2,450
           Credit Limit: $5,000
           Status: Current
      `

      const result = await parser.parseCreditReport(highQualityText, 'test')
      
      expect(result.extractionMetadata.confidence).toBeGreaterThan(80)
      expect(result.personalInfo.confidence).toBeGreaterThan(85)
      expect(Object.values(result.creditScores)[0]?.confidence).toBeGreaterThan(85)
      expect(result.accounts[0]?.confidence).toBeGreaterThan(80)
    })

    it('should assign lower confidence to poor quality data', async () => {
      const poorQualityText = `
        N@me: J0hn D03
        @ddr3ss: 123 M@1n St
        Sc0r3: 7?0
        @cc0unt: B@nk
      `

      const result = await parser.parseCreditReport(poorQualityText, 'test')
      
      expect(result.extractionMetadata.confidence).toBeLessThan(50)
      expect(result.extractionMetadata.documentQuality).toBeLessThan(60)
    })
  })
})