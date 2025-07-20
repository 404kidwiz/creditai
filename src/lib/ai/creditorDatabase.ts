/**
 * Comprehensive creditor database with fuzzy matching and confidence scoring
 * Provides standardized creditor name resolution for credit report analysis
 */

export interface CreditorInfo {
  name: string
  type: CreditorType
  aliases: string[]
  confidence: number
  category?: string
  website?: string
  phone?: string
  address?: string
}

export interface CreditorMatch {
  creditor: CreditorInfo
  confidence: number
  matchType: MatchType
  originalInput: string
}

export enum CreditorType {
  CREDIT_CARD = 'credit_card',
  BANK = 'bank',
  MORTGAGE = 'mortgage',
  AUTO_LOAN = 'auto_loan',
  STUDENT_LOAN = 'student_loan',
  PERSONAL_LOAN = 'personal_loan',
  COLLECTION_AGENCY = 'collection_agency',
  UTILITY = 'utility',
  RETAIL = 'retail',
  MEDICAL = 'medical',
  OTHER = 'other'
}

export enum MatchType {
  EXACT = 'exact',
  ALIAS = 'alias',
  FUZZY = 'fuzzy',
  PARTIAL = 'partial',
  PHONETIC = 'phonetic'
}

export class CreditorDatabase {
  private static readonly CREDITOR_PATTERNS = new Map<string, CreditorInfo>([
    // Major Credit Card Companies
    ['american express', {
      name: 'American Express',
      type: CreditorType.CREDIT_CARD,
      aliases: ['amex', 'americanexpress', 'american exp', 'amex card', 'american express card'],
      confidence: 0.95,
      category: 'Major Credit Card',
      website: 'americanexpress.com'
    }],
    ['chase', {
      name: 'Chase',
      type: CreditorType.CREDIT_CARD,
      aliases: ['jpmorgan chase', 'chase bank', 'chase card', 'jp morgan chase', 'chase credit'],
      confidence: 0.95,
      category: 'Major Credit Card',
      website: 'chase.com'
    }],
    ['capital one', {
      name: 'Capital One',
      type: CreditorType.CREDIT_CARD,
      aliases: ['capitalone', 'capital 1', 'cap one', 'capital one bank', 'capital one card'],
      confidence: 0.95,
      category: 'Major Credit Card',
      website: 'capitalone.com'
    }],
    ['citibank', {
      name: 'Citibank',
      type: CreditorType.CREDIT_CARD,
      aliases: ['citi', 'citicorp', 'citi card', 'citibank card', 'citi credit'],
      confidence: 0.95,
      category: 'Major Credit Card',
      website: 'citibank.com'
    }],
    ['discover', {
      name: 'Discover',
      type: CreditorType.CREDIT_CARD,
      aliases: ['discover card', 'discover bank', 'discover financial', 'discover it'],
      confidence: 0.95,
      category: 'Major Credit Card',
      website: 'discover.com'
    }],
    ['bank of america', {
      name: 'Bank of America',
      type: CreditorType.CREDIT_CARD,
      aliases: ['boa', 'bankofamerica', 'bank america', 'bofa', 'b of a'],
      confidence: 0.95,
      category: 'Major Credit Card',
      website: 'bankofamerica.com'
    }],
    ['wells fargo', {
      name: 'Wells Fargo',
      type: CreditorType.CREDIT_CARD,
      aliases: ['wellsfargo', 'wells', 'wf', 'wells fargo bank', 'wells fargo card'],
      confidence: 0.95,
      category: 'Major Credit Card',
      website: 'wellsfargo.com'
    }],
    ['synchrony', {
      name: 'Synchrony Bank',
      type: CreditorType.CREDIT_CARD,
      aliases: ['synchrony bank', 'synchrony financial', 'sync bank', 'ge capital'],
      confidence: 0.90,
      category: 'Store Credit Card',
      website: 'synchronybank.com'
    }],

    // Major Banks
    ['us bank', {
      name: 'U.S. Bank',
      type: CreditorType.BANK,
      aliases: ['usbank', 'us bancorp', 'united states bank', 'u s bank'],
      confidence: 0.95,
      category: 'Major Bank',
      website: 'usbank.com'
    }],
    ['pnc bank', {
      name: 'PNC Bank',
      type: CreditorType.BANK,
      aliases: ['pnc', 'pnc financial', 'pittsburgh national corporation'],
      confidence: 0.90,
      category: 'Regional Bank',
      website: 'pnc.com'
    }],
    ['td bank', {
      name: 'TD Bank',
      type: CreditorType.BANK,
      aliases: ['toronto dominion', 'td', 'td america'],
      confidence: 0.90,
      category: 'Regional Bank',
      website: 'tdbank.com'
    }],

    // Auto Lenders
    ['toyota financial', {
      name: 'Toyota Financial Services',
      type: CreditorType.AUTO_LOAN,
      aliases: ['toyota motor credit', 'tfs', 'toyota finance', 'toyota credit'],
      confidence: 0.90,
      category: 'Auto Finance',
      website: 'toyotafinancial.com'
    }],
    ['ford motor credit', {
      name: 'Ford Motor Credit Company',
      type: CreditorType.AUTO_LOAN,
      aliases: ['ford credit', 'fmcc', 'ford financial', 'ford motor'],
      confidence: 0.90,
      category: 'Auto Finance',
      website: 'credit.ford.com'
    }],
    ['ally financial', {
      name: 'Ally Financial',
      type: CreditorType.AUTO_LOAN,
      aliases: ['ally bank', 'ally auto', 'gmac', 'general motors acceptance'],
      confidence: 0.90,
      category: 'Auto Finance',
      website: 'ally.com'
    }],

    // Student Loan Servicers
    ['navient', {
      name: 'Navient',
      type: CreditorType.STUDENT_LOAN,
      aliases: ['navient corporation', 'navient solutions', 'sallie mae'],
      confidence: 0.90,
      category: 'Student Loan Servicer',
      website: 'navient.com'
    }],
    ['great lakes', {
      name: 'Great Lakes Educational Loan Services',
      type: CreditorType.STUDENT_LOAN,
      aliases: ['great lakes higher education', 'glhec', 'great lakes student loans'],
      confidence: 0.90,
      category: 'Student Loan Servicer',
      website: 'mygreatlakes.org'
    }],
    ['fedloan servicing', {
      name: 'FedLoan Servicing',
      type: CreditorType.STUDENT_LOAN,
      aliases: ['pheaa', 'pennsylvania higher education', 'fed loan'],
      confidence: 0.90,
      category: 'Student Loan Servicer',
      website: 'myfedloan.org'
    }],

    // Collection Agencies
    ['portfolio recovery', {
      name: 'Portfolio Recovery Associates',
      type: CreditorType.COLLECTION_AGENCY,
      aliases: ['pra', 'portfolio recovery associates', 'portfolio recovery assoc'],
      confidence: 0.85,
      category: 'Collection Agency',
      website: 'portfoliorecovery.com'
    }],
    ['midland credit', {
      name: 'Midland Credit Management',
      type: CreditorType.COLLECTION_AGENCY,
      aliases: ['mcm', 'midland funding', 'midland credit mgmt'],
      confidence: 0.85,
      category: 'Collection Agency',
      website: 'midlandcredit.com'
    }],
    ['cavalry portfolio', {
      name: 'Cavalry Portfolio Services',
      type: CreditorType.COLLECTION_AGENCY,
      aliases: ['cavalry spv', 'cavalry', 'cps'],
      confidence: 0.85,
      category: 'Collection Agency'
    }],

    // Store Cards
    ['target', {
      name: 'Target',
      type: CreditorType.RETAIL,
      aliases: ['target card', 'target store', 'target credit', 'target redcard'],
      confidence: 0.85,
      category: 'Store Credit Card',
      website: 'target.com'
    }],
    ['home depot', {
      name: 'The Home Depot',
      type: CreditorType.RETAIL,
      aliases: ['homedepot', 'home depot card', 'home depot credit'],
      confidence: 0.85,
      category: 'Store Credit Card',
      website: 'homedepot.com'
    }],
    ['amazon', {
      name: 'Amazon',
      type: CreditorType.RETAIL,
      aliases: ['amazon card', 'amazon store card', 'amazon credit', 'amazon prime'],
      confidence: 0.85,
      category: 'Store Credit Card',
      website: 'amazon.com'
    }],

    // Utilities
    ['verizon', {
      name: 'Verizon',
      type: CreditorType.UTILITY,
      aliases: ['verizon wireless', 'vzw', 'verizon communications'],
      confidence: 0.80,
      category: 'Telecommunications',
      website: 'verizon.com'
    }],
    ['at&t', {
      name: 'AT&T',
      type: CreditorType.UTILITY,
      aliases: ['att', 'at and t', 'american telephone', 'at&t wireless'],
      confidence: 0.80,
      category: 'Telecommunications',
      website: 'att.com'
    }],
    ['comcast', {
      name: 'Comcast',
      type: CreditorType.UTILITY,
      aliases: ['xfinity', 'comcast cable', 'comcast corp'],
      confidence: 0.80,
      category: 'Cable/Internet',
      website: 'comcast.com'
    }]
  ])

  /**
   * Standardize creditor name using comprehensive database and fuzzy matching
   */
  static standardizeCreditorName(rawName: string): CreditorMatch {
    if (!rawName || typeof rawName !== 'string') {
      return this.createNoMatch(rawName)
    }

    const normalized = this.normalizeInput(rawName)
    
    // Try exact match first
    const exactMatch = this.findExactMatch(normalized)
    if (exactMatch) {
      return {
        creditor: exactMatch,
        confidence: exactMatch.confidence,
        matchType: MatchType.EXACT,
        originalInput: rawName
      }
    }

    // Try alias match
    const aliasMatch = this.findAliasMatch(normalized)
    if (aliasMatch) {
      return {
        creditor: aliasMatch,
        confidence: aliasMatch.confidence * 0.95, // Slight penalty for alias match
        matchType: MatchType.ALIAS,
        originalInput: rawName
      }
    }

    // Try fuzzy matching
    const fuzzyMatch = this.findFuzzyMatch(normalized)
    if (fuzzyMatch) {
      return fuzzyMatch
    }

    // Try partial matching
    const partialMatch = this.findPartialMatch(normalized)
    if (partialMatch) {
      return partialMatch
    }

    // Return best guess or no match
    return this.createNoMatch(rawName)
  }

  /**
   * Find multiple potential matches for ambiguous creditor names
   */
  static findPotentialMatches(rawName: string, limit: number = 5): CreditorMatch[] {
    if (!rawName || typeof rawName !== 'string') {
      return []
    }

    const normalized = this.normalizeInput(rawName)
    const matches: CreditorMatch[] = []

    // Collect all potential matches
    for (const [key, creditor] of this.CREDITOR_PATTERNS) {
      const exactScore = this.calculateExactMatchScore(normalized, key)
      if (exactScore > 0.6) {
        matches.push({
          creditor,
          confidence: creditor.confidence * exactScore,
          matchType: MatchType.EXACT,
          originalInput: rawName
        })
        continue
      }

      const aliasScore = this.calculateAliasMatchScore(normalized, creditor.aliases)
      if (aliasScore > 0.6) {
        matches.push({
          creditor,
          confidence: creditor.confidence * aliasScore * 0.95,
          matchType: MatchType.ALIAS,
          originalInput: rawName
        })
        continue
      }

      const fuzzyScore = this.calculateFuzzyScore(normalized, key)
      if (fuzzyScore > 0.5) {
        matches.push({
          creditor,
          confidence: creditor.confidence * fuzzyScore * 0.8,
          matchType: MatchType.FUZZY,
          originalInput: rawName
        })
      }
    }

    // Sort by confidence and return top matches
    return matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit)
  }

  /**
   * Get creditor information by exact name
   */
  static getCreditorInfo(creditorName: string): CreditorInfo | null {
    const normalized = this.normalizeInput(creditorName)
    return this.CREDITOR_PATTERNS.get(normalized) || null
  }

  /**
   * Get all creditors by type
   */
  static getCreditorsByType(type: CreditorType): CreditorInfo[] {
    return Array.from(this.CREDITOR_PATTERNS.values())
      .filter(creditor => creditor.type === type)
  }

  /**
   * Add or update creditor in database
   */
  static addCreditor(key: string, creditor: CreditorInfo): void {
    const normalized = this.normalizeInput(key)
    this.CREDITOR_PATTERNS.set(normalized, creditor)
  }

  // Private helper methods

  private static normalizeInput(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^\w\s&]/g, ' ') // Replace special chars with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  private static findExactMatch(normalized: string): CreditorInfo | null {
    return this.CREDITOR_PATTERNS.get(normalized) || null
  }

  private static findAliasMatch(normalized: string): CreditorInfo | null {
    for (const creditor of this.CREDITOR_PATTERNS.values()) {
      for (const alias of creditor.aliases) {
        if (this.normalizeInput(alias) === normalized) {
          return creditor
        }
      }
    }
    return null
  }

  private static findFuzzyMatch(normalized: string): CreditorMatch | null {
    let bestMatch: CreditorMatch | null = null
    let bestScore = 0

    for (const [key, creditor] of this.CREDITOR_PATTERNS) {
      const score = this.calculateFuzzyScore(normalized, key)
      if (score > bestScore && score >= 0.7) {
        bestScore = score
        bestMatch = {
          creditor,
          confidence: creditor.confidence * score * 0.8, // Penalty for fuzzy match
          matchType: MatchType.FUZZY,
          originalInput: normalized
        }
      }

      // Also check aliases
      for (const alias of creditor.aliases) {
        const aliasScore = this.calculateFuzzyScore(normalized, this.normalizeInput(alias))
        if (aliasScore > bestScore && aliasScore >= 0.7) {
          bestScore = aliasScore
          bestMatch = {
            creditor,
            confidence: creditor.confidence * aliasScore * 0.75, // Higher penalty for fuzzy alias
            matchType: MatchType.FUZZY,
            originalInput: normalized
          }
        }
      }
    }

    return bestMatch
  }

  private static findPartialMatch(normalized: string): CreditorMatch | null {
    let bestMatch: CreditorMatch | null = null
    let bestScore = 0

    for (const [key, creditor] of this.CREDITOR_PATTERNS) {
      const score = this.calculatePartialMatchScore(normalized, key)
      if (score > bestScore && score >= 0.6) {
        bestScore = score
        bestMatch = {
          creditor,
          confidence: creditor.confidence * score * 0.6, // Higher penalty for partial match
          matchType: MatchType.PARTIAL,
          originalInput: normalized
        }
      }
    }

    return bestMatch
  }

  private static calculateFuzzyScore(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2)
    const maxLength = Math.max(str1.length, str2.length)
    
    if (maxLength === 0) return 1
    
    return 1 - (distance / maxLength)
  }

  private static calculateExactMatchScore(input: string, target: string): number {
    return input === target ? 1 : 0
  }

  private static calculateAliasMatchScore(input: string, aliases: string[]): number {
    for (const alias of aliases) {
      if (this.normalizeInput(alias) === input) {
        return 1
      }
    }
    return 0
  }

  private static calculatePartialMatchScore(input: string, target: string): number {
    const inputWords = input.split(' ')
    const targetWords = target.split(' ')
    
    let matchedWords = 0
    for (const inputWord of inputWords) {
      for (const targetWord of targetWords) {
        if (inputWord === targetWord || this.calculateFuzzyScore(inputWord, targetWord) >= 0.8) {
          matchedWords++
          break
        }
      }
    }
    
    return matchedWords / Math.max(inputWords.length, targetWords.length)
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  private static createNoMatch(originalInput: string): CreditorMatch {
    return {
      creditor: {
        name: originalInput,
        type: CreditorType.OTHER,
        aliases: [],
        confidence: 0.1
      },
      confidence: 0.1,
      matchType: MatchType.EXACT,
      originalInput
    }
  }
}