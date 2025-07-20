/**
 * Application Cache Layer
 * Provides multi-level caching with memory and Redis fallback
 */

import { RedisCache, CacheKeys, CacheTTL } from './redisCache'

export interface CacheStrategy {
  memory: boolean
  redis: boolean
  memoryTTL: number
  redisTTL: number
}

export interface CachedItem<T> {
  data: T
  timestamp: number
  ttl: number
}

export class ApplicationCache {
  private static instance: ApplicationCache
  private memoryCache: Map<string, CachedItem<any>> = new Map()
  private redisCache: RedisCache
  private cleanupInterval: NodeJS.Timeout

  private readonly DEFAULT_STRATEGY: CacheStrategy = {
    memory: true,
    redis: true,
    memoryTTL: CacheTTL.SHORT,
    redisTTL: CacheTTL.LONG
  }

  private constructor() {
    this.redisCache = RedisCache.getInstance()
    
    // Clean up expired memory cache items every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupMemoryCache()
    }, 300000)
  }

  static getInstance(): ApplicationCache {
    if (!ApplicationCache.instance) {
      ApplicationCache.instance = new ApplicationCache()
    }
    return ApplicationCache.instance
  }

  /**
   * Get item from cache with multi-level fallback
   */
  async get<T>(
    key: string,
    namespace?: string,
    strategy: Partial<CacheStrategy> = {}
  ): Promise<T | null> {
    const fullStrategy = { ...this.DEFAULT_STRATEGY, ...strategy }
    const cacheKey = namespace ? `${namespace}:${key}` : key

    // Try memory cache first
    if (fullStrategy.memory) {
      const memoryResult = this.getFromMemory<T>(cacheKey)
      if (memoryResult !== null) {
        return memoryResult
      }
    }

    // Try Redis cache
    if (fullStrategy.redis) {
      const redisResult = await this.redisCache.get<T>(key, namespace)
      if (redisResult !== null) {
        // Store in memory cache for faster subsequent access
        if (fullStrategy.memory) {
          this.setInMemory(cacheKey, redisResult, fullStrategy.memoryTTL)
        }
        return redisResult
      }
    }

    return null
  }

  /**
   * Set item in cache with multi-level storage
   */
  async set<T>(
    key: string,
    data: T,
    namespace?: string,
    strategy: Partial<CacheStrategy> = {}
  ): Promise<boolean> {
    const fullStrategy = { ...this.DEFAULT_STRATEGY, ...strategy }
    const cacheKey = namespace ? `${namespace}:${key}` : key
    let success = true

    // Set in memory cache
    if (fullStrategy.memory) {
      this.setInMemory(cacheKey, data, fullStrategy.memoryTTL)
    }

    // Set in Redis cache
    if (fullStrategy.redis) {
      const redisSuccess = await this.redisCache.set(
        key,
        data,
        fullStrategy.redisTTL,
        namespace
      )
      success = success && redisSuccess
    }

    return success
  }

  /**
   * Delete item from all cache levels
   */
  async delete(key: string, namespace?: string): Promise<boolean> {
    const cacheKey = namespace ? `${namespace}:${key}` : key
    
    // Delete from memory cache
    this.memoryCache.delete(cacheKey)
    
    // Delete from Redis cache
    const redisSuccess = await this.redisCache.delete(key, namespace)
    
    return redisSuccess
  }

  /**
   * Get or set pattern - get from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    namespace?: string,
    strategy: Partial<CacheStrategy> = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, namespace, strategy)
    if (cached !== null) {
      return cached
    }

    // Compute the value
    const computed = await computeFn()
    
    // Cache the computed value
    await this.set(key, computed, namespace, strategy)
    
    return computed
  }

  /**
   * Cache credit report data with optimized strategy
   */
  async cacheCreditReport(
    userId: string,
    reportId: string,
    data: any
  ): Promise<boolean> {
    const key = CacheKeys.creditReport(userId, reportId)
    return this.set(key, data, 'credit_reports', {
      memory: true,
      redis: true,
      memoryTTL: CacheTTL.MEDIUM,
      redisTTL: CacheTTL.VERY_LONG
    })
  }

  /**
   * Get cached credit report data
   */
  async getCachedCreditReport(
    userId: string,
    reportId: string
  ): Promise<any | null> {
    const key = CacheKeys.creditReport(userId, reportId)
    return this.get(key, 'credit_reports')
  }

  /**
   * Cache user dashboard data
   */
  async cacheDashboardData(userId: string, data: any): Promise<boolean> {
    const key = CacheKeys.userDashboard(userId)
    return this.set(key, data, 'dashboard', {
      memory: true,
      redis: true,
      memoryTTL: CacheTTL.SHORT,
      redisTTL: CacheTTL.MEDIUM
    })
  }

  /**
   * Get cached dashboard data
   */
  async getCachedDashboardData(userId: string): Promise<any | null> {
    const key = CacheKeys.userDashboard(userId)
    return this.get(key, 'dashboard')
  }

  /**
   * Cache AI model results
   */
  async cacheAIResult(
    modelType: string,
    inputHash: string,
    result: any
  ): Promise<boolean> {
    const key = CacheKeys.aiModelResult(modelType, inputHash)
    return this.set(key, result, 'ai_results', {
      memory: false, // AI results can be large, skip memory cache
      redis: true,
      memoryTTL: 0,
      redisTTL: CacheTTL.VERY_LONG
    })
  }

  /**
   * Get cached AI result
   */
  async getCachedAIResult(
    modelType: string,
    inputHash: string
  ): Promise<any | null> {
    const key = CacheKeys.aiModelResult(modelType, inputHash)
    return this.get(key, 'ai_results', {
      memory: false,
      redis: true,
      memoryTTL: 0,
      redisTTL: CacheTTL.VERY_LONG
    })
  }

  /**
   * Cache dispute analytics
   */
  async cacheDisputeAnalytics(
    userId: string,
    timeRange: string,
    analytics: any
  ): Promise<boolean> {
    const key = CacheKeys.disputeAnalytics(userId, timeRange)
    return this.set(key, analytics, 'analytics', {
      memory: true,
      redis: true,
      memoryTTL: CacheTTL.MEDIUM,
      redisTTL: CacheTTL.LONG
    })
  }

  /**
   * Get cached dispute analytics
   */
  async getCachedDisputeAnalytics(
    userId: string,
    timeRange: string
  ): Promise<any | null> {
    const key = CacheKeys.disputeAnalytics(userId, timeRange)
    return this.get(key, 'analytics')
  }

  /**
   * Invalidate user-related caches
   */
  async invalidateUserCaches(userId: string): Promise<void> {
    const patterns = [
      `dashboard:${userId}`,
      `credit_reports:credit_report:${userId}:*`,
      `analytics:dispute_analytics:${userId}:*`
    ]

    // Clear from memory cache
    for (const [key] of this.memoryCache) {
      if (patterns.some(pattern => this.matchesPattern(key, pattern))) {
        this.memoryCache.delete(key)
      }
    }

    // Clear from Redis cache
    await Promise.all([
      this.redisCache.clearNamespace(`dashboard:${userId}`),
      this.redisCache.clearNamespace(`credit_reports:credit_report:${userId}`),
      this.redisCache.clearNamespace(`analytics:dispute_analytics:${userId}`)
    ])
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmupCache(userId: string): Promise<void> {
    // This would typically be called after user login
    // to preload frequently accessed data
    
    try {
      // Preload dashboard data if not cached
      const dashboardKey = CacheKeys.userDashboard(userId)
      const dashboardCached = await this.get(dashboardKey, 'dashboard')
      
      if (!dashboardCached) {
        // Load dashboard data from database and cache it
        // This would integrate with your data loading functions
        console.log(`Warming up cache for user ${userId}`)
      }
    } catch (error) {
      console.error('Cache warmup error:', error)
    }
  }

  /**
   * Get from memory cache
   */
  private getFromMemory<T>(key: string): T | null {
    const item = this.memoryCache.get(key)
    if (!item) {
      return null
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl * 1000) {
      this.memoryCache.delete(key)
      return null
    }

    return item.data as T
  }

  /**
   * Set in memory cache
   */
  private setInMemory<T>(key: string, data: T, ttl: number): void {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Clean up expired memory cache items
   */
  private cleanupMemoryCache(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, item] of this.memoryCache) {
      if (now - item.timestamp > item.ttl * 1000) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.memoryCache.delete(key))
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache items`)
    }
  }

  /**
   * Check if key matches pattern (simple wildcard support)
   */
  private matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return regex.test(key)
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memory: {
      size: number
      keys: string[]
    }
    redis: any
  } {
    return {
      memory: {
        size: this.memoryCache.size,
        keys: Array.from(this.memoryCache.keys())
      },
      redis: this.redisCache.getStats()
    }
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear()
    
    // Clear Redis cache would require admin privileges
    // This is typically not implemented for security reasons
    console.log('Memory cache cleared')
  }

  /**
   * Shutdown cache system
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    this.memoryCache.clear()
    await this.redisCache.shutdown()
    
    console.log('Application cache shutdown complete')
  }
}

/**
 * Cache decorator for methods
 */
export function Cached(
  keyGenerator: (...args: any[]) => string,
  strategy: Partial<CacheStrategy> = {}
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value
    const cache = ApplicationCache.getInstance()

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator(...args)
      
      // Try to get from cache
      const cached = await cache.get(cacheKey, undefined, strategy)
      if (cached !== null) {
        return cached
      }

      // Execute original method
      const result = await method.apply(this, args)
      
      // Cache the result
      await cache.set(cacheKey, result, undefined, strategy)
      
      return result
    }

    return descriptor
  }
}

/**
 * Utility function to generate hash for cache keys
 */
export function generateCacheHash(input: any): string {
  const crypto = require('crypto')
  const hash = crypto.createHash('sha256')
  hash.update(JSON.stringify(input))
  return hash.digest('hex').substring(0, 16)
}