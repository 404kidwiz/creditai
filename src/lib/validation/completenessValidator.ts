/**
 * Completeness Validator
 * 
 * Validates the completeness of extracted credit report data
 * and identifies missing critical information.
 */

import { 
  EnhancedCreditReportData, 
  ValidationIssue,
  EnhancedPersonalInfo,
  EnhancedCreditAccount,
  EnhancedNegativeItem
} from '@/types/enhanced-credit'

export interface CompletenessResult {
  overallCompleteness: number
  sectionCompleteness: {
    personalInfo: number
    creditScores: number
    accounts: number
    negativeItems: number
    inquiries: number
    publicRecords: number
  }
  criticalMissing: string[]
  optionalMissing: string[]
  issues: ValidationIssue[]
  recommendations: string[]
}

export interface FieldRequirement {
  field: string
  required: boolean
  weight: number
  description: string
  category: 'critical' | 'important' | 'optional'
}

export class CompletenessValidator {
  private readonly COMPLETENESS_THRESHOLDS = {
    EXCELLENT: 95,
    GOOD: 85,
    FAIR: 70,
    POOR: 50
  }

  private readonly PERSONAL_INFO_REQUIREMENTS: FieldRequirement[] = [
    { field: 'name', required: true, weight: 30, description: 'Full name', category: 'critical' },
    { field: 'address', required: true, weight: 25, description: 'Current address', category: 'critical' },
    { field: 'ssn', required: false, weight: 20, description: 'Social Security Number', category: 'important' },
    { field: 'dateOfBirth', required: false, weight: 15, description: 'Date of birth', category: 'important' },
    { field: 'phone', required: false, weight: 10, description: 'Phone number', category: 'optional' }
  ]

  private readonly CREDIT_SCORE_REQUIREMENTS: FieldRequirement[] = [
    { field: 'score', required: true, weight: 40, description: 'Credit score value', category: 'critical' },
    { field: 'bureau', required: true, weight: 30, description: 'Credit bureau', category: 'critical' },
    { field: 'date', required: true, weight: 20, description: 'Score date', category: 'critical' },
    { field: 'model', required: false, weight: 10, description: 'Scoring model', category: 'optional' }
  ]

  private readonly ACCOUNT_REQUIREMENTS: FieldRequirement[] = [
    { field: 'creditorName', required: true, weight: 25, description: 'Creditor name', category: 'critical' },
    { field: 'accountNumber', required: true, weight: 20, description: 'Account number', category: 'critical' },
    { field: 'accountType', required: true, weight: 15, description: 'Account type', category: 'critical' },
    { field: 'balance', required: true, weight: 15, description: 'Current balance', category: 'important' },
    { field: 'status', required: true, weight: 10, description: 'Account status', category: 'important' },
    { field: 'openDate', required: true, weight: 10, description: 'Account open date', category: 'important' },
    { field: 'paymentHistory', required: false, weight: 5, description: 'Payment history', category: 'optional' }
  ]

  private readonly NEGATIVE_ITEM_REQUIREMENTS: FieldRequirement[] = [
    { field: 'type', required: true, weight: 25, description: 'Negative item type', category: 'critical' },
    { field: 'creditorName', required: true, weight: 25, description: 'Creditor name', category: 'critical' },
    { field: 'amount', required: true, weight: 20, description: 'Amount', category: 'critical' },
    { field: 'date', required: true, weight: 15, description: 'Date reported', category: 'critical' },
    { field: 'status', required: true, weight: 10, description: 'Current status', category: 'important' },
    { field: 'impactScore', required: false, weight: 5, description: 'Impact score', category: 'optional' }
  ]

  /**
   * Validate overall data completeness
   */
  async validateCompleteness(data: EnhancedCreditReportData): Promise<CompletenessResult> {
    const issues: ValidationIssue[] = []
    const criticalMissing: string[] = []
    const optionalMissing: string[] = []
    const recommendations: string[] = []

    // Validate each section
    const personalInfoCompleteness = await this.validatePersonalInfoCompleteness(
      data.personalInfo, issues, criticalMissing, optionalMissing
    )
    
    const creditScoresCompleteness = await this.validateCreditScoresCompleteness(
      data.creditScores, issues, criticalMissing, optionalMissing
    )
    
    const accountsCompleteness = await this.validateAccountsCompleteness(
      data.accounts, issues, criticalMissing, optionalMissing
    )
    
    const negativeItemsCompleteness = await this.validateNegativeItemsCompleteness(
      data.negativeItems, issues, criticalMissing, optionalMissing
    )
    
    const inquiriesCompleteness = await this.validateInquiriesCompleteness(
      data.inquiries, issues, criticalMissing, optionalMissing
    )
    
    const publicRecordsCompleteness = await this.validatePublicRecordsCompleteness(
      data.publicRecords, issues, criticalMissing, optionalMissing
    )

    const sectionCompleteness = {
      personalInfo: personalInfoCompleteness,
      creditScores: creditScoresCompleteness,
      accounts: accountsCompleteness,
      negativeItems: negativeItemsCompleteness,
      inquiries: inquiriesCompleteness,
      publicRecords: publicRecordsCompleteness
    }

    // Calculate overall completeness
    const overallCompleteness = this.calculateOverallCompleteness(sectionCompleteness)

    // Generate recommendations
    this.generateCompletenessRecommendations(
      overallCompleteness, 
      sectionCompleteness, 
      criticalMissing, 
      optionalMissing, 
      recommendations
    )

    return {
      overallCompleteness,
      sectionCompleteness,
      criticalMissing,
      optionalMissing,
      issues,
      recommendations
    }
  }

  /**
   * Validate personal information completeness
   */
  private async validatePersonalInfoCompleteness(
    personalInfo: EnhancedPersonalInfo,
    issues: ValidationIssue[],
    criticalMissing: string[],
    optionalMissing: string[]
  ): Promise<number> {
    let completenessScore = 0
    let totalWeight = 0

    for (const requirement of this.PERSONAL_INFO_REQUIREMENTS) {
      totalWeight += requirement.weight
      const fieldValue = (personalInfo as any)[requirement.field]
      
      if (this.isFieldComplete(fieldValue)) {
        completenessScore += requirement.weight
      } else {
        const missingField = `personalInfo.${requirement.field}`
        
        if (requirement.required || requirement.category === 'critical') {
          criticalMissing.push(missingField)
          issues.push({
            type: 'error',
            category: 'completeness',
            message: `Missing critical personal information: ${requirement.description}`,
            severity: 'high',
            field: missingField,
            suggestion: `Ensure ${requirement.description} is extracted from the document`
          })
        } else if (requirement.category === 'important') {
          issues.push({
            type: 'warning',
            category: 'completeness',
            message: `Missing important personal information: ${requirement.description}`,
            severity: 'medium',
            field: missingField,
            suggestion: `Consider extracting ${requirement.description} for better analysis`
          })
        } else {
          optionalMissing.push(missingField)
          issues.push({
            type: 'info',
            category: 'completeness',
            message: `Missing optional personal information: ${requirement.description}`,
            severity: 'low',
            field: missingField,
            suggestion: `${requirement.description} would enhance the analysis if available`
          })
        }
      }
    }

    return totalWeight > 0 ? Math.round((completenessScore / totalWeight) * 100) : 0
  }

  /**
   * Validate credit scores completeness
   */
  private async validateCreditScoresCompleteness(
    creditScores: any,
    issues: ValidationIssue[],
    criticalMissing: string[],
    optionalMissing: string[]
  ): Promise<number> {
    const bureauScores = [
      { bureau: 'experian', score: creditScores.experian },
      { bureau: 'equifax', score: creditScores.equifax },
      { bureau: 'transunion', score: creditScores.transunion }
    ].filter(item => item.score)

    if (bureauScores.length === 0) {
      criticalMissing.push('creditScores')
      issues.push({
        type: 'error',
        category: 'completeness',
        message: 'No credit scores found in any bureau section',
        severity: 'high',
        field: 'creditScores',
        suggestion: 'Ensure credit scores are properly extracted from the document'
      })
      return 0
    }

    let totalCompleteness = 0
    let validScoreCount = 0

    for (const { bureau, score } of bureauScores) {
      let scoreCompleteness = 0
      let totalWeight = 0

      for (const requirement of this.CREDIT_SCORE_REQUIREMENTS) {
        totalWeight += requirement.weight
        const fieldValue = (score as any)[requirement.field]
        
        if (this.isFieldComplete(fieldValue)) {
          scoreCompleteness += requirement.weight
        } else {
          const missingField = `creditScores.${bureau}.${requirement.field}`
          
          if (requirement.required || requirement.category === 'critical') {
            criticalMissing.push(missingField)
            issues.push({
              type: 'error',
              category: 'completeness',
              message: `Missing critical credit score field for ${bureau}: ${requirement.description}`,
              severity: 'high',
              field: missingField,
              suggestion: `Ensure ${requirement.description} is extracted for ${bureau}`
            })
          } else {
            optionalMissing.push(missingField)
            issues.push({
              type: 'info',
              category: 'completeness',
              message: `Missing optional credit score field for ${bureau}: ${requirement.description}`,
              severity: 'low',
              field: missingField,
              suggestion: `${requirement.description} would enhance analysis if available`
            })
          }
        }
      }

      if (totalWeight > 0) {
        totalCompleteness += (scoreCompleteness / totalWeight) * 100
        validScoreCount++
      }
    }

    return validScoreCount > 0 ? Math.round(totalCompleteness / validScoreCount) : 0
  }

  /**
   * Validate accounts completeness
   */
  private async validateAccountsCompleteness(
    accounts: EnhancedCreditAccount[],
    issues: ValidationIssue[],
    criticalMissing: string[],
    optionalMissing: string[]
  ): Promise<number> {
    if (!accounts || accounts.length === 0) {
      issues.push({
        type: 'info',
        category: 'completeness',
        message: 'No credit accounts found',
        severity: 'low',
        field: 'accounts',
        suggestion: 'Verify if credit accounts should be present in the report'
      })
      return 100 // Neutral score for no accounts
    }

    let totalCompleteness = 0
    let validAccountCount = 0

    for (const account of accounts) {
      const accountId = account.id || `account-${accounts.indexOf(account)}`
      let accountCompleteness = 0
      let totalWeight = 0

      for (const requirement of this.ACCOUNT_REQUIREMENTS) {
        totalWeight += requirement.weight
        const fieldValue = (account as any)[requirement.field]
        
        if (this.isFieldComplete(fieldValue)) {
          accountCompleteness += requirement.weight
        } else {
          const missingField = `accounts[${accountId}].${requirement.field}`
          
          if (requirement.required || requirement.category === 'critical') {
            criticalMissing.push(missingField)
            issues.push({
              type: 'error',
              category: 'completeness',
              message: `Account ${accountId}: Missing critical field ${requirement.description}`,
              severity: 'high',
              field: missingField,
              suggestion: `Ensure ${requirement.description} is extracted for all accounts`
            })
          } else if (requirement.category === 'important') {
            issues.push({
              type: 'warning',
              category: 'completeness',
              message: `Account ${accountId}: Missing important field ${requirement.description}`,
              severity: 'medium',
              field: missingField,
              suggestion: `Consider extracting ${requirement.description} for better analysis`
            })
          } else {
            optionalMissing.push(missingField)
            issues.push({
              type: 'info',
              category: 'completeness',
              message: `Account ${accountId}: Missing optional field ${requirement.description}`,
              severity: 'low',
              field: missingField,
              suggestion: `${requirement.description} would enhance analysis if available`
            })
          }
        }
      }

      // Special validation for payment history completeness
      if (account.paymentHistory && account.paymentHistory.length > 0) {
        const completePayments = account.paymentHistory.filter(payment => 
          payment.month && payment.status && payment.confidence >= 0.5
        )
        const paymentHistoryCompleteness = (completePayments.length / account.paymentHistory.length) * 100
        
        if (paymentHistoryCompleteness < 80) {
          issues.push({
            type: 'warning',
            category: 'completeness',
            message: `Account ${accountId}: Incomplete payment history (${Math.round(paymentHistoryCompleteness)}% complete)`,
            severity: 'medium',
            field: `accounts[${accountId}].paymentHistory`,
            suggestion: 'Improve payment history extraction completeness'
          })
        }
      }

      if (totalWeight > 0) {
        totalCompleteness += (accountCompleteness / totalWeight) * 100
        validAccountCount++
      }
    }

    return validAccountCount > 0 ? Math.round(totalCompleteness / validAccountCount) : 0
  }

  /**
   * Validate negative items completeness
   */
  private async validateNegativeItemsCompleteness(
    negativeItems: EnhancedNegativeItem[],
    issues: ValidationIssue[],
    criticalMissing: string[],
    optionalMissing: string[]
  ): Promise<number> {
    if (!negativeItems || negativeItems.length === 0) {
      return 100 // Perfect score for no negative items
    }

    let totalCompleteness = 0
    let validItemCount = 0

    for (const item of negativeItems) {
      const itemId = item.id || `item-${negativeItems.indexOf(item)}`
      let itemCompleteness = 0
      let totalWeight = 0

      for (const requirement of this.NEGATIVE_ITEM_REQUIREMENTS) {
        totalWeight += requirement.weight
        const fieldValue = (item as any)[requirement.field]
        
        if (this.isFieldComplete(fieldValue)) {
          itemCompleteness += requirement.weight
        } else {
          const missingField = `negativeItems[${itemId}].${requirement.field}`
          
          if (requirement.required || requirement.category === 'critical') {
            criticalMissing.push(missingField)
            issues.push({
              type: 'error',
              category: 'completeness',
              message: `Negative item ${itemId}: Missing critical field ${requirement.description}`,
              severity: 'high',
              field: missingField,
              suggestion: `Ensure ${requirement.description} is extracted for all negative items`
            })
          } else if (requirement.category === 'important') {
            issues.push({
              type: 'warning',
              category: 'completeness',
              message: `Negative item ${itemId}: Missing important field ${requirement.description}`,
              severity: 'medium',
              field: missingField,
              suggestion: `Consider extracting ${requirement.description} for better analysis`
            })
          } else {
            optionalMissing.push(missingField)
            issues.push({
              type: 'info',
              category: 'completeness',
              message: `Negative item ${itemId}: Missing optional field ${requirement.description}`,
              severity: 'low',
              field: missingField,
              suggestion: `${requirement.description} would enhance analysis if available`
            })
          }
        }
      }

      // Special validation for dispute-related completeness
      if (!item.disputeReasons || item.disputeReasons.length === 0) {
        issues.push({
          type: 'info',
          category: 'completeness',
          message: `Negative item ${itemId}: No dispute reasons identified`,
          severity: 'low',
          field: `negativeItems[${itemId}].disputeReasons`,
          suggestion: 'Consider analyzing potential dispute reasons for this item'
        })
      }

      if (totalWeight > 0) {
        totalCompleteness += (itemCompleteness / totalWeight) * 100
        validItemCount++
      }
    }

    return validItemCount > 0 ? Math.round(totalCompleteness / validItemCount) : 0
  }

  /**
   * Validate inquiries completeness
   */
  private async validateInquiriesCompleteness(
    inquiries: any[],
    issues: ValidationIssue[],
    criticalMissing: string[],
    optionalMissing: string[]
  ): Promise<number> {
    if (!inquiries || inquiries.length === 0) {
      return 100 // Perfect score for no inquiries
    }

    let completeInquiries = 0

    for (const inquiry of inquiries) {
      const inquiryId = inquiry.id || `inquiry-${inquiries.indexOf(inquiry)}`
      let isComplete = true

      // Check required fields
      if (!inquiry.creditorName || inquiry.creditorName.length < 2) {
        isComplete = false
        criticalMissing.push(`inquiries[${inquiryId}].creditorName`)
        issues.push({
          type: 'error',
          category: 'completeness',
          message: `Inquiry ${inquiryId}: Missing creditor name`,
          severity: 'high',
          field: `inquiries[${inquiryId}].creditorName`,
          suggestion: 'Ensure creditor names are extracted for all inquiries'
        })
      }

      if (!inquiry.date) {
        isComplete = false
        criticalMissing.push(`inquiries[${inquiryId}].date`)
        issues.push({
          type: 'error',
          category: 'completeness',
          message: `Inquiry ${inquiryId}: Missing inquiry date`,
          severity: 'high',
          field: `inquiries[${inquiryId}].date`,
          suggestion: 'Ensure inquiry dates are extracted'
        })
      }

      if (!inquiry.type || !['hard', 'soft'].includes(inquiry.type)) {
        isComplete = false
        issues.push({
          type: 'warning',
          category: 'completeness',
          message: `Inquiry ${inquiryId}: Missing or invalid inquiry type`,
          severity: 'medium',
          field: `inquiries[${inquiryId}].type`,
          suggestion: 'Classify inquiries as hard or soft'
        })
      }

      // Check optional fields
      if (!inquiry.bureau) {
        optionalMissing.push(`inquiries[${inquiryId}].bureau`)
        issues.push({
          type: 'info',
          category: 'completeness',
          message: `Inquiry ${inquiryId}: Missing bureau information`,
          severity: 'low',
          field: `inquiries[${inquiryId}].bureau`,
          suggestion: 'Bureau information would enhance inquiry analysis'
        })
      }

      if (isComplete) {
        completeInquiries++
      }
    }

    return inquiries.length > 0 ? Math.round((completeInquiries / inquiries.length) * 100) : 100
  }

  /**
   * Validate public records completeness
   */
  private async validatePublicRecordsCompleteness(
    publicRecords: any[],
    issues: ValidationIssue[],
    criticalMissing: string[],
    optionalMissing: string[]
  ): Promise<number> {
    if (!publicRecords || publicRecords.length === 0) {
      return 100 // Perfect score for no public records
    }

    let completeRecords = 0

    for (const record of publicRecords) {
      const recordId = record.id || `record-${publicRecords.indexOf(record)}`
      let isComplete = true

      // Check required fields
      const validTypes = ['bankruptcy', 'tax_lien', 'judgment', 'foreclosure']
      if (!record.type || !validTypes.includes(record.type)) {
        isComplete = false
        criticalMissing.push(`publicRecords[${recordId}].type`)
        issues.push({
          type: 'error',
          category: 'completeness',
          message: `Public record ${recordId}: Missing or invalid type`,
          severity: 'high',
          field: `publicRecords[${recordId}].type`,
          suggestion: 'Ensure public record types are properly classified'
        })
      }

      if (!record.date) {
        isComplete = false
        criticalMissing.push(`publicRecords[${recordId}].date`)
        issues.push({
          type: 'error',
          category: 'completeness',
          message: `Public record ${recordId}: Missing date`,
          severity: 'high',
          field: `publicRecords[${recordId}].date`,
          suggestion: 'Ensure public record dates are extracted'
        })
      }

      if (!record.status) {
        issues.push({
          type: 'warning',
          category: 'completeness',
          message: `Public record ${recordId}: Missing status`,
          severity: 'medium',
          field: `publicRecords[${recordId}].status`,
          suggestion: 'Extract status information for public records'
        })
      }

      // Check optional fields
      if (!record.amount && record.type !== 'bankruptcy') {
        optionalMissing.push(`publicRecords[${recordId}].amount`)
        issues.push({
          type: 'info',
          category: 'completeness',
          message: `Public record ${recordId}: Missing amount`,
          severity: 'low',
          field: `publicRecords[${recordId}].amount`,
          suggestion: 'Amount information would enhance public record analysis'
        })
      }

      if (isComplete) {
        completeRecords++
      }
    }

    return publicRecords.length > 0 ? Math.round((completeRecords / publicRecords.length) * 100) : 100
  }

  /**
   * Calculate overall completeness score
   */
  private calculateOverallCompleteness(sectionCompleteness: any): number {
    const weights = {
      personalInfo: 0.25,
      creditScores: 0.30,
      accounts: 0.25,
      negativeItems: 0.10,
      inquiries: 0.05,
      publicRecords: 0.05
    }

    return Math.round(
      (sectionCompleteness.personalInfo * weights.personalInfo) +
      (sectionCompleteness.creditScores * weights.creditScores) +
      (sectionCompleteness.accounts * weights.accounts) +
      (sectionCompleteness.negativeItems * weights.negativeItems) +
      (sectionCompleteness.inquiries * weights.inquiries) +
      (sectionCompleteness.publicRecords * weights.publicRecords)
    )
  }

  /**
   * Generate completeness-specific recommendations
   */
  private generateCompletenessRecommendations(
    overallCompleteness: number,
    sectionCompleteness: any,
    criticalMissing: string[],
    optionalMissing: string[],
    recommendations: string[]
  ): void {
    if (overallCompleteness >= this.COMPLETENESS_THRESHOLDS.EXCELLENT) {
      recommendations.push('Excellent data completeness - all critical information captured')
    } else if (overallCompleteness >= this.COMPLETENESS_THRESHOLDS.GOOD) {
      recommendations.push('Good data completeness - minor gaps in optional information')
    } else if (overallCompleteness >= this.COMPLETENESS_THRESHOLDS.FAIR) {
      recommendations.push('Fair data completeness - address missing important information')
    } else {
      recommendations.push('Poor data completeness - significant information gaps detected')
    }

    // Critical missing data recommendations
    if (criticalMissing.length > 0) {
      recommendations.push(`Address ${criticalMissing.length} critical missing data fields immediately`)
      
      // Group by section for specific recommendations
      const personalInfoMissing = criticalMissing.filter(field => field.startsWith('personalInfo')).length
      const creditScoresMissing = criticalMissing.filter(field => field.startsWith('creditScores')).length
      const accountsMissing = criticalMissing.filter(field => field.startsWith('accounts')).length
      const negativeItemsMissing = criticalMissing.filter(field => field.startsWith('negativeItems')).length

      if (personalInfoMissing > 0) {
        recommendations.push('Improve personal information extraction - critical fields missing')
      }
      if (creditScoresMissing > 0) {
        recommendations.push('Enhance credit score extraction - essential score data missing')
      }
      if (accountsMissing > 0) {
        recommendations.push('Strengthen account data extraction - key account information missing')
      }
      if (negativeItemsMissing > 0) {
        recommendations.push('Improve negative item extraction - critical negative item data missing')
      }
    }

    // Section-specific recommendations
    if (sectionCompleteness.personalInfo < this.COMPLETENESS_THRESHOLDS.GOOD) {
      recommendations.push('Focus on improving personal information completeness')
    }
    
    if (sectionCompleteness.creditScores < this.COMPLETENESS_THRESHOLDS.GOOD) {
      recommendations.push('Enhance credit score data extraction completeness')
    }
    
    if (sectionCompleteness.accounts < this.COMPLETENESS_THRESHOLDS.GOOD) {
      recommendations.push('Improve account information extraction completeness')
    }

    // Optional improvements
    if (optionalMissing.length > 5) {
      recommendations.push('Consider extracting additional optional fields to enhance analysis quality')
    }

    // Overall improvement suggestions
    if (overallCompleteness < this.COMPLETENESS_THRESHOLDS.FAIR) {
      recommendations.push('Review document quality and extraction algorithms for comprehensive improvements')
      recommendations.push('Consider manual review for documents with low completeness scores')
    }
  }

  /**
   * Helper method to check if a field is complete
   */
  private isFieldComplete(value: any): boolean {
    if (value === null || value === undefined) return false
    if (typeof value === 'string') return value.trim().length > 0
    if (typeof value === 'number') return !isNaN(value) && isFinite(value)
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return Object.keys(value).length > 0
    return Boolean(value)
  }
}

export const completenessValidator = new CompletenessValidator()