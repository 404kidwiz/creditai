/**
 * Creditor Database and Standardization System
 * 
 * This module provides comprehensive creditor information management with
 * EOSCAR compliance, standardized naming, and address verification.
 */

import { supabase } from '@/lib/supabase/client'

// ===================================
// Creditor Database Types
// ===================================

export interface CreditorInfo {
  id: string
  creditorName: string
  standardizedName: string
  aliases: string[]
  creditorCode?: string
  eoscarCode?: string
  bureauCodes: BureauCreditorCodes
  address: CreditorAddress
  contactInfo: CreditorContactInfo
  industry: string
  businessType: 'bank' | 'credit_union' | 'finance_company' | 'retailer' | 'collection_agency' | 'other'
  isActive: boolean
  
  // Validation metadata
  verified: boolean
  lastVerified: Date
  verificationSource: string
  confidence: number
  
  // EOSCAR specific
  eoscarCompliant: boolean
  supportedBureaus: ('experian' | 'equifax' | 'transunion')[]
  
  // Metadata
  createdAt: Date
  updatedAt: Date
}

export interface BureauCreditorCodes {
  experian?: string
  equifax?: string
  transunion?: string
}

export interface CreditorAddress {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  addressType: 'headquarters' | 'mailing' | 'dispute_address'
  
  // Standardization metadata
  standardized: boolean
  standardizedBy?: string
  confidence: number
}

export interface CreditorContactInfo {
  phone?: string
  email?: string
  website?: string
  disputePhone?: string
  disputeEmail?: string
  disputeAddress?: CreditorAddress
  customerServiceHours?: string
}

export interface CreditorSearchResult {
  creditor: CreditorInfo
  matchScore: number
  matchType: 'exact' | 'alias' | 'fuzzy' | 'phonetic'
  matchedField: string
}

export interface CreditorStandardizationResult {
  originalName: string
  standardizedName: string
  creditorInfo?: CreditorInfo
  confidence: number
  suggestions: string[]
  requiresManualReview: boolean
}

// ===================================
// Creditor Database Class
// ===================================

export class CreditorDatabase {
  private creditorCache: Map<string, CreditorInfo> = new Map()
  private aliasMap: Map<string, string> = new Map()
  private lastCacheUpdate: Date = new Date(0)
  private cacheExpiryMinutes = 60

  constructor() {
    this.initializeDatabase()
  }

  /**
   * Initialize creditor database
   */
  private async initializeDatabase(): Promise<void> {
    await this.loadCreditorData()
    await this.buildAliasMap()
    console.log(`Creditor database initialized with ${this.creditorCache.size} creditors`)
  }

  /**
   * Load creditor data from database
   */
  private async loadCreditorData(): Promise<void> {
    try {
      const { data: creditors, error } = await supabase
        .from('creditor_database')
        .select('*')
        .eq('is_active', true)

      if (error) {
        console.error('Error loading creditor data:', error)
        await this.loadDefaultCreditors()
        return
      }

      creditors?.forEach(creditor => {
        const creditorInfo: CreditorInfo = {
          id: creditor.id,
          creditorName: creditor.creditor_name,
          standardizedName: creditor.standardized_name,
          aliases: creditor.aliases || [],
          creditorCode: creditor.creditor_code,
          eoscarCode: creditor.eoscar_code,
          bureauCodes: creditor.bureau_codes || {},
          address: creditor.address || this.getDefaultAddress(),
          contactInfo: creditor.contact_info || {},
          industry: creditor.industry || 'unknown',
          businessType: creditor.business_type || 'other',
          isActive: creditor.is_active,
          verified: creditor.verified || false,
          lastVerified: new Date(creditor.last_verified || Date.now()),
          verificationSource: creditor.verification_source || 'system',
          confidence: creditor.confidence || 0.8,
          eoscarCompliant: creditor.eoscar_compliant || false,
          supportedBureaus: creditor.supported_bureaus || ['experian', 'equifax', 'transunion'],
          createdAt: new Date(creditor.created_at),
          updatedAt: new Date(creditor.updated_at)
        }

        this.creditorCache.set(creditor.id, creditorInfo)
      })

      this.lastCacheUpdate = new Date()
      console.log(`Loaded ${creditors?.length || 0} creditors from database`)

    } catch (error) {
      console.error('Failed to load creditor data:', error)
      await this.loadDefaultCreditors()
    }
  }

  /**
   * Load default creditor data
   */
  private async loadDefaultCreditors(): Promise<void> {
    const defaultCreditors = this.getDefaultCreditorData()
    
    defaultCreditors.forEach(creditor => {
      this.creditorCache.set(creditor.id, creditor)
    })

    console.log(`Loaded ${defaultCreditors.length} default creditors`)
  }

  /**
   * Build alias mapping for fast lookups
   */
  private async buildAliasMap(): Promise<void> {
    this.aliasMap.clear()

    this.creditorCache.forEach((creditor, id) => {
      // Map standardized name
      this.aliasMap.set(creditor.standardizedName.toLowerCase(), id)
      
      // Map original name
      this.aliasMap.set(creditor.creditorName.toLowerCase(), id)
      
      // Map aliases
      creditor.aliases.forEach(alias => {
        this.aliasMap.set(alias.toLowerCase(), id)
      })
    })

    console.log(`Built alias map with ${this.aliasMap.size} entries`)
  }

  /**
   * Search for creditor by name
   */
  async searchCreditor(creditorName: string): Promise<CreditorSearchResult[]> {
    await this.ensureCacheValid()

    const results: CreditorSearchResult[] = []
    const searchTerm = creditorName.toLowerCase().trim()

    // Exact match
    const exactId = this.aliasMap.get(searchTerm)
    if (exactId) {
      const creditor = this.creditorCache.get(exactId)
      if (creditor) {
        results.push({
          creditor,
          matchScore: 1.0,
          matchType: 'exact',
          matchedField: 'name'
        })
      }
    }

    // Fuzzy matching if no exact match
    if (results.length === 0) {
      this.creditorCache.forEach(creditor => {
        const fuzzyScore = this.calculateFuzzyMatch(searchTerm, creditor)
        if (fuzzyScore > 0.7) {
          results.push({
            creditor,
            matchScore: fuzzyScore,
            matchType: 'fuzzy',
            matchedField: 'name'
          })
        }
      })
    }

    // Sort by match score
    results.sort((a, b) => b.matchScore - a.matchScore)

    return results.slice(0, 10) // Return top 10 matches
  }

  /**
   * Get creditor by ID
   */
  async getCreditor(creditorId: string): Promise<CreditorInfo | null> {
    await this.ensureCacheValid()
    return this.creditorCache.get(creditorId) || null
  }

  /**
   * Standardize creditor name
   */
  async standardizeCreditorName(creditorName: string): Promise<CreditorStandardizationResult> {
    const searchResults = await this.searchCreditor(creditorName)

    if (searchResults.length > 0 && searchResults[0].matchScore > 0.8) {
      const bestMatch = searchResults[0]
      return {
        originalName: creditorName,
        standardizedName: bestMatch.creditor.standardizedName,
        creditorInfo: bestMatch.creditor,
        confidence: bestMatch.matchScore,
        suggestions: searchResults.slice(1, 4).map(r => r.creditor.standardizedName),
        requiresManualReview: bestMatch.matchScore < 0.9
      }
    }

    // No good match found - suggest creating new creditor
    const suggestions = this.generateNameSuggestions(creditorName)
    
    return {
      originalName: creditorName,
      standardizedName: this.generateStandardizedName(creditorName),
      confidence: 0.5,
      suggestions,
      requiresManualReview: true
    }
  }

  /**
   * Get EOSCAR creditor code
   */
  async getEOSCARCreditorCode(
    creditorName: string,
    bureau: 'experian' | 'equifax' | 'transunion'
  ): Promise<string | null> {
    const searchResults = await this.searchCreditor(creditorName)
    
    if (searchResults.length > 0) {
      const creditor = searchResults[0].creditor
      
      // Return bureau-specific code if available
      if (creditor.bureauCodes[bureau]) {
        return creditor.bureauCodes[bureau]!
      }
      
      // Return EOSCAR code if available
      if (creditor.eoscarCode) {
        return creditor.eoscarCode
      }
      
      // Return general creditor code
      if (creditor.creditorCode) {
        return creditor.creditorCode
      }
    }

    return null
  }

  /**
   * Validate creditor information
   */
  async validateCreditor(creditorInfo: Partial<CreditorInfo>): Promise<{
    isValid: boolean
    issues: string[]
    warnings: string[]
  }> {
    const issues: string[] = []
    const warnings: string[] = []

    // Required fields validation
    if (!creditorInfo.creditorName || creditorInfo.creditorName.length < 2) {
      issues.push('Creditor name is required and must be at least 2 characters')
    }

    if (!creditorInfo.standardizedName || creditorInfo.standardizedName.length < 2) {
      issues.push('Standardized name is required and must be at least 2 characters')
    }

    // Address validation
    if (creditorInfo.address) {
      if (!creditorInfo.address.street) {
        warnings.push('Street address is recommended')
      }
      if (!creditorInfo.address.city) {
        warnings.push('City is recommended')
      }
      if (!creditorInfo.address.state) {
        warnings.push('State is recommended')
      }
      if (!creditorInfo.address.zipCode || !creditorInfo.address.zipCode.match(/^\d{5}(-\d{4})?$/)) {
        warnings.push('Valid ZIP code is recommended')
      }
    }

    // EOSCAR compliance validation
    if (creditorInfo.eoscarCompliant) {
      if (!creditorInfo.eoscarCode && !creditorInfo.creditorCode) {
        issues.push('EOSCAR compliant creditors must have a creditor code')
      }
      
      if (!creditorInfo.bureauCodes || Object.keys(creditorInfo.bureauCodes).length === 0) {
        warnings.push('Bureau-specific codes are recommended for EOSCAR compliance')
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    }
  }

  /**
   * Add or update creditor
   */
  async upsertCreditor(creditorInfo: Partial<CreditorInfo>): Promise<CreditorInfo> {
    const validation = await this.validateCreditor(creditorInfo)
    
    if (!validation.isValid) {
      throw new Error(`Creditor validation failed: ${validation.issues.join(', ')}`)
    }

    const now = new Date()
    const creditorId = creditorInfo.id || this.generateCreditorId(creditorInfo.creditorName!)

    const fullCreditorInfo: CreditorInfo = {
      id: creditorId,
      creditorName: creditorInfo.creditorName!,
      standardizedName: creditorInfo.standardizedName || creditorInfo.creditorName!,
      aliases: creditorInfo.aliases || [],
      creditorCode: creditorInfo.creditorCode,
      eoscarCode: creditorInfo.eoscarCode,
      bureauCodes: creditorInfo.bureauCodes || {},
      address: creditorInfo.address || this.getDefaultAddress(),
      contactInfo: creditorInfo.contactInfo || {},
      industry: creditorInfo.industry || 'unknown',
      businessType: creditorInfo.businessType || 'other',
      isActive: creditorInfo.isActive !== false,
      verified: creditorInfo.verified || false,
      lastVerified: creditorInfo.lastVerified || now,
      verificationSource: creditorInfo.verificationSource || 'manual',
      confidence: creditorInfo.confidence || 0.8,
      eoscarCompliant: creditorInfo.eoscarCompliant || false,
      supportedBureaus: creditorInfo.supportedBureaus || ['experian', 'equifax', 'transunion'],
      createdAt: creditorInfo.createdAt || now,
      updatedAt: now
    }

    // Save to database
    try {
      const { error } = await supabase
        .from('creditor_database')
        .upsert({
          id: fullCreditorInfo.id,
          creditor_name: fullCreditorInfo.creditorName,
          standardized_name: fullCreditorInfo.standardizedName,
          aliases: fullCreditorInfo.aliases,
          creditor_code: fullCreditorInfo.creditorCode,
          eoscar_code: fullCreditorInfo.eoscarCode,
          bureau_codes: fullCreditorInfo.bureauCodes,
          address: fullCreditorInfo.address,
          contact_info: fullCreditorInfo.contactInfo,
          industry: fullCreditorInfo.industry,
          business_type: fullCreditorInfo.businessType,
          is_active: fullCreditorInfo.isActive,
          verified: fullCreditorInfo.verified,
          last_verified: fullCreditorInfo.lastVerified.toISOString(),
          verification_source: fullCreditorInfo.verificationSource,
          confidence: fullCreditorInfo.confidence,
          eoscar_compliant: fullCreditorInfo.eoscarCompliant,
          supported_bureaus: fullCreditorInfo.supportedBureaus,
          updated_at: fullCreditorInfo.updatedAt.toISOString()
        })

      if (error) {
        console.error('Error saving creditor:', error)
      }
    } catch (error) {
      console.error('Failed to save creditor:', error)
    }

    // Update cache
    this.creditorCache.set(creditorId, fullCreditorInfo)
    await this.buildAliasMap()

    return fullCreditorInfo
  }

  /**
   * Ensure cache is valid and refresh if needed
   */
  private async ensureCacheValid(): Promise<void> {
    const now = new Date()
    const cacheAge = now.getTime() - this.lastCacheUpdate.getTime()
    const cacheAgeMinutes = cacheAge / (1000 * 60)

    if (cacheAgeMinutes > this.cacheExpiryMinutes) {
      await this.loadCreditorData()
      await this.buildAliasMap()
    }
  }

  /**
   * Calculate fuzzy match score
   */
  private calculateFuzzyMatch(searchTerm: string, creditor: CreditorInfo): number {
    const targets = [
      creditor.creditorName.toLowerCase(),
      creditor.standardizedName.toLowerCase(),
      ...creditor.aliases.map(a => a.toLowerCase())
    ]

    let bestScore = 0

    targets.forEach(target => {
      const score = this.calculateStringSimilarity(searchTerm, target)
      if (score > bestScore) {
        bestScore = score
      }
    })

    return bestScore
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const matrix = []
    const len1 = str1.length
    const len2 = str2.length

    if (len1 === 0) return len2 === 0 ? 1 : 0
    if (len2 === 0) return 0

    // Initialize matrix
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j
    }

    // Fill matrix
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }

    const distance = matrix[len2][len1]
    const maxLength = Math.max(len1, len2)
    return 1 - (distance / maxLength)
  }

  /**
   * Generate standardized creditor name
   */
  private generateStandardizedName(creditorName: string): string {
    return creditorName
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\b(inc|llc|corp|ltd|co)\b\.?/gi, '')
      .replace(/[^\w\s]/g, '')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Generate name suggestions
   */
  private generateNameSuggestions(creditorName: string): string[] {
    const suggestions: string[] = []
    const standardized = this.generateStandardizedName(creditorName)
    
    // Add variations
    suggestions.push(standardized)
    suggestions.push(standardized + ' Inc')
    suggestions.push(standardized + ' LLC')
    suggestions.push(standardized + ' Corp')
    
    return suggestions.slice(0, 3)
  }

  /**
   * Generate creditor ID
   */
  private generateCreditorId(creditorName: string): string {
    const normalized = creditorName.toLowerCase().replace(/[^a-z0-9]/g, '')
    const timestamp = Date.now().toString(36)
    return `cred_${normalized.slice(0, 10)}_${timestamp}`
  }

  /**
   * Get default address
   */
  private getDefaultAddress(): CreditorAddress {
    return {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
      addressType: 'headquarters',
      standardized: false,
      confidence: 0
    }
  }

  /**
   * Get default creditor data
   */
  private getDefaultCreditorData(): CreditorInfo[] {
    const now = new Date()
    
    return [
      {
        id: 'cred_chase_001',
        creditorName: 'Chase Bank',
        standardizedName: 'JPMorgan Chase Bank',
        aliases: ['Chase', 'JP Morgan Chase', 'Chase Manhattan'],
        creditorCode: 'CHASE',
        eoscarCode: 'CHASE001',
        bureauCodes: {
          experian: 'CHASE',
          equifax: 'JPMC',
          transunion: 'CHASE'
        },
        address: {
          street: '270 Park Avenue',
          city: 'New York',
          state: 'NY',
          zipCode: '10017',
          country: 'USA',
          addressType: 'headquarters',
          standardized: true,
          confidence: 1.0
        },
        contactInfo: {
          phone: '1-800-935-9935',
          website: 'https://www.chase.com',
          disputePhone: '1-800-955-9060'
        },
        industry: 'Banking',
        businessType: 'bank',
        isActive: true,
        verified: true,
        lastVerified: now,
        verificationSource: 'official',
        confidence: 1.0,
        eoscarCompliant: true,
        supportedBureaus: ['experian', 'equifax', 'transunion'],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'cred_citi_001',
        creditorName: 'Citibank',
        standardizedName: 'Citibank N.A.',
        aliases: ['Citi', 'Citicorp', 'Citigroup'],
        creditorCode: 'CITI',
        eoscarCode: 'CITI001',
        bureauCodes: {
          experian: 'CITI',
          equifax: 'CITI',
          transunion: 'CITI'
        },
        address: {
          street: '388 Greenwich Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10013',
          country: 'USA',
          addressType: 'headquarters',
          standardized: true,
          confidence: 1.0
        },
        contactInfo: {
          phone: '1-800-950-5114',
          website: 'https://www.citibank.com',
          disputePhone: '1-800-950-5114'
        },
        industry: 'Banking',
        businessType: 'bank',
        isActive: true,
        verified: true,
        lastVerified: now,
        verificationSource: 'official',
        confidence: 1.0,
        eoscarCompliant: true,
        supportedBureaus: ['experian', 'equifax', 'transunion'],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'cred_amex_001',
        creditorName: 'American Express',
        standardizedName: 'American Express Company',
        aliases: ['Amex', 'AmEx', 'American Express Co'],
        creditorCode: 'AMEX',
        eoscarCode: 'AMEX001',
        bureauCodes: {
          experian: 'AMEX',
          equifax: 'AMEX',
          transunion: 'AMEX'
        },
        address: {
          street: '200 Vesey Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10285',
          country: 'USA',
          addressType: 'headquarters',
          standardized: true,
          confidence: 1.0
        },
        contactInfo: {
          phone: '1-800-528-4800',
          website: 'https://www.americanexpress.com',
          disputePhone: '1-800-528-2122'
        },
        industry: 'Financial Services',
        businessType: 'finance_company',
        isActive: true,
        verified: true,
        lastVerified: now,
        verificationSource: 'official',
        confidence: 1.0,
        eoscarCompliant: true,
        supportedBureaus: ['experian', 'equifax', 'transunion'],
        createdAt: now,
        updatedAt: now
      }
    ]
  }
}

// ===================================
// Address Standardization Service
// ===================================

export class AddressStandardizer {
  /**
   * Standardize creditor address
   */
  static async standardizeAddress(address: Partial<CreditorAddress>): Promise<CreditorAddress> {
    const standardized: CreditorAddress = {
      street: this.standardizeStreet(address.street || ''),
      city: this.standardizeCity(address.city || ''),
      state: this.standardizeState(address.state || ''),
      zipCode: this.standardizeZipCode(address.zipCode || ''),
      country: address.country || 'USA',
      addressType: address.addressType || 'headquarters',
      standardized: true,
      confidence: this.calculateAddressConfidence(address)
    }

    return standardized
  }

  /**
   * Standardize street address
   */
  private static standardizeStreet(street: string): string {
    return street
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\b(street|st)\b\.?/gi, 'St')
      .replace(/\b(avenue|ave)\b\.?/gi, 'Ave')
      .replace(/\b(boulevard|blvd)\b\.?/gi, 'Blvd')
      .replace(/\b(drive|dr)\b\.?/gi, 'Dr')
      .replace(/\b(road|rd)\b\.?/gi, 'Rd')
      .replace(/\b(lane|ln)\b\.?/gi, 'Ln')
      .replace(/\b(court|ct)\b\.?/gi, 'Ct')
      .replace(/\b(place|pl)\b\.?/gi, 'Pl')
  }

  /**
   * Standardize city name
   */
  private static standardizeCity(city: string): string {
    return city
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Standardize state
   */
  private static standardizeState(state: string): string {
    const stateMap: { [key: string]: string } = {
      'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
      'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
      'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
      'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
      'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
      'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
      'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
      'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
      'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
      'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
      'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
      'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
      'wisconsin': 'WI', 'wyoming': 'WY'
    }

    const normalized = state.toLowerCase().trim()
    return stateMap[normalized] || state.toUpperCase()
  }

  /**
   * Standardize ZIP code
   */
  private static standardizeZipCode(zipCode: string): string {
    const cleaned = zipCode.replace(/[^\d-]/g, '')
    
    if (cleaned.match(/^\d{5}$/)) {
      return cleaned
    }
    
    if (cleaned.match(/^\d{5}-?\d{4}$/)) {
      return cleaned.replace(/^(\d{5})-?(\d{4})$/, '$1-$2')
    }
    
    return zipCode
  }

  /**
   * Calculate address confidence score
   */
  private static calculateAddressConfidence(address: Partial<CreditorAddress>): number {
    let score = 0
    let maxScore = 0

    // Street address (30%)
    maxScore += 30
    if (address.street && address.street.length > 5) {
      score += 30
    } else if (address.street && address.street.length > 0) {
      score += 15
    }

    // City (25%)
    maxScore += 25
    if (address.city && address.city.length > 1) {
      score += 25
    }

    // State (25%)
    maxScore += 25
    if (address.state && address.state.length >= 2) {
      score += 25
    }

    // ZIP code (20%)
    maxScore += 20
    if (address.zipCode && address.zipCode.match(/^\d{5}(-\d{4})?$/)) {
      score += 20
    } else if (address.zipCode && address.zipCode.length > 0) {
      score += 10
    }

    return maxScore > 0 ? score / maxScore : 0
  }
}

// ===================================
// Creditor Verification Service
// ===================================

export class CreditorVerificationService {
  /**
   * Verify creditor information
   */
  static async verifyCreditor(creditorInfo: CreditorInfo): Promise<{
    verified: boolean
    confidence: number
    issues: string[]
    suggestions: string[]
  }> {
    const issues: string[] = []
    const suggestions: string[] = []
    let confidence = 0.5

    // Verify basic information
    if (creditorInfo.creditorName && creditorInfo.creditorName.length > 2) {
      confidence += 0.2
    } else {
      issues.push('Creditor name is too short or missing')
    }

    // Verify address
    if (creditorInfo.address && creditorInfo.address.confidence > 0.8) {
      confidence += 0.2
    } else {
      issues.push('Address information is incomplete or unverified')
      suggestions.push('Verify and complete address information')
    }

    // Verify contact information
    if (creditorInfo.contactInfo.phone || creditorInfo.contactInfo.website) {
      confidence += 0.1
    } else {
      suggestions.push('Add contact information for better verification')
    }

    // Verify EOSCAR compliance
    if (creditorInfo.eoscarCompliant) {
      if (creditorInfo.eoscarCode || creditorInfo.creditorCode) {
        confidence += 0.2
      } else {
        issues.push('EOSCAR compliant creditors must have creditor codes')
      }

      if (Object.keys(creditorInfo.bureauCodes).length > 0) {
        confidence += 0.1
      } else {
        suggestions.push('Add bureau-specific codes for better EOSCAR compliance')
      }
    }

    // Verify industry classification
    if (creditorInfo.industry && creditorInfo.industry !== 'unknown') {
      confidence += 0.1
    } else {
      suggestions.push('Classify creditor industry for better categorization')
    }

    return {
      verified: confidence > 0.7 && issues.length === 0,
      confidence: Math.min(confidence, 1.0),
      issues,
      suggestions
    }
  }
}