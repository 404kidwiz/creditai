/**
 * Enhanced confidence calculation system for credit report analysis
 * Provides comprehensive confidence scoring based on multiple quality factors
 */

export interface ConfidenceResult {
  confidence: number
  breakdown: ConfidenceBreakdown
  method: string
  minimumApplied: boolean
  qualityIndicators: QualityIndicator[]
}

export interface ConfidenceBreakdown {
  textQuality: number
  dataExtraction: number
  structureRecognition: number
  contentValidation: number
}

export interface QualityIndicator {
  type: 'text' | 'structure' | 'data' | 'validation'
  score: number
  description: string
  impact: 'positive' | 'negative' | 'neutral'
}

export interface CreditReportData {
  personalInfo?: {
    name?: string
    address?: string
    ssn?: string
  }
  accounts?: Array<{
    creditor?: string
    accountNumber?: string
    balance?: number
    status?: string
  }>
  creditScores?: Array<{
    bureau?: string
    score?: number
    date?: string
  }>
  negativeItems?: Array<{
    type?: string
    creditor?: string
    amount?: number
  }>
  inquiries?: Array<{
    creditor?: string
    date?: string
    type?: string
  }>
}

export class ImprovedConfidenceCalculator {
  private static readonly WEIGHTS = {
    textQuality: 0.25,
    dataExtraction: 0.35,
    structureRecognition: 0.20,
    contentValidation: 0.20
  }

  private static readonly METHOD_BONUSES = {
    'document-ai': 15,
    'vision-api': 10,
    'ocr-fallback': 5,
    'manual-review': 20
  }

  private static readonly MINIMUM_CONFIDENCE_THRESHOLDS = {
    'high-quality': 45,
    'medium-quality': 35,
    'low-quality': 25,
    'very-low-quality': 20
  }

  /**
   * Calculate comprehensive confidence score for credit report analysis
   */
  static calculateConfidence(
    extractedData: CreditReportData,
    originalText: string,
    processingMethod: string
  ): ConfidenceResult {
    const scores = {
      textQuality: this.assessTextQuality(originalText),
      dataExtraction: this.assessExtractionQuality(extractedData, originalText),
      structureRecognition: this.assessStructureRecognition(originalText),
      contentValidation: this.assessContentValidation(extractedData, originalText)
    }

    // Calculate weighted base confidence
    const baseConfidence = Object.entries(this.WEIGHTS)
      .reduce((total, [key, weight]) => {
        return total + (scores[key as keyof typeof scores] * weight)
      }, 0)

    // Apply processing method bonus
    const methodBonus = this.getProcessingMethodBonus(processingMethod)
    
    // Determine minimum confidence threshold
    const textQualityLevel = this.determineTextQualityLevel(originalText)
    const minimumConfidence = this.MINIMUM_CONFIDENCE_THRESHOLDS[textQualityLevel]

    // Calculate final confidence
    const adjustedConfidence = baseConfidence + methodBonus
    const finalConfidence = Math.max(minimumConfidence, Math.min(100, Math.round(adjustedConfidence)))

    // Generate quality indicators
    const qualityIndicators = this.generateQualityIndicators(scores, extractedData, originalText)

    return {
      confidence: finalConfidence,
      breakdown: scores,
      method: processingMethod,
      minimumApplied: adjustedConfidence < minimumConfidence,
      qualityIndicators
    }
  }

  /**
   * Assess text quality based on readability and structure
   */
  private static assessTextQuality(text: string): number {
    if (!text || text.trim().length === 0) return 0

    let score = 0
    const indicators: string[] = []

    // Length assessment (optimal range: 1000-10000 characters)
    const length = text.length
    if (length >= 1000 && length <= 10000) {
      score += 20
      indicators.push('optimal-length')
    } else if (length >= 500 && length <= 15000) {
      score += 15
      indicators.push('acceptable-length')
    } else {
      score += 5
      indicators.push('suboptimal-length')
    }

    // Character quality assessment
    const alphanumericRatio = (text.match(/[a-zA-Z0-9]/g) || []).length / text.length
    if (alphanumericRatio >= 0.7) {
      score += 20
      indicators.push('high-alphanumeric-ratio')
    } else if (alphanumericRatio >= 0.5) {
      score += 15
      indicators.push('medium-alphanumeric-ratio')
    } else {
      score += 5
      indicators.push('low-alphanumeric-ratio')
    }

    // Line structure assessment
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length
    if (avgLineLength >= 20 && avgLineLength <= 100) {
      score += 15
      indicators.push('good-line-structure')
    } else {
      score += 8
      indicators.push('poor-line-structure')
    }

    // Noise assessment (excessive special characters)
    const specialCharRatio = (text.match(/[^a-zA-Z0-9\s\-.,()]/g) || []).length / text.length
    if (specialCharRatio <= 0.1) {
      score += 15
      indicators.push('low-noise')
    } else if (specialCharRatio <= 0.2) {
      score += 10
      indicators.push('medium-noise')
    } else {
      score += 3
      indicators.push('high-noise')
    }

    // Credit report specific patterns
    const creditPatterns = [
      /credit\s+report/i,
      /account\s+number/i,
      /balance/i,
      /payment\s+history/i,
      /credit\s+score/i
    ]
    
    const patternMatches = creditPatterns.filter(pattern => pattern.test(text)).length
    score += Math.min(30, patternMatches * 6)

    return Math.min(100, score)
  }

  /**
   * Assess quality of data extraction
   */
  private static assessExtractionQuality(data: CreditReportData, originalText: string): number {
    if (!data) return 0

    let score = 0
    let totalFields = 0
    let extractedFields = 0

    // Personal information assessment
    if (data.personalInfo) {
      totalFields += 3
      if (data.personalInfo.name) extractedFields++
      if (data.personalInfo.address) extractedFields++
      if (data.personalInfo.ssn) extractedFields++
    }

    // Accounts assessment
    if (data.accounts && data.accounts.length > 0) {
      totalFields += 4
      const validAccounts = data.accounts.filter(acc => acc && typeof acc === 'object')
      const accountsWithCreditor = validAccounts.filter(acc => acc.creditor).length
      const accountsWithNumber = validAccounts.filter(acc => acc.accountNumber).length
      const accountsWithBalance = validAccounts.filter(acc => acc.balance !== undefined).length
      const accountsWithStatus = validAccounts.filter(acc => acc.status).length

      if (accountsWithCreditor > 0) extractedFields++
      if (accountsWithNumber > 0) extractedFields++
      if (accountsWithBalance > 0) extractedFields++
      if (accountsWithStatus > 0) extractedFields++

      // Bonus for multiple complete accounts
      const completeAccounts = validAccounts.filter(acc => 
        acc.creditor && acc.accountNumber && acc.balance !== undefined && acc.status
      ).length
      score += Math.min(25, completeAccounts * 5)
    }

    // Credit scores assessment
    if (data.creditScores && data.creditScores.length > 0) {
      totalFields += 2
      const validScores = data.creditScores.filter(score => score && typeof score === 'object')
      const scoresWithBureau = validScores.filter(score => score.bureau).length
      const scoresWithValue = validScores.filter(score => score.score).length

      if (scoresWithBureau > 0) extractedFields++
      if (scoresWithValue > 0) extractedFields++

      // Bonus for multiple bureau scores
      score += Math.min(15, validScores.length * 5)
    }

    // Negative items assessment
    if (data.negativeItems && data.negativeItems.length > 0) {
      totalFields += 2
      const validItems = data.negativeItems.filter(item => item && typeof item === 'object')
      const itemsWithType = validItems.filter(item => item.type).length
      const itemsWithCreditor = validItems.filter(item => item.creditor).length

      if (itemsWithType > 0) extractedFields++
      if (itemsWithCreditor > 0) extractedFields++
    }

    // Inquiries assessment
    if (data.inquiries && data.inquiries.length > 0) {
      totalFields += 2
      const validInquiries = data.inquiries.filter(inq => inq && typeof inq === 'object')
      const inquiriesWithCreditor = validInquiries.filter(inq => inq.creditor).length
      const inquiriesWithDate = validInquiries.filter(inq => inq.date).length

      if (inquiriesWithCreditor > 0) extractedFields++
      if (inquiriesWithDate > 0) extractedFields++
    }

    // Calculate extraction completeness
    const completenessScore = totalFields > 0 ? (extractedFields / totalFields) * 65 : 0
    score += completenessScore

    return Math.min(100, score)
  }

  /**
   * Assess structure recognition quality
   */
  private static assessStructureRecognition(text: string): number {
    if (!text) return 0

    let score = 0

    // Section headers recognition
    const sectionPatterns = [
      /personal\s+information/i,
      /account\s+information/i,
      /credit\s+history/i,
      /payment\s+history/i,
      /public\s+records/i,
      /inquiries/i
    ]

    const recognizedSections = sectionPatterns.filter(pattern => pattern.test(text)).length
    score += Math.min(35, recognizedSections * 8)

    // Table structure recognition
    const tableIndicators = [
      /\|.*\|.*\|/g, // Pipe-separated tables
      /\t.*\t.*\t/g, // Tab-separated data
      /\s{3,}\w+\s{3,}\w+/g // Space-aligned columns
    ]

    const tableMatches = tableIndicators.reduce((count, pattern) => {
      return count + (text.match(pattern) || []).length
    }, 0)
    score += Math.min(30, tableMatches * 4)

    // Date pattern recognition
    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{2,4}/g,
      /\d{1,2}-\d{1,2}-\d{2,4}/g,
      /\w+\s+\d{1,2},?\s+\d{4}/g
    ]

    const dateMatches = datePatterns.reduce((count, pattern) => {
      return count + (text.match(pattern) || []).length
    }, 0)
    score += Math.min(25, dateMatches * 3)

    // Account number patterns
    const accountPatterns = [
      /\*{4,}\d{4}/g, // Masked account numbers
      /\d{4,16}/g // Full account numbers
    ]

    const accountMatches = accountPatterns.reduce((count, pattern) => {
      return count + (text.match(pattern) || []).length
    }, 0)
    score += Math.min(20, accountMatches * 2)

    // Currency patterns
    const currencyMatches = (text.match(/\$[\d,]+\.?\d*/g) || []).length
    score += Math.min(15, currencyMatches * 2)

    return Math.min(100, score)
  }

  /**
   * Assess content validation quality
   */
  private static assessContentValidation(data: CreditReportData, originalText: string): number {
    if (!data) return 0

    let score = 0

    // Cross-reference validation
    if (data.accounts && data.accounts.length > 0) {
      const validAccountsArray = data.accounts.filter(account => account && typeof account === 'object')
      const validAccounts = validAccountsArray.filter(account => {
        // Check if account data appears consistent
        if (account.creditor && originalText.toLowerCase().includes(account.creditor.toLowerCase())) {
          return true
        }
        return false
      }).length

      if (validAccountsArray.length > 0) {
        score += Math.min(30, (validAccounts / validAccountsArray.length) * 30)
      }
    }

    // Credit score validation
    if (data.creditScores && data.creditScores.length > 0) {
      const validScoresArray = data.creditScores.filter(scoreData => scoreData && typeof scoreData === 'object')
      const validScores = validScoresArray.filter(scoreData => {
        if (scoreData.score && typeof scoreData.score === 'number' && scoreData.score >= 300 && scoreData.score <= 850) {
          return true
        }
        return false
      }).length

      if (validScoresArray.length > 0) {
        score += Math.min(25, (validScores / validScoresArray.length) * 25)
      }
    }

    // Data consistency checks
    let consistencyScore = 0
    
    // Check for duplicate accounts
    if (data.accounts && data.accounts.length > 1) {
      const validAccountsArray = data.accounts.filter(acc => acc && typeof acc === 'object')
      const uniqueCreditors = new Set(validAccountsArray.map(acc => acc.creditor).filter(Boolean))
      if (validAccountsArray.length > 0 && uniqueCreditors.size === validAccountsArray.length) {
        consistencyScore += 15
      }
    }

    // Check for reasonable date ranges
    if (data.inquiries && data.inquiries.length > 0) {
      const validInquiriesArray = data.inquiries.filter(inq => inq && typeof inq === 'object')
      const validDates = validInquiriesArray.filter(inq => {
        if (inq.date) {
          const date = new Date(inq.date)
          const now = new Date()
          const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
          return date >= twoYearsAgo && date <= now
        }
        return false
      }).length

      if (validInquiriesArray.length > 0) {
        consistencyScore += Math.min(15, (validDates / validInquiriesArray.length) * 15)
      }
    }

    score += consistencyScore

    // Completeness validation
    const hasPersonalInfo = data.personalInfo && (data.personalInfo.name || data.personalInfo.address)
    const hasAccounts = data.accounts && data.accounts.length > 0
    const hasScores = data.creditScores && data.creditScores.length > 0

    let completenessBonus = 0
    if (hasPersonalInfo) completenessBonus += 10
    if (hasAccounts) completenessBonus += 10
    if (hasScores) completenessBonus += 10

    score += completenessBonus

    return Math.min(100, score)
  }

  /**
   * Get processing method bonus
   */
  private static getProcessingMethodBonus(method: string): number {
    return this.METHOD_BONUSES[method as keyof typeof this.METHOD_BONUSES] || 0
  }

  /**
   * Determine text quality level for minimum confidence threshold
   */
  private static determineTextQualityLevel(text: string): keyof typeof ImprovedConfidenceCalculator.MINIMUM_CONFIDENCE_THRESHOLDS {
    const textScore = this.assessTextQuality(text)
    
    if (textScore >= 80) return 'high-quality'
    if (textScore >= 60) return 'medium-quality'
    if (textScore >= 40) return 'low-quality'
    return 'very-low-quality'
  }

  /**
   * Generate quality indicators for detailed feedback
   */
  private static generateQualityIndicators(
    scores: ConfidenceBreakdown,
    data: CreditReportData,
    text: string
  ): QualityIndicator[] {
    const indicators: QualityIndicator[] = []

    // Text quality indicators
    if (scores.textQuality >= 80) {
      indicators.push({
        type: 'text',
        score: scores.textQuality,
        description: 'Excellent text quality with clear structure and minimal noise',
        impact: 'positive'
      })
    } else if (scores.textQuality >= 60) {
      indicators.push({
        type: 'text',
        score: scores.textQuality,
        description: 'Good text quality with some minor formatting issues',
        impact: 'neutral'
      })
    } else {
      indicators.push({
        type: 'text',
        score: scores.textQuality,
        description: 'Poor text quality may affect extraction accuracy',
        impact: 'negative'
      })
    }

    // Data extraction indicators
    if (scores.dataExtraction >= 70) {
      indicators.push({
        type: 'data',
        score: scores.dataExtraction,
        description: 'High data extraction completeness with most fields captured',
        impact: 'positive'
      })
    } else if (scores.dataExtraction >= 50) {
      indicators.push({
        type: 'data',
        score: scores.dataExtraction,
        description: 'Moderate data extraction with some missing information',
        impact: 'neutral'
      })
    } else {
      indicators.push({
        type: 'data',
        score: scores.dataExtraction,
        description: 'Limited data extraction - manual review recommended',
        impact: 'negative'
      })
    }

    // Structure recognition indicators
    if (scores.structureRecognition >= 70) {
      indicators.push({
        type: 'structure',
        score: scores.structureRecognition,
        description: 'Document structure well recognized with clear sections',
        impact: 'positive'
      })
    } else {
      indicators.push({
        type: 'structure',
        score: scores.structureRecognition,
        description: 'Document structure partially recognized',
        impact: 'neutral'
      })
    }

    // Validation indicators
    if (scores.contentValidation >= 70) {
      indicators.push({
        type: 'validation',
        score: scores.contentValidation,
        description: 'Content validation passed with high consistency',
        impact: 'positive'
      })
    } else {
      indicators.push({
        type: 'validation',
        score: scores.contentValidation,
        description: 'Some validation concerns detected',
        impact: 'negative'
      })
    }

    return indicators
  }
}