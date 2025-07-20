/**
 * Intelligent Rate Limiting with User-Based Quotas and Burst Handling
 * PERF-4.4: Advanced rate limiting with adaptive algorithms
 */

import { RedisCache, CacheKeys, CacheTTL } from '@/lib/cache/redisCache'
import { logger } from '@/lib/logging'

export interface RateLimitRule {
  id: string
  name: string
  pattern: string // URL pattern to match
  method?: string
  limits: Array<{
    tier: string
    window: number // milliseconds
    max: number
    burst?: number
    replenishRate?: number // tokens per second
  }>
  enabled: boolean
  priority: number
  skipConditions?: Array<{
    type: 'user' | 'ip' | 'header' | 'time'
    field: string
    operator: 'eq' | 'neq' | 'in' | 'not_in' | 'regex'
    value: any
  }>
}

export interface UserQuota {
  userId: string
  tier: string
  limits: {
    requests: {
      daily: number
      hourly: number
      minutely: number
    }
    burst: number
    concurrent: number
  }
  usage: {
    daily: number
    hourly: number
    minutely: number
    burst: number
    concurrent: number
  }
  resetTimes: {
    daily: number
    hourly: number
    minutely: number
  }
  customLimits?: Record<string, {
    limit: number
    used: number
    resetTime: number
  }>
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
  bucket?: string
  rule?: string
  tier?: string
  customHeaders?: Record<string, string>
}

export interface BurstConfig {
  enabled: boolean
  maxTokens: number
  refillRate: number // tokens per second
  refillInterval: number // milliseconds
}

export interface AdaptiveConfig {
  enabled: boolean
  learningPeriod: number // minutes
  adaptationRate: number // 0-1
  thresholds: {
    errorRate: number // Tighten limits if error rate exceeds this
    successRate: number // Loosen limits if success rate exceeds this
    avgResponseTime: number // Tighten if response time exceeds this
  }
}

export interface DistributedLockConfig {
  enabled: boolean
  lockTimeout: number // milliseconds
  maxWaitTime: number // milliseconds
}

/**
 * Advanced Rate Limiter with Intelligent Algorithms
 */
export class IntelligentRateLimiter {
  private static instance: IntelligentRateLimiter
  private cache: RedisCache
  private rules: Map<string, RateLimitRule> = new Map()
  private userQuotas: Map<string, UserQuota> = new Map()
  private burstBuckets: Map<string, TokenBucket> = new Map()
  private adaptiveMetrics: Map<string, AdaptiveMetrics> = new Map()
  private distributedLocks: Map<string, DistributedLock> = new Map()

  private readonly burstConfig: BurstConfig = {
    enabled: true,
    maxTokens: 100,
    refillRate: 10, // 10 tokens per second
    refillInterval: 100 // Check every 100ms
  }

  private readonly adaptiveConfig: AdaptiveConfig = {
    enabled: true,
    learningPeriod: 60, // 1 hour
    adaptationRate: 0.1,
    thresholds: {
      errorRate: 0.05, // 5%
      successRate: 0.95, // 95%
      avgResponseTime: 1000 // 1 second
    }
  }

  private readonly lockConfig: DistributedLockConfig = {
    enabled: true,
    lockTimeout: 5000, // 5 seconds
    maxWaitTime: 1000 // 1 second
  }

  private constructor() {
    this.cache = RedisCache.getInstance()
    this.initializeDefaultRules()
    this.startCleanupTimer()
  }

  static getInstance(): IntelligentRateLimiter {
    if (!IntelligentRateLimiter.instance) {
      IntelligentRateLimiter.instance = new IntelligentRateLimiter()
    }
    return IntelligentRateLimiter.instance
  }

  /**
   * Initialize default rate limiting rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: RateLimitRule[] = [
      {
        id: 'api-general',
        name: 'General API Rate Limit',
        pattern: '/api/**',
        limits: [
          { tier: 'free', window: 60000, max: 100, burst: 20 },
          { tier: 'premium', window: 60000, max: 1000, burst: 100 },
          { tier: 'enterprise', window: 60000, max: 10000, burst: 500 }
        ],
        enabled: true,
        priority: 100
      },
      {
        id: 'auth-strict',
        name: 'Authentication Endpoints',
        pattern: '/api/auth/**',
        limits: [
          { tier: 'free', window: 60000, max: 10, burst: 3 },
          { tier: 'premium', window: 60000, max: 50, burst: 10 },
          { tier: 'enterprise', window: 60000, max: 200, burst: 30 }
        ],
        enabled: true,
        priority: 200
      },
      {
        id: 'upload-heavy',
        name: 'File Upload Endpoints',
        pattern: '/api/upload/**',
        limits: [
          { tier: 'free', window: 300000, max: 5, burst: 2 }, // 5 per 5 min
          { tier: 'premium', window: 300000, max: 50, burst: 10 },
          { tier: 'enterprise', window: 300000, max: 200, burst: 30 }
        ],
        enabled: true,
        priority: 150
      },
      {
        id: 'analysis-compute',
        name: 'AI Analysis Endpoints',
        pattern: '/api/credit/analyze',
        limits: [
          { tier: 'free', window: 3600000, max: 10, burst: 3 }, // 10 per hour
          { tier: 'premium', window: 3600000, max: 100, burst: 20 },
          { tier: 'enterprise', window: 3600000, max: 1000, burst: 100 }
        ],
        enabled: true,
        priority: 300
      }
    ]

    defaultRules.forEach(rule => this.addRule(rule))
  }

  /**
   * Add a rate limiting rule
   */
  addRule(rule: RateLimitRule): void {
    this.rules.set(rule.id, rule)
    logger.info('Rate limiting rule added', {
      id: rule.id,
      pattern: rule.pattern,
      priority: rule.priority
    })
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(
    identifier: string,
    path: string,
    method: string = 'GET',
    tier: string = 'free',
    metadata: Record<string, any> = {}
  ): Promise<RateLimitResult> {
    // Find applicable rules
    const applicableRules = this.findApplicableRules(path, method)
    
    if (applicableRules.length === 0) {
      return {
        allowed: true,
        limit: Infinity,
        remaining: Infinity,
        resetTime: Date.now() + 60000
      }
    }

    // Sort by priority (highest first)
    applicableRules.sort((a, b) => b.priority - a.priority)

    // Check each rule
    for (const rule of applicableRules) {
      // Check skip conditions
      if (rule.skipConditions && this.shouldSkipRule(rule, metadata)) {
        continue
      }

      const result = await this.checkRuleLimit(identifier, rule, tier, path)
      
      if (!result.allowed) {
        // Apply adaptive adjustment if enabled
        if (this.adaptiveConfig.enabled) {
          await this.updateAdaptiveMetrics(rule.id, false, metadata)
        }
        
        logger.warn('Rate limit exceeded', {
          identifier,
          rule: rule.id,
          tier,
          path,
          remaining: result.remaining
        })
        
        return { ...result, rule: rule.id, tier }
      }

      // Record successful request for adaptive learning
      if (this.adaptiveConfig.enabled) {
        await this.updateAdaptiveMetrics(rule.id, true, metadata)
      }
    }

    // All rules passed - check burst limits
    const burstResult = await this.checkBurstLimit(identifier, tier)
    
    return {
      allowed: burstResult.allowed,
      limit: burstResult.limit,
      remaining: burstResult.remaining,
      resetTime: burstResult.resetTime,
      bucket: 'burst',
      tier
    }
  }

  /**
   * Find applicable rules for a path and method
   */
  private findApplicableRules(path: string, method: string): RateLimitRule[] {
    return Array.from(this.rules.values()).filter(rule => {
      if (!rule.enabled) return false
      if (rule.method && rule.method.toLowerCase() !== method.toLowerCase()) return false
      
      return this.matchesPattern(path, rule.pattern)
    })
  }

  /**
   * Check if path matches pattern (supports wildcards)
   */
  private matchesPattern(path: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*') // ** matches any path
      .replace(/\*/g, '[^/]*') // * matches any segment
      .replace(/\?/g, '.') // ? matches any character

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(path)
  }

  /**
   * Check if rule should be skipped based on conditions
   */
  private shouldSkipRule(rule: RateLimitRule, metadata: Record<string, any>): boolean {
    if (!rule.skipConditions) return false

    return rule.skipConditions.every(condition => {
      const value = metadata[condition.field]
      
      switch (condition.operator) {
        case 'eq': return value === condition.value
        case 'neq': return value !== condition.value
        case 'in': return Array.isArray(condition.value) && condition.value.includes(value)
        case 'not_in': return Array.isArray(condition.value) && !condition.value.includes(value)
        case 'regex': return new RegExp(condition.value).test(value)
        default: return false
      }
    })
  }

  /**
   * Check rate limit for a specific rule
   */
  private async checkRuleLimit(
    identifier: string,
    rule: RateLimitRule,
    tier: string,
    path: string
  ): Promise<RateLimitResult> {
    const tierLimit = rule.limits.find(l => l.tier === tier)
    if (!tierLimit) {
      return {
        allowed: false,
        limit: 0,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60
      }
    }

    const key = `rate_limit:${rule.id}:${identifier}`
    const now = Date.now()
    const windowStart = now - tierLimit.window

    // Use distributed lock for critical sections
    const lockKey = `lock:${key}`
    const lock = await this.acquireDistributedLock(lockKey)

    try {
      // Get current usage from cache
      const usage = await this.cache.get<{
        count: number
        window: number
        firstRequest: number
      }>(key) || {
        count: 0,
        window: tierLimit.window,
        firstRequest: now
      }

      // Check if window has expired
      if (now - usage.firstRequest > tierLimit.window) {
        usage.count = 0
        usage.firstRequest = now
      }

      // Apply adaptive limits if enabled
      let effectiveLimit = tierLimit.max
      if (this.adaptiveConfig.enabled) {
        effectiveLimit = await this.getAdaptiveLimit(rule.id, tierLimit.max)
      }

      // Check limit
      if (usage.count >= effectiveLimit) {
        const resetTime = usage.firstRequest + tierLimit.window
        const retryAfter = Math.ceil((resetTime - now) / 1000)
        
        return {
          allowed: false,
          limit: effectiveLimit,
          remaining: 0,
          resetTime,
          retryAfter
        }
      }

      // Update usage
      usage.count++
      await this.cache.set(key, usage, Math.ceil(tierLimit.window / 1000))

      return {
        allowed: true,
        limit: effectiveLimit,
        remaining: effectiveLimit - usage.count,
        resetTime: usage.firstRequest + tierLimit.window
      }
    } finally {
      await this.releaseDistributedLock(lock)
    }
  }

  /**
   * Check burst limit using token bucket algorithm
   */
  private async checkBurstLimit(
    identifier: string,
    tier: string
  ): Promise<RateLimitResult> {
    if (!this.burstConfig.enabled) {
      return {
        allowed: true,
        limit: Infinity,
        remaining: Infinity,
        resetTime: Date.now() + 60000
      }
    }

    const bucketKey = `burst:${identifier}:${tier}`
    let bucket = this.burstBuckets.get(bucketKey)

    if (!bucket) {
      bucket = new TokenBucket(
        this.burstConfig.maxTokens,
        this.burstConfig.refillRate,
        this.burstConfig.refillInterval
      )
      this.burstBuckets.set(bucketKey, bucket)
    }

    const allowed = bucket.consume(1)
    
    return {
      allowed,
      limit: this.burstConfig.maxTokens,
      remaining: bucket.getTokens(),
      resetTime: Date.now() + bucket.getTimeToRefill()
    }
  }

  /**
   * Update adaptive metrics for machine learning
   */
  private async updateAdaptiveMetrics(
    ruleId: string,
    success: boolean,
    metadata: Record<string, any>
  ): Promise<void> {
    const key = `adaptive:${ruleId}`
    let metrics = this.adaptiveMetrics.get(key)

    if (!metrics) {
      metrics = new AdaptiveMetrics(this.adaptiveConfig.learningPeriod)
      this.adaptiveMetrics.set(key, metrics)
    }

    metrics.addSample({
      success,
      responseTime: metadata.responseTime || 0,
      errorRate: metadata.errorRate || 0,
      timestamp: Date.now()
    })

    // Persist metrics to cache for distributed learning
    await this.cache.set(
      `metrics:${ruleId}`,
      metrics.getState(),
      CacheTTL.LONG
    )
  }

  /**
   * Get adaptive limit based on learned patterns
   */
  private async getAdaptiveLimit(ruleId: string, baseLimit: number): Promise<number> {
    const key = `adaptive:${ruleId}`
    const metrics = this.adaptiveMetrics.get(key)

    if (!metrics || !metrics.hasEnoughData()) {
      return baseLimit
    }

    const analysis = metrics.analyze()
    let adjustment = 1.0

    // Adjust based on error rate
    if (analysis.errorRate > this.adaptiveConfig.thresholds.errorRate) {
      adjustment *= (1 - this.adaptiveConfig.adaptationRate)
    } else if (analysis.errorRate < this.adaptiveConfig.thresholds.errorRate / 2) {
      adjustment *= (1 + this.adaptiveConfig.adaptationRate)
    }

    // Adjust based on response time
    if (analysis.avgResponseTime > this.adaptiveConfig.thresholds.avgResponseTime) {
      adjustment *= (1 - this.adaptiveConfig.adaptationRate)
    }

    // Adjust based on success rate
    if (analysis.successRate > this.adaptiveConfig.thresholds.successRate) {
      adjustment *= (1 + this.adaptiveConfig.adaptationRate / 2)
    }

    const adaptiveLimit = Math.max(1, Math.floor(baseLimit * adjustment))
    
    logger.debug('Adaptive limit calculated', {
      ruleId,
      baseLimit,
      adjustment,
      adaptiveLimit,
      analysis
    })

    return adaptiveLimit
  }

  /**
   * Acquire distributed lock for critical sections
   */
  private async acquireDistributedLock(key: string): Promise<DistributedLock> {
    if (!this.lockConfig.enabled) {
      return new DistributedLock(key, '', 0) // Dummy lock
    }

    const lockId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const lock = new DistributedLock(key, lockId, this.lockConfig.lockTimeout)

    const startTime = Date.now()
    
    while (Date.now() - startTime < this.lockConfig.maxWaitTime) {
      const acquired = await this.cache.setIfNotExists(
        `lock:${key}`,
        lockId,
        Math.ceil(this.lockConfig.lockTimeout / 1000)
      )

      if (acquired) {
        this.distributedLocks.set(key, lock)
        return lock
      }

      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    // Return dummy lock if acquisition failed
    return new DistributedLock(key, '', 0)
  }

  /**
   * Release distributed lock
   */
  private async releaseDistributedLock(lock: DistributedLock): Promise<void> {
    if (!this.lockConfig.enabled || !lock.lockId) return

    try {
      // Only delete if we still own the lock
      const currentLock = await this.cache.get(`lock:${lock.key}`)
      if (currentLock === lock.lockId) {
        await this.cache.delete(`lock:${lock.key}`)
      }
      
      this.distributedLocks.delete(lock.key)
    } catch (error) {
      logger.warn('Failed to release distributed lock', error)
    }
  }

  /**
   * Set user quota
   */
  setUserQuota(userId: string, quota: Omit<UserQuota, 'usage' | 'resetTimes'>): void {
    const now = Date.now()
    const userQuota: UserQuota = {
      ...quota,
      usage: {
        daily: 0,
        hourly: 0,
        minutely: 0,
        burst: 0,
        concurrent: 0
      },
      resetTimes: {
        daily: now + 24 * 60 * 60 * 1000,
        hourly: now + 60 * 60 * 1000,
        minutely: now + 60 * 1000
      }
    }

    this.userQuotas.set(userId, userQuota)
    
    // Persist to cache
    this.cache.set(CacheKeys.userSession(userId), userQuota, CacheTTL.VERY_LONG)
  }

  /**
   * Get user quota
   */
  async getUserQuota(userId: string): Promise<UserQuota | null> {
    // Try memory first
    let quota = this.userQuotas.get(userId)
    
    if (!quota) {
      // Try cache
      quota = await this.cache.get<UserQuota>(CacheKeys.userSession(userId))
      if (quota) {
        this.userQuotas.set(userId, quota)
      }
    }

    return quota
  }

  /**
   * Get rate limiting statistics
   */
  getStatistics(): {
    totalRules: number
    activeRules: number
    totalQuotas: number
    adaptiveRules: number
    burstBuckets: number
  } {
    return {
      totalRules: this.rules.size,
      activeRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      totalQuotas: this.userQuotas.size,
      adaptiveRules: this.adaptiveMetrics.size,
      burstBuckets: this.burstBuckets.size
    }
  }

  /**
   * Start cleanup timer for expired data
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Cleanup expired data
   */
  private cleanup(): void {
    const now = Date.now()

    // Cleanup expired user quotas
    this.userQuotas.forEach((quota, userId) => {
      if (quota.resetTimes.daily < now) {
        this.userQuotas.delete(userId)
      }
    })

    // Cleanup old burst buckets
    this.burstBuckets.forEach((bucket, key) => {
      if (bucket.isExpired()) {
        this.burstBuckets.delete(key)
      }
    })

    // Cleanup expired locks
    this.distributedLocks.forEach((lock, key) => {
      if (lock.isExpired()) {
        this.distributedLocks.delete(key)
      }
    })

    logger.debug('Rate limiter cleanup completed')
  }
}

/**
 * Token Bucket implementation for burst handling
 */
class TokenBucket {
  private tokens: number
  private lastRefill: number

  constructor(
    private maxTokens: number,
    private refillRate: number, // tokens per second
    private refillInterval: number // milliseconds
  ) {
    this.tokens = maxTokens
    this.lastRefill = Date.now()
  }

  consume(tokens: number): boolean {
    this.refill()
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens
      return true
    }
    
    return false
  }

  getTokens(): number {
    this.refill()
    return this.tokens
  }

  getTimeToRefill(): number {
    const tokensNeeded = this.maxTokens - this.tokens
    return Math.ceil(tokensNeeded / this.refillRate * 1000)
  }

  isExpired(): boolean {
    return Date.now() - this.lastRefill > 24 * 60 * 60 * 1000 // 24 hours
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    
    if (elapsed >= this.refillInterval) {
      const tokensToAdd = Math.floor(elapsed / 1000 * this.refillRate)
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
      this.lastRefill = now
    }
  }
}

/**
 * Adaptive Metrics for machine learning
 */
class AdaptiveMetrics {
  private samples: Array<{
    success: boolean
    responseTime: number
    errorRate: number
    timestamp: number
  }> = []

  constructor(private retentionPeriod: number) {}

  addSample(sample: {
    success: boolean
    responseTime: number
    errorRate: number
    timestamp: number
  }): void {
    this.samples.push(sample)
    this.cleanup()
  }

  hasEnoughData(): boolean {
    return this.samples.length >= 10
  }

  analyze(): {
    successRate: number
    errorRate: number
    avgResponseTime: number
    trend: 'improving' | 'degrading' | 'stable'
  } {
    if (this.samples.length === 0) {
      return {
        successRate: 1,
        errorRate: 0,
        avgResponseTime: 0,
        trend: 'stable'
      }
    }

    const successful = this.samples.filter(s => s.success).length
    const successRate = successful / this.samples.length
    const errorRate = this.samples.reduce((sum, s) => sum + s.errorRate, 0) / this.samples.length
    const avgResponseTime = this.samples.reduce((sum, s) => sum + s.responseTime, 0) / this.samples.length

    // Calculate trend (simplified)
    const recent = this.samples.slice(-5)
    const older = this.samples.slice(-10, -5)
    
    let trend: 'improving' | 'degrading' | 'stable' = 'stable'
    
    if (recent.length >= 5 && older.length >= 5) {
      const recentSuccess = recent.filter(s => s.success).length / recent.length
      const olderSuccess = older.filter(s => s.success).length / older.length
      
      if (recentSuccess > olderSuccess + 0.1) {
        trend = 'improving'
      } else if (recentSuccess < olderSuccess - 0.1) {
        trend = 'degrading'
      }
    }

    return { successRate, errorRate, avgResponseTime, trend }
  }

  getState(): any {
    return {
      samples: this.samples,
      retentionPeriod: this.retentionPeriod
    }
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.retentionPeriod * 60 * 1000
    this.samples = this.samples.filter(s => s.timestamp > cutoff)
  }
}

/**
 * Distributed Lock implementation
 */
class DistributedLock {
  constructor(
    public key: string,
    public lockId: string,
    private timeout: number
  ) {}

  isExpired(): boolean {
    return Date.now() > this.timeout
  }
}

/**
 * Global rate limiter instance
 */
export const rateLimiter = IntelligentRateLimiter.getInstance()

/**
 * Express.js middleware for rate limiting
 */
export function createRateLimitMiddleware(options: {
  keyGenerator?: (req: any) => string
  tierGenerator?: (req: any) => string
  onLimitReached?: (req: any, res: any, result: RateLimitResult) => void
} = {}) {
  return async (req: any, res: any, next: any) => {
    const identifier = options.keyGenerator?.(req) || req.ip || 'anonymous'
    const tier = options.tierGenerator?.(req) || req.user?.subscription?.tier || 'free'
    
    const result = await rateLimiter.checkRateLimit(
      identifier,
      req.path,
      req.method,
      tier,
      {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        user: req.user
      }
    )

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    })

    if (result.customHeaders) {
      res.set(result.customHeaders)
    }

    if (!result.allowed) {
      if (result.retryAfter) {
        res.set('Retry-After', result.retryAfter.toString())
      }

      if (options.onLimitReached) {
        options.onLimitReached(req, res, result)
        return
      }

      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: result.retryAfter,
        limit: result.limit,
        remaining: result.remaining
      })
    }

    next()
  }
}

/**
 * Utility functions
 */
export function createUserQuota(
  userId: string,
  tier: 'free' | 'premium' | 'enterprise'
): UserQuota {
  const quotaLimits = {
    free: {
      daily: 100,
      hourly: 20,
      minutely: 5,
      burst: 10,
      concurrent: 2
    },
    premium: {
      daily: 10000,
      hourly: 1000,
      minutely: 100,
      burst: 50,
      concurrent: 10
    },
    enterprise: {
      daily: 100000,
      hourly: 10000,
      minutely: 1000,
      burst: 200,
      concurrent: 50
    }
  }

  const limits = quotaLimits[tier]
  const now = Date.now()

  return {
    userId,
    tier,
    limits,
    usage: {
      daily: 0,
      hourly: 0,
      minutely: 0,
      burst: 0,
      concurrent: 0
    },
    resetTimes: {
      daily: now + 24 * 60 * 60 * 1000,
      hourly: now + 60 * 60 * 1000,
      minutely: now + 60 * 1000
    }
  }
}

export async function resetUserQuota(userId: string): Promise<void> {
  await rateLimiter.setUserQuota(userId, createUserQuota(userId, 'free'))
}