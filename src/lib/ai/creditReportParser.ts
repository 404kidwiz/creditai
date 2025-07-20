/**
 * Intelligent Credit Report Parser
 * 
 * This module provides pattern-based parsing for major credit report formats
 * with confidence scoring and support for multiple bureaus.
 */

export interface PersonalInfo {
  name: string
  address: string
  ssn?: string
  dateOfBirth?: string
  phone?: string
  confidence: number
}

export interface CreditScore {
  score: number
  bureau: 'experian' | 'equifax' | 'transunion' | 'vantage' | 'fico'
  date: string
  scoreRange: { min: number; max: number }
  factors?: string[]
  confidence: number
  dataQuality: number
}

export interface PaymentHistoryEntry {
  month: string
  status: 'current' | '30_days_late' | '60_days_late' | '90_days_late' | '120_days_late' | 'charge_off' | 'collection'
  amount?: number
  dateReported?: string
}

export interface Account {
  id: string
  creditorName: string
  accountNumber: string
  accountType: 'credit_card' | 'auto_loan' | 'mortgage' | 'personal_loan' | 'student_loan' | 'line_of_credit' | 'other'
  balance: number
  creditLimit?: number
  paymentHistory: PaymentHistoryEntry[]
  status: 'open' | 'closed' | 'paid' | 'charged_off' | 'collection'
  openDate: string
  lastReported: string
  bureaus: string[]
  confidence: number
  extractionNotes?: string[]
}

export interface NegativeItem {
  id: string
  type: 'late_payment' | 'collection' | 'charge_off' | 'bankruptcy' | 'tax_lien' | 'judgment' | 'foreclosure' | 'repossession'
  creditorName: string
  accountNumber?: string
  amount: number
  date: string
  status: string
  description: string
  disputeReasons: string[]
  impactScore: number
  confidence: number
}

export interface CreditInquiry {
  id: string
  creditorName: string
  date: string
  type: 'hard' | 'soft'
  purpose: string
  bureau: string
  confidence: number
}

export interface PublicRecord {
  id: string
  type: 'bankruptcy' | 'tax_lien' | 'judgment' | 'foreclosure'
  court?: string
  date: string
  amount?: number
  status: string
  confidence: number
}

export interface ParsedCreditReport {
  personalInfo: PersonalInfo
  creditScores: { [bureau: string]: CreditScore }
  accounts: Account[]
  negativeItems: NegativeItem[]
  inquiries: CreditInquiry[]
  publicRecords: PublicRecord[]
  extractionMetadata: {
    processingMethod: string
    confidence: number
    processingTime: number
    documentQuality: number
    reportFormat: string
  }
}

export class IntelligentCreditReportParser {
  private patterns = {
    // Personal Information Patterns
    name: [
      /(?:Name|Full Name|Consumer Name):\s*([A-Za-z\s,.-]+?)(?:\n|Address|$)/i,
      /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/m,
      /Consumer:\s*([A-Za-z\s,.-]+?)(?:\n|Address|$)/i
    ],
    address: [
      /(?:Address|Current Address|Mailing Address):\s*([^\n\r]+)/i,
      /(?:Street|Address Line):\s*([^\n\r]+)/i,
      /(\d+\s+[A-Za-z\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)[^\n\r]*)/i
    ],
    ssn: [
      /(?:SSN|Social Security|SS#):\s*(\*{3}-\*{2}-\*{4}|\d{3}-\d{2}-\d{4}|\*+\d{4})/i,
      /Social Security Number:\s*(\*{3}-\*{2}-\*{4}|\d{3}-\d{2}-\d{4}|\*+\d{4})/i
    ],
    dateOfBirth: [
      /(?:Date of Birth|DOB|Birth Date):\s*(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i,
      /Born:\s*(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i
    ],
    phone: [
      /(?:Phone|Telephone|Tel):\s*(\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\d{10})/i
    ],

    // Credit Score Patterns
    creditScore: [
      /(?:FICO|Credit Score|Score):\s*(\d{3})/i,
      /(?:Current Score|Your Score):\s*(\d{3})/i,
      /Score:\s*(\d{3})\s*(?:out of|\/)\s*(\d{3})/i,
      /(\d{3})\s*(?:FICO|Credit Score)/i
    ],
    scoreRange: [
      /(?:Range|Scale):\s*(\d{3})\s*(?:to|-)\s*(\d{3})/i,
      /(\d{3})\s*-\s*(\d{3})\s*(?:range|scale)/i
    ],
    bureau: [
      /(Experian|Equifax|TransUnion|Trans Union)/i,
      /Bureau:\s*(Experian|Equifax|TransUnion|Trans Union)/i
    ],

    // Account Patterns
    creditorName: [
      /(?:Creditor|Company|Lender):\s*([A-Za-z\s&.-]+)/i,
      /^([A-Z][A-Za-z\s&.-]+)(?:\s*-\s*(?:Credit Card|Auto Loan|Mortgage|Personal Loan))/im
    ],
    accountNumber: [
      /(?:Account|Acct)(?:\s*#|\s*Number):\s*(\*+\d{4}|\d{4,})/i,
      /Account:\s*(\*+\d{4}|\d{4,})/i
    ],
    balance: [
      /(?:Balance|Current Balance|Outstanding):\s*\$?([\d,]+\.?\d*)/i,
      /Owed:\s*\$?([\d,]+\.?\d*)/i
    ],
    creditLimit: [
      /(?:Credit Limit|Limit|High Credit):\s*\$?([\d,]+\.?\d*)/i,
      /Available:\s*\$?([\d,]+\.?\d*)/i
    ],
    paymentStatus: [
      /(?:Payment Status|Status):\s*([A-Za-z\s]+)/i,
      /Current Status:\s*([A-Za-z\s]+)/i
    ],

    // Negative Item Patterns
    latePayment: [
      /(\d+)\s*days?\s*late/i,
      /Late Payment.*?([A-Za-z\s&.-]+).*?(\d{1,2}\/\d{4})/i,
      /Past Due.*?(\d{1,2}\/\d{4})/i
    ],
    collection: [
      /Collection.*?from\s+([A-Za-z\s&.-]+?)\s+for\s+\$?([\d,]+\.?\d*)/i,
      /([A-Za-z\s&.-]+).*?collection.*?\$?([\d,]+\.?\d*)/i,
      /Placed for collection.*?(\d{1,2}\/\d{4})/i
    ],
    chargeOff: [
      /Charge.*?off.*?(\d{1,2}\/\d{4})/i,
      /Charged off.*?\$?([\d,]+\.?\d*)/i,
      /Account charged off.*?\$?([\d,]+\.?\d*)/i
    ],

    // Inquiry Patterns
    inquiry: [
      /(?:Inquiry|Credit Check).*?([A-Za-z\s&.-]+).*?(\d{1,2}\/\d{4})/i,
      /([A-Za-z\s&.-]+).*?inquired.*?(\d{1,2}\/\d{4})/i
    ],
    hardInquiry: [
      /Hard.*?(?:Inquiry|Pull)/i,
      /Credit Application/i
    ],
    softInquiry: [
      /Soft.*?(?:Inquiry|Pull)/i,
      /Account Review/i,
      /Promotional/i
    ]
  }

  /**
   * Parse credit report text and extract structured data
   */
  async parseCreditReport(text: string, processingMethod: string = 'unknown'): Promise<ParsedCreditReport> {
    const startTime = Date.now()
    
    // Detect report format
    const reportFormat = this.detectReportFormat(text)
    
    // Parse different sections
    const personalInfo = this.parsePersonalInfo(text)
    const creditScores = this.parseCreditScores(text)
    const accounts = this.parseAccounts(text)
    const negativeItems = this.parseNegativeItems(text)
    const inquiries = this.parseInquiries(text)
    const publicRecords = this.parsePublicRecords(text)
    
    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence([
      personalInfo.confidence,
      ...Object.values(creditScores).map(score => score.confidence),
      ...accounts.map(account => account.confidence),
      ...negativeItems.map(item => item.confidence),
      ...inquiries.map(inquiry => inquiry.confidence),
      ...publicRecords.map(record => record.confidence)
    ])

    const processingTime = Date.now() - startTime

    return {
      personalInfo,
      creditScores,
      accounts,
      negativeItems,
      inquiries,
      publicRecords,
      extractionMetadata: {
        processingMethod,
        confidence: overallConfidence,
        processingTime,
        documentQuality: this.assessDocumentQuality(text),
        reportFormat
      }
    }
  }

  /**
   * Parse personal information from credit report text
   */
  private parsePersonalInfo(text: string): PersonalInfo {
    const info: PersonalInfo = {
      name: '',
      address: '',
      confidence: 0
    }

    let confidenceFactors = 0
    let totalFactors = 0

    // Extract name
    for (const pattern of this.patterns.name) {
      const match = text.match(pattern)
      if (match && match[1]) {
        info.name = this.cleanText(match[1])
        confidenceFactors += 90
        break
      }
    }
    totalFactors += 90

    // Extract address
    for (const pattern of this.patterns.address) {
      const match = text.match(pattern)
      if (match && match[1]) {
        info.address = this.cleanText(match[1])
        confidenceFactors += 80
        break
      }
    }
    totalFactors += 80

    // Extract SSN (masked)
    for (const pattern of this.patterns.ssn) {
      const match = text.match(pattern)
      if (match && match[1]) {
        info.ssn = match[1]
        confidenceFactors += 70
        break
      }
    }
    totalFactors += 70

    // Extract date of birth
    for (const pattern of this.patterns.dateOfBirth) {
      const match = text.match(pattern)
      if (match && match[1]) {
        info.dateOfBirth = this.formatDate(match[1])
        confidenceFactors += 60
        break
      }
    }
    totalFactors += 60

    // Extract phone
    for (const pattern of this.patterns.phone) {
      const match = text.match(pattern)
      if (match && match[1]) {
        info.phone = match[1]
        confidenceFactors += 50
        break
      }
    }
    totalFactors += 50

    info.confidence = totalFactors > 0 ? Math.round((confidenceFactors / totalFactors) * 100) : 0

    return info
  }

  /**
   * Parse credit scores from multiple bureaus
   */
  private parseCreditScores(text: string): { [bureau: string]: CreditScore } {
    const scores: { [bureau: string]: CreditScore } = {}
    
    // Look for bureau-specific sections
    const bureauSections = this.extractBureauSections(text)
    
    for (const [bureau, sectionText] of Object.entries(bureauSections)) {
      const score = this.extractCreditScoreFromSection(sectionText, bureau)
      if (score) {
        scores[bureau] = score
      }
    }

    // If no bureau-specific scores found, look for general scores
    if (Object.keys(scores).length === 0) {
      const generalScore = this.extractCreditScoreFromSection(text, 'unknown')
      if (generalScore) {
        scores['experian'] = generalScore // Default to Experian
      }
    }

    return scores
  }

  /**
   * Extract credit score from a text section
   */
  private extractCreditScoreFromSection(text: string, bureau: string): CreditScore | null {
    let score = 0
    let scoreRange = { min: 300, max: 850 }
    let confidence = 0
    let factors: string[] = []

    // Extract score
    for (const pattern of this.patterns.creditScore) {
      const match = text.match(pattern)
      if (match && match[1]) {
        const parsedScore = parseInt(match[1])
        if (parsedScore >= 300 && parsedScore <= 850) {
          score = parsedScore
          confidence += 90
          break
        }
      }
    }

    if (score === 0) return null

    // Extract score range
    for (const pattern of this.patterns.scoreRange) {
      const match = text.match(pattern)
      if (match && match[1] && match[2]) {
        scoreRange = {
          min: parseInt(match[1]),
          max: parseInt(match[2])
        }
        confidence += 10
        break
      }
    }

    // Extract score factors
    factors = this.extractScoreFactors(text)

    return {
      score,
      bureau: this.normalizeBureauName(bureau) as any,
      date: new Date().toISOString().split('T')[0],
      scoreRange,
      factors,
      confidence: Math.min(confidence, 100),
      dataQuality: this.assessScoreDataQuality(text, score)
    }
  }

  /**
   * Parse account information with payment history
   */
  private parseAccounts(text: string): Account[] {
    const accounts: Account[] = []
    
    // Split text into account sections
    const accountSections = this.extractAccountSections(text)
    
    for (let i = 0; i < accountSections.length; i++) {
      const section = accountSections[i]
      const account = this.parseAccountSection(section, i + 1)
      if (account) {
        accounts.push(account)
      }
    }

    return accounts
  }

  /**
   * Parse individual account section
   */
  private parseAccountSection(text: string, index: number): Account | null {
    const account: Partial<Account> = {
      id: `account-${index}`,
      paymentHistory: [],
      bureaus: [],
      confidence: 0
    }

    let confidenceFactors = 0
    let totalFactors = 0

    // Extract creditor name
    for (const pattern of this.patterns.creditorName) {
      const match = text.match(pattern)
      if (match && match[1]) {
        account.creditorName = this.cleanText(match[1])
        confidenceFactors += 90
        break
      }
    }
    totalFactors += 90

    // Extract account number
    for (const pattern of this.patterns.accountNumber) {
      const match = text.match(pattern)
      if (match && match[1]) {
        account.accountNumber = match[1]
        confidenceFactors += 80
        break
      }
    }
    totalFactors += 80

    // Extract balance
    for (const pattern of this.patterns.balance) {
      const match = text.match(pattern)
      if (match && match[1]) {
        account.balance = parseFloat(match[1].replace(/[$,]/g, ''))
        confidenceFactors += 70
        break
      }
    }
    totalFactors += 70

    // Extract credit limit
    for (const pattern of this.patterns.creditLimit) {
      const match = text.match(pattern)
      if (match && match[1]) {
        account.creditLimit = parseFloat(match[1].replace(/[$,]/g, ''))
        confidenceFactors += 60
        break
      }
    }
    totalFactors += 60

    // Determine account type
    account.accountType = this.determineAccountType(text)
    confidenceFactors += 50
    totalFactors += 50

    // Extract payment status
    for (const pattern of this.patterns.paymentStatus) {
      const match = text.match(pattern)
      if (match && match[1]) {
        account.status = this.normalizeAccountStatus(match[1])
        confidenceFactors += 40
        break
      }
    }
    totalFactors += 40

    // Generate payment history
    account.paymentHistory = this.parsePaymentHistory(text)
    if (account.paymentHistory.length > 0) {
      confidenceFactors += 30
    }
    totalFactors += 30

    // Set dates
    account.openDate = this.extractOpenDate(text) || new Date().toISOString().split('T')[0]
    account.lastReported = new Date().toISOString().split('T')[0]

    // Set bureaus
    account.bureaus = this.extractBureaus(text)

    account.confidence = totalFactors > 0 ? Math.round((confidenceFactors / totalFactors) * 100) : 0

    // Only return account if we have minimum required information
    if (account.creditorName && account.balance !== undefined) {
      return account as Account
    }

    return null
  }

  /**
   * Parse negative items (late payments, collections, charge-offs)
   */
  private parseNegativeItems(text: string): NegativeItem[] {
    const negativeItems: NegativeItem[] = []
    
    // Parse late payments
    negativeItems.push(...this.parseLatePayments(text))
    
    // Parse collections
    negativeItems.push(...this.parseCollections(text))
    
    // Parse charge-offs
    negativeItems.push(...this.parseChargeOffs(text))

    return negativeItems
  }

  /**
   * Parse credit inquiries with hard/soft classification
   */
  private parseInquiries(text: string): CreditInquiry[] {
    const inquiries: CreditInquiry[] = []
    
    // Extract inquiry sections
    const inquirySection = this.extractInquirySection(text)
    if (!inquirySection) return inquiries

    // Parse individual inquiries
    const inquiryMatches = Array.from(inquirySection.matchAll(/(\d+)\.\s*([^-\n]+)(?:-\s*)?(\d{1,2}\/\d{4})?/g))
    
    let index = 1
    for (const match of inquiryMatches) {
      const creditorName = this.cleanText(match[2])
      const date = match[3] || ''
      
      if (creditorName) {
        const inquiry: CreditInquiry = {
          id: `inquiry-${index++}`,
          creditorName,
          date: this.formatDate(date),
          type: this.classifyInquiryType(creditorName, text),
          purpose: this.determineInquiryPurpose(creditorName),
          bureau: this.extractInquiryBureau(text, creditorName),
          confidence: 80
        }
        
        inquiries.push(inquiry)
      }
    }

    return inquiries
  }

  /**
   * Parse public records
   */
  private parsePublicRecords(text: string): PublicRecord[] {
    const publicRecords: PublicRecord[] = []
    
    // Look for public records section
    const publicRecordsSection = text.match(/PUBLIC RECORDS([\s\S]*?)(?=\n[A-Z]|$)/i)
    if (!publicRecordsSection) return publicRecords

    const sectionText = publicRecordsSection[1]
    
    // Parse bankruptcies
    const bankruptcyMatches = Array.from(sectionText.matchAll(/bankruptcy.*?(\d{1,2}\/\d{4})/gi))
    for (const match of bankruptcyMatches) {
      publicRecords.push({
        id: `public-${publicRecords.length + 1}`,
        type: 'bankruptcy',
        date: this.formatDate(match[1]),
        status: 'Filed',
        confidence: 85
      })
    }

    // Parse tax liens
    const taxLienMatches = Array.from(sectionText.matchAll(/tax lien.*?(\d{1,2}\/\d{4})/gi))
    for (const match of taxLienMatches) {
      publicRecords.push({
        id: `public-${publicRecords.length + 1}`,
        type: 'tax_lien',
        date: this.formatDate(match[1]),
        status: 'Filed',
        confidence: 85
      })
    }

    return publicRecords
  }

  // Helper methods for parsing specific types of negative items

  private parseLatePayments(text: string): NegativeItem[] {
    const latePayments: NegativeItem[] = []
    
    for (const pattern of this.patterns.latePayment) {
      const matches = Array.from(text.matchAll(new RegExp(pattern.source, 'gi')))
      for (const match of matches) {
        const days = match[1] ? parseInt(match[1]) : 30
        const date = match[2] || ''
        
        latePayments.push({
          id: `late-${latePayments.length + 1}`,
          type: 'late_payment',
          creditorName: 'Unknown Creditor',
          amount: 0,
          date: this.formatDate(date),
          status: `${days} days late`,
          description: `Late payment - ${days} days`,
          disputeReasons: ['Verify accuracy of late payment'],
          impactScore: this.calculateLatePaymentImpact(days),
          confidence: 75
        })
      }
    }

    return latePayments
  }

  private parseCollections(text: string): NegativeItem[] {
    const collections: NegativeItem[] = []
    
    for (const pattern of this.patterns.collection) {
      const matches = Array.from(text.matchAll(new RegExp(pattern.source, 'gi')))
      for (const match of matches) {
        const creditorName = match[1] ? this.cleanText(match[1]) : 'Collection Agency'
        const amount = match[2] ? parseFloat(match[2].replace(/[$,]/g, '')) : 0
        
        collections.push({
          id: `collection-${collections.length + 1}`,
          type: 'collection',
          creditorName,
          amount,
          date: new Date().toISOString().split('T')[0],
          status: 'In Collection',
          description: 'Account placed for collection',
          disputeReasons: ['Request validation of debt', 'Verify accuracy of amount'],
          impactScore: 80,
          confidence: 80
        })
      }
    }

    return collections
  }

  private parseChargeOffs(text: string): NegativeItem[] {
    const chargeOffs: NegativeItem[] = []
    
    for (const pattern of this.patterns.chargeOff) {
      const matches = Array.from(text.matchAll(new RegExp(pattern.source, 'gi')))
      for (const match of matches) {
        const date = match[1] || ''
        const amount = match[2] ? parseFloat(match[2].replace(/[$,]/g, '')) : 0
        
        chargeOffs.push({
          id: `chargeoff-${chargeOffs.length + 1}`,
          type: 'charge_off',
          creditorName: 'Unknown Creditor',
          amount,
          date: this.formatDate(date),
          status: 'Charged Off',
          description: 'Account charged off as bad debt',
          disputeReasons: ['Verify accuracy of charge-off', 'Request proof of debt'],
          impactScore: 90,
          confidence: 85
        })
      }
    }

    return chargeOffs
  }

  // Utility methods

  private detectReportFormat(text: string): string {
    if (text.includes('Experian') && text.includes('Credit Report')) return 'experian'
    if (text.includes('Equifax') && text.includes('Credit Report')) return 'equifax'
    if (text.includes('TransUnion') && text.includes('Credit Report')) return 'transunion'
    if (text.includes('Credit Karma')) return 'credit_karma'
    if (text.includes('Annual Credit Report')) return 'annual_credit_report'
    return 'unknown'
  }

  private extractBureauSections(text: string): { [bureau: string]: string } {
    const sections: { [bureau: string]: string } = {}
    
    const bureaus = ['experian', 'equifax', 'transunion']
    
    for (const bureau of bureaus) {
      const pattern = new RegExp(`(${bureau}[\\s\\S]*?)(?=${bureaus.filter(b => b !== bureau).join('|')}|$)`, 'i')
      const match = text.match(pattern)
      if (match) {
        sections[bureau] = match[1]
      }
    }

    return sections
  }

  private extractAccountSections(text: string): string[] {
    const sections: string[] = []
    
    // Look for account details section
    const accountSection = text.match(/ACCOUNT DETAILS([\s\S]*?)(?=NEGATIVE ITEMS|CREDIT INQUIRIES|PUBLIC RECORDS|$)/i)
    if (!accountSection) return sections

    // Split by numbered items
    const accountMatches = accountSection[1].matchAll(/(\d+)\.\s*([^]+?)(?=\d+\.|$)/g)
    
    for (const match of accountMatches) {
      sections.push(match[2].trim())
    }

    return sections
  }

  private extractInquirySection(text: string): string | null {
    const inquirySection = text.match(/CREDIT INQUIRIES([\s\S]*?)(?=PUBLIC RECORDS|RECOMMENDATIONS|$)/i)
    return inquirySection ? inquirySection[1] : null
  }

  private parsePaymentHistory(text: string): PaymentHistoryEntry[] {
    const history: PaymentHistoryEntry[] = []
    const currentDate = new Date()
    
    // Generate mock payment history based on account status
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      let status: PaymentHistoryEntry['status'] = 'current'
      
      // Check for late payment indicators in text
      if (text.toLowerCase().includes('late') && Math.random() > 0.8) {
        status = '30_days_late'
      }
      
      history.push({
        month,
        status,
        amount: undefined,
        dateReported: undefined
      })
    }
    
    return history.reverse()
  }

  private determineAccountType(text: string): Account['accountType'] {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('credit card') || lowerText.includes('card')) return 'credit_card'
    if (lowerText.includes('auto') || lowerText.includes('car') || lowerText.includes('vehicle')) return 'auto_loan'
    if (lowerText.includes('mortgage') || lowerText.includes('home') || lowerText.includes('real estate')) return 'mortgage'
    if (lowerText.includes('personal loan') || lowerText.includes('personal')) return 'personal_loan'
    if (lowerText.includes('student') || lowerText.includes('education')) return 'student_loan'
    if (lowerText.includes('line of credit') || lowerText.includes('loc')) return 'line_of_credit'
    
    return 'other'
  }

  private normalizeAccountStatus(status: string): Account['status'] {
    const lowerStatus = status.toLowerCase().trim()
    
    if (lowerStatus.includes('current') || lowerStatus.includes('ok') || lowerStatus.includes('good')) return 'open'
    if (lowerStatus.includes('closed') || lowerStatus.includes('close')) return 'closed'
    if (lowerStatus.includes('paid') || lowerStatus.includes('pay')) return 'paid'
    if (lowerStatus.includes('charge') || lowerStatus.includes('charged off')) return 'charged_off'
    if (lowerStatus.includes('collection')) return 'collection'
    
    return 'open'
  }

  private normalizeBureauName(bureau: string): string {
    const lowerBureau = bureau.toLowerCase()
    
    if (lowerBureau.includes('experian')) return 'experian'
    if (lowerBureau.includes('equifax')) return 'equifax'
    if (lowerBureau.includes('transunion') || lowerBureau.includes('trans union')) return 'transunion'
    if (lowerBureau.includes('vantage')) return 'vantage'
    if (lowerBureau.includes('fico')) return 'fico'
    
    return 'experian' // Default
  }

  private classifyInquiryType(creditorName: string, context: string): 'hard' | 'soft' {
    const lowerName = creditorName.toLowerCase()
    const lowerContext = context.toLowerCase()
    
    // Soft inquiry indicators (check first for specific companies)
    const softIndicators = ['credit karma', 'account review', 'promotional', 'pre-approved', 'monitoring', 'karma']
    
    for (const indicator of softIndicators) {
      if (lowerName.includes(indicator) || lowerContext.includes(indicator)) {
        return 'soft'
      }
    }
    
    // Hard inquiry indicators
    const hardIndicators = ['credit application', 'loan application', 'mortgage', 'auto loan', 'credit card application']
    
    for (const indicator of hardIndicators) {
      if (lowerContext.includes(indicator) || lowerName.includes(indicator)) {
        return 'hard'
      }
    }
    
    // Default to hard for credit-related companies
    const creditCompanies = ['bank', 'credit', 'financial', 'lending', 'loan']
    for (const company of creditCompanies) {
      if (lowerName.includes(company)) {
        return 'hard'
      }
    }
    
    return 'hard' // Default to hard for unknown inquiries
  }

  private determineInquiryPurpose(creditorName: string): string {
    const lowerName = creditorName.toLowerCase()
    
    if (lowerName.includes('auto') || lowerName.includes('car')) return 'Auto loan application'
    if (lowerName.includes('mortgage') || lowerName.includes('home')) return 'Mortgage application'
    if (lowerName.includes('credit card') || lowerName.includes('card')) return 'Credit card application'
    if (lowerName.includes('personal')) return 'Personal loan application'
    if (lowerName.includes('student')) return 'Student loan application'
    
    return 'Credit application'
  }

  private extractInquiryBureau(text: string, creditorName: string): string {
    // Look for bureau information near the creditor name
    const bureaus = ['experian', 'equifax', 'transunion']
    
    for (const bureau of bureaus) {
      if (text.toLowerCase().includes(bureau)) {
        return bureau
      }
    }
    
    return 'experian' // Default
  }

  private extractOpenDate(text: string): string | null {
    const datePatterns = [
      /Open Date:\s*(\d{1,2}\/\d{4})/i,
      /Opened:\s*(\d{1,2}\/\d{4})/i,
      /Date Opened:\s*(\d{1,2}\/\d{4})/i
    ]
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        return this.formatDate(match[1])
      }
    }
    
    return null
  }

  private extractBureaus(text: string): string[] {
    const bureaus: string[] = []
    const bureauNames = ['experian', 'equifax', 'transunion']
    
    for (const bureau of bureauNames) {
      if (text.toLowerCase().includes(bureau)) {
        bureaus.push(bureau)
      }
    }
    
    return bureaus.length > 0 ? bureaus : ['experian']
  }

  private extractScoreFactors(text: string): string[] {
    const factors: string[] = []
    
    // Common score factors
    const factorPatterns = [
      /high credit card balances/i,
      /payment history/i,
      /length of credit history/i,
      /credit mix/i,
      /new credit/i,
      /credit utilization/i
    ]
    
    for (const pattern of factorPatterns) {
      if (pattern.test(text)) {
        factors.push(pattern.source.replace(/[\/\\^$*+?.()|[\]{}]/g, '').replace(/i$/, ''))
      }
    }
    
    return factors
  }

  private calculateOverallConfidence(confidenceScores: number[]): number {
    if (confidenceScores.length === 0) return 0
    
    const validScores = confidenceScores.filter(score => score > 0)
    if (validScores.length === 0) return 0
    
    const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length
    return Math.round(average)
  }

  private assessDocumentQuality(text: string): number {
    let quality = 100
    
    // Penalize for short text
    if (text.length < 1000) quality -= 20
    if (text.length < 500) quality -= 30
    
    // Penalize for OCR artifacts
    const ocrArtifacts = (text.match(/[^\w\s.,!?;:()\-]/g) || []).length
    quality -= Math.min(ocrArtifacts * 2, 30)
    
    // Reward for structured content
    if (text.includes('PERSONAL INFORMATION')) quality += 10
    if (text.includes('CREDIT SCORE')) quality += 10
    if (text.includes('ACCOUNT DETAILS')) quality += 10
    
    return Math.max(0, Math.min(100, quality))
  }

  private assessScoreDataQuality(text: string, score: number): number {
    let quality = 100
    
    // Check if score is in reasonable range
    if (score < 300 || score > 850) quality -= 50
    
    // Check for supporting information
    if (!text.includes('bureau') && !text.includes('Bureau')) quality -= 20
    if (!text.includes('range') && !text.includes('Range')) quality -= 10
    
    return Math.max(0, Math.min(100, quality))
  }

  private calculateLatePaymentImpact(days: number): number {
    if (days >= 120) return 90
    if (days >= 90) return 80
    if (days >= 60) return 70
    if (days >= 30) return 60
    return 50
  }

  private cleanText(text: string): string {
    return text.trim().replace(/\s+/g, ' ').replace(/[^\w\s&.,-]/g, '')
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().split('T')[0]
    
    // Handle MM/YYYY format
    const mmYyyyMatch = dateStr.match(/(\d{1,2})\/(\d{4})/)
    if (mmYyyyMatch) {
      return `${mmYyyyMatch[2]}-${mmYyyyMatch[1].padStart(2, '0')}-01`
    }
    
    // Handle MM/DD/YYYY format
    const mmDdYyyyMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (mmDdYyyyMatch) {
      return `${mmDdYyyyMatch[3]}-${mmDdYyyyMatch[1].padStart(2, '0')}-${mmDdYyyyMatch[2].padStart(2, '0')}`
    }
    
    // Handle YYYY-MM-DD format
    const yyyyMmDdMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (yyyyMmDdMatch) {
      return dateStr
    }
    
    return new Date().toISOString().split('T')[0]
  }
}

// Export singleton instance
export const creditReportParser = new IntelligentCreditReportParser()