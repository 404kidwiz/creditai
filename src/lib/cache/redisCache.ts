/**
 * Redis Cache Implementation for CreditAI Platform
 * Provides high-performance caching for AI model results, user data, and API responses
 */

import Redis from 'ioredis'
import { PIIMasker } from '@/lib/security/piiMasker'

export interface CacheConfig {
  host: string
  port: number
  password?: string
  db?: number
  keyPrefix?: string
  retryDelayOnFailover?: number
  maxRetriesPerRequest?: number
  lazyConnect?: boolean
}

export interface CacheItem<T = any> {
  data: T
  timestamp: number
  ttl: number
  version: string
}

export interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  errors: number
  hitRate: number
}

export class RedisCache {
  private static instance: RedisCache
  private redis: Redis
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0
  }
  private readonly keyPrefix: string
  private readonly defaultTTL: number = 3600 // 1 hour

  private constructor(config: CacheConfig) {
    this.keyPrefix = config.keyPrefix || 'creditai:'
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      lazyConnect: config.lazyConnect || true,
      keyPrefix: this.keyPrefix
    })

    this.setupEventHandlers()
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: CacheConfig): RedisCache {
    if (!RedisCache.instance) {
      if (!config) {
        config = {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0'),
          keyPrefix: 'creditai:'
        }
      }
      RedisCache.instance = new RedisCache(config)
    }
    return RedisCache.instance
  }

  /**
   * Set up Redis event handlers
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('Redis connected successfully')
    })

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error)
      this.stats.errors++
    })

    this.redis.on('reconnecting', () => {
      console.log('Redis reconnecting...')
    })

    this.redis.on('ready', () => {
      console.log('Redis ready for operations')
    })
  }

  /**
   * Generate cache key with proper namespacing
   */
  private generateKey(key: string, namespace?: string): string {
    const parts = [namespace, key].filter(Boolean)
    return parts.join(':')
  }

  /**
   * Set cache item with TTL and PII masking
   */
  async set<T>(
    key: string,
    data: T,
    ttl: number = this.defaultTTL,
    namespace?: string
  ): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key, namespace)
      
      // Mask PII before caching
      const maskedData = PIIMasker.maskPII(JSON.stringify(data))
      
      const cacheItem: CacheItem<string> = {
        data: maskedData,
        timestamp: Date.now(),
        ttl,
        version: '1.0'
      }

      const result = await this.redis.setex(
        cacheKey,
        ttl,
        JSON.stringify(cacheItem)
      )

      this.stats.sets++
      this.updateHitRate()
      
      return result === 'OK'
    } catch (error) {
      console.error('Redis set error:', error)
      this.stats.errors++
      return false
    }
  }

  /**
   * Get cache item with automatic deserialization
   */
  async get<T>(key: string, namespace?: string): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(key, namespace)
      const cached = await this.redis.get(cacheKey)

      if (!cached) {
        this.stats.misses++
        this.updateHitRate()
        return null
      }

      const cacheItem: CacheItem<string> = JSON.parse(cached)
      
      // Check if cache item is expired (additional safety check)
      if (Date.now() - cacheItem.timestamp > cacheItem.ttl * 1000) {
        await this.delete(key, namespace)
        this.stats.misses++
        this.updateHitRate()
        return null
      }

      this.stats.hits++
      this.updateHitRate()
      
      return JSON.parse(cacheItem.data) as T
    } catch (error) {
      console.error('Redis get error:', error)
      this.stats.errors++
      this.stats.misses++
      this.updateHitRate()
      return null
    }
  }

  /**
   * Delete cache item
   */
  async delete(key: string, namespace?: string): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key, namespace)
      const result = await this.redis.del(cacheKey)
      
      this.stats.deletes++
      return result > 0
    } catch (error) {
      console.error('Redis delete error:', error)
      this.stats.errors++
      return false
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, namespace?: string): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key, namespace)
      const result = await this.redis.exists(cacheKey)
      return result === 1
    } catch (error) {
      console.error('Redis exists error:', error)
      this.stats.errors++
      return false
    }
  }

  /**
   * Set cache item with expiration time
   */
  async setWithExpiry<T>(
    key: string,
    data: T,
    expiryDate: Date,
    namespace?: string
  ): Promise<boolean> {
    const ttl = Math.max(0, Math.floor((expiryDate.getTime() - Date.now()) / 1000))
    return this.set(key, data, ttl, namespace)
  }

  /**
   * Get multiple cache items at once
   */
  async mget<T>(keys: string[], namespace?: string): Promise<(T | null)[]> {
    try {
      const cacheKeys = keys.map(key => this.generateKey(key, namespace))
      const results = await this.redis.mget(...cacheKeys)
      
      return results.map((result, index) => {
        if (!result) {
          this.stats.misses++
          return null
        }

        try {
          const cacheItem: CacheItem<string> = JSON.parse(result)
          
          // Check expiration
          if (Date.now() - cacheItem.timestamp > cacheItem.ttl * 1000) {
            this.delete(keys[index], namespace)
            this.stats.misses++
            return null
          }

          this.stats.hits++
          return JSON.parse(cacheItem.data) as T
        } catch (parseError) {
          console.error('Error parsing cached item:', parseError)
          this.stats.errors++
          this.stats.misses++
          return null
        }
      })
    } catch (error) {
      console.error('Redis mget error:', error)
      this.stats.errors++
      return keys.map(() => null)
    } finally {
      this.updateHitRate()
    }
  }

  /**
   * Set multiple cache items at once
   */
  async mset<T>(
    items: Array<{ key: string; data: T; ttl?: number }>,
    namespace?: string
  ): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline()
      
      for (const item of items) {
        const cacheKey = this.generateKey(item.key, namespace)
        const ttl = item.ttl || this.defaultTTL
        
        const maskedData = PIIMasker.maskPII(JSON.stringify(item.data))
        const cacheItem: CacheItem<string> = {
          data: maskedData,
          timestamp: Date.now(),
          ttl,
          version: '1.0'
        }

        pipeline.setex(cacheKey, ttl, JSON.stringify(cacheItem))
      }

      const results = await pipeline.exec()
      const success = results?.every(([error, result]) => !error && result === 'OK') || false
      
      if (success) {
        this.stats.sets += items.length
      } else {
        this.stats.errors++
      }
      
      return success
    } catch (error) {
      console.error('Redis mset error:', error)
      this.stats.errors++
      return false
    }
  }

  /**
   * Increment a numeric value in cache
   */
  async increment(key: string, amount: number = 1, namespace?: string): Promise<number> {
    try {
      const cacheKey = this.generateKey(key, namespace)
      return await this.redis.incrby(cacheKey, amount)
    } catch (error) {
      console.error('Redis increment error:', error)
      this.stats.errors++
      return 0
    }
  }

  /**
   * Set cache item only if it doesn't exist
   */
  async setIfNotExists<T>(
    key: string,
    data: T,
    ttl: number = this.defaultTTL,
    namespace?: string
  ): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key, namespace)
      
      const maskedData = PIIMasker.maskPII(JSON.stringify(data))
      const cacheItem: CacheItem<string> = {
        data: maskedData,
        timestamp: Date.now(),
        ttl,
        version: '1.0'
      }

      const result = await this.redis.set(
        cacheKey,
        JSON.stringify(cacheItem),
        'EX',
        ttl,
        'NX'
      )

      const success = result === 'OK'
      if (success) {
        this.stats.sets++
      }
      
      return success
    } catch (error) {
      console.error('Redis setIfNotExists error:', error)
      this.stats.errors++
      return false
    }
  }

  /**
   * Get cache item and extend its TTL
   */
  async getAndExtend<T>(
    key: string,
    extendTTL: number,
    namespace?: string
  ): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(key, namespace)
      const cached = await this.redis.get(cacheKey)

      if (!cached) {
        this.stats.misses++
        this.updateHitRate()
        return null
      }

      // Extend TTL
      await this.redis.expire(cacheKey, extendTTL)

      const cacheItem: CacheItem<string> = JSON.parse(cached)
      this.stats.hits++
      this.updateHitRate()
      
      return JSON.parse(cacheItem.data) as T
    } catch (error) {
      console.error('Redis getAndExtend error:', error)
      this.stats.errors++
      this.stats.misses++
      this.updateHitRate()
      return null
    }
  }

  /**
   * Clear all cache items in a namespace
   */
  async clearNamespace(namespace: string): Promise<number> {
    try {
      const pattern = this.generateKey('*', namespace)
      const keys = await this.redis.keys(pattern)
      
      if (keys.length === 0) {
        return 0
      }

      const result = await this.redis.del(...keys)
      this.stats.deletes += result
      
      return result
    } catch (error) {
      console.error('Redis clearNamespace error:', error)
      this.stats.errors++
      return 0
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0
  }

  /**
   * Get Redis connection info
   */
  async getConnectionInfo(): Promise<{
    status: string
    uptime: number
    connectedClients: number
    usedMemory: string
    keyspaceHits: number
    keyspaceMisses: number
  }> {
    try {
      const info = await this.redis.info()
      const lines = info.split('\r\n')
      const stats: any = {}
      
      lines.forEach(line => {
        const [key, value] = line.split(':')
        if (key && value) {
          stats[key] = value
        }
      })

      return {
        status: 'connected',
        uptime: parseInt(stats.uptime_in_seconds) || 0,
        connectedClients: parseInt(stats.connected_clients) || 0,
        usedMemory: stats.used_memory_human || '0B',
        keyspaceHits: parseInt(stats.keyspace_hits) || 0,
        keyspaceMisses: parseInt(stats.keyspace_misses) || 0
      }
    } catch (error) {
      console.error('Redis connection info error:', error)
      return {
        status: 'error',
        uptime: 0,
        connectedClients: 0,
        usedMemory: '0B',
        keyspaceHits: 0,
        keyspaceMisses: 0
      }
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping()
      return result === 'PONG'
    } catch (error) {
      console.error('Redis health check failed:', error)
      return false
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      await this.redis.quit()
      console.log('Redis connection closed gracefully')
    } catch (error) {
      console.error('Error during Redis shutdown:', error)
    }
  }
}

/**
 * Cache key generators for different data types
 */
export class CacheKeys {
  static creditReport(userId: string, reportId: string): string {
    return `credit_report:${userId}:${reportId}`
  }

  static userDashboard(userId: string): string {
    return `dashboard:${userId}`
  }

  static aiModelResult(modelType: string, inputHash: string): string {
    return `ai_result:${modelType}:${inputHash}`
  }

  static disputeAnalytics(userId: string, timeRange: string): string {
    return `dispute_analytics:${userId}:${timeRange}`
  }

  static creditScore(userId: string, bureau: string): string {
    return `credit_score:${userId}:${bureau}`
  }

  static userSession(sessionId: string): string {
    return `session:${sessionId}`
  }

  static rateLimitCounter(identifier: string, window: string): string {
    return `rate_limit:${identifier}:${window}`
  }

  static processingStatus(jobId: string): string {
    return `processing:${jobId}`
  }
}

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  VERY_SHORT: 60,        // 1 minute
  SHORT: 300,            // 5 minutes
  MEDIUM: 1800,          // 30 minutes
  LONG: 3600,            // 1 hour
  VERY_LONG: 86400,      // 24 hours
  WEEK: 604800,          // 7 days
  MONTH: 2592000         // 30 days
} as const