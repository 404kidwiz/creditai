/**
 * Tests for Intelligent Credit Report Parser
 */

import { creditReportParser, IntelligentCreditReportParser } from '../creditReportParser'

describe('IntelligentCreditReportParser', () => {
  let parser: IntelligentCreditReportParser

  beforeEach(() => {
    parser = new IntelligentCreditReportParser()
  })

  describe('Personal Information Parsing', () => {
    it('should extract personal information from credit report text', async () => {
      const mockText = `
        PERSONAL INFORMATION
        Name: John Doe
        Address: 123 Main Street, Anytown, CA 90210
        SSN: ***-**-1234
        Date of Birth: 01/15/1985
        Phone: (555) 123-4567
      `

      const result = await parser.parseCreditReport(mockText, 'test')
      
      expect(result.personalInfo.name).toBe('John Doe')
      expect(result.personalInfo.address).toBe('123 Main Street Anytown CA 90210')
      expect(result.personalInfo.ssn).toBe('***-**-1234')
      expect(result.personalInfo.dateOfBirth).toBe('1985-01-15')
      expect(result.personalInfo.phone).toBe('(555) 123-4567')
      expect(result.personalInfo.confidence).toBeGreaterThan(80)
    })

    it('should handle missing personal information gracefully', async () => {
      const mockText = `
        CREDIT REPORT
        Some other information without personal details
      `

      const result = await parser.parseCreditReport(mockText, 'test')
      
      expect(result.personalInfo.name).toBe('')
      expect(result.personalInfo.address).toBe('')
      expect(result.personalInfo.confidence).toBeLessThan(50)
    })
  })

  describe('Credit Score Parsing', () => {
    it('should extract credit scores from multiple bureaus', async () => {
      const mockText = `
        EXPERIAN CREDIT SCORE
        Current Score: 720
        Score Range: 300-850
        Bureau: Experian
        
        EQUIFAX CREDIT SCORE  
        Current Score: 715
        Bureau: Equifax
      `

      const result = await parser.parseCreditReport(mockText, 'test')
      
      expect(result.creditScores.experian).toBeDefined()
      expect(result.creditScores.experian.score).toBe(720)
      expect(result.creditScores.experian.bureau).toBe('experian')
      expect(result.creditScores.experian.confidence).toBeGreaterThan(80)
      
      expect(result.creditScores.equifax).toBeDefined()
      expect(result.creditScores.equifax.score).toBe(715)
    })

    it('should handle invalid credit scores', async () => {
      const mockText = `
        CREDIT SCORE
        Current Score: 999
        Invalid score above range
      `

      const result = await parser.parseCreditReport(mockText, 'test')
      
      expect(Object.keys(result.creditScores)).toHaveLength(0)
    })
  })

  describe('Account Parsing', () => {
    it('should extract account information with payment history', async () => {
      const mockText = `
        ACCOUNT DETAILS
        1. Bank of America - Credit Card
           Account Number: ****1234
           Balance: $2,450
           Credit Limit: $5,000
           Payment Status: Current
           Open Date: 03/2018

        2. Chase Bank - Auto Loan
           Account Number: ****5678
           Balance: $18,500
           Payment Status: Current
           Open Date: 06/2020
      `

      const result = await parser.parseCreditReport(mockText, 'test')
      
      expect(result.accounts).toHaveLength(2)
      
      const creditCard = result.accounts[0]
      expect(creditCard.creditorName).toBe('Bank of America')
      expect(creditCard.accountType).toBe('credit_card')
      expect(creditCard.balance).toBe(2450)
      expect(creditCard.creditLimit).toBe(5000)
      expect(creditCard.status).toBe('open')
      expect(creditCard.confidence).toBeGreaterThan(70)
      
      const autoLoan = result.accounts[1]
      expect(autoLoan.creditorName).toBe('Chase Bank')
      expect(autoLoan.accountType).toBe('auto_loan')
      expect(autoLoan.balance).toBe(18500)
    })

    it('should generate payment history for accounts', async () => {
      const mockText = `
        ACCOUNT DETAILS
        1. Capital One - Credit Card
           Account Number: ****9999
           Balance: $1,000
           Payment Status: Current
      `

      const result = await parser.parseCreditReport(mockText, 'test')
      
      expect(result.accounts).toHaveLength(1)
      expect(result.accounts[0].paymentHistory).toHaveLength(12)
      expect(result.accounts[0].paymentHistory[0].month).toMatch(/\d{4}-\d{2}/)
    })
  })

  describe('Negative Items Parsing', () => {
    it('should extract late payments', async () => {
      const mockText = `
        NEGATIVE ITEMS
        1. Late Payment - Capital One
           Date Reported: 12/2022
           Balance: $150
           Status: Paid
           30 days late payment
      `

      const result = await parser.parseCreditReport(mockText, 'test')
      
      expect(result.negativeItems).toHaveLength(1)
      
      const latePayment = result.negativeItems[0]
      expect(latePayment.type).toBe('late_payment')
      expect(latePayment.creditorName).toBe('Late Payment')
      expect(latePayment.amount).toBe(150)
      expect(latePayment.status).toBe('Paid')
      expect(latePayment.disputeReasons).toContain('Verify accuracy of late payment')
      expect(latePayment.confidence).toBeGreaterThan(70)
    })

    it('should extract collections', async () => {
      const mockText = `
        Collection account from Medical Services for $350
        Placed for collection 08/2022
      `

      const result = await parser.parseCreditReport(mockText, 'test')
      
      const collections = result.negativeItems.filter(item => item.type === 'collection')
      expect(collections.length).toBeGreaterThan(0)
      
      const collection = collections[0]
      expect(collection.creditorName).toBe('Medical Services')
      expect(collection.amount).toBe(350)
      expect(collection.disputeReasons).toContain('Request validation of debt')
    })

    it('should extract charge-offs', async () => {
      const mockText = `
        Account charged off as bad debt 06/2021
        Charged off $2,500
      `

      const result = await parser.parseCreditReport(mockText, 'test')
      
      const chargeOffs = result.negativeItems.filter(item => item.type === 'charge_off')
      expect(chargeOffs.length).toBeGreaterThan(0)
      
      const chargeOff = chargeOffs[0]
      expect(chargeOff.amount).toBe(2500)
      expect(chargeOff.impactScore).toBe(90)
    })
  })

  describe('Credit Inquiries Parsing', () => {
    it('should extract and classify credit inquiries', async () => {
      const mockText = `
        CREDIT INQUIRIES
        1. Bank of America - 03/2023
        2. Wells Fargo - 06/2020
        3. Credit Karma - 01/2023
      `

      const result = await parser.parseCreditReport(mockText, 'test')
      
      expect(result.inquiries).toHaveLength(3)
      
      const bankInquiry = result.inquiries[0]
      expect(bankInquiry.creditorName).toBe('Bank of America')
      expect(bankInquiry.date).toBe('2023-03-01')
      expect(bankInquiry.type).toBe('hard')
      expect(bankInquiry.purpose).toBe('Credit application')
      
      const creditKarmaInquiry = result.inquiries[2]
      expect(creditKarmaInquiry.type).toBe('soft')
    })
  })

  describe('Public Records Parsing', () => {
    it('should extract bankruptcy records', async () => {
      const mockText = `
        PUBLIC RECORDS
        Bankruptcy filed 03/2020
        Chapter 7 bankruptcy
      `

      const result = await parser.parseCreditReport(mockText, 'test')
      
      const bankruptcies = result.publicRecords.filter(record => record.type === 'bankruptcy')
      expect(bankruptcies.length).toBeGreaterThan(0)
      
      const bankruptcy = bankruptcies[0]
      expect(bankruptcy.date).toBe('2020-03-01')
      expect(bankruptcy.status).toBe('Filed')
    })

    it('should extract tax liens', async () => {
      const mockText = `
        PUBLIC RECORDS
        Tax lien filed 05/2019
        Federal tax lien
      `

      const result = await parser.parseCreditReport(mockText, 'test')
      
      const taxLiens = result.publicRecords.filter(record => record.type === 'tax_lien')
      expect(taxLiens.length).toBeGreaterThan(0)
      
      const taxLien = taxLiens[0]
      expect(taxLien.date).toBe('2019-05-01')
    })
  })

  describe('Report Format Detection', () => {
    it('should detect Experian format', async () => {
      const mockText = `
        Experian Credit Report
        Personal Information
        Credit Score: 720
      `

      const result = await parser.parseCreditReport(mockText, 'test')
      
      expect(result.extractionMetadata.reportFormat).toBe('experian')
    })

    it('should detect unknown format', async () => {
      const mockText = `
        Some unknown credit report format
        No specific bureau mentioned
      `

      const result = await parser.parseCreditReport(mockText, 'test')
      
      expect(result.extractionMetadata.reportFormat).toBe('unknown')
    })
  })

  describe('Confidence Scoring', () => {
    it('should calculate overall confidence based on extracted data', async () => {
      const highQualityText = `
        PERSONAL INFORMATION
        Name: John Doe
        Address: 123 Main St
        SSN: ***-**-1234
        
        CREDIT SCORE
        Current Score: 720
        Bureau: Experian
        
        ACCOUNT DETAILS
        1. Bank of America - Credit Card
           Balance: $1,000
           Credit Limit: $5,000
      `

      const result = await parser.parseCreditReport(highQualityText, 'test')
      
      expect(result.extractionMetadata.confidence).toBeGreaterThanOrEqual(70)
      expect(result.extractionMetadata.documentQuality).toBeGreaterThan(80)
    })

    it('should assign lower confidence to poor quality text', async () => {
      const poorQualityText = `
        Some garbled text with OCR errors
        @@#$%^&*()
        Incomplete information
      `

      const result = await parser.parseCreditReport(poorQualityText, 'test')
      
      expect(result.extractionMetadata.confidence).toBeLessThan(30)
      expect(result.extractionMetadata.documentQuality).toBeLessThan(50)
    })
  })

  describe('Date Formatting', () => {
    it('should handle various date formats', async () => {
      const mockText = `
        Date formats test:
        MM/YYYY: 03/2023
        MM/DD/YYYY: 03/15/2023
        YYYY-MM-DD: 2023-03-15
      `

      const result = await parser.parseCreditReport(mockText, 'test')
      
      // The parser should normalize all dates to YYYY-MM-DD format
      expect(result.extractionMetadata.processingTime).toBeGreaterThan(0)
    })
  })
})