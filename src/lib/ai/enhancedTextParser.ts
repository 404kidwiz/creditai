/**
 * Enhanced text parsing engine for multiple credit report formats
 * Supports Experian, Equifax, TransUnion, and other credit report layouts
 */

import { CreditorDatabase, CreditorMatch } from './creditorDatabase'

export interface ParsedCreditReport {
  format: CreditReportFormat
  confidence: number
  personalInfo: PersonalInfo
  creditScores: CreditScore[]
  accounts: Account[]
  negativeItems: NegativeItem[]
  inquiries: Inquiry[]
  publicRecords: PublicRecord[]
  metadata: ParseMetadata
}

export interface PersonalInfo {
  name?: string
  address?: string
  ssn?: string
  dateOfBirth?: string
  aliases?: string[]
  confidence: number
}

export interface CreditScore {
  bureau: string
  score: number
  date: string
  model?: string
  factors?: string[]
  confidence: number
}

export interface Account {
  creditor: string
  creditorMatch?: CreditorMatch
  accountNumber?: string
  accountType?: string
  balance?: number
  creditLimit?: number
  paymentHistory?: PaymentHistory[]
  status: string
  openDate?: string
  lastActivity?: string
  confidence: number
}

export interface PaymentHistory {
  date: string
  status: 'OK' | 'LATE' | 'MISSED' | 'UNKNOWN'
  daysLate?: number
}

export interface NegativeItem {
  type: string
  creditor: string
  creditorMatch?: CreditorMatch
  amount?: number
  date?: string
  status?: string
  description?: string
  confidence: number
}

export interface Inquiry {
  creditor: string
  creditorMatch?: CreditorMatch
  date: string
  type: 'hard' | 'soft' | 'unknown'
  confidence: number
}

export interface PublicRecord {
  type: string
  court?: string
  amount?: number
  date?: string
  status?: string
  confidence: number
}

export interface ParseMetadata {
  detectedFormat: CreditReportFormat
  processingTime: number
  sectionsFound: string[]
  parsingErrors: string[]
  qualityScore: number
}

export enum CreditReportFormat {
  EXPERIAN = 'experian',
  EQUIFAX = 'equifax',
  TRANSUNION = 'transunion',
  ANNUAL_CREDIT_REPORT = 'annual_credit_report',
  CREDIT_KARMA = 'credit_karma',
  GENERIC = 'generic',
  UNKNOWN = 'unknown'
}

export class EnhancedTextParser {
  private static readonly FORMAT_PATTERNS = {
    [CreditReportFormat.EXPERIAN]: [
      /experian/i,
      /personal\s+credit\s+report/i,
      /experian\s+information\s+solutions/i,
      /report\s+number:\s*\d+/i
    ],
    [CreditReportFormat.EQUIFAX]: [
      /equifax/i,
      /equifax\s+credit\s+report/i,
      /equifax\s+information\s+services/i,
      /report\s+confirmation\s+number/i
    ],
    [CreditReportFormat.TRANSUNION]: [
      /transunion/i,
      /trans\s*union/i,
      /transunion\s+credit\s+report/i,
      /file\s+number:\s*\d+/i
    ],
    [CreditReportFormat.ANNUAL_CREDIT_REPORT]: [
      /annualcreditreport\.com/i,
      /annual\s+credit\s+report/i,
      /authorized\s+by\s+federal\s+law/i
    ],
    [CreditReportFormat.CREDIT_KARMA]: [
      /credit\s*karma/i,
      /creditkarma\.com/i,
      /vantagescore/i
    ]
  }

  private static readonly SECTION_PATTERNS = {
    personalInfo: [
      /personal\s+information/i,
      /consumer\s+information/i,
      /identification\s+information/i,
      /personal\s+data/i
    ],
    creditScores: [
      /credit\s+score/i,
      /fico\s+score/i,
      /vantagescore/i,
      /score\s+summary/i,
      /credit\s+rating/i
    ],
    accounts: [
      /account\s+information/i,
      /credit\s+accounts/i,
      /trade\s+lines/i,
      /account\s+history/i,
      /credit\s+history/i
    ],
    negativeItems: [
      /negative\s+items/i,
      /derogatory\s+information/i,
      /adverse\s+accounts/i,
      /collections/i,
      /charge\s*offs/i
    ],
    inquiries: [
      /inquiries/i,
      /credit\s+inquiries/i,
      /requests\s+for\s+credit/i,
      /inquiry\s+information/i
    ],
    publicRecords: [
      /public\s+records/i,
      /court\s+records/i,
      /bankruptcy/i,
      /tax\s+liens/i,
      /judgments/i
    ]
  }

  /**
   * Parse credit report text with format detection and context-aware extraction
   */
  static parseText(text: string): ParsedCreditReport {
    const startTime = Date.now()
    
    // Detect format
    const detectedFormat = this.detectFormat(text)
    
    // Initialize result structure
    const result: ParsedCreditReport = {
      format: detectedFormat,
      confidence: 0,
      personalInfo: { confidence: 0 },
      creditScores: [],
      accounts: [],
      negativeItems: [],
      inquiries: [],
      publicRecords: [],
      metadata: {
        detectedFormat,
        processingTime: 0,
        sectionsFound: [],
        parsingErrors: [],
        qualityScore: 0
      }
    }

    try {
      // Parse sections based on detected format
      const sections = this.identifySections(text, detectedFormat)
      result.metadata.sectionsFound = Object.keys(sections)

      // Parse each section
      if (sections.personalInfo) {
        result.personalInfo = this.parsePersonalInfo(sections.personalInfo, detectedFormat)
      }

      if (sections.creditScores) {
        result.creditScores = this.parseCreditScores(sections.creditScores, detectedFormat)
      }

      if (sections.accounts) {
        result.accounts = this.parseAccounts(sections.accounts, detectedFormat)
      }

      if (sections.negativeItems) {
        result.negativeItems = this.parseNegativeItems(sections.negativeItems, detectedFormat)
      }

      if (sections.inquiries) {
        result.inquiries = this.parseInquiries(sections.inquiries, detectedFormat)
      }

      if (sections.publicRecords) {
        result.publicRecords = this.parsePublicRecords(sections.publicRecords, detectedFormat)
      }

      // Calculate overall confidence
      result.confidence = this.calculateOverallConfidence(result)
      
    } catch (error) {
      result.metadata.parsingErrors.push(`Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Finalize metadata
    result.metadata.processingTime = Date.now() - startTime
    result.metadata.qualityScore = this.calculateQualityScore(result, text)

    return result
  }

  /**
   * Detect credit report format based on text patterns
   */
  private static detectFormat(text: string): CreditReportFormat {
    const normalizedText = text.toLowerCase()
    
    for (const [format, patterns] of Object.entries(this.FORMAT_PATTERNS)) {
      const matchCount = patterns.filter(pattern => pattern.test(normalizedText)).length
      if (matchCount >= 2) {
        return format as CreditReportFormat
      }
    }

    // Check for single strong indicators
    if (/experian/i.test(text)) return CreditReportFormat.EXPERIAN
    if (/equifax/i.test(text)) return CreditReportFormat.EQUIFAX
    if (/transunion|trans\s*union/i.test(text)) return CreditReportFormat.TRANSUNION
    if (/annualcreditreport/i.test(text)) return CreditReportFormat.ANNUAL_CREDIT_REPORT
    if (/credit\s*karma/i.test(text)) return CreditReportFormat.CREDIT_KARMA

    return CreditReportFormat.UNKNOWN
  }

  /**
   * Identify and extract sections from text
   */
  private static identifySections(text: string, format: CreditReportFormat): Record<string, string> {
    const sections: Record<string, string> = {}
    const lines = text.split('\n')
    
    let currentSection = ''
    let currentContent: string[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Check if this line starts a new section
      const sectionType = this.identifyLineAsSection(line)
      
      if (sectionType) {
        // Save previous section if it exists
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n')
        }
        
        // Start new section
        currentSection = sectionType
        currentContent = [line]
      } else if (currentSection) {
        // Add to current section
        currentContent.push(line)
      }
    }
    
    // Save final section
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n')
    }

    return sections
  }

  /**
   * Identify if a line indicates the start of a section
   */
  private static identifyLineAsSection(line: string): string | null {
    for (const [sectionName, patterns] of Object.entries(this.SECTION_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          return sectionName
        }
      }
    }
    return null
  }

  /**
   * Parse personal information section
   */
  private static parsePersonalInfo(text: string, format: CreditReportFormat): PersonalInfo {
    const result: PersonalInfo = { confidence: 0 }
    
    // Name extraction
    const namePatterns = [
      /name:\s*([^\n\r]+)/i,
      /consumer\s+name:\s*([^\n\r]+)/i,
      /full\s+name:\s*([^\n\r]+)/i,
      /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/m
    ]
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        result.name = match[1].trim()
        break
      }
    }

    // Address extraction
    const addressPatterns = [
      /address:\s*([^\n\r]+(?:\n[^\n\r]+)*?)(?=\n\s*\n|\n[A-Z][a-z]+:|$)/i,
      /current\s+address:\s*([^\n\r]+)/i,
      /mailing\s+address:\s*([^\n\r]+)/i
    ]
    
    for (const pattern of addressPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        result.address = match[1].trim().replace(/\n/g, ' ')
        break
      }
    }

    // SSN extraction (masked)
    const ssnPatterns = [
      /ssn:\s*(\*{3}-?\*{2}-?\d{4})/i,
      /social\s+security:\s*(\*{3}-?\*{2}-?\d{4})/i,
      /(\*{3}-?\*{2}-?\d{4})/
    ]
    
    for (const pattern of ssnPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        result.ssn = match[1]
        break
      }
    }

    // Date of birth extraction
    const dobPatterns = [
      /date\s+of\s+birth:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /dob:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /birth\s+date:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i
    ]
    
    for (const pattern of dobPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        result.dateOfBirth = match[1]
        break
      }
    }

    // Calculate confidence
    let confidence = 0
    if (result.name) confidence += 40
    if (result.address) confidence += 30
    if (result.ssn) confidence += 20
    if (result.dateOfBirth) confidence += 10
    
    result.confidence = Math.min(100, confidence)
    
    return result
  }

  /**
   * Parse credit scores section
   */
  private static parseCreditScores(text: string, format: CreditReportFormat): CreditScore[] {
    const scores: CreditScore[] = []
    
    // Different patterns for different formats
    const scorePatterns = [
      // Standard format: "FICO Score: 750 (Experian)"
      /(?:fico\s+score|credit\s+score|score):\s*(\d{3})\s*(?:\(([^)]+)\))?/gi,
      // Table format: "Experian    750    01/15/2024"
      /(experian|equifax|transunion)\s+(\d{3})\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/gi,
      // VantageScore format
      /vantagescore\s*(?:3\.0|4\.0)?\s*:\s*(\d{3})/gi
    ]

    for (const pattern of scorePatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const score: CreditScore = {
          bureau: match[2] || this.inferBureauFromContext(text, match.index) || 'Unknown',
          score: parseInt(match[1]),
          date: match[3] || this.extractDateFromContext(text, match.index) || new Date().toISOString().split('T')[0],
          confidence: 85
        }

        // Validate score range
        if (score.score >= 300 && score.score <= 850) {
          scores.push(score)
        }
      }
    }

    return scores
  }

  /**
   * Parse accounts section with context-aware extraction
   */
  private static parseAccounts(text: string, format: CreditReportFormat): Account[] {
    const accounts: Account[] = []
    
    // Split into individual account blocks
    const accountBlocks = this.splitIntoAccountBlocks(text)
    
    for (const block of accountBlocks) {
      const account = this.parseAccountBlock(block, format)
      if (account) {
        accounts.push(account)
      }
    }

    return accounts
  }

  /**
   * Parse individual account block
   */
  private static parseAccountBlock(text: string, format: CreditReportFormat): Account | null {
    const account: Partial<Account> = {}
    
    // Extract creditor name
    const creditorPatterns = [
      /creditor:\s*([^\n\r]+)/i,
      /company:\s*([^\n\r]+)/i,
      /account\s+name:\s*([^\n\r]+)/i,
      /^([A-Z][A-Z\s&]+)(?:\s+\d+)?$/m
    ]
    
    for (const pattern of creditorPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        account.creditor = match[1].trim()
        account.creditorMatch = CreditorDatabase.standardizeCreditorName(account.creditor)
        break
      }
    }

    if (!account.creditor) return null

    // Extract account number
    const accountNumberPatterns = [
      /account\s+(?:number|#):\s*([*\d]+)/i,
      /acct\s*#?\s*:\s*([*\d]+)/i,
      /([*]{4,}\d{4})/
    ]
    
    for (const pattern of accountNumberPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        account.accountNumber = match[1]
        break
      }
    }

    // Extract balance
    const balancePatterns = [
      /balance:\s*\$?([\d,]+)/i,
      /current\s+balance:\s*\$?([\d,]+)/i,
      /outstanding:\s*\$?([\d,]+)/i
    ]
    
    for (const pattern of balancePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        account.balance = parseInt(match[1].replace(/,/g, ''))
        break
      }
    }

    // Extract credit limit
    const limitPatterns = [
      /credit\s+limit:\s*\$?([\d,]+)/i,
      /limit:\s*\$?([\d,]+)/i,
      /high\s+credit:\s*\$?([\d,]+)/i
    ]
    
    for (const pattern of limitPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        account.creditLimit = parseInt(match[1].replace(/,/g, ''))
        break
      }
    }

    // Extract status
    const statusPatterns = [
      /status:\s*([^\n\r]+)/i,
      /account\s+status:\s*([^\n\r]+)/i,
      /(open|closed|current|delinquent|charge\s*off)/i
    ]
    
    for (const pattern of statusPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        account.status = match[1].trim()
        break
      }
    }

    // Calculate confidence
    let confidence = 50 // Base confidence for having creditor
    if (account.accountNumber) confidence += 15
    if (account.balance !== undefined) confidence += 15
    if (account.status) confidence += 10
    if (account.creditLimit) confidence += 10

    return {
      creditor: account.creditor,
      creditorMatch: account.creditorMatch,
      accountNumber: account.accountNumber,
      balance: account.balance,
      creditLimit: account.creditLimit,
      status: account.status || 'Unknown',
      confidence
    } as Account
  }

  /**
   * Parse negative items section
   */
  private static parseNegativeItems(text: string, format: CreditReportFormat): NegativeItem[] {
    const items: NegativeItem[] = []
    
    const itemBlocks = this.splitIntoItemBlocks(text)
    
    for (const block of itemBlocks) {
      const item = this.parseNegativeItemBlock(block)
      if (item) {
        items.push(item)
      }
    }

    return items
  }

  /**
   * Parse individual negative item block
   */
  private static parseNegativeItemBlock(text: string): NegativeItem | null {
    const item: Partial<NegativeItem> = {}
    
    // Extract type
    const typePatterns = [
      /type:\s*([^\n\r]+)/i,
      /(collection|charge\s*off|late\s+payment|bankruptcy|judgment)/i
    ]
    
    for (const pattern of typePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        item.type = match[1].trim()
        break
      }
    }

    // Extract creditor
    const creditorPatterns = [
      /creditor:\s*([^\n\r]+)/i,
      /original\s+creditor:\s*([^\n\r]+)/i,
      /company:\s*([^\n\r]+)/i
    ]
    
    for (const pattern of creditorPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        item.creditor = match[1].trim()
        item.creditorMatch = CreditorDatabase.standardizeCreditorName(item.creditor)
        break
      }
    }

    if (!item.type && !item.creditor) return null

    // Extract amount
    const amountPatterns = [
      /amount:\s*\$?([\d,]+)/i,
      /balance:\s*\$?([\d,]+)/i,
      /\$?([\d,]+)/
    ]
    
    for (const pattern of amountPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        item.amount = parseInt(match[1].replace(/,/g, ''))
        break
      }
    }

    return {
      type: item.type || 'Unknown',
      creditor: item.creditor || 'Unknown',
      creditorMatch: item.creditorMatch,
      amount: item.amount,
      confidence: 70
    } as NegativeItem
  }

  /**
   * Parse inquiries section
   */
  private static parseInquiries(text: string, format: CreditReportFormat): Inquiry[] {
    const inquiries: Inquiry[] = []
    
    const inquiryPattern = /([^\n\r]+?)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(hard|soft)?/gi
    let match
    
    while ((match = inquiryPattern.exec(text)) !== null) {
      const creditor = match[1].trim()
      const creditorMatch = CreditorDatabase.standardizeCreditorName(creditor)
      
      inquiries.push({
        creditor,
        creditorMatch,
        date: match[2],
        type: (match[3]?.toLowerCase() as 'hard' | 'soft') || 'unknown',
        confidence: 75
      })
    }

    return inquiries
  }

  /**
   * Parse public records section
   */
  private static parsePublicRecords(text: string, format: CreditReportFormat): PublicRecord[] {
    const records: PublicRecord[] = []
    
    const recordPatterns = [
      /(bankruptcy|judgment|tax\s+lien)\s+([^\n\r]+)/gi
    ]
    
    for (const pattern of recordPatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        records.push({
          type: match[1],
          description: match[2],
          confidence: 70
        })
      }
    }

    return records
  }

  // Helper methods

  private static splitIntoAccountBlocks(text: string): string[] {
    // Split by common account separators
    const separators = [
      /\n\s*\n\s*[A-Z][A-Z\s&]+/g,
      /\n\s*Account\s+\d+/gi,
      /\n\s*Creditor:/gi
    ]
    
    let blocks = [text]
    
    for (const separator of separators) {
      const newBlocks: string[] = []
      for (const block of blocks) {
        newBlocks.push(...block.split(separator))
      }
      blocks = newBlocks
    }
    
    return blocks.filter(block => block.trim().length > 20)
  }

  private static splitIntoItemBlocks(text: string): string[] {
    return text.split(/\n\s*\n/).filter(block => block.trim().length > 10)
  }

  private static inferBureauFromContext(text: string, position: number): string | null {
    const contextWindow = text.substring(Math.max(0, position - 100), position + 100)
    
    if (/experian/i.test(contextWindow)) return 'Experian'
    if (/equifax/i.test(contextWindow)) return 'Equifax'
    if (/transunion/i.test(contextWindow)) return 'TransUnion'
    
    return null
  }

  private static extractDateFromContext(text: string, position: number): string | null {
    const contextWindow = text.substring(Math.max(0, position - 50), position + 50)
    const dateMatch = contextWindow.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)
    
    return dateMatch ? dateMatch[0] : null
  }

  private static calculateOverallConfidence(result: ParsedCreditReport): number {
    let totalConfidence = 0
    let componentCount = 0

    if (result.personalInfo.confidence > 0) {
      totalConfidence += result.personalInfo.confidence
      componentCount++
    }

    if (result.creditScores.length > 0) {
      const avgScoreConfidence = result.creditScores.reduce((sum, score) => sum + score.confidence, 0) / result.creditScores.length
      totalConfidence += avgScoreConfidence
      componentCount++
    }

    if (result.accounts.length > 0) {
      const avgAccountConfidence = result.accounts.reduce((sum, account) => sum + account.confidence, 0) / result.accounts.length
      totalConfidence += avgAccountConfidence
      componentCount++
    }

    return componentCount > 0 ? Math.round(totalConfidence / componentCount) : 0
  }

  private static calculateQualityScore(result: ParsedCreditReport, originalText: string): number {
    let score = 0
    
    // Text quality factors
    const textLength = originalText.length
    if (textLength > 1000 && textLength < 50000) score += 20
    
    // Section completeness
    if (result.personalInfo.confidence > 0) score += 15
    if (result.creditScores.length > 0) score += 20
    if (result.accounts.length > 0) score += 25
    if (result.negativeItems.length > 0) score += 10
    if (result.inquiries.length > 0) score += 10
    
    return Math.min(100, score)
  }
}