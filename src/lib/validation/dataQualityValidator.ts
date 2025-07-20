/**
 * Data Quality Validator
 * 
 * Validates the accuracy and quality of extracted credit report data
 * with comprehensive scoring and issue detection.
 */

import { 
  EnhancedCreditReportData, 
  ValidationIssue, 
  DataQualityMetrics,
  EnhancedPersonalInfo,
  EnhancedCreditScore,
  EnhancedCreditAccount,
  EnhancedNegativeItem,
  EnhancedCreditInquiry,
  EnhancedPublicRecord
} from '@/types/enhanced-credit'

export interface DataQualityResult {
  overallScore: number
  metrics: DataQualityMetrics
  issues: ValidationIssue[]
  recommendations: string[]
  validatedFields: string[]
  failedFields: string[]
}

export class DataQualityValidator {
  private readonly SCORE_THRESHOLDS = {
    EXCELLENT: 90,
    GOOD: 75,
    FAIR: 60,
    POOR: 40
  }

  private readonly FIELD_WEIGHTS = {
    personalInfo: 0.20,
    creditScore: 0.25,
    accounts: 0.25,
    negativeItems: 0.15,
    inquiries: 0.10,
    publicRecords: 0.05
  }

  /**
   * Validate overall data quality of extracted credit report
   */
  async validateDataQuality(data: EnhancedCreditReportData): Promise<DataQualityResult> {
    const issues: ValidationIssue[] = []
    const recommendations: string[] = []
    const validatedFields: string[] = []
    const failedFields: string[] = []

    // Validate each section
    const personalInfoScore = await this.validatePersonalInfo(data.personalInfo, issues, validatedFields, failedFields)
    const creditScoreScore = await this.validateCreditScores(data.creditScores, issues, validatedFields, failedFields)
    const accountsScore = await this.validateAccounts(data.accounts, issues, validatedFields, failedFields)
    const negativeItemsScore = await this.validateNegativeItems(data.negativeItems, issues, validatedFields, failedFields)
    const inquiriesScore = await this.validateInquiries(data.inquiries, issues, validatedFields, failedFields)
    const publicRecordsScore = await this.validatePublicRecords(data.publicRecords, issues, validatedFields, failedFields)

    const metrics: DataQualityMetrics = {
      personalInfo: personalInfoScore,
      creditScore: creditScoreScore,
      accounts: accountsScore,
      negativeItems: negativeItemsScore,
      inquiries: inquiriesScore,
      publicRecords: publicRecordsScore
    }

    // Calculate overall score
    const overallScore = this.calculateOverallScore(metrics)

    // Generate recommendations
    this.generateRecommendations(metrics, issues, recommendations)

    return {
      overallScore,
      metrics,
      issues,
      recommendations,
      validatedFields,
      failedFields
    }
  }

  /**
   * Validate personal information quality
   */
  private async validatePersonalInfo(
    personalInfo: EnhancedPersonalInfo, 
    issues: ValidationIssue[],
    validatedFields: string[],
    failedFields: string[]
  ): Promise<number> {
    let score = 0
    const maxScore = 100

    // Name validation (25 points)
    if (personalInfo.name && personalInfo.name.trim().length >= 2) {
      score += 20
      validatedFields.push('personalInfo.name')
      
      if (personalInfo.nameConfidence >= 0.8) {
        score += 5
      } else if (personalInfo.nameConfidence < 0.6) {
        issues.push({
          type: 'warning',
          category: 'data_quality',
          message: 'Low confidence in name extraction',
          severity: 'medium',
          field: 'personalInfo.name',
          suggestion: 'Review name extraction accuracy'
        })
      }
    } else {
      failedFields.push('personalInfo.name')
      issues.push({
        type: 'error',
        category: 'data_quality',
        message: 'Personal name is missing or too short',
        severity: 'high',
        field: 'personalInfo.name',
        suggestion: 'Ensure name is properly extracted from document'
      })
    }

    // Address validation (25 points)
    if (personalInfo.address && personalInfo.address.trim().length >= 10) {
      score += 20
      validatedFields.push('personalInfo.address')
      
      if (personalInfo.addressConfidence >= 0.8) {
        score += 5
      } else if (personalInfo.addressConfidence < 0.6) {
        issues.push({
          type: 'warning',
          category: 'data_quality',
          message: 'Low confidence in address extraction',
          severity: 'medium',
          field: 'personalInfo.address',
          suggestion: 'Verify address extraction accuracy'
        })
      }
    } else {
      failedFields.push('personalInfo.address')
      issues.push({
        type: 'error',
        category: 'data_quality',
        message: 'Address is missing or incomplete',
        severity: 'high',
        field: 'personalInfo.address',
        suggestion: 'Check address extraction from document'
      })
    }

    // SSN validation (20 points)
    if (personalInfo.ssn) {
      const ssnPattern = /^\d{3}-?\d{2}-?\d{4}$/
      if (ssnPattern.test(personalInfo.ssn)) {
        score += 15
        validatedFields.push('personalInfo.ssn')
        
        if (personalInfo.ssnValidated) {
          score += 5
        }
      } else {
        failedFields.push('personalInfo.ssn')
        issues.push({
          type: 'error',
          category: 'data_quality',
          message: 'Invalid SSN format',
          severity: 'high',
          field: 'personalInfo.ssn',
          suggestion: 'Verify SSN extraction and formatting'
        })
      }
    } else {
      issues.push({
        type: 'warning',
        category: 'completeness',
        message: 'SSN is missing',
        severity: 'medium',
        field: 'personalInfo.ssn',
        suggestion: 'SSN may be required for complete analysis'
      })
    }

    // Date of birth validation (15 points)
    if (personalInfo.dateOfBirth) {
      const dobDate = new Date(personalInfo.dateOfBirth)
      const currentDate = new Date()
      const age = currentDate.getFullYear() - dobDate.getFullYear()
      
      if (age >= 18 && age <= 120) {
        score += 10
        validatedFields.push('personalInfo.dateOfBirth')
        
        if (personalInfo.dobValidated) {
          score += 5
        }
      } else {
        failedFields.push('personalInfo.dateOfBirth')
        issues.push({
          type: 'error',
          category: 'data_quality',
          message: 'Invalid date of birth - age appears unrealistic',
          severity: 'high',
          field: 'personalInfo.dateOfBirth',
          suggestion: 'Verify date of birth extraction'
        })
      }
    }

    // Phone validation (10 points)
    if (personalInfo.phone) {
      const phonePattern = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
      if (phonePattern.test(personalInfo.phone)) {
        score += 10
        validatedFields.push('personalInfo.phone')
      } else {
        issues.push({
          type: 'warning',
          category: 'data_quality',
          message: 'Phone number format may be invalid',
          severity: 'low',
          field: 'personalInfo.phone',
          suggestion: 'Verify phone number extraction'
        })
      }
    }

    // Employment information (5 points)
    if (personalInfo.employers && personalInfo.employers.length > 0) {
      const validEmployers = personalInfo.employers.filter(emp => 
        emp.employerName && emp.employerName.length > 2
      )
      if (validEmployers.length > 0) {
        score += 5
        validatedFields.push('personalInfo.employers')
      }
    }

    return Math.min(score, maxScore)
  }

  /**
   * Validate credit scores quality
   */
  private async validateCreditScores(
    creditScores: any, 
    issues: ValidationIssue[],
    validatedFields: string[],
    failedFields: string[]
  ): Promise<number> {
    let score = 0
    const maxScore = 100

    const bureauScores = [creditScores.experian, creditScores.equifax, creditScores.transunion]
      .filter(s => s !== undefined)

    if (bureauScores.length === 0) {
      failedFields.push('creditScores')
      issues.push({
        type: 'error',
        category: 'completeness',
        message: 'No credit scores found',
        severity: 'high',
        field: 'creditScores',
        suggestion: 'Ensure credit scores are properly extracted'
      })
      return 0
    }

    // Validate each bureau score
    for (const bureauScore of bureauScores) {
      if (this.isValidCreditScore(bureauScore)) {
        score += 25
        validatedFields.push(`creditScores.${bureauScore.bureau}`)
        
        // Bonus for high confidence
        if (bureauScore.confidence >= 0.9) {
          score += 5
        }
        
        // Bonus for recent date
        const scoreDate = new Date(bureauScore.date)
        const daysSinceScore = Math.floor((Date.now() - scoreDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysSinceScore <= 90) {
          score += 5
        }
      } else {
        failedFields.push(`creditScores.${bureauScore?.bureau || 'unknown'}`)
        issues.push({
          type: 'error',
          category: 'data_quality',
          message: `Invalid credit score for ${bureauScore?.bureau || 'unknown bureau'}`,
          severity: 'high',
          field: `creditScores.${bureauScore?.bureau || 'unknown'}`,
          suggestion: 'Verify credit score extraction and validation'
        })
      }
    }

    // Cross-bureau consistency check
    if (bureauScores.length > 1) {
      const scores = bureauScores.map(s => s.score).filter(s => s > 0)
      if (scores.length > 1) {
        const maxDiff = Math.max(...scores) - Math.min(...scores)
        if (maxDiff > 100) {
          issues.push({
            type: 'warning',
            category: 'consistency',
            message: 'Large variance between bureau credit scores',
            severity: 'medium',
            field: 'creditScores',
            suggestion: 'Review score extraction accuracy across bureaus'
          })
        } else {
          score += 10 // Bonus for consistency
        }
      }
    }

    return Math.min(score, maxScore)
  }

  /**
   * Validate accounts quality
   */
  private async validateAccounts(
    accounts: EnhancedCreditAccount[], 
    issues: ValidationIssue[],
    validatedFields: string[],
    failedFields: string[]
  ): Promise<number> {
    if (!accounts || accounts.length === 0) {
      issues.push({
        type: 'info',
        category: 'completeness',
        message: 'No credit accounts found',
        severity: 'low',
        field: 'accounts',
        suggestion: 'Verify if credit accounts should be present'
      })
      return 50 // Neutral score for no accounts
    }

    let score = 0
    let validAccounts = 0
    const maxScore = 100

    for (const account of accounts) {
      let accountScore = 0
      const accountId = account.id || `account-${accounts.indexOf(account)}`

      // Creditor name (20 points)
      if (account.creditorName && account.creditorName.length > 2) {
        accountScore += 20
        if (account.standardizedCreditorName) {
          accountScore += 5
        }
      } else {
        failedFields.push(`accounts[${accountId}].creditorName`)
        issues.push({
          type: 'error',
          category: 'data_quality',
          message: `Account ${accountId}: Missing or invalid creditor name`,
          severity: 'medium',
          field: `accounts[${accountId}].creditorName`,
          suggestion: 'Improve creditor name extraction'
        })
      }

      // Account number (15 points)
      if (account.accountNumber && account.accountNumber.length >= 4) {
        accountScore += 15
      } else {
        failedFields.push(`accounts[${accountId}].accountNumber`)
        issues.push({
          type: 'warning',
          category: 'data_quality',
          message: `Account ${accountId}: Missing or invalid account number`,
          severity: 'medium',
          field: `accounts[${accountId}].accountNumber`,
          suggestion: 'Verify account number extraction'
        })
      }

      // Balance validation (15 points)
      if (typeof account.balance === 'number' && account.balance >= 0) {
        accountScore += 15
      } else {
        issues.push({
          type: 'warning',
          category: 'data_quality',
          message: `Account ${accountId}: Invalid balance`,
          severity: 'low',
          field: `accounts[${accountId}].balance`,
          suggestion: 'Check balance extraction accuracy'
        })
      }

      // Account type (10 points)
      const validAccountTypes = ['credit_card', 'auto_loan', 'mortgage', 'personal_loan', 'student_loan', 'other']
      if (validAccountTypes.includes(account.accountType)) {
        accountScore += 10
      }

      // Payment history (20 points)
      if (account.paymentHistory && account.paymentHistory.length > 0) {
        accountScore += 15
        
        const validPayments = account.paymentHistory.filter(p => 
          p.month && p.status && p.confidence >= 0.5
        )
        if (validPayments.length === account.paymentHistory.length) {
          accountScore += 5
        }
      }

      // Status validation (10 points)
      const validStatuses = ['open', 'closed', 'paid', 'charged_off']
      if (validStatuses.includes(account.status)) {
        accountScore += 10
      }

      // Data quality score (10 points)
      if (account.dataQuality >= 0.8) {
        accountScore += 10
      } else if (account.dataQuality < 0.5) {
        issues.push({
          type: 'warning',
          category: 'data_quality',
          message: `Account ${accountId}: Low data quality score`,
          severity: 'medium',
          field: `accounts[${accountId}].dataQuality`,
          suggestion: 'Review account data extraction quality'
        })
      }

      if (accountScore >= 70) {
        validAccounts++
        validatedFields.push(`accounts[${accountId}]`)
      } else {
        failedFields.push(`accounts[${accountId}]`)
      }

      score += accountScore
    }

    // Calculate average score
    const averageScore = accounts.length > 0 ? score / accounts.length : 0
    
    // Bonus for high percentage of valid accounts
    const validAccountPercentage = validAccounts / accounts.length
    if (validAccountPercentage >= 0.9) {
      score += 10
    } else if (validAccountPercentage < 0.5) {
      issues.push({
        type: 'warning',
        category: 'data_quality',
        message: 'Low percentage of valid accounts detected',
        severity: 'medium',
        field: 'accounts',
        suggestion: 'Review account extraction process'
      })
    }

    return Math.min(averageScore, maxScore)
  }

  /**
   * Validate negative items quality
   */
  private async validateNegativeItems(
    negativeItems: EnhancedNegativeItem[], 
    issues: ValidationIssue[],
    validatedFields: string[],
    failedFields: string[]
  ): Promise<number> {
    if (!negativeItems || negativeItems.length === 0) {
      validatedFields.push('negativeItems')
      return 100 // Perfect score for no negative items
    }

    let score = 0
    let validItems = 0
    const maxScore = 100

    for (const item of negativeItems) {
      let itemScore = 0
      const itemId = item.id || `item-${negativeItems.indexOf(item)}`

      // Type validation (20 points)
      const validTypes = ['late_payment', 'collection', 'charge_off', 'bankruptcy', 'tax_lien', 'judgment', 'foreclosure']
      if (validTypes.includes(item.type)) {
        itemScore += 20
      } else {
        failedFields.push(`negativeItems[${itemId}].type`)
        issues.push({
          type: 'error',
          category: 'data_quality',
          message: `Negative item ${itemId}: Invalid type`,
          severity: 'high',
          field: `negativeItems[${itemId}].type`,
          suggestion: 'Verify negative item type classification'
        })
      }

      // Creditor name (20 points)
      if (item.creditorName && item.creditorName.length > 2) {
        itemScore += 15
        if (item.standardizedCreditorName) {
          itemScore += 5
        }
      } else {
        failedFields.push(`negativeItems[${itemId}].creditorName`)
        issues.push({
          type: 'error',
          category: 'data_quality',
          message: `Negative item ${itemId}: Missing creditor name`,
          severity: 'high',
          field: `negativeItems[${itemId}].creditorName`,
          suggestion: 'Improve creditor name extraction for negative items'
        })
      }

      // Amount validation (15 points)
      if (typeof item.amount === 'number' && item.amount >= 0) {
        itemScore += 15
      } else {
        issues.push({
          type: 'warning',
          category: 'data_quality',
          message: `Negative item ${itemId}: Invalid amount`,
          severity: 'medium',
          field: `negativeItems[${itemId}].amount`,
          suggestion: 'Check amount extraction for negative items'
        })
      }

      // Date validation (15 points)
      if (item.date) {
        const itemDate = new Date(item.date)
        if (!isNaN(itemDate.getTime())) {
          itemScore += 15
        } else {
          issues.push({
            type: 'error',
            category: 'data_quality',
            message: `Negative item ${itemId}: Invalid date`,
            severity: 'high',
            field: `negativeItems[${itemId}].date`,
            suggestion: 'Verify date extraction for negative items'
          })
        }
      }

      // Impact score validation (15 points)
      if (typeof item.impactScore === 'number' && item.impactScore >= 0 && item.impactScore <= 100) {
        itemScore += 15
      } else {
        issues.push({
          type: 'warning',
          category: 'data_quality',
          message: `Negative item ${itemId}: Invalid impact score`,
          severity: 'medium',
          field: `negativeItems[${itemId}].impactScore`,
          suggestion: 'Review impact score calculation'
        })
      }

      // Bureau reporting validation (10 points)
      if (item.bureauReporting && item.bureauReporting.length > 0) {
        itemScore += 10
      }

      // Confidence validation (5 points)
      if (item.confidence >= 0.7) {
        itemScore += 5
      } else if (item.confidence < 0.5) {
        issues.push({
          type: 'warning',
          category: 'data_quality',
          message: `Negative item ${itemId}: Low confidence score`,
          severity: 'medium',
          field: `negativeItems[${itemId}].confidence`,
          suggestion: 'Review extraction confidence for negative items'
        })
      }

      if (itemScore >= 70) {
        validItems++
        validatedFields.push(`negativeItems[${itemId}]`)
      } else {
        failedFields.push(`negativeItems[${itemId}]`)
      }

      score += itemScore
    }

    // Calculate average score
    const averageScore = negativeItems.length > 0 ? score / negativeItems.length : 0
    
    return Math.min(averageScore, maxScore)
  }

  /**
   * Validate inquiries quality
   */
  private async validateInquiries(
    inquiries: EnhancedCreditInquiry[], 
    issues: ValidationIssue[],
    validatedFields: string[],
    failedFields: string[]
  ): Promise<number> {
    if (!inquiries || inquiries.length === 0) {
      validatedFields.push('inquiries')
      return 100 // Perfect score for no inquiries
    }

    let score = 0
    let validInquiries = 0
    const maxScore = 100

    for (const inquiry of inquiries) {
      let inquiryScore = 0
      const inquiryId = inquiry.id || `inquiry-${inquiries.indexOf(inquiry)}`

      // Creditor name (30 points)
      if (inquiry.creditorName && inquiry.creditorName.length > 2) {
        inquiryScore += 25
        if (inquiry.standardizedCreditorName) {
          inquiryScore += 5
        }
      } else {
        failedFields.push(`inquiries[${inquiryId}].creditorName`)
        issues.push({
          type: 'error',
          category: 'data_quality',
          message: `Inquiry ${inquiryId}: Missing creditor name`,
          severity: 'medium',
          field: `inquiries[${inquiryId}].creditorName`,
          suggestion: 'Improve creditor name extraction for inquiries'
        })
      }

      // Date validation (25 points)
      if (inquiry.date) {
        const inquiryDate = new Date(inquiry.date)
        if (!isNaN(inquiryDate.getTime())) {
          inquiryScore += 25
        } else {
          issues.push({
            type: 'error',
            category: 'data_quality',
            message: `Inquiry ${inquiryId}: Invalid date`,
            severity: 'high',
            field: `inquiries[${inquiryId}].date`,
            suggestion: 'Verify date extraction for inquiries'
          })
        }
      }

      // Type validation (20 points)
      if (['hard', 'soft'].includes(inquiry.type)) {
        inquiryScore += 20
      } else {
        issues.push({
          type: 'warning',
          category: 'data_quality',
          message: `Inquiry ${inquiryId}: Invalid inquiry type`,
          severity: 'medium',
          field: `inquiries[${inquiryId}].type`,
          suggestion: 'Verify inquiry type classification'
        })
      }

      // Bureau validation (15 points)
      if (['experian', 'equifax', 'transunion'].includes(inquiry.bureau)) {
        inquiryScore += 15
      }

      // Confidence validation (10 points)
      if (inquiry.confidence >= 0.7) {
        inquiryScore += 10
      } else if (inquiry.confidence < 0.5) {
        issues.push({
          type: 'warning',
          category: 'data_quality',
          message: `Inquiry ${inquiryId}: Low confidence score`,
          severity: 'low',
          field: `inquiries[${inquiryId}].confidence`,
          suggestion: 'Review extraction confidence for inquiries'
        })
      }

      if (inquiryScore >= 70) {
        validInquiries++
        validatedFields.push(`inquiries[${inquiryId}]`)
      } else {
        failedFields.push(`inquiries[${inquiryId}]`)
      }

      score += inquiryScore
    }

    // Calculate average score
    const averageScore = inquiries.length > 0 ? score / inquiries.length : 0
    
    return Math.min(averageScore, maxScore)
  }

  /**
   * Validate public records quality
   */
  private async validatePublicRecords(
    publicRecords: EnhancedPublicRecord[], 
    issues: ValidationIssue[],
    validatedFields: string[],
    failedFields: string[]
  ): Promise<number> {
    if (!publicRecords || publicRecords.length === 0) {
      validatedFields.push('publicRecords')
      return 100 // Perfect score for no public records
    }

    let score = 0
    let validRecords = 0
    const maxScore = 100

    for (const record of publicRecords) {
      let recordScore = 0
      const recordId = record.id || `record-${publicRecords.indexOf(record)}`

      // Type validation (30 points)
      const validTypes = ['bankruptcy', 'tax_lien', 'judgment', 'foreclosure']
      if (validTypes.includes(record.type)) {
        recordScore += 30
      } else {
        failedFields.push(`publicRecords[${recordId}].type`)
        issues.push({
          type: 'error',
          category: 'data_quality',
          message: `Public record ${recordId}: Invalid type`,
          severity: 'high',
          field: `publicRecords[${recordId}].type`,
          suggestion: 'Verify public record type classification'
        })
      }

      // Date validation (25 points)
      if (record.date) {
        const recordDate = new Date(record.date)
        if (!isNaN(recordDate.getTime())) {
          recordScore += 25
        } else {
          issues.push({
            type: 'error',
            category: 'data_quality',
            message: `Public record ${recordId}: Invalid date`,
            severity: 'high',
            field: `publicRecords[${recordId}].date`,
            suggestion: 'Verify date extraction for public records'
          })
        }
      }

      // Amount validation (20 points)
      if (record.amount && typeof record.amount === 'number' && record.amount >= 0) {
        recordScore += 20
      }

      // Status validation (15 points)
      if (record.status && record.status.length > 0) {
        recordScore += 15
      }

      // Confidence validation (10 points)
      if (record.confidence >= 0.7) {
        recordScore += 10
      } else if (record.confidence < 0.5) {
        issues.push({
          type: 'warning',
          category: 'data_quality',
          message: `Public record ${recordId}: Low confidence score`,
          severity: 'medium',
          field: `publicRecords[${recordId}].confidence`,
          suggestion: 'Review extraction confidence for public records'
        })
      }

      if (recordScore >= 70) {
        validRecords++
        validatedFields.push(`publicRecords[${recordId}]`)
      } else {
        failedFields.push(`publicRecords[${recordId}]`)
      }

      score += recordScore
    }

    // Calculate average score
    const averageScore = publicRecords.length > 0 ? score / publicRecords.length : 0
    
    return Math.min(averageScore, maxScore)
  }

  /**
   * Calculate overall data quality score
   */
  private calculateOverallScore(metrics: DataQualityMetrics): number {
    const weightedScore = 
      (metrics.personalInfo * this.FIELD_WEIGHTS.personalInfo) +
      (metrics.creditScore * this.FIELD_WEIGHTS.creditScore) +
      (metrics.accounts * this.FIELD_WEIGHTS.accounts) +
      (metrics.negativeItems * this.FIELD_WEIGHTS.negativeItems) +
      (metrics.inquiries * this.FIELD_WEIGHTS.inquiries) +
      (metrics.publicRecords * this.FIELD_WEIGHTS.publicRecords)

    return Math.round(weightedScore)
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(
    metrics: DataQualityMetrics, 
    issues: ValidationIssue[], 
    recommendations: string[]
  ): void {
    // Overall quality recommendations
    const overallScore = this.calculateOverallScore(metrics)
    
    if (overallScore >= this.SCORE_THRESHOLDS.EXCELLENT) {
      recommendations.push('Excellent data quality - proceed with confidence')
    } else if (overallScore >= this.SCORE_THRESHOLDS.GOOD) {
      recommendations.push('Good data quality - minor improvements may be beneficial')
    } else if (overallScore >= this.SCORE_THRESHOLDS.FAIR) {
      recommendations.push('Fair data quality - address medium and high priority issues')
    } else {
      recommendations.push('Poor data quality - significant improvements needed before proceeding')
    }

    // Section-specific recommendations
    if (metrics.personalInfo < this.SCORE_THRESHOLDS.GOOD) {
      recommendations.push('Improve personal information extraction accuracy')
    }
    
    if (metrics.creditScore < this.SCORE_THRESHOLDS.GOOD) {
      recommendations.push('Review credit score extraction and validation process')
    }
    
    if (metrics.accounts < this.SCORE_THRESHOLDS.GOOD) {
      recommendations.push('Enhance account data extraction and standardization')
    }
    
    if (metrics.negativeItems < this.SCORE_THRESHOLDS.GOOD) {
      recommendations.push('Improve negative item identification and classification')
    }

    // Issue-based recommendations
    const highPriorityIssues = issues.filter(issue => issue.severity === 'high')
    if (highPriorityIssues.length > 0) {
      recommendations.push(`Address ${highPriorityIssues.length} high-priority data quality issues`)
    }

    const mediumPriorityIssues = issues.filter(issue => issue.severity === 'medium')
    if (mediumPriorityIssues.length > 3) {
      recommendations.push('Multiple medium-priority issues detected - consider batch processing improvements')
    }
  }

  /**
   * Helper method to validate credit score
   */
  private isValidCreditScore(score: EnhancedCreditScore): boolean {
    return score && 
           typeof score.score === 'number' && 
           score.score >= 300 && 
           score.score <= 850 &&
           score.bureau &&
           ['experian', 'equifax', 'transunion'].includes(score.bureau) &&
           score.date &&
           !isNaN(new Date(score.date).getTime())
  }
}

export const dataQualityValidator = new DataQualityValidator()