import { CreditReportData, AIAnalysisResult } from './multiProviderCreditAnalyzer'
import { ParserResult } from './providerParsers'

export interface ValidationResult {
  overallScore: number
  dataQuality: {
    personalInfo: number
    creditScore: number
    accounts: number
    negativeItems: number
    inquiries: number
    publicRecords: number
  }
  accuracy: {
    textExtraction: number
    dataParsing: number
    providerDetection: number
    aiAnalysis: number
  }
  issues: ValidationIssue[]
  recommendations: string[]
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info'
  category: 'data_quality' | 'accuracy' | 'completeness' | 'consistency'
  message: string
  severity: 'high' | 'medium' | 'low'
  field?: string
  suggestion?: string
}

interface ValidationRule {
  name: string
  validate: (data: CreditReportData) => boolean
  message: string
  severity: 'high' | 'medium' | 'low'
}

export class CreditReportValidationSystem {
  private validationRules: ValidationRule[] = []

  constructor() {
    this.initializeValidationRules()
  }

  /**
   * Validate credit report analysis results
   */
  validateAnalysis(
    originalText: string,
    analysis: AIAnalysisResult,
    parserResults?: ParserResult[]
  ): ValidationResult {
    const issues: ValidationIssue[] = []
    const recommendations: string[] = []

    // Validate data quality
    const dataQuality = this.validateDataQuality(analysis.extractedData, issues)
    
    // Validate accuracy
    const accuracy = this.validateAccuracy(originalText, analysis, parserResults, issues)
    
    // Validate consistency
    this.validateConsistency(analysis, issues)
    
    // Validate completeness
    this.validateCompleteness(analysis, issues)
    
    // Generate recommendations
    this.generateRecommendations(issues, recommendations)
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore(dataQuality, accuracy, issues)

    return {
      overallScore,
      dataQuality,
      accuracy,
      issues,
      recommendations
    }
  }

  /**
   * Validate data quality of extracted information
   */
  private validateDataQuality(data: CreditReportData, issues: ValidationIssue[]): any {
    const quality: any = {
      personalInfo: 0,
      creditScore: 0,
      accounts: 0,
      negativeItems: 0,
      inquiries: 0,
      publicRecords: 0
    }

    // Validate personal information
    if (data.personalInfo.name && data.personalInfo.name.length > 2) {
      quality.personalInfo += 30
    } else {
      issues.push({
        type: 'warning',
        category: 'data_quality',
        message: 'Personal name is missing or incomplete',
        severity: 'medium',
        field: 'personalInfo.name',
        suggestion: 'Verify name extraction from document'
      })
    }

    if (data.personalInfo.address && data.personalInfo.address.length > 10) {
      quality.personalInfo += 30
    } else {
      issues.push({
        type: 'warning',
        category: 'data_quality',
        message: 'Address is missing or incomplete',
        severity: 'medium',
        field: 'personalInfo.address',
        suggestion: 'Check address extraction accuracy'
      })
    }

    if (data.personalInfo.ssn) {
      quality.personalInfo += 20
    }

    if (data.personalInfo.dateOfBirth) {
      quality.personalInfo += 20
    }

    // Validate credit score
    if (data.creditScore.score >= 300 && data.creditScore.score <= 850) {
      quality.creditScore += 50
    } else {
      issues.push({
        type: 'error',
        category: 'data_quality',
        message: 'Invalid credit score detected',
        severity: 'high',
        field: 'creditScore.score',
        suggestion: 'Verify credit score extraction'
      })
    }

    if (data.creditScore.bureau) {
      quality.creditScore += 30
    }

    if (data.creditScore.date) {
      quality.creditScore += 20
    }

    // Validate accounts
    if (data.accounts.length > 0) {
      quality.accounts += 30
      
      // Check account data quality
      const validAccounts = data.accounts.filter(acc => 
        acc.creditorName && acc.creditorName.length > 2
      )
      
      if (validAccounts.length === data.accounts.length) {
        quality.accounts += 40
      } else {
        issues.push({
          type: 'warning',
          category: 'data_quality',
          message: 'Some accounts have incomplete creditor information',
          severity: 'medium',
          field: 'accounts',
          suggestion: 'Improve creditor name extraction'
        })
      }

      // Check for balance information
      const accountsWithBalance = data.accounts.filter(acc => acc.balance > 0)
      if (accountsWithBalance.length > 0) {
        quality.accounts += 30
      }
    } else {
      issues.push({
        type: 'info',
        category: 'completeness',
        message: 'No accounts found in credit report',
        severity: 'low',
        field: 'accounts'
      })
    }

    // Validate negative items
    if (data.negativeItems.length > 0) {
      quality.negativeItems += 30
      
      const validNegativeItems = data.negativeItems.filter(item => 
        item.creditorName && item.creditorName.length > 2
      )
      
      if (validNegativeItems.length === data.negativeItems.length) {
        quality.negativeItems += 40
      }

      // Check for impact scores
      const itemsWithImpact = data.negativeItems.filter(item => item.impactScore > 0)
      if (itemsWithImpact.length > 0) {
        quality.negativeItems += 30
      }
    }

    // Validate inquiries
    if (data.inquiries.length > 0) {
      quality.inquiries += 50
      
      const validInquiries = data.inquiries.filter(inq => 
        inq.creditorName && inq.creditorName.length > 2
      )
      
      if (validInquiries.length === data.inquiries.length) {
        quality.inquiries += 50
      }
    }

    // Validate public records
    if (data.publicRecords.length > 0) {
      quality.publicRecords += 50
      
      const validRecords = data.publicRecords.filter(record => 
        record.type && record.date
      )
      
      if (validRecords.length === data.publicRecords.length) {
        quality.publicRecords += 50
      }
    }

    return quality
  }

  /**
   * Validate accuracy of analysis
   */
  private validateAccuracy(
    originalText: string,
    analysis: AIAnalysisResult,
    parserResults?: ParserResult[],
    issues?: ValidationIssue[]
  ): any {
    const accuracy: any = {
      textExtraction: 0,
      dataParsing: 0,
      providerDetection: 0,
      aiAnalysis: 0
    }

    // Validate text extraction
    if (originalText.length > 1000) {
      accuracy.textExtraction += 40
    } else {
      issues?.push({
        type: 'warning',
        category: 'accuracy',
        message: 'Extracted text seems too short',
        severity: 'medium',
        field: 'textExtraction',
        suggestion: 'Check OCR quality and document clarity'
      })
    }

    if (originalText.includes('credit') || originalText.includes('score')) {
      accuracy.textExtraction += 30
    }

    if (originalText.length > 5000) {
      accuracy.textExtraction += 30
    }

    // Validate data parsing
    if (analysis.extractedData.creditScore.score > 0) {
      accuracy.dataParsing += 30
    }

    if (analysis.extractedData.personalInfo.name) {
      accuracy.dataParsing += 20
    }

    if (analysis.extractedData.accounts.length > 0) {
      accuracy.dataParsing += 25
    }

    if (analysis.extractedData.negativeItems.length > 0) {
      accuracy.dataParsing += 25
    }

    // Validate provider detection
    if (analysis.provider !== 'unknown') {
      accuracy.providerDetection += 50
    } else {
      issues?.push({
        type: 'warning',
        category: 'accuracy',
        message: 'Could not detect credit report provider',
        severity: 'medium',
        field: 'provider',
        suggestion: 'Improve provider detection algorithm'
      })
    }

    // Cross-validate with parser results if available
    if (parserResults && parserResults.length > 0) {
      const bestParser = parserResults.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      )
      
      if (bestParser.provider === analysis.provider) {
        accuracy.providerDetection += 50
      } else {
        issues?.push({
          type: 'warning',
          category: 'accuracy',
          message: 'Provider detection mismatch between AI and parser',
          severity: 'medium',
          field: 'provider',
          suggestion: 'Review provider detection logic'
        })
      }
    }

    // Validate AI analysis
    if (analysis.confidence > 80) {
      accuracy.aiAnalysis += 40
    } else if (analysis.confidence > 60) {
      accuracy.aiAnalysis += 30
    } else {
      issues?.push({
        type: 'warning',
        category: 'accuracy',
        message: 'Low AI analysis confidence',
        severity: 'medium',
        field: 'aiAnalysis',
        suggestion: 'Review AI model performance and input quality'
      })
    }

    if (analysis.recommendations.length > 0) {
      accuracy.aiAnalysis += 30
    }

    if (analysis.summary && analysis.summary.length > 100) {
      accuracy.aiAnalysis += 30
    }

    return accuracy
  }

  /**
   * Validate consistency of data
   */
  private validateConsistency(analysis: AIAnalysisResult, issues: ValidationIssue[]): void {
    // Check for logical inconsistencies
    const data = analysis.extractedData

    // Check if credit score matches account data
    if (data.creditScore.score > 0 && data.negativeItems.length > 0) {
      const highScoreWithNegatives = data.creditScore.score > 750 && data.negativeItems.length > 2
      if (highScoreWithNegatives) {
        issues.push({
          type: 'warning',
          category: 'consistency',
          message: 'High credit score with multiple negative items - verify accuracy',
          severity: 'medium',
          field: 'creditScore',
          suggestion: 'Review negative items and credit score consistency'
        })
      }
    }

    // Check for duplicate accounts
    const creditorNames = data.accounts.map(acc => acc.creditorName.toLowerCase())
    const duplicates = creditorNames.filter((name, index) => creditorNames.indexOf(name) !== index)
    if (duplicates.length > 0) {
      issues.push({
        type: 'warning',
        category: 'consistency',
        message: 'Potential duplicate accounts detected',
        severity: 'medium',
        field: 'accounts',
        suggestion: 'Review for duplicate account entries'
      })
    }

    // Check for date consistency
    const currentDate = new Date()
    const reportDate = new Date(data.creditScore.date)
    const dateDiff = Math.abs(currentDate.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24)
    
    if (dateDiff > 365) {
      issues.push({
        type: 'warning',
        category: 'consistency',
        message: 'Credit report appears to be over 1 year old',
        severity: 'medium',
        field: 'creditScore.date',
        suggestion: 'Consider requesting a fresh credit report'
      })
    }
  }

  /**
   * Validate completeness of data
   */
  private validateCompleteness(analysis: AIAnalysisResult, issues: ValidationIssue[]): void {
    const data = analysis.extractedData

    // Check for missing critical information
    if (!data.personalInfo.name) {
      issues.push({
        type: 'error',
        category: 'completeness',
        message: 'Personal name is missing',
        severity: 'high',
        field: 'personalInfo.name',
        suggestion: 'Improve name extraction from document'
      })
    }

    if (!data.creditScore.score) {
      issues.push({
        type: 'error',
        category: 'completeness',
        message: 'Credit score is missing',
        severity: 'high',
        field: 'creditScore.score',
        suggestion: 'Check credit score extraction logic'
      })
    }

    // Check for minimal account information
    if (data.accounts.length === 0 && data.negativeItems.length === 0) {
      issues.push({
        type: 'warning',
        category: 'completeness',
        message: 'No accounts or negative items found',
        severity: 'medium',
        field: 'accounts',
        suggestion: 'Verify document contains credit information'
      })
    }
  }

  /**
   * Generate recommendations based on validation issues
   */
  private generateRecommendations(issues: ValidationIssue[], recommendations: string[]): void {
    const highPriorityIssues = issues.filter(issue => issue.severity === 'high')
    const mediumPriorityIssues = issues.filter(issue => issue.severity === 'medium')

    if (highPriorityIssues.length > 0) {
      recommendations.push('Address high-priority validation issues before proceeding with analysis')
    }

    if (mediumPriorityIssues.length > 0) {
      recommendations.push('Review and address medium-priority issues to improve analysis quality')
    }

    // Specific recommendations based on issue types
    const dataQualityIssues = issues.filter(issue => issue.category === 'data_quality')
    if (dataQualityIssues.length > 0) {
      recommendations.push('Improve data extraction quality for better analysis results')
    }

    const accuracyIssues = issues.filter(issue => issue.category === 'accuracy')
    if (accuracyIssues.length > 0) {
      recommendations.push('Review AI model performance and input quality')
    }

    const completenessIssues = issues.filter(issue => issue.category === 'completeness')
    if (completenessIssues.length > 0) {
      recommendations.push('Ensure all required credit report sections are captured')
    }

    // Add general recommendations
    if (recommendations.length === 0) {
      recommendations.push('Analysis quality is good - proceed with confidence')
    }
  }

  /**
   * Calculate overall validation score
   */
  private calculateOverallScore(dataQuality: any, accuracy: any, issues: ValidationIssue[]): number {
    // Calculate average data quality score
    const dataQualityValues = Object.values(dataQuality) as number[]
    const dataQualitySum = dataQualityValues.reduce((sum: number, score: number) => {
      const numScore = typeof score === 'number' ? score : 0
      return sum + numScore
    }, 0)
    const dataQualityAvg = dataQualityValues.length > 0 ? dataQualitySum / dataQualityValues.length : 0

    // Calculate average accuracy score
    const accuracyValues = Object.values(accuracy) as number[]
    const accuracySum = accuracyValues.reduce((sum: number, score: number) => {
      const numScore = typeof score === 'number' ? score : 0
      return sum + numScore
    }, 0)
    const accuracyAvg = accuracyValues.length > 0 ? accuracySum / accuracyValues.length : 0

    // Penalize for issues
    const highIssues = issues.filter(issue => issue.severity === 'high').length
    const mediumIssues = issues.filter(issue => issue.severity === 'medium').length
    const lowIssues = issues.filter(issue => issue.severity === 'low').length

    const issuePenalty = (highIssues * 10) + (mediumIssues * 5) + (lowIssues * 2)

    // Calculate overall score (0-100)
    const overallScore = Math.max(0, Math.min(100, 
      (dataQualityAvg * 0.4) + (accuracyAvg * 0.6) - issuePenalty
    ))

    return Math.round(overallScore)
  }

  /**
   * Initialize validation rules
   */
  private initializeValidationRules(): void {
    this.validationRules = [
      {
        name: 'Credit Score Range',
        validate: (data: CreditReportData) => {
          return data.creditScore.score >= 300 && data.creditScore.score <= 850
        },
        message: 'Credit score must be between 300 and 850',
        severity: 'high'
      },
      {
        name: 'Personal Name Required',
        validate: (data: CreditReportData) => {
          return data.personalInfo.name && data.personalInfo.name.length > 2
        },
        message: 'Personal name is required and must be at least 3 characters',
        severity: 'high'
      },
      {
        name: 'Valid Bureau',
        validate: (data: CreditReportData) => {
          return ['experian', 'equifax', 'transunion'].includes(data.creditScore.bureau)
        },
        message: 'Credit bureau must be one of: experian, equifax, transunion',
        severity: 'medium'
      }
    ]
  }
}

// Singleton instance
export const validationSystem = new CreditReportValidationSystem()
