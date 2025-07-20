/**
 * Enhanced Data Extraction and Standardization
 * 
 * This module provides comprehensive data standardization, validation, and enhancement
 * for credit report analysis with improved accuracy and consistency.
 */

import { supabase } from '@/lib/supabase/client'
import { 
  EnhancedCreditAccount, 
  EnhancedNegativeItem, 
  EnhancedPaymentHistoryEntry,
  PaymentPerformance 
} from '@/types/enhanced-credit'

// ===================================
// Creditor Standardization
// ===================================

export interface CreditorMapping {
  originalName: string
  standardizedName: string
  creditorCode?: string
  eoscarCode?: string
  aliases: string[]
  industry: string
  confidence: number
}

export class CreditorStandardizer {
  private creditorDatabase: Map<string, CreditorMapping> = new Map()
  private aliasMap: Map<string, string> = new Map()
  private initialized = false

  constructor() {
    this.initializeCreditorDatabase()
  }

  /**
   * Initialize creditor database from Supabase
   */
  private async initializeCreditorDatabase(): Promise<void> {
    if (this.initialized) return

    try {
      const { data: creditors, error } = await supabase
        .from('creditor_database')
        .select('*')

      if (error) {
        console.error('Error loading creditor database:', error)
        this.loadDefaultCreditors()
        return
      }

      // Load creditors into memory for fast lookup
      creditors?.forEach(creditor => {
        const mapping: CreditorMapping = {
          originalName: creditor.creditor_name,
          standardizedName: creditor.standardized_name,
          creditorCode: creditor.creditor_code,
          eoscarCode: creditor.eoscar_code,
          aliases: creditor.aliases || [],
          industry: creditor.industry || 'Unknown',
          confidence: 1.0
        }

        this.creditorDatabase.set(creditor.standardized_name.toLowerCase(), mapping)

        // Create alias mappings
        mapping.aliases.forEach(alias => {
          this.aliasMap.set(alias.toLowerCase(), creditor.standardized_name)
        })
      })

      this.initialized = true
      console.log(`Loaded ${creditors?.length || 0} creditors into standardizer`)

    } catch (error) {
      console.error('Failed to initialize creditor database:', error)
      this.loadDefaultCreditors()
    }
  }

  /**
   * Load default creditors if database is unavailable
   */
  private loadDefaultCreditors(): void {
    const defaultCreditors = [
      {
        original: ['BANK OF AMERICA', 'BOA', 'B OF A', 'BANKAMER'],
        standardized: 'Bank of America',
        code: 'BOA',
        eoscar: 'BOA',
        industry: 'Banking'
      },
      {
        original: ['CHASE', 'JPMORGAN CHASE', 'JP MORGAN', 'CHASE BANK'],
        standardized: 'JPMorgan Chase',
        code: 'CHASE',
        eoscar: 'CHASE',
        industry: 'Banking'
      },
      {
        original: ['WELLS FARGO', 'WELLS FARGO BANK', 'WF', 'WELLSFARGO'],
        standardized: 'Wells Fargo',
        code: 'WF',
        eoscar: 'WF',
        industry: 'Banking'
      },
      {
        original: ['CAPITAL ONE', 'CAP ONE', 'CAPITALONE', 'CAPONE'],
        standardized: 'Capital One',
        code: 'CAPONE',
        eoscar: 'CAPONE',
        industry: 'Banking'
      },
      {
        original: ['DISCOVER', 'DISCOVER BANK', 'DISC'],
        standardized: 'Discover Bank',
        code: 'DISC',
        eoscar: 'DISC',
        industry: 'Banking'
      },
      {
        original: ['AMERICAN EXPRESS', 'AMEX', 'AM EXPRESS'],
        standardized: 'American Express',
        code: 'AMEX',
        eoscar: 'AMEX',
        industry: 'Banking'
      },
      {
        original: ['CITIBANK', 'CITI', 'CITI BANK'],
        standardized: 'Citibank',
        code: 'CITI',
        eoscar: 'CITI',
        industry: 'Banking'
      },
      {
        original: ['SYNCHRONY BANK', 'SYNCHRONY', 'SYNC', 'SYNCB'],
        standardized: 'Synchrony Bank',
        code: 'SYNC',
        eoscar: 'SYNC',
        industry: 'Banking'
      }
    ]

    defaultCreditors.forEach(creditor => {
      const mapping: CreditorMapping = {
        originalName: creditor.original[0],
        standardizedName: creditor.standardized,
        creditorCode: creditor.code,
        eoscarCode: creditor.eoscar,
        aliases: creditor.original,
        industry: creditor.industry,
        confidence: 0.9
      }

      this.creditorDatabase.set(creditor.standardized.toLowerCase(), mapping)

      creditor.original.forEach(alias => {
        this.aliasMap.set(alias.toLowerCase(), creditor.standardized)
      })
    })

    this.initialized = true
    console.log('Loaded default creditor mappings')
  }

  /**
   * Standardize creditor name
   */
  async standardizeCreditorName(originalName: string): Promise<{
    standardizedName: string
    creditorCode?: string
    eoscarCode?: string
    confidence: number
    industry?: string
  }> {
    if (!this.initialized) {
      await this.initializeCreditorDatabase()
    }

    if (!originalName || originalName.trim() === '') {
      return {
        standardizedName: 'Unknown Creditor',
        confidence: 0
      }
    }

    const cleanName = originalName.trim().toUpperCase()

    // Direct lookup in alias map
    const aliasMatch = this.aliasMap.get(cleanName.toLowerCase())
    if (aliasMatch) {
      const mapping = this.creditorDatabase.get(aliasMatch.toLowerCase())
      if (mapping) {
        await this.updateUsageCount(mapping.standardizedName)
        return {
          standardizedName: mapping.standardizedName,
          creditorCode: mapping.creditorCode,
          eoscarCode: mapping.eoscarCode,
          confidence: mapping.confidence,
          industry: mapping.industry
        }
      }
    }

    // Fuzzy matching
    const fuzzyMatch = this.findFuzzyMatch(cleanName)
    if (fuzzyMatch) {
      await this.updateUsageCount(fuzzyMatch.standardizedName)
      return {
        standardizedName: fuzzyMatch.standardizedName,
        creditorCode: fuzzyMatch.creditorCode,
        eoscarCode: fuzzyMatch.eoscarCode,
        confidence: fuzzyMatch.confidence * 0.8, // Reduce confidence for fuzzy match
        industry: fuzzyMatch.industry
      }
    }

    // No match found - create new entry
    const newMapping = await this.createNewCreditorMapping(originalName)
    return {
      standardizedName: newMapping.standardizedName,
      creditorCode: newMapping.creditorCode,
      eoscarCode: newMapping.eoscarCode,
      confidence: newMapping.confidence,
      industry: newMapping.industry
    }
  }

  /**
   * Find fuzzy match for creditor name
   */
  private findFuzzyMatch(name: string): CreditorMapping | null {
    let bestMatch: CreditorMapping | null = null
    let bestScore = 0

    for (const mapping of this.creditorDatabase.values()) {
      // Check against standardized name
      const score1 = this.calculateSimilarity(name, mapping.standardizedName.toUpperCase())
      if (score1 > bestScore && score1 > 0.7) {
        bestScore = score1
        bestMatch = mapping
      }

      // Check against aliases
      for (const alias of mapping.aliases) {
        const score2 = this.calculateSimilarity(name, alias.toUpperCase())
        if (score2 > bestScore && score2 > 0.7) {
          bestScore = score2
          bestMatch = mapping
        }
      }
    }

    return bestMatch
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length
    const len2 = str2.length
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null))

    for (let i = 0; i <= len1; i++) matrix[0][i] = i
    for (let j = 0; j <= len2; j++) matrix[j][0] = j

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        )
      }
    }

    const distance = matrix[len2][len1]
    const maxLen = Math.max(len1, len2)
    return maxLen === 0 ? 1 : (maxLen - distance) / maxLen
  }

  /**
   * Create new creditor mapping
   */
  private async createNewCreditorMapping(originalName: string): Promise<CreditorMapping> {
    const standardizedName = this.standardizeName(originalName)
    const industry = this.guessIndustry(originalName)

    const mapping: CreditorMapping = {
      originalName,
      standardizedName,
      aliases: [originalName.toUpperCase()],
      industry,
      confidence: 0.6 // Lower confidence for new entries
    }

    // Save to database
    try {
      await supabase
        .from('creditor_database')
        .insert({
          creditor_name: originalName,
          standardized_name: standardizedName,
          aliases: [originalName.toUpperCase()],
          industry,
          usage_count: 1
        })

      console.log(`Created new creditor mapping: ${originalName} -> ${standardizedName}`)
    } catch (error) {
      console.error('Error saving new creditor mapping:', error)
    }

    // Add to local cache
    this.creditorDatabase.set(standardizedName.toLowerCase(), mapping)
    this.aliasMap.set(originalName.toLowerCase(), standardizedName)

    return mapping
  }

  /**
   * Standardize name format
   */
  private standardizeName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace(/\b(Inc|Corp|Co|Ltd|Llc|Bank|Credit|Union)\b/gi, (match) => {
        const replacements: { [key: string]: string } = {
          'inc': 'Inc.',
          'corp': 'Corp.',
          'co': 'Co.',
          'ltd': 'Ltd.',
          'llc': 'LLC',
          'bank': 'Bank',
          'credit': 'Credit',
          'union': 'Union'
        }
        return replacements[match.toLowerCase()] || match
      })
  }

  /**
   * Guess industry based on creditor name
   */
  private guessIndustry(name: string): string {
    const lowerName = name.toLowerCase()

    if (lowerName.includes('bank') || lowerName.includes('credit') || lowerName.includes('financial')) {
      return 'Banking'
    } else if (lowerName.includes('medical') || lowerName.includes('hospital') || lowerName.includes('health')) {
      return 'Healthcare'
    } else if (lowerName.includes('utility') || lowerName.includes('electric') || lowerName.includes('gas')) {
      return 'Utilities'
    } else if (lowerName.includes('telecom') || lowerName.includes('wireless') || lowerName.includes('phone')) {
      return 'Telecommunications'
    } else if (lowerName.includes('collection') || lowerName.includes('recovery')) {
      return 'Collections'
    } else {
      return 'Other'
    }
  }

  /**
   * Update usage count for creditor
   */
  private async updateUsageCount(standardizedName: string): Promise<void> {
    try {
      await supabase
        .from('creditor_database')
        .update({ 
          usage_count: (supabase as any).raw('usage_count + 1'),
          last_used: new Date().toISOString()
        })
        .eq('standardized_name', standardizedName)
    } catch (error) {
      console.error('Error updating creditor usage count:', error)
    }
  }
}

// ===================================
// Payment History Validation
// ===================================

export class PaymentHistoryValidator {
  /**
   * Validate and enhance payment history data
   */
  validatePaymentHistory(
    paymentHistory: any[],
    accountInfo: any
  ): {
    validatedHistory: EnhancedPaymentHistoryEntry[]
    performance: PaymentPerformance
    issues: string[]
  } {
    const issues: string[] = []
    const validatedHistory: EnhancedPaymentHistoryEntry[] = []

    if (!Array.isArray(paymentHistory)) {
      issues.push('Payment history is not in array format')
      return {
        validatedHistory: [],
        performance: this.createDefaultPerformance(),
        issues
      }
    }

    // Validate each payment history entry
    paymentHistory.forEach((entry, index) => {
      const validatedEntry = this.validatePaymentEntry(entry, index, issues)
      if (validatedEntry) {
        validatedHistory.push(validatedEntry)
      }
    })

    // Sort by month (most recent first)
    validatedHistory.sort((a, b) => b.month.localeCompare(a.month))

    // Ensure we have at least 24 months of history (fill gaps if needed)
    const completeHistory = this.fillPaymentHistoryGaps(validatedHistory, issues)

    // Calculate performance metrics
    const performance = this.calculatePaymentPerformance(completeHistory)

    return {
      validatedHistory: completeHistory,
      performance,
      issues
    }
  }

  /**
   * Validate individual payment entry
   */
  private validatePaymentEntry(
    entry: any,
    index: number,
    issues: string[]
  ): EnhancedPaymentHistoryEntry | null {
    if (!entry || typeof entry !== 'object') {
      issues.push(`Payment entry ${index} is invalid`)
      return null
    }

    // Validate month format
    const month = this.validateMonth(entry.month, index, issues)
    if (!month) return null

    // Validate status
    const status = this.validatePaymentStatus(entry.status, index, issues)
    if (!status) return null

    return {
      month,
      status: status as any,
      amount: this.validateAmount(entry.amount),
      dateReported: this.validateDate(entry.dateReported),
      bureau: this.validateBureau(entry.bureau),
      confidence: this.calculateEntryConfidence(entry),
      verified: false,
      discrepancies: []
    }
  }

  /**
   * Validate month format (YYYY-MM)
   */
  private validateMonth(month: any, index: number, issues: string[]): string | null {
    if (!month || typeof month !== 'string') {
      issues.push(`Payment entry ${index} has invalid month format`)
      return null
    }

    const monthRegex = /^\d{4}-\d{2}$/
    if (!monthRegex.test(month)) {
      issues.push(`Payment entry ${index} month format should be YYYY-MM`)
      return null
    }

    // Validate date range (not in future, not too old)
    const entryDate = new Date(month + '-01')
    const now = new Date()
    const tenYearsAgo = new Date()
    tenYearsAgo.setFullYear(now.getFullYear() - 10)

    if (entryDate > now) {
      issues.push(`Payment entry ${index} is in the future`)
      return null
    }

    if (entryDate < tenYearsAgo) {
      issues.push(`Payment entry ${index} is too old (>10 years)`)
      return null
    }

    return month
  }

  /**
   * Validate payment status
   */
  private validatePaymentStatus(status: any, index: number, issues: string[]): string | null {
    const validStatuses = [
      'current', '30_days_late', '60_days_late', '90_days_late', 
      '120_days_late', 'charge_off', 'collection', 'paid', 'closed'
    ]

    if (!status || typeof status !== 'string') {
      issues.push(`Payment entry ${index} has invalid status`)
      return 'current' // Default to current
    }

    if (!validStatuses.includes(status)) {
      issues.push(`Payment entry ${index} has unknown status: ${status}`)
      return 'current' // Default to current
    }

    return status
  }

  /**
   * Validate amount
   */
  private validateAmount(amount: any): number | undefined {
    if (amount === null || amount === undefined) return undefined
    
    const numAmount = Number(amount)
    if (isNaN(numAmount) || numAmount < 0) return undefined
    
    return Math.round(numAmount * 100) / 100 // Round to 2 decimal places
  }

  /**
   * Validate date
   */
  private validateDate(date: any): string | undefined {
    if (!date) return undefined
    
    try {
      const parsedDate = new Date(date)
      if (isNaN(parsedDate.getTime())) return undefined
      
      return parsedDate.toISOString().split('T')[0]
    } catch {
      return undefined
    }
  }

  /**
   * Validate bureau
   */
  private validateBureau(bureau: any): 'experian' | 'equifax' | 'transunion' | undefined {
    const validBureaus = ['experian', 'equifax', 'transunion']
    
    if (!bureau || typeof bureau !== 'string') return undefined
    
    const lowerBureau = bureau.toLowerCase()
    return validBureaus.includes(lowerBureau) ? lowerBureau as any : undefined
  }

  /**
   * Calculate confidence for payment entry
   */
  private calculateEntryConfidence(entry: any): number {
    let confidence = 0.8 // Base confidence

    // Increase confidence if we have amount
    if (entry.amount && !isNaN(Number(entry.amount))) {
      confidence += 0.1
    }

    // Increase confidence if we have date reported
    if (entry.dateReported) {
      confidence += 0.1
    }

    return Math.min(1.0, confidence)
  }

  /**
   * Fill gaps in payment history
   */
  private fillPaymentHistoryGaps(
    history: EnhancedPaymentHistoryEntry[],
    issues: string[]
  ): EnhancedPaymentHistoryEntry[] {
    if (history.length === 0) {
      issues.push('No payment history available')
      return []
    }

    const completeHistory: EnhancedPaymentHistoryEntry[] = [...history]
    const existingMonths = new Set(history.map(h => h.month))

    // Generate last 24 months
    const now = new Date()
    for (let i = 0; i < 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!existingMonths.has(monthStr)) {
        // Add missing month with default 'current' status
        completeHistory.push({
          month: monthStr,
          status: 'current',
          confidence: 0.5, // Lower confidence for filled gaps
          verified: false,
          discrepancies: ['Filled gap - no data available']
        })
      }
    }

    // Sort again after filling gaps
    completeHistory.sort((a, b) => b.month.localeCompare(a.month))

    if (completeHistory.length > history.length) {
      issues.push(`Filled ${completeHistory.length - history.length} missing months with default values`)
    }

    return completeHistory.slice(0, 24) // Keep only last 24 months
  }

  /**
   * Calculate payment performance metrics
   */
  private calculatePaymentPerformance(history: EnhancedPaymentHistoryEntry[]): PaymentPerformance {
    if (history.length === 0) {
      return this.createDefaultPerformance()
    }

    const totalEntries = history.length
    const onTimeEntries = history.filter(h => h.status === 'current').length
    const lateEntries = history.filter(h => 
      ['30_days_late', '60_days_late', '90_days_late', '120_days_late'].includes(h.status)
    ).length

    // Find worst status
    const statusSeverity = {
      'current': 0,
      'paid': 0,
      'closed': 0,
      '30_days_late': 1,
      '60_days_late': 2,
      '90_days_late': 3,
      '120_days_late': 4,
      'charge_off': 5,
      'collection': 5
    }

    const worstStatus = history.reduce((worst, entry) => {
      const currentSeverity = statusSeverity[entry.status as keyof typeof statusSeverity] || 0
      const worstSeverity = statusSeverity[worst as keyof typeof statusSeverity] || 0
      return currentSeverity > worstSeverity ? entry.status : worst
    }, 'current')

    // Calculate improvement trend
    const recentHistory = history.slice(0, 6) // Last 6 months
    const olderHistory = history.slice(6, 12) // 6-12 months ago

    const recentLateCount = recentHistory.filter(h => 
      ['30_days_late', '60_days_late', '90_days_late', '120_days_late'].includes(h.status)
    ).length

    const olderLateCount = olderHistory.filter(h => 
      ['30_days_late', '60_days_late', '90_days_late', '120_days_late'].includes(h.status)
    ).length

    let improvementTrend: 'improving' | 'declining' | 'stable' = 'stable'
    if (recentLateCount < olderLateCount) {
      improvementTrend = 'improving'
    } else if (recentLateCount > olderLateCount) {
      improvementTrend = 'declining'
    }

    // Calculate risk score
    const riskScore = Math.min(100, (lateEntries / totalEntries) * 100 + 
      (statusSeverity[worstStatus as keyof typeof statusSeverity] || 0) * 10)

    return {
      onTimePercentage: Math.round((onTimeEntries / totalEntries) * 100),
      latePaymentCount: lateEntries,
      worstStatus,
      improvementTrend,
      riskScore: Math.round(riskScore)
    }
  }

  /**
   * Create default performance metrics
   */
  private createDefaultPerformance(): PaymentPerformance {
    return {
      onTimePercentage: 0,
      latePaymentCount: 0,
      worstStatus: 'current',
      improvementTrend: 'stable',
      riskScore: 50
    }
  }
}

// Export singleton instances
export const creditorStandardizer = new CreditorStandardizer()
export const paymentHistoryValidator = new PaymentHistoryValidator()