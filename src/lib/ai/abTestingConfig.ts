/**
 * A/B Testing configuration for AI improvements
 * Manages feature flags and gradual rollout of enhanced features
 */

export interface ABTestConfig {
  featureName: string
  enabled: boolean
  rolloutPercentage: number
  conditions?: string[]
  dependencies?: string[]
  startDate?: string
  endDate?: string
}

export interface ABTestResult {
  variant: 'control' | 'treatment'
  featureName: string
  userId?: string
  sessionId?: string
  timestamp: string
}

export class ABTestingManager {
  private static readonly FEATURE_FLAGS = new Map<string, ABTestConfig>([
    ['improved-confidence-calculator', {
      featureName: 'improved-confidence-calculator',
      enabled: true,
      rolloutPercentage: 25, // Start with 25% rollout
      conditions: [],
      dependencies: [],
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    }],
    ['enhanced-text-parser', {
      featureName: 'enhanced-text-parser',
      enabled: true,
      rolloutPercentage: 15, // More conservative rollout
      conditions: [],
      dependencies: ['improved-confidence-calculator'],
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    }],
    ['creditor-database-matching', {
      featureName: 'creditor-database-matching',
      enabled: true,
      rolloutPercentage: 30,
      conditions: [],
      dependencies: [],
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    }]
  ])

  /**
   * Check if a user should receive a feature based on A/B testing configuration
   */
  static shouldReceiveFeature(
    featureName: string, 
    userId?: string, 
    sessionId?: string
  ): ABTestResult {
    const config = this.FEATURE_FLAGS.get(featureName)
    
    if (!config || !config.enabled) {
      return {
        variant: 'control',
        featureName,
        userId,
        sessionId,
        timestamp: new Date().toISOString()
      }
    }

    // Check date constraints
    if (config.startDate && new Date() < new Date(config.startDate)) {
      return {
        variant: 'control',
        featureName,
        userId,
        sessionId,
        timestamp: new Date().toISOString()
      }
    }

    if (config.endDate && new Date() > new Date(config.endDate)) {
      return {
        variant: 'control',
        featureName,
        userId,
        sessionId,
        timestamp: new Date().toISOString()
      }
    }

    // Check dependencies
    if (config.dependencies && config.dependencies.length > 0) {
      for (const dependency of config.dependencies) {
        const dependencyResult = this.shouldReceiveFeature(dependency, userId, sessionId)
        if (dependencyResult.variant === 'control') {
          return {
            variant: 'control',
            featureName,
            userId,
            sessionId,
            timestamp: new Date().toISOString()
          }
        }
      }
    }

    // Determine variant based on consistent hashing
    const variant = this.determineVariant(featureName, userId, sessionId, config.rolloutPercentage)
    
    return {
      variant,
      featureName,
      userId,
      sessionId,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Determine variant using consistent hashing
   */
  private static determineVariant(
    featureName: string,
    userId?: string,
    sessionId?: string,
    rolloutPercentage: number
  ): 'control' | 'treatment' {
    // Create a consistent identifier
    const identifier = userId || sessionId || 'anonymous'
    const hashInput = `${featureName}:${identifier}`
    
    // Simple hash function (in production, use crypto.createHash)
    let hash = 0
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Convert to percentage (0-99)
    const percentage = Math.abs(hash) % 100
    
    return percentage < rolloutPercentage ? 'treatment' : 'control'
  }

  /**
   * Update feature flag configuration
   */
  static updateFeatureFlag(featureName: string, config: Partial<ABTestConfig>): void {
    const existingConfig = this.FEATURE_FLAGS.get(featureName)
    if (existingConfig) {
      this.FEATURE_FLAGS.set(featureName, { ...existingConfig, ...config })
    }
  }

  /**
   * Get all feature flags
   */
  static getAllFeatureFlags(): Map<string, ABTestConfig> {
    return new Map(this.FEATURE_FLAGS)
  }

  /**
   * Get feature flag configuration
   */
  static getFeatureFlag(featureName: string): ABTestConfig | undefined {
    return this.FEATURE_FLAGS.get(featureName)
  }

  /**
   * Log A/B test result for analytics
   */
  static logABTestResult(result: ABTestResult, additionalData?: Record<string, any>): void {
    console.log('A/B Test Result:', {
      ...result,
      ...additionalData
    })
    
    // In production, this would send to analytics service
    // analytics.track('ab_test_assignment', {
    //   feature: result.featureName,
    //   variant: result.variant,
    //   userId: result.userId,
    //   sessionId: result.sessionId,
    //   timestamp: result.timestamp,
    //   ...additionalData
    // })
  }

  /**
   * Check if improved confidence calculator should be used
   */
  static shouldUseImprovedConfidence(userId?: string, sessionId?: string): boolean {
    const result = this.shouldReceiveFeature('improved-confidence-calculator', userId, sessionId)
    this.logABTestResult(result)
    return result.variant === 'treatment'
  }

  /**
   * Check if enhanced text parser should be used
   */
  static shouldUseEnhancedTextParser(userId?: string, sessionId?: string): boolean {
    const result = this.shouldReceiveFeature('enhanced-text-parser', userId, sessionId)
    this.logABTestResult(result)
    return result.variant === 'treatment'
  }

  /**
   * Check if creditor database matching should be used
   */
  static shouldUseCreditorDatabase(userId?: string, sessionId?: string): boolean {
    const result = this.shouldReceiveFeature('creditor-database-matching', userId, sessionId)
    this.logABTestResult(result)
    return result.variant === 'treatment'
  }
}