/**
 * PII Masking Utility
 * Simplified implementation for build compatibility
 */

export interface PIIMaskingOptions {
  maskingLevel: 'standard' | 'enhanced' | 'maximum'
  preserveFormat: boolean
  customPatterns?: RegExp[]
}

export interface PIIDetectionResult {
  originalText: string
  maskedText: string
  detectedPII: Array<{
    type: string
    value: string
    masked: string
    position: { start: number; end: number }
  }>
  sensitivityScore: number
}

export class PIIMasker {
  private readonly patterns = {
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    phone: /\b\d{3}-\d{3}-\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    accountNumber: /\b\d{8,17}\b/g,
  }

  maskText(text: string, options?: Partial<PIIMaskingOptions>): PIIDetectionResult {
    const opts: PIIMaskingOptions = {
      maskingLevel: 'standard',
      preserveFormat: true,
      ...options,
    }

    let maskedText = text
    const detectedPII: PIIDetectionResult['detectedPII'] = []

    // Mask different types of PII
    Object.entries(this.patterns).forEach(([type, pattern]) => {
      const matches = Array.from(text.matchAll(pattern))
      
      matches.forEach((match) => {
        if (match.index !== undefined) {
          const original = match[0]
          const masked = this.getMaskedValue(original, type, opts)
          
          maskedText = maskedText.replace(original, masked)
          
          detectedPII.push({
            type,
            value: original,
            masked,
            position: { start: match.index, end: match.index + original.length }
          })
        }
      })
    })

    const sensitivityScore = this.calculateSensitivityScore(detectedPII)

    return {
      originalText: text,
      maskedText,
      detectedPII,
      sensitivityScore,
    }
  }

  private getMaskedValue(value: string, type: string, options: PIIMaskingOptions): string {
    switch (options.maskingLevel) {
      case 'maximum':
        return '[REDACTED]'
      case 'enhanced':
        return this.getEnhancedMask(value, type)
      default:
        return this.getStandardMask(value, type, options.preserveFormat)
    }
  }

  private getStandardMask(value: string, type: string, preserveFormat: boolean): string {
    if (!preserveFormat) {
      return '*'.repeat(value.length)
    }

    switch (type) {
      case 'ssn':
        return `***-**-${value.slice(-4)}`
      case 'phone':
        return `***-***-${value.slice(-4)}`
      case 'email':
        const [localPart, domain] = value.split('@')
        return `${localPart.charAt(0)}***@${domain}`
      case 'creditCard':
        return `****-****-****-${value.slice(-4)}`
      default:
        return `***${value.slice(-4)}`
    }
  }

  private getEnhancedMask(value: string, type: string): string {
    return `[${type.toUpperCase()}_MASKED]`
  }

  private calculateSensitivityScore(detectedPII: PIIDetectionResult['detectedPII']): number {
    if (detectedPII.length === 0) return 0

    const weights = {
      ssn: 10,
      creditCard: 9,
      accountNumber: 8,
      phone: 5,
      email: 3,
    }

    const totalWeight = detectedPII.reduce((sum, item) => {
      return sum + (weights[item.type as keyof typeof weights] || 1)
    }, 0)

    return Math.min(totalWeight, 10)
  }

  // Static helper methods for API compatibility
  static maskPII(text: string, options?: any) {
    const masker = new PIIMasker()
    const result = masker.maskText(text, options)
    return {
      maskedText: result.maskedText,
      maskingApplied: result.detectedPII.length > 0,
      detectedPII: {
        ssn: result.detectedPII.filter(p => p.type === 'ssn'),
        accountNumbers: result.detectedPII.filter(p => p.type === 'accountNumber'),
        creditCards: result.detectedPII.filter(p => p.type === 'creditCard'),
        phoneNumbers: result.detectedPII.filter(p => p.type === 'phone'),
        emails: result.detectedPII.filter(p => p.type === 'email'),
      },
      sensitivityScore: result.sensitivityScore
    }
  }

  static maskCreditReportData(data: any) {
    return PIIMasker.maskSensitiveData(data)
  }

  static getPIISummary(text: string) {
    const masker = new PIIMasker()
    const result = masker.maskText(text)
    return {
      hasPII: result.detectedPII.length > 0,
      piiTypes: [...new Set(result.detectedPII.map(p => p.type))],
      sensitivityScore: result.sensitivityScore,
      detectedItems: result.detectedPII.length
    }
  }

  static maskSensitiveData(data: any): any {
    const masker = new PIIMasker()
    
    if (typeof data === 'string') {
      return masker.maskText(data).maskedText
    }
    
    if (typeof data === 'object' && data !== null) {
      const masked = { ...data }
      Object.keys(masked).forEach(key => {
        if (typeof masked[key] === 'string') {
          masked[key] = masker.maskText(masked[key]).maskedText
        }
      })
      return masked
    }
    
    return data
  }

  static detectPII(text: string): boolean {
    const masker = new PIIMasker()
    const result = masker.maskText(text)
    return result.detectedPII.length > 0
  }

  static sanitizeErrorMessage(message: string): string {
    const masker = new PIIMasker()
    const result = masker.maskText(message, { maskingLevel: 'enhanced' })
    return result.maskedText
  }
}

// Export singleton instance
export const piiMasker = new PIIMasker()

// Export for compatibility
export { PIIMasker as default }