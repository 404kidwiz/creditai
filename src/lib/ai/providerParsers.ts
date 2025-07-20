import { CreditReportData, CreditAccount, NegativeItem, CreditInquiry, PublicRecord } from './multiProviderCreditAnalyzer'

export interface ParserResult {
  success: boolean
  data: Partial<CreditReportData>
  confidence: number
  provider: string
  errors: string[]
}

export abstract class BaseProviderParser {
  protected provider: string
  protected confidence: number = 0

  constructor(provider: string) {
    this.provider = provider
  }

  abstract parse(text: string): ParserResult
  abstract getProviderName(): string

  protected extractPersonalInfo(text: string): any {
    const personalInfo: any = {
      name: '',
      address: '',
      ssn: undefined,
      dateOfBirth: undefined,
      phone: undefined
    }

    // Extract name
    const namePatterns = [
      /name[:\s]+([A-Za-z\s]+)/i,
      /([A-Za-z]+\s+[A-Za-z]+)\s*credit\s*report/i,
      /personal\s+information[:\s]*\n([A-Za-z\s]+)/i
    ]

    for (const pattern of namePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        personalInfo.name = match[1].trim()
        break
      }
    }

    // Extract address
    const addressPatterns = [
      /address[:\s]+([^\n]+)/i,
      /([0-9]+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)[^\n]*)/i
    ]

    for (const pattern of addressPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        personalInfo.address = match[1].trim()
        break
      }
    }

    // Extract SSN (last 4 digits only)
    const ssnMatch = text.match(/ssn[:\s]*\*{3,4}-?\*{2}-?(\d{4})/i)
    if (ssnMatch) {
      personalInfo.ssn = `***-**-${ssnMatch[1]}`
    }

    // Extract date of birth
    const dobMatch = text.match(/date\s+of\s+birth[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    if (dobMatch) {
      personalInfo.dateOfBirth = dobMatch[1]
    }

    // Extract phone
    const phoneMatch = text.match(/phone[:\s]*(\d{3}-\d{3}-\d{4})/i)
    if (phoneMatch) {
      personalInfo.phone = phoneMatch[1]
    }

    return personalInfo
  }

  protected extractCreditScore(text: string): any {
    const creditScore: any = {
      score: 0,
      bureau: this.provider as any,
      date: new Date().toISOString().split('T')[0],
      scoreRange: { min: 300, max: 850 }
    }

    // Extract score
    const scorePatterns = [
      /(\d{3})\s*(?:credit\s*)?score/i,
      /score[:\s]*(\d{3})/i,
      /fico\s*score[:\s]*(\d{3})/i,
      /vantage\s*score[:\s]*(\d{3})/i
    ]

    for (const pattern of scorePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        const score = parseInt(match[1])
        if (score >= 300 && score <= 850) {
          creditScore.score = score
          break
        }
      }
    }

    // Extract date
    const dateMatch = text.match(/report\s+date[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    if (dateMatch) {
      creditScore.date = dateMatch[1]
    }

    return creditScore
  }

  protected extractAccounts(text: string): CreditAccount[] {
    const accounts: CreditAccount[] = []
    const accountSections = text.split(/(?:account|creditor|tradeline)/i)

    for (let i = 1; i < accountSections.length; i++) {
      const section = accountSections[i]
      
      // Extract creditor name
      const creditorMatch = section.match(/([A-Za-z\s&]+(?:bank|credit|loan|mortgage|card))/i)
      if (!creditorMatch) continue

      const creditorName = creditorMatch[1].trim()
      
      // Extract account number
      const accountMatch = section.match(/(?:account|acct)[:\s]*(\*{4,}\d{4}|\d{4,})/i)
      const accountNumber = accountMatch ? accountMatch[1] : '****'

      // Extract balance
      const balanceMatch = section.match(/(?:balance|bal)[:\s]*\$?([0-9,]+)/i)
      const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : 0

      // Extract credit limit
      const limitMatch = section.match(/(?:limit|credit\s+limit)[:\s]*\$?([0-9,]+)/i)
      const creditLimit = limitMatch ? parseFloat(limitMatch[1].replace(/,/g, '')) : undefined

      // Determine account type
      let accountType: any = 'other'
      if (section.toLowerCase().includes('credit card') || section.toLowerCase().includes('card')) {
        accountType = 'credit_card'
      } else if (section.toLowerCase().includes('auto') || section.toLowerCase().includes('car')) {
        accountType = 'auto_loan'
      } else if (section.toLowerCase().includes('mortgage') || section.toLowerCase().includes('home')) {
        accountType = 'mortgage'
      } else if (section.toLowerCase().includes('student')) {
        accountType = 'student_loan'
      } else if (section.toLowerCase().includes('personal')) {
        accountType = 'personal_loan'
      }

      // Determine status
      let status: any = 'open'
      if (section.toLowerCase().includes('closed') || section.toLowerCase().includes('paid')) {
        status = 'closed'
      } else if (section.toLowerCase().includes('charge off') || section.toLowerCase().includes('charged off')) {
        status = 'charged_off'
      }

      accounts.push({
        id: `acc_${i}`,
        creditorName,
        accountNumber,
        accountType,
        balance,
        creditLimit,
        paymentHistory: [],
        status,
        openDate: '',
        lastReported: new Date().toISOString().split('T')[0],
        remarks: ''
      })
    }

    return accounts
  }

  protected extractNegativeItems(text: string): NegativeItem[] {
    const negativeItems: NegativeItem[] = []
    
    // Look for negative item indicators
    const negativePatterns = [
      /(late\s+payment|collection|charge\s+off|bankruptcy|tax\s+lien|judgment|foreclosure)/gi
    ]

    const sections = text.split(/\n\s*\n/)
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      const lowerSection = section.toLowerCase()
      
      // Check if this section contains negative information
      let itemType: any = 'other'
      if (lowerSection.includes('late payment')) itemType = 'late_payment'
      else if (lowerSection.includes('collection')) itemType = 'collection'
      else if (lowerSection.includes('charge off')) itemType = 'charge_off'
      else if (lowerSection.includes('bankruptcy')) itemType = 'bankruptcy'
      else if (lowerSection.includes('tax lien')) itemType = 'tax_lien'
      else if (lowerSection.includes('judgment')) itemType = 'judgment'
      else if (lowerSection.includes('foreclosure')) itemType = 'foreclosure'
      else continue

      // Extract creditor name
      const creditorMatch = section.match(/([A-Za-z\s&]+(?:bank|credit|loan|mortgage|card|collection))/i)
      const creditorName = creditorMatch ? creditorMatch[1].trim() : 'Unknown Creditor'

      // Extract amount
      const amountMatch = section.match(/\$?([0-9,]+)/)
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0

      // Extract date
      const dateMatch = section.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)
      const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0]

      negativeItems.push({
        id: `neg_${i}`,
        type: itemType,
        creditorName,
        accountNumber: undefined,
        amount,
        date,
        status: 'open',
        description: `${itemType.replace('_', ' ')} - ${creditorName}`,
        disputeReasons: ['inaccurate', 'outdated', 'not_mine'],
        impactScore: this.calculateImpactScore(itemType)
      })
    }

    return negativeItems
  }

  private calculateImpactScore(itemType: string): number {
    const impactScores: { [key: string]: number } = {
      bankruptcy: 100,
      foreclosure: 95,
      judgment: 90,
      tax_lien: 85,
      charge_off: 80,
      collection: 75,
      late_payment: 60
    }
    
    return impactScores[itemType] || 50
  }

  protected extractInquiries(text: string): CreditInquiry[] {
    const inquiries: CreditInquiry[] = []
    
    // Look for inquiry sections
    const inquirySections = text.split(/(?:inquiry|inquiries)/i)
    
    for (let i = 1; i < inquirySections.length; i++) {
      const section = inquirySections[i]
      
      // Extract creditor name
      const creditorMatch = section.match(/([A-Za-z\s&]+(?:bank|credit|loan|mortgage|card))/i)
      if (!creditorMatch) continue

      const creditorName = creditorMatch[1].trim()
      
      // Extract date
      const dateMatch = section.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)
      const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0]

      // Determine type (hard vs soft)
      const type = section.toLowerCase().includes('hard') ? 'hard' : 'soft'
      
      // Extract purpose
      let purpose = 'Credit application'
      if (section.toLowerCase().includes('credit card')) purpose = 'Credit card application'
      else if (section.toLowerCase().includes('auto') || section.toLowerCase().includes('car')) purpose = 'Auto loan application'
      else if (section.toLowerCase().includes('mortgage') || section.toLowerCase().includes('home')) purpose = 'Mortgage application'

      inquiries.push({
        id: `inq_${i}`,
        creditorName,
        date,
        type,
        purpose
      })
    }

    return inquiries
  }

  protected extractPublicRecords(text: string): PublicRecord[] {
    const publicRecords: PublicRecord[] = []
    
    // Look for public record sections
    const recordSections = text.split(/(?:public\s+record|bankruptcy|judgment|tax\s+lien|foreclosure)/i)
    
    for (let i = 1; i < recordSections.length; i++) {
      const section = recordSections[i]
      const lowerSection = section.toLowerCase()
      
      // Determine record type
      let recordType: any = 'other'
      if (lowerSection.includes('bankruptcy')) recordType = 'bankruptcy'
      else if (lowerSection.includes('judgment')) recordType = 'judgment'
      else if (lowerSection.includes('tax lien')) recordType = 'tax_lien'
      else if (lowerSection.includes('foreclosure')) recordType = 'foreclosure'
      else continue

      // Extract amount
      const amountMatch = section.match(/\$?([0-9,]+)/)
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : undefined

      // Extract date
      const dateMatch = section.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)
      const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0]

      // Extract court
      const courtMatch = section.match(/([A-Za-z\s]+(?:court|county|district))/i)
      const court = courtMatch ? courtMatch[1].trim() : undefined

      publicRecords.push({
        id: `pub_${i}`,
        type: recordType,
        amount,
        date,
        status: 'open',
        court
      })
    }

    return publicRecords
  }
}

export class ExperianParser extends BaseProviderParser {
  constructor() {
    super('experian')
  }

  getProviderName(): string {
    return 'Experian'
  }

  parse(text: string): ParserResult {
    const errors: string[] = []
    let confidence = 0

    try {
      const personalInfo = this.extractPersonalInfo(text)
      const creditScore = this.extractCreditScore(text)
      const accounts = this.extractAccounts(text)
      const negativeItems = this.extractNegativeItems(text)
      const inquiries = this.extractInquiries(text)
      const publicRecords = this.extractPublicRecords(text)

      // Experian-specific confidence calculation
      if (text.toLowerCase().includes('experian')) confidence += 20
      if (creditScore.score > 0) confidence += 20
      if (personalInfo.name) confidence += 15
      if (accounts.length > 0) confidence += 15
      if (negativeItems.length > 0) confidence += 10
      if (inquiries.length > 0) confidence += 10
      if (publicRecords.length > 0) confidence += 10

      return {
        success: true,
        data: {
          personalInfo,
          creditScore,
          accounts,
          negativeItems,
          inquiries,
          publicRecords
        },
        confidence,
        provider: this.provider,
        errors
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown parsing error')
      return {
        success: false,
        data: {},
        confidence: 0,
        provider: this.provider,
        errors
      }
    }
  }
}

export class EquifaxParser extends BaseProviderParser {
  constructor() {
    super('equifax')
  }

  getProviderName(): string {
    return 'Equifax'
  }

  parse(text: string): ParserResult {
    const errors: string[] = []
    let confidence = 0

    try {
      const personalInfo = this.extractPersonalInfo(text)
      const creditScore = this.extractCreditScore(text)
      const accounts = this.extractAccounts(text)
      const negativeItems = this.extractNegativeItems(text)
      const inquiries = this.extractInquiries(text)
      const publicRecords = this.extractPublicRecords(text)

      // Equifax-specific confidence calculation
      if (text.toLowerCase().includes('equifax')) confidence += 20
      if (creditScore.score > 0) confidence += 20
      if (personalInfo.name) confidence += 15
      if (accounts.length > 0) confidence += 15
      if (negativeItems.length > 0) confidence += 10
      if (inquiries.length > 0) confidence += 10
      if (publicRecords.length > 0) confidence += 10

      return {
        success: true,
        data: {
          personalInfo,
          creditScore,
          accounts,
          negativeItems,
          inquiries,
          publicRecords
        },
        confidence,
        provider: this.provider,
        errors
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown parsing error')
      return {
        success: false,
        data: {},
        confidence: 0,
        provider: this.provider,
        errors
      }
    }
  }
}

export class TransUnionParser extends BaseProviderParser {
  constructor() {
    super('transunion')
  }

  getProviderName(): string {
    return 'TransUnion'
  }

  parse(text: string): ParserResult {
    const errors: string[] = []
    let confidence = 0

    try {
      const personalInfo = this.extractPersonalInfo(text)
      const creditScore = this.extractCreditScore(text)
      const accounts = this.extractAccounts(text)
      const negativeItems = this.extractNegativeItems(text)
      const inquiries = this.extractInquiries(text)
      const publicRecords = this.extractPublicRecords(text)

      // TransUnion-specific confidence calculation
      if (text.toLowerCase().includes('transunion')) confidence += 20
      if (creditScore.score > 0) confidence += 20
      if (personalInfo.name) confidence += 15
      if (accounts.length > 0) confidence += 15
      if (negativeItems.length > 0) confidence += 10
      if (inquiries.length > 0) confidence += 10
      if (publicRecords.length > 0) confidence += 10

      return {
        success: true,
        data: {
          personalInfo,
          creditScore,
          accounts,
          negativeItems,
          inquiries,
          publicRecords
        },
        confidence,
        provider: this.provider,
        errors
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown parsing error')
      return {
        success: false,
        data: {},
        confidence: 0,
        provider: this.provider,
        errors
      }
    }
  }
}

export class CreditKarmaParser extends BaseProviderParser {
  constructor() {
    super('credit_karma')
  }

  getProviderName(): string {
    return 'Credit Karma'
  }

  parse(text: string): ParserResult {
    const errors: string[] = []
    let confidence = 0

    try {
      const personalInfo = this.extractPersonalInfo(text)
      const creditScore = this.extractCreditScore(text)
      const accounts = this.extractAccounts(text)
      const negativeItems = this.extractNegativeItems(text)
      const inquiries = this.extractInquiries(text)
      const publicRecords = this.extractPublicRecords(text)

      // Credit Karma-specific confidence calculation
      if (text.toLowerCase().includes('credit karma') || text.toLowerCase().includes('karma')) confidence += 20
      if (creditScore.score > 0) confidence += 20
      if (personalInfo.name) confidence += 15
      if (accounts.length > 0) confidence += 15
      if (negativeItems.length > 0) confidence += 10
      if (inquiries.length > 0) confidence += 10
      if (publicRecords.length > 0) confidence += 10

      return {
        success: true,
        data: {
          personalInfo,
          creditScore,
          accounts,
          negativeItems,
          inquiries,
          publicRecords
        },
        confidence,
        provider: this.provider,
        errors
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown parsing error')
      return {
        success: false,
        data: {},
        confidence: 0,
        provider: this.provider,
        errors
      }
    }
  }
}

export class GenericParser extends BaseProviderParser {
  constructor() {
    super('unknown')
  }

  getProviderName(): string {
    return 'Generic'
  }

  parse(text: string): ParserResult {
    const errors: string[] = []
    let confidence = 0

    try {
      const personalInfo = this.extractPersonalInfo(text)
      const creditScore = this.extractCreditScore(text)
      const accounts = this.extractAccounts(text)
      const negativeItems = this.extractNegativeItems(text)
      const inquiries = this.extractInquiries(text)
      const publicRecords = this.extractPublicRecords(text)

      // Generic confidence calculation
      if (creditScore.score > 0) confidence += 25
      if (personalInfo.name) confidence += 20
      if (accounts.length > 0) confidence += 20
      if (negativeItems.length > 0) confidence += 15
      if (inquiries.length > 0) confidence += 10
      if (publicRecords.length > 0) confidence += 10

      return {
        success: true,
        data: {
          personalInfo,
          creditScore,
          accounts,
          negativeItems,
          inquiries,
          publicRecords
        },
        confidence,
        provider: this.provider,
        errors
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown parsing error')
      return {
        success: false,
        data: {},
        confidence: 0,
        provider: this.provider,
        errors
      }
    }
  }
}

// Parser factory
export class ParserFactory {
  static getParser(text: string): BaseProviderParser {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('experian') || lowerText.includes('expert')) {
      return new ExperianParser()
    } else if (lowerText.includes('equifax') || lowerText.includes('equi')) {
      return new EquifaxParser()
    } else if (lowerText.includes('transunion') || lowerText.includes('trans')) {
      return new TransUnionParser()
    } else if (lowerText.includes('credit karma') || lowerText.includes('karma')) {
      return new CreditKarmaParser()
    } else {
      return new GenericParser()
    }
  }

  static parseWithAllParsers(text: string): ParserResult[] {
    const parsers = [
      new ExperianParser(),
      new EquifaxParser(),
      new TransUnionParser(),
      new CreditKarmaParser(),
      new GenericParser()
    ]

    return parsers.map(parser => parser.parse(text))
  }
} 