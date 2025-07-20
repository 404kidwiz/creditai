/**
 * Consistency Checker
 * 
 * Validates consistency of data across different sections of the credit report
 * and identifies logical inconsistencies and discrepancies.
 */

import { 
  EnhancedCreditReportData, 
  ValidationIssue, 
  BureauDiscrepancy,
  EnhancedCreditAccount,
  EnhancedNegativeItem,
  EnhancedCreditScore
} from '@/types/enhanced-credit'

export interface ConsistencyResult {
  overallConsistency: number
  crossSectionConsistency: number
  bureauConsistency: number
  temporalConsistency: number
  logicalConsistency: number
  issues: ValidationIssue[]
  discrepancies: BureauDiscrepancy[]
  recommendations: string[]
}

export class ConsistencyChecker {
  private readonly CONSISTENCY_THRESHOLDS = {
    EXCELLENT: 95,
    GOOD: 85,
    FAIR: 70,
    POOR: 50
  }

  /**
   * Perform comprehensive consistency validation
   */
  async validateConsistency(data: EnhancedCreditReportData): Promise<ConsistencyResult> {
    const issues: ValidationIssue[] = []
    const discrepancies: BureauDiscrepancy[] = []
    const recommendations: string[] = []

    // Perform different types of consistency checks
    const crossSectionConsistency = await this.checkCrossSectionConsistency(data, issues)
    const bureauConsistency = await this.checkBureauConsistency(data, issues, discrepancies)
    const temporalConsistency = await this.checkTemporalConsistency(data, issues)
    const logicalConsistency = await this.checkLogicalConsistency(data, issues)

    // Calculate overall consistency score
    const overallConsistency = this.calculateOverallConsistency(
      crossSectionConsistency,
      bureauConsistency,
      temporalConsistency,
      logicalConsistency
    )

    // Generate recommendations
    this.generateConsistencyRecommendations(
      overallConsistency,
      crossSectionConsistency,
      bureauConsistency,
      temporalConsistency,
      logicalConsistency,
      issues,
      recommendations
    )

    return {
      overallConsistency,
      crossSectionConsistency,
      bureauConsistency,
      temporalConsistency,
      logicalConsistency,
      issues,
      discrepancies,
      recommendations
    }
  }

  /**
   * Check consistency across different sections of the credit report
   */
  private async checkCrossSectionConsistency(
    data: EnhancedCreditReportData, 
    issues: ValidationIssue[]
  ): Promise<number> {
    let consistencyScore = 100
    let checksPerformed = 0
    let checksPasssed = 0

    // Check if personal info matches across sections
    checksPerformed++
    if (this.validatePersonalInfoConsistency(data, issues)) {
      checksPasssed++
    } else {
      consistencyScore -= 15
    }

    // Check account vs negative item consistency
    checksPerformed++
    if (this.validateAccountNegativeItemConsistency(data, issues)) {
      checksPasssed++
    } else {
      consistencyScore -= 20
    }

    // Check credit score vs account data consistency
    checksPerformed++
    if (this.validateScoreAccountConsistency(data, issues)) {
      checksPasssed++
    } else {
      consistencyScore -= 25
    }

    // Check inquiry vs account opening consistency
    checksPerformed++
    if (this.validateInquiryAccountConsistency(data, issues)) {
      checksPasssed++
    } else {
      consistencyScore -= 10
    }

    // Check public records vs negative items consistency
    checksPerformed++
    if (this.validatePublicRecordConsistency(data, issues)) {
      checksPasssed++
    } else {
      consistencyScore -= 15
    }

    // Check address consistency across sections
    checksPerformed++
    if (this.validateAddressConsistency(data, issues)) {
      checksPasssed++
    } else {
      consistencyScore -= 10
    }

    return Math.max(0, consistencyScore)
  }

  /**
   * Check consistency across different credit bureaus
   */
  private async checkBureauConsistency(
    data: EnhancedCreditReportData, 
    issues: ValidationIssue[],
    discrepancies: BureauDiscrepancy[]
  ): Promise<number> {
    let consistencyScore = 100

    // Check credit score consistency across bureaus
    const scoreConsistency = this.checkCreditScoreConsistency(data.creditScores, issues, discrepancies)
    consistencyScore = Math.min(consistencyScore, scoreConsistency)

    // Check account reporting consistency
    const accountConsistency = this.checkAccountBureauConsistency(data.accounts, issues, discrepancies)
    consistencyScore = Math.min(consistencyScore, accountConsistency)

    // Check negative item reporting consistency
    const negativeItemConsistency = this.checkNegativeItemBureauConsistency(data.negativeItems, issues, discrepancies)
    consistencyScore = Math.min(consistencyScore, negativeItemConsistency)

    return consistencyScore
  }

  /**
   * Check temporal consistency of dates and timelines
   */
  private async checkTemporalConsistency(
    data: EnhancedCreditReportData, 
    issues: ValidationIssue[]
  ): Promise<number> {
    let consistencyScore = 100
    const currentDate = new Date()

    // Check account date consistency
    for (const account of data.accounts) {
      const openDate = new Date(account.openDate)
      const lastReported = new Date(account.lastReported)

      if (openDate > currentDate) {
        consistencyScore -= 10
        issues.push({
          type: 'error',
          category: 'consistency',
          message: `Account ${account.id}: Open date is in the future`,
          severity: 'high',
          field: `accounts[${account.id}].openDate`,
          suggestion: 'Verify account open date accuracy'
        })
      }

      if (lastReported > currentDate) {
        consistencyScore -= 5
        issues.push({
          type: 'warning',
          category: 'consistency',
          message: `Account ${account.id}: Last reported date is in the future`,
          severity: 'medium',
          field: `accounts[${account.id}].lastReported`,
          suggestion: 'Check last reported date'
        })
      }

      if (openDate > lastReported) {
        consistencyScore -= 15
        issues.push({
          type: 'error',
          category: 'consistency',
          message: `Account ${account.id}: Open date is after last reported date`,
          severity: 'high',
          field: `accounts[${account.id}]`,
          suggestion: 'Verify account date consistency'
        })
      }

      // Check payment history date consistency
      if (account.paymentHistory) {
        for (const payment of account.paymentHistory) {
          const paymentDate = new Date(payment.month + '-01')
          if (paymentDate < openDate) {
            consistencyScore -= 5
            issues.push({
              type: 'warning',
              category: 'consistency',
              message: `Account ${account.id}: Payment history before account open date`,
              severity: 'medium',
              field: `accounts[${account.id}].paymentHistory`,
              suggestion: 'Review payment history dates'
            })
          }
        }
      }
    }

    // Check negative item date consistency
    for (const item of data.negativeItems) {
      const itemDate = new Date(item.date)
      
      if (itemDate > currentDate) {
        consistencyScore -= 10
        issues.push({
          type: 'error',
          category: 'consistency',
          message: `Negative item ${item.id}: Date is in the future`,
          severity: 'high',
          field: `negativeItems[${item.id}].date`,
          suggestion: 'Verify negative item date'
        })
      }

      if (item.dateOfDelinquency) {
        const delinquencyDate = new Date(item.dateOfDelinquency)
        if (delinquencyDate > itemDate) {
          consistencyScore -= 10
          issues.push({
            type: 'error',
            category: 'consistency',
            message: `Negative item ${item.id}: Delinquency date is after item date`,
            severity: 'high',
            field: `negativeItems[${item.id}]`,
            suggestion: 'Check date consistency for negative item'
          })
        }
      }
    }

    // Check inquiry date consistency
    for (const inquiry of data.inquiries) {
      const inquiryDate = new Date(inquiry.date)
      
      if (inquiryDate > currentDate) {
        consistencyScore -= 5
        issues.push({
          type: 'warning',
          category: 'consistency',
          message: `Inquiry ${inquiry.id}: Date is in the future`,
          severity: 'medium',
          field: `inquiries[${inquiry.id}].date`,
          suggestion: 'Verify inquiry date'
        })
      }

      // Check if inquiry is too old (typically 2 years for hard inquiries)
      const daysSinceInquiry = Math.floor((currentDate.getTime() - inquiryDate.getTime()) / (1000 * 60 * 60 * 24))
      if (inquiry.type === 'hard' && daysSinceInquiry > 730) {
        issues.push({
          type: 'info',
          category: 'consistency',
          message: `Inquiry ${inquiry.id}: Hard inquiry is over 2 years old`,
          severity: 'low',
          field: `inquiries[${inquiry.id}]`,
          suggestion: 'Old hard inquiries may not affect credit score'
        })
      }
    }

    return Math.max(0, consistencyScore)
  }

  /**
   * Check logical consistency of data relationships
   */
  private async checkLogicalConsistency(
    data: EnhancedCreditReportData, 
    issues: ValidationIssue[]
  ): Promise<number> {
    let consistencyScore = 100

    // Check credit score vs negative items logical consistency
    const creditScores = [data.creditScores.experian, data.creditScores.equifax, data.creditScores.transunion]
      .filter(score => score && score.score > 0)

    if (creditScores.length > 0) {
      const averageScore = creditScores.reduce((sum, score) => sum + score.score, 0) / creditScores.length
      const negativeItemCount = data.negativeItems.length
      const recentNegativeItems = data.negativeItems.filter(item => {
        const itemDate = new Date(item.date)
        const daysSince = Math.floor((Date.now() - itemDate.getTime()) / (1000 * 60 * 60 * 24))
        return daysSince <= 730 // Within 2 years
      }).length

      // High score with many recent negative items is inconsistent
      if (averageScore > 750 && recentNegativeItems > 2) {
        consistencyScore -= 20
        issues.push({
          type: 'warning',
          category: 'consistency',
          message: 'High credit score with multiple recent negative items - verify accuracy',
          severity: 'medium',
          field: 'creditScores',
          suggestion: 'Review negative items and credit score consistency'
        })
      }

      // Very low score with no negative items is also inconsistent
      if (averageScore < 500 && negativeItemCount === 0) {
        consistencyScore -= 15
        issues.push({
          type: 'warning',
          category: 'consistency',
          message: 'Very low credit score with no negative items - verify completeness',
          severity: 'medium',
          field: 'negativeItems',
          suggestion: 'Check if negative items are missing from extraction'
        })
      }
    }

    // Check account utilization consistency
    for (const account of data.accounts) {
      if (account.accountType === 'credit_card' && account.creditLimit && account.balance) {
        const utilization = (account.balance / account.creditLimit) * 100
        
        if (utilization > 100) {
          consistencyScore -= 10
          issues.push({
            type: 'error',
            category: 'consistency',
            message: `Account ${account.id}: Balance exceeds credit limit`,
            severity: 'high',
            field: `accounts[${account.id}]`,
            suggestion: 'Verify balance and credit limit accuracy'
          })
        }

        if (account.status === 'closed' && account.balance > 0) {
          issues.push({
            type: 'warning',
            category: 'consistency',
            message: `Account ${account.id}: Closed account with outstanding balance`,
            severity: 'medium',
            field: `accounts[${account.id}]`,
            suggestion: 'Verify account status and balance'
          })
        }
      }
    }

    // Check duplicate account detection
    const accountSignatures = new Map<string, string[]>()
    for (const account of data.accounts) {
      const signature = `${account.creditorName.toLowerCase()}-${account.accountNumber.slice(-4)}`
      if (!accountSignatures.has(signature)) {
        accountSignatures.set(signature, [])
      }
      accountSignatures.get(signature)!.push(account.id)
    }

    for (const [signature, accountIds] of accountSignatures) {
      if (accountIds.length > 1) {
        consistencyScore -= 5
        issues.push({
          type: 'warning',
          category: 'consistency',
          message: `Potential duplicate accounts detected: ${accountIds.join(', ')}`,
          severity: 'medium',
          field: 'accounts',
          suggestion: 'Review for duplicate account entries'
        })
      }
    }

    return Math.max(0, consistencyScore)
  }

  /**
   * Validate personal information consistency across sections
   */
  private validatePersonalInfoConsistency(
    data: EnhancedCreditReportData, 
    issues: ValidationIssue[]
  ): boolean {
    let isConsistent = true

    // Check name consistency in accounts
    const reportName = data.personalInfo.name.toLowerCase().trim()
    for (const account of data.accounts) {
      // This would require more sophisticated name matching logic
      // For now, we'll do a basic check
      if (account.creditorName && account.creditorName.toLowerCase().includes('authorized user')) {
        // Skip authorized user accounts for name consistency
        continue
      }
    }

    // Check address consistency
    const reportAddress = data.personalInfo.address.toLowerCase().trim()
    // Additional address consistency checks would go here

    return isConsistent
  }

  /**
   * Validate consistency between accounts and negative items
   */
  private validateAccountNegativeItemConsistency(
    data: EnhancedCreditReportData, 
    issues: ValidationIssue[]
  ): boolean {
    let isConsistent = true

    // Check if negative items correspond to accounts
    for (const negativeItem of data.negativeItems) {
      const matchingAccount = data.accounts.find(account => 
        account.creditorName.toLowerCase() === negativeItem.creditorName.toLowerCase() ||
        (account.accountNumber && negativeItem.accountNumber && 
         account.accountNumber === negativeItem.accountNumber)
      )

      if (negativeItem.type === 'late_payment' && !matchingAccount) {
        isConsistent = false
        issues.push({
          type: 'warning',
          category: 'consistency',
          message: `Late payment negative item without corresponding account: ${negativeItem.creditorName}`,
          severity: 'medium',
          field: `negativeItems[${negativeItem.id}]`,
          suggestion: 'Verify if corresponding account exists or was missed in extraction'
        })
      }
    }

    return isConsistent
  }

  /**
   * Validate consistency between credit scores and account data
   */
  private validateScoreAccountConsistency(
    data: EnhancedCreditReportData, 
    issues: ValidationIssue[]
  ): boolean {
    let isConsistent = true

    const creditScores = [data.creditScores.experian, data.creditScores.equifax, data.creditScores.transunion]
      .filter(score => score && score.score > 0)

    if (creditScores.length === 0) return true

    const averageScore = creditScores.reduce((sum, score) => sum + score.score, 0) / creditScores.length

    // Calculate total utilization
    const creditCardAccounts = data.accounts.filter(acc => 
      acc.accountType === 'credit_card' && acc.creditLimit && acc.balance !== undefined
    )

    if (creditCardAccounts.length > 0) {
      const totalBalance = creditCardAccounts.reduce((sum, acc) => sum + acc.balance, 0)
      const totalLimit = creditCardAccounts.reduce((sum, acc) => sum + (acc.creditLimit || 0), 0)
      const overallUtilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0

      // High utilization with high score is inconsistent
      if (overallUtilization > 80 && averageScore > 700) {
        isConsistent = false
        issues.push({
          type: 'warning',
          category: 'consistency',
          message: 'High credit utilization with high credit score - verify accuracy',
          severity: 'medium',
          field: 'accounts',
          suggestion: 'Review credit utilization calculations and score consistency'
        })
      }
    }

    return isConsistent
  }

  /**
   * Validate consistency between inquiries and account openings
   */
  private validateInquiryAccountConsistency(
    data: EnhancedCreditReportData, 
    issues: ValidationIssue[]
  ): boolean {
    let isConsistent = true

    // Check if hard inquiries correspond to new accounts
    const hardInquiries = data.inquiries.filter(inq => inq.type === 'hard')
    
    for (const inquiry of hardInquiries) {
      const inquiryDate = new Date(inquiry.date)
      
      // Look for accounts opened within 3 months of the inquiry
      const correspondingAccount = data.accounts.find(account => {
        const openDate = new Date(account.openDate)
        const daysDiff = Math.abs((openDate.getTime() - inquiryDate.getTime()) / (1000 * 60 * 60 * 24))
        return daysDiff <= 90 && 
               account.creditorName.toLowerCase().includes(inquiry.creditorName.toLowerCase().split(' ')[0])
      })

      if (!correspondingAccount && inquiry.ageInMonths <= 6) {
        // Only flag recent inquiries without corresponding accounts
        issues.push({
          type: 'info',
          category: 'consistency',
          message: `Recent hard inquiry without corresponding new account: ${inquiry.creditorName}`,
          severity: 'low',
          field: `inquiries[${inquiry.id}]`,
          suggestion: 'Verify if inquiry resulted in account opening or was declined'
        })
      }
    }

    return isConsistent
  }

  /**
   * Validate consistency between public records and negative items
   */
  private validatePublicRecordConsistency(
    data: EnhancedCreditReportData, 
    issues: ValidationIssue[]
  ): boolean {
    let isConsistent = true

    // Check if bankruptcies correspond to account statuses
    const bankruptcies = data.publicRecords.filter(record => record.type === 'bankruptcy')
    
    for (const bankruptcy of bankruptcies) {
      const bankruptcyDate = new Date(bankruptcy.date)
      
      // Check if accounts show bankruptcy status
      const accountsWithBankruptcy = data.accounts.filter(account => 
        account.status === 'charged_off' || 
        account.paymentHistory?.some(payment => payment.status === 'charge_off')
      )

      if (accountsWithBankruptcy.length === 0) {
        isConsistent = false
        issues.push({
          type: 'warning',
          category: 'consistency',
          message: 'Bankruptcy record without corresponding account impacts',
          severity: 'medium',
          field: `publicRecords[${bankruptcy.id}]`,
          suggestion: 'Verify bankruptcy impact on accounts'
        })
      }
    }

    return isConsistent
  }

  /**
   * Validate address consistency across sections
   */
  private validateAddressConsistency(
    data: EnhancedCreditReportData, 
    issues: ValidationIssue[]
  ): boolean {
    let isConsistent = true

    const primaryAddress = data.personalInfo.address.toLowerCase().trim()
    
    // Check previous addresses for consistency
    if (data.personalInfo.previousAddresses) {
      for (const prevAddress of data.personalInfo.previousAddresses) {
        if (prevAddress.toLowerCase().trim() === primaryAddress) {
          isConsistent = false
          issues.push({
            type: 'warning',
            category: 'consistency',
            message: 'Current address matches previous address',
            severity: 'low',
            field: 'personalInfo.previousAddresses',
            suggestion: 'Verify address history accuracy'
          })
        }
      }
    }

    return isConsistent
  }

  /**
   * Check credit score consistency across bureaus
   */
  private checkCreditScoreConsistency(
    creditScores: any,
    issues: ValidationIssue[],
    discrepancies: BureauDiscrepancy[]
  ): number {
    const scores = [creditScores.experian, creditScores.equifax, creditScores.transunion]
      .filter(score => score && score.score > 0)

    if (scores.length < 2) return 100

    const scoreValues = scores.map(s => s.score)
    const maxScore = Math.max(...scoreValues)
    const minScore = Math.min(...scoreValues)
    const scoreDifference = maxScore - minScore

    let consistencyScore = 100

    if (scoreDifference > 100) {
      consistencyScore -= 30
      issues.push({
        type: 'warning',
        category: 'consistency',
        message: `Large credit score variance across bureaus: ${scoreDifference} points`,
        severity: 'medium',
        field: 'creditScores',
        suggestion: 'Review score differences and verify bureau-specific factors'
      })

      // Add discrepancy record
      discrepancies.push({
        bureau: 'experian',
        field: 'creditScore',
        reportedValue: creditScores.experian?.score,
        expectedValue: `Within ${scoreDifference} points of other bureaus`,
        severity: 'medium'
      })
    } else if (scoreDifference > 50) {
      consistencyScore -= 15
      issues.push({
        type: 'info',
        category: 'consistency',
        message: `Moderate credit score variance across bureaus: ${scoreDifference} points`,
        severity: 'low',
        field: 'creditScores',
        suggestion: 'Score differences are within normal range but worth monitoring'
      })
    }

    return consistencyScore
  }

  /**
   * Check account reporting consistency across bureaus
   */
  private checkAccountBureauConsistency(
    accounts: EnhancedCreditAccount[],
    issues: ValidationIssue[],
    discrepancies: BureauDiscrepancy[]
  ): number {
    let consistencyScore = 100

    for (const account of accounts) {
      if (account.bureauData) {
        const bureauBalances = [
          account.bureauData.experian?.balance,
          account.bureauData.equifax?.balance,
          account.bureauData.transunion?.balance
        ].filter(balance => balance !== undefined && balance !== null)

        if (bureauBalances.length > 1) {
          const maxBalance = Math.max(...bureauBalances)
          const minBalance = Math.min(...bureauBalances)
          const balanceDifference = maxBalance - minBalance

          if (balanceDifference > 100) {
            consistencyScore -= 10
            issues.push({
              type: 'warning',
              category: 'consistency',
              message: `Account ${account.id}: Balance inconsistency across bureaus`,
              severity: 'medium',
              field: `accounts[${account.id}].bureauData`,
              suggestion: 'Review balance reporting across bureaus'
            })

            discrepancies.push({
              bureau: 'experian',
              field: `account.${account.id}.balance`,
              reportedValue: account.bureauData.experian?.balance,
              expectedValue: account.bureauData.equifax?.balance || account.bureauData.transunion?.balance,
              severity: 'medium'
            })
          }
        }
      }
    }

    return consistencyScore
  }

  /**
   * Check negative item reporting consistency across bureaus
   */
  private checkNegativeItemBureauConsistency(
    negativeItems: EnhancedNegativeItem[],
    issues: ValidationIssue[],
    discrepancies: BureauDiscrepancy[]
  ): number {
    let consistencyScore = 100

    for (const item of negativeItems) {
      if (item.bureauReporting && item.bureauReporting.length > 0) {
        // Check if item is reported by all expected bureaus
        const expectedBureaus = ['experian', 'equifax', 'transunion']
        const missingBureaus = expectedBureaus.filter(bureau => 
          !item.bureauReporting.includes(bureau as any)
        )

        if (missingBureaus.length > 0 && item.bureauReporting.length > 0) {
          issues.push({
            type: 'info',
            category: 'consistency',
            message: `Negative item ${item.id}: Not reported by all bureaus (missing: ${missingBureaus.join(', ')})`,
            severity: 'low',
            field: `negativeItems[${item.id}].bureauReporting`,
            suggestion: 'Verify bureau reporting consistency for negative items'
          })
        }
      }
    }

    return consistencyScore
  }

  /**
   * Calculate overall consistency score
   */
  private calculateOverallConsistency(
    crossSection: number,
    bureau: number,
    temporal: number,
    logical: number
  ): number {
    const weights = {
      crossSection: 0.3,
      bureau: 0.25,
      temporal: 0.25,
      logical: 0.2
    }

    return Math.round(
      (crossSection * weights.crossSection) +
      (bureau * weights.bureau) +
      (temporal * weights.temporal) +
      (logical * weights.logical)
    )
  }

  /**
   * Generate consistency-specific recommendations
   */
  private generateConsistencyRecommendations(
    overall: number,
    crossSection: number,
    bureau: number,
    temporal: number,
    logical: number,
    issues: ValidationIssue[],
    recommendations: string[]
  ): void {
    if (overall >= this.CONSISTENCY_THRESHOLDS.EXCELLENT) {
      recommendations.push('Excellent data consistency - high confidence in analysis')
    } else if (overall >= this.CONSISTENCY_THRESHOLDS.GOOD) {
      recommendations.push('Good data consistency - minor inconsistencies detected')
    } else if (overall >= this.CONSISTENCY_THRESHOLDS.FAIR) {
      recommendations.push('Fair data consistency - address identified inconsistencies')
    } else {
      recommendations.push('Poor data consistency - significant review required')
    }

    // Specific recommendations based on consistency types
    if (crossSection < this.CONSISTENCY_THRESHOLDS.GOOD) {
      recommendations.push('Review cross-section data consistency - verify related information matches')
    }

    if (bureau < this.CONSISTENCY_THRESHOLDS.GOOD) {
      recommendations.push('Address bureau reporting inconsistencies - verify data across credit bureaus')
    }

    if (temporal < this.CONSISTENCY_THRESHOLDS.GOOD) {
      recommendations.push('Fix temporal inconsistencies - verify dates and timelines')
    }

    if (logical < this.CONSISTENCY_THRESHOLDS.GOOD) {
      recommendations.push('Address logical inconsistencies - review data relationships')
    }

    // Issue-based recommendations
    const highPriorityIssues = issues.filter(issue => issue.severity === 'high')
    if (highPriorityIssues.length > 0) {
      recommendations.push(`Resolve ${highPriorityIssues.length} high-priority consistency issues immediately`)
    }
  }
}

export const consistencyChecker = new ConsistencyChecker()