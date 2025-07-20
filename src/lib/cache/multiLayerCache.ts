/**
 * Multi-Layer Caching System with Intelligent Cache Invalidation
 * PERF-4.3: Advanced caching strategies with Redis, memory, and browser layers
 */

import { RedisCache, CacheKeys, CacheTTL } from './redisCache'
import { logger } from '@/lib/logging'

export interface CacheLayer {
  name: string
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<boolean>
  delete(key: string): Promise<boolean>
  clear(): Promise<void>
  size(): Promise<number>
}

export interface CacheConfig {
  layers: Array<{
    name: string
    priority: number
    ttl: number
    maxSize?: number
    strategy: 'lru' | 'lfu' | 'fifo'
  }>
  invalidationStrategy: 'time-based' | 'dependency-based' | 'event-based'
  warmupStrategy: 'eager' | 'lazy' | 'predictive'
  compressionThreshold: number // Bytes
  encryptSensitiveData: boolean
}

export interface CacheEntry<T = any> {
  data: T
  metadata: {
    timestamp: number
    ttl: number
    accessCount: number
    lastAccess: number
    tags: string[]
    dependencies: string[]
    compressed: boolean
    encrypted: boolean
    layer: string
    size: number
  }
}

export interface CacheStatistics {
  totalHits: number
  totalMisses: number
  hitRate: number
  layerStats: Array<{
    layer: string
    hits: number
    misses: number
    hitRate: number
    size: number
    evictions: number
  }>
  averageResponseTime: number
  cacheEfficiency: number
}

/**
 * Memory Cache Layer for fastest access
 */
class MemoryCache implements CacheLayer {
  name = 'memory'
  private cache = new Map<string, CacheEntry>()
  private accessOrder = new Map<string, number>()
  private accessCount = new Map<string, number>()
  private currentSize = 0
  private stats = { hits: 0, misses: 0, evictions: 0 }

  constructor(
    private maxSize: number = 100 * 1024 * 1024, // 100MB
    private strategy: 'lru' | 'lfu' | 'fifo' = 'lru'
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check TTL
    if (Date.now() - entry.metadata.timestamp > entry.metadata.ttl * 1000) {
      await this.delete(key)
      this.stats.misses++
      return null
    }

    // Update access tracking
    this.updateAccess(key)
    this.stats.hits++
    
    return entry.data as T
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<boolean> {
    try {
      const data = JSON.stringify(value)
      const size = Buffer.byteLength(data, 'utf8')
      
      // Check if we need to evict
      if (this.currentSize + size > this.maxSize) {
        await this.evictItems(size)
      }

      const entry: CacheEntry<T> = {
        data: value,
        metadata: {
          timestamp: Date.now(),
          ttl,
          accessCount: 0,
          lastAccess: Date.now(),
          tags: [],
          dependencies: [],
          compressed: false,
          encrypted: false,
          layer: this.name,
          size
        }
      }

      this.cache.set(key, entry)
      this.currentSize += size
      this.updateAccess(key)
      
      return true
    } catch (error) {
      logger.error('Memory cache set error', error)
      return false
    }
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key)
    if (entry) {
      this.cache.delete(key)
      this.accessOrder.delete(key)
      this.accessCount.delete(key)
      this.currentSize -= entry.metadata.size
      return true
    }
    return false
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.accessOrder.clear()
    this.accessCount.clear()
    this.currentSize = 0
  }

  async size(): Promise<number> {
    return this.cache.size
  }

  private updateAccess(key: string): void {
    const now = Date.now()
    this.accessOrder.set(key, now)
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1)
    
    const entry = this.cache.get(key)
    if (entry) {
      entry.metadata.lastAccess = now
      entry.metadata.accessCount++
    }
  }

  private async evictItems(neededSize: number): Promise<void> {
    const itemsToEvict = this.selectItemsForEviction(neededSize)
    
    for (const key of itemsToEvict) {
      await this.delete(key)
      this.stats.evictions++
    }
  }

  private selectItemsForEviction(neededSize: number): string[] {
    const items = Array.from(this.cache.entries())
    let freedSize = 0
    const toEvict: string[] = []

    switch (this.strategy) {
      case 'lru': // Least Recently Used
        items.sort((a, b) => a[1].metadata.lastAccess - b[1].metadata.lastAccess)
        break
      case 'lfu': // Least Frequently Used
        items.sort((a, b) => a[1].metadata.accessCount - b[1].metadata.accessCount)
        break
      case 'fifo': // First In, First Out
        items.sort((a, b) => a[1].metadata.timestamp - b[1].metadata.timestamp)
        break
    }

    for (const [key, entry] of items) {
      toEvict.push(key)
      freedSize += entry.metadata.size
      
      if (freedSize >= neededSize) {
        break
      }
    }

    return toEvict
  }

  getStats() {
    return {
      layer: this.name,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
        : 0,
      size: this.currentSize,
      evictions: this.stats.evictions
    }
  }
}

/**
 * Browser Storage Cache Layer
 */
class BrowserStorageCache implements CacheLayer {
  name = 'browser'
  private storage: Storage
  private stats = { hits: 0, misses: 0 }

  constructor(useSessionStorage: boolean = false) {
    this.storage = typeof window !== 'undefined' 
      ? (useSessionStorage ? sessionStorage : localStorage)
      : {} as Storage
  }

  async get<T>(key: string): Promise<T | null> {
    if (typeof window === 'undefined') {
      this.stats.misses++
      return null
    }

    try {
      const cached = this.storage.getItem(`cache:${key}`)
      if (!cached) {
        this.stats.misses++
        return null
      }

      const entry: CacheEntry<T> = JSON.parse(cached)
      
      // Check TTL
      if (Date.now() - entry.metadata.timestamp > entry.metadata.ttl * 1000) {
        await this.delete(key)
        this.stats.misses++
        return null
      }

      this.stats.hits++
      return entry.data
    } catch (error) {
      this.stats.misses++
      return null
    }
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<boolean> {
    if (typeof window === 'undefined') return false

    try {
      const entry: CacheEntry<T> = {
        data: value,
        metadata: {
          timestamp: Date.now(),
          ttl,
          accessCount: 0,
          lastAccess: Date.now(),
          tags: [],
          dependencies: [],
          compressed: false,
          encrypted: false,
          layer: this.name,
          size: JSON.stringify(value).length
        }
      }

      this.storage.setItem(`cache:${key}`, JSON.stringify(entry))
      return true
    } catch (error) {
      // Storage quota exceeded or other error
      logger.warn('Browser storage cache set failed', error)
      return false
    }
  }

  async delete(key: string): Promise<boolean> {
    if (typeof window === 'undefined') return false

    try {
      this.storage.removeItem(`cache:${key}`)
      return true
    } catch (error) {
      return false
    }
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') return

    const keys = Object.keys(this.storage).filter(key => key.startsWith('cache:'))
    keys.forEach(key => this.storage.removeItem(key))
  }

  async size(): Promise<number> {
    if (typeof window === 'undefined') return 0
    
    return Object.keys(this.storage).filter(key => key.startsWith('cache:')).length
  }

  getStats() {
    return {
      layer: this.name,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
        : 0,
      size: 0, // Browser storage size tracking would be more complex
      evictions: 0
    }
  }
}

/**
 * Redis Cache Layer for distributed caching
 */
class RedisCacheLayer implements CacheLayer {
  name = 'redis'
  private redisCache: RedisCache
  private stats = { hits: 0, misses: 0 }

  constructor() {
    this.redisCache = RedisCache.getInstance()
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.redisCache.get<T>(key)
      
      if (result) {
        this.stats.hits++
      } else {
        this.stats.misses++
      }
      
      return result
    } catch (error) {
      this.stats.misses++
      logger.error('Redis cache get error', error)
      return null
    }
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<boolean> {
    try {
      return await this.redisCache.set(key, value, ttl)
    } catch (error) {
      logger.error('Redis cache set error', error)
      return false
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      return await this.redisCache.delete(key)
    } catch (error) {
      logger.error('Redis cache delete error', error)
      return false
    }
  }

  async clear(): Promise<void> {
    // Implementation would depend on Redis setup
    logger.warn('Redis cache clear not implemented')
  }

  async size(): Promise<number> {
    // Would require Redis INFO command
    return 0
  }

  getStats() {
    return {
      layer: this.name,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
        : 0,
      size: 0,
      evictions: 0
    }
  }
}

/**
 * Multi-Layer Cache Manager
 */
export class MultiLayerCacheManager {
  private static instance: MultiLayerCacheManager
  private layers: CacheLayer[] = []
  private config: CacheConfig
  private dependencyGraph = new Map<string, Set<string>>()
  private tagIndex = new Map<string, Set<string>>()
  private warmupQueue: Array<{ key: string; generator: () => Promise<any> }> = []

  private constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      layers: [
        { name: 'memory', priority: 1, ttl: 300, maxSize: 50 * 1024 * 1024, strategy: 'lru' },
        { name: 'browser', priority: 2, ttl: 1800, strategy: 'lru' },
        { name: 'redis', priority: 3, ttl: 3600, strategy: 'lru' }
      ],
      invalidationStrategy: 'dependency-based',
      warmupStrategy: 'predictive',
      compressionThreshold: 1024, // 1KB
      encryptSensitiveData: true,
      ...config
    }

    this.initializeLayers()
  }

  static getInstance(config?: Partial<CacheConfig>): MultiLayerCacheManager {
    if (!MultiLayerCacheManager.instance) {
      MultiLayerCacheManager.instance = new MultiLayerCacheManager(config)
    }
    return MultiLayerCacheManager.instance
  }

  private initializeLayers(): void {
    // Sort layers by priority
    const sortedLayers = this.config.layers.sort((a, b) => a.priority - b.priority)
    
    for (const layerConfig of sortedLayers) {
      switch (layerConfig.name) {
        case 'memory':
          this.layers.push(new MemoryCache(layerConfig.maxSize, layerConfig.strategy))
          break
        case 'browser':
          this.layers.push(new BrowserStorageCache())
          break
        case 'redis':
          this.layers.push(new RedisCacheLayer())
          break
      }
    }
  }

  /**
   * Get value from cache with multi-layer fallback
   */
  async get<T>(
    key: string,
    options: {
      tags?: string[]
      dependencies?: string[]
      skipLayers?: string[]
    } = {}
  ): Promise<T | null> {
    const startTime = Date.now()
    
    for (const layer of this.layers) {
      if (options.skipLayers?.includes(layer.name)) {
        continue
      }

      try {
        const value = await layer.get<T>(key)
        
        if (value !== null) {
          // Populate higher priority layers (cache warming)
          this.populateHigherLayers(key, value, layer.name)
          
          logger.debug('Cache hit', {
            key,
            layer: layer.name,
            responseTime: Date.now() - startTime
          })
          
          return value
        }
      } catch (error) {
        logger.warn(`Cache layer ${layer.name} get failed`, error)
        continue
      }
    }

    logger.debug('Cache miss', {
      key,
      totalResponseTime: Date.now() - startTime
    })
    
    return null
  }

  /**
   * Set value in all appropriate cache layers
   */
  async set<T>(
    key: string,
    value: T,
    options: {
      ttl?: number
      tags?: string[]
      dependencies?: string[]
      layers?: string[]
    } = {}
  ): Promise<boolean> {
    const { ttl, tags = [], dependencies = [], layers } = options
    let success = false

    // Update dependency graph
    if (dependencies.length > 0) {
      this.dependencyGraph.set(key, new Set(dependencies))
    }

    // Update tag index
    if (tags.length > 0) {
      tags.forEach(tag => {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set())
        }
        this.tagIndex.get(tag)!.add(key)
      })
    }

    // Set in specified layers or all layers
    const targetLayers = layers 
      ? this.layers.filter(layer => layers.includes(layer.name))
      : this.layers

    for (const layer of targetLayers) {
      try {
        const layerConfig = this.config.layers.find(l => l.name === layer.name)
        const layerTTL = ttl || layerConfig?.ttl || 3600
        
        const result = await layer.set(key, value, layerTTL)
        if (result) {
          success = true
        }
      } catch (error) {
        logger.warn(`Cache layer ${layer.name} set failed`, error)
      }
    }

    if (success) {
      logger.debug('Cache set', { key, layers: targetLayers.map(l => l.name) })
    }

    return success
  }

  /**
   * Delete from all cache layers
   */
  async delete(key: string): Promise<boolean> {
    let success = false

    for (const layer of this.layers) {
      try {
        const result = await layer.delete(key)
        if (result) {
          success = true
        }
      } catch (error) {
        logger.warn(`Cache layer ${layer.name} delete failed`, error)
      }
    }

    // Clean up indexes
    this.dependencyGraph.delete(key)
    this.tagIndex.forEach((keys, tag) => {
      keys.delete(key)
      if (keys.size === 0) {
        this.tagIndex.delete(tag)
      }
    })

    return success
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    const keysToInvalidate = new Set<string>()

    tags.forEach(tag => {
      const keys = this.tagIndex.get(tag)
      if (keys) {
        keys.forEach(key => keysToInvalidate.add(key))
      }
    })

    for (const key of keysToInvalidate) {
      await this.delete(key)
    }

    logger.info('Cache invalidated by tags', { 
      tags, 
      keysInvalidated: keysToInvalidate.size 
    })
  }

  /**
   * Invalidate cache by dependencies
   */
  async invalidateByDependencies(changedKey: string): Promise<void> {
    const keysToInvalidate = new Set<string>()

    // Find all keys that depend on the changed key
    this.dependencyGraph.forEach((dependencies, key) => {
      if (dependencies.has(changedKey)) {
        keysToInvalidate.add(key)
      }
    })

    for (const key of keysToInvalidate) {
      await this.delete(key)
      // Recursively invalidate dependencies
      await this.invalidateByDependencies(key)
    }

    if (keysToInvalidate.size > 0) {
      logger.info('Cache invalidated by dependencies', {
        changedKey,
        keysInvalidated: keysToInvalidate.size
      })
    }
  }

  /**
   * Populate higher priority layers with cached value
   */
  private async populateHigherLayers<T>(
    key: string,
    value: T,
    currentLayerName: string
  ): Promise<void> {
    const currentLayerIndex = this.layers.findIndex(l => l.name === currentLayerName)
    
    // Populate all higher priority layers (lower index)
    for (let i = 0; i < currentLayerIndex; i++) {
      try {
        const layer = this.layers[i]
        const layerConfig = this.config.layers.find(l => l.name === layer.name)
        await layer.set(key, value, layerConfig?.ttl || 3600)
      } catch (error) {
        logger.warn(`Failed to populate layer ${this.layers[i].name}`, error)
      }
    }
  }

  /**
   * Get cache statistics across all layers
   */
  async getStatistics(): Promise<CacheStatistics> {
    const layerStats = []
    let totalHits = 0
    let totalMisses = 0

    for (const layer of this.layers) {
      const stats = (layer as any).getStats?.() || {
        layer: layer.name,
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: await layer.size(),
        evictions: 0
      }
      
      layerStats.push(stats)
      totalHits += stats.hits
      totalMisses += stats.misses
    }

    const hitRate = totalHits + totalMisses > 0 
      ? (totalHits / (totalHits + totalMisses)) * 100 
      : 0

    return {
      totalHits,
      totalMisses,
      hitRate,
      layerStats,
      averageResponseTime: 0, // Would need to track this
      cacheEfficiency: hitRate // Simplified efficiency metric
    }
  }

  /**
   * Warm up cache with predictive data
   */
  async warmupCache(
    predictions: Array<{
      key: string
      generator: () => Promise<any>
      priority: number
      tags?: string[]
      dependencies?: string[]
    }>
  ): Promise<void> {
    // Sort by priority
    const sortedPredictions = predictions.sort((a, b) => b.priority - a.priority)

    for (const prediction of sortedPredictions) {
      try {
        // Check if already cached
        const existing = await this.get(prediction.key)
        if (existing === null) {
          const value = await prediction.generator()
          await this.set(prediction.key, value, {
            tags: prediction.tags,
            dependencies: prediction.dependencies
          })
        }
      } catch (error) {
        logger.warn('Cache warmup failed', { key: prediction.key, error })
      }
    }

    logger.info('Cache warmup completed', { 
      predictions: predictions.length 
    })
  }

  /**
   * Clear all cache layers
   */
  async clear(): Promise<void> {
    for (const layer of this.layers) {
      try {
        await layer.clear()
      } catch (error) {
        logger.warn(`Failed to clear layer ${layer.name}`, error)
      }
    }

    this.dependencyGraph.clear()
    this.tagIndex.clear()
    
    logger.info('All cache layers cleared')
  }

  /**
   * Get or set with fallback to generator function
   */
  async getOrSet<T>(
    key: string,
    generator: () => Promise<T>,
    options: {
      ttl?: number
      tags?: string[]
      dependencies?: string[]
    } = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Generate new value
    const value = await generator()
    
    // Store in cache
    await this.set(key, value, options)
    
    return value
  }
}

/**
 * Global multi-layer cache instance
 */
export const multiLayerCache = MultiLayerCacheManager.getInstance({
  layers: [
    { name: 'memory', priority: 1, ttl: 300, maxSize: 50 * 1024 * 1024, strategy: 'lru' },
    { name: 'browser', priority: 2, ttl: 1800, strategy: 'lru' },
    { name: 'redis', priority: 3, ttl: 3600, strategy: 'lru' }
  ],
  invalidationStrategy: 'dependency-based',
  warmupStrategy: 'predictive',
  compressionThreshold: 1024,
  encryptSensitiveData: true
})

/**
 * Cache decorators for functions
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  ttl: number = 3600,
  options: {
    keyGenerator?: (...args: Parameters<T>) => string
    tags?: string[]
    dependencies?: string[]
  } = {}
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: Parameters<T>) {
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(...args)
        : `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`

      return multiLayerCache.getOrSet(
        cacheKey,
        () => originalMethod.apply(this, args),
        { ttl, tags: options.tags, dependencies: options.dependencies }
      )
    }

    return descriptor
  }
}

/**
 * Hook for React components to use multi-layer cache
 */
export function useMultiLayerCache<T>(
  key: string,
  generator: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        
        const result = await multiLayerCache.getOrSet(key, generator)
        
        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [key, ...dependencies])

  return { data, loading, error }
}

// Import React for hooks
import React from 'react'