/**
 * Advanced API Performance Optimization
 * PERF-4.4: Response compression, request batching, and intelligent rate limiting
 */

import { logger } from '@/lib/logging'
import { multiLayerCache } from '@/lib/cache/multiLayerCache'
import { RedisCache, CacheKeys, CacheTTL } from '@/lib/cache/redisCache'
import zlib from 'zlib'
import { promisify } from 'util'

const gzip = promisify(zlib.gzip)
const brotli = promisify(zlib.brotliCompress)

export interface CompressionConfig {
  enabled: boolean
  threshold: number // Minimum size in bytes to compress
  algorithms: Array<'gzip' | 'brotli' | 'deflate'>
  level: number // Compression level (1-9)
  chunkSize: number
  excludeTypes: string[]
}

export interface BatchingConfig {
  enabled: boolean
  maxBatchSize: number
  batchTimeout: number // milliseconds
  endpoints: string[]
  concurrencyLimit: number
  retryPolicy: {
    maxRetries: number
    baseDelay: number
    maxDelay: number
    backoffMultiplier: number
  }
}

export interface RateLimitConfig {
  enabled: boolean
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests: boolean
  skipFailedRequests: boolean
  keyGenerator: (req: any) => string
  tiers: Array<{
    name: string
    maxRequests: number
    windowMs: number
    burstLimit?: number
  }>
  quotas: Map<string, {
    requests: number
    remaining: number
    resetTime: number
  }>
}

export interface RequestMetrics {
  endpoint: string
  method: string
  responseTime: number
  responseSize: number
  compressionRatio?: number
  cacheHit: boolean
  rateLimited: boolean
  batchSize?: number
  userId?: string
  timestamp: Date
}

export interface BatchRequest {
  id: string
  endpoint: string
  method: string
  body?: any
  headers?: Record<string, string>
  priority: number
  timeout: number
  retry: number
  timestamp: number
}

export interface BatchResponse {
  id: string
  status: number
  data?: any
  error?: string
  responseTime: number
  fromCache: boolean
}

/**
 * API Performance Optimizer
 */
export class APIPerformanceOptimizer {
  private static instance: APIPerformanceOptimizer
  private cache: RedisCache
  private compressionConfig: CompressionConfig
  private batchingConfig: BatchingConfig
  private rateLimitConfig: RateLimitConfig
  private metrics: RequestMetrics[] = []
  private batchQueue = new Map<string, BatchRequest[]>()
  private batchTimers = new Map<string, NodeJS.Timeout>()
  private activeRequests = new Map<string, Promise<any>>()

  private constructor() {
    this.cache = RedisCache.getInstance()
    
    this.compressionConfig = {
      enabled: true,
      threshold: 1024, // 1KB
      algorithms: ['brotli', 'gzip'],
      level: 6,
      chunkSize: 16384, // 16KB
      excludeTypes: ['image/', 'video/', 'audio/', 'application/octet-stream']
    }

    this.batchingConfig = {
      enabled: true,
      maxBatchSize: 10,
      batchTimeout: 100, // 100ms
      endpoints: ['/api/credit/analyze', '/api/documents/process'],
      concurrencyLimit: 5,
      retryPolicy: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
      }
    }

    this.rateLimitConfig = {
      enabled: true,
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req: any) => req.ip || 'anonymous',
      tiers: [
        { name: 'free', maxRequests: 10, windowMs: 60 * 1000 },
        { name: 'premium', maxRequests: 100, windowMs: 60 * 1000, burstLimit: 20 },
        { name: 'enterprise', maxRequests: 1000, windowMs: 60 * 1000, burstLimit: 100 }
      ],
      quotas: new Map()
    }
  }

  static getInstance(): APIPerformanceOptimizer {
    if (!APIPerformanceOptimizer.instance) {
      APIPerformanceOptimizer.instance = new APIPerformanceOptimizer()
    }
    return APIPerformanceOptimizer.instance
  }

  /**
   * Compress response data based on Accept-Encoding header
   */
  async compressResponse(
    data: string | Buffer,
    acceptEncoding: string = '',
    contentType: string = 'application/json'
  ): Promise<{
    data: Buffer
    encoding: string
    originalSize: number
    compressedSize: number
    ratio: number
  }> {
    const originalData = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')
    const originalSize = originalData.length

    // Check if compression should be applied
    if (!this.compressionConfig.enabled || 
        originalSize < this.compressionConfig.threshold ||
        this.shouldSkipCompression(contentType)) {
      return {
        data: originalData,
        encoding: 'identity',
        originalSize,
        compressedSize: originalSize,
        ratio: 1
      }
    }

    // Determine best compression algorithm
    const supportedEncodings = acceptEncoding.toLowerCase().split(',').map(e => e.trim())
    let selectedAlgorithm = 'gzip' // Default
    
    for (const algorithm of this.compressionConfig.algorithms) {
      if (supportedEncodings.includes(algorithm)) {
        selectedAlgorithm = algorithm
        break
      }
    }

    try {
      let compressedData: Buffer
      const compressionOptions = { level: this.compressionConfig.level }

      switch (selectedAlgorithm) {
        case 'brotli':
          compressedData = await brotli(originalData, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: this.compressionConfig.level
            }
          })
          break
        case 'gzip':
          compressedData = await gzip(originalData, compressionOptions)
          break
        default:
          compressedData = await gzip(originalData, compressionOptions)
          selectedAlgorithm = 'gzip'
      }

      const compressedSize = compressedData.length
      const ratio = originalSize / compressedSize

      logger.debug('Response compressed', {
        algorithm: selectedAlgorithm,
        originalSize,
        compressedSize,
        ratio: ratio.toFixed(2)
      })

      return {
        data: compressedData,
        encoding: selectedAlgorithm,
        originalSize,
        compressedSize,
        ratio
      }
    } catch (error) {
      logger.error('Compression failed', error)
      return {
        data: originalData,
        encoding: 'identity',
        originalSize,
        compressedSize: originalSize,
        ratio: 1
      }
    }
  }

  /**
   * Check if content type should skip compression
   */
  private shouldSkipCompression(contentType: string): boolean {
    return this.compressionConfig.excludeTypes.some(type => 
      contentType.toLowerCase().startsWith(type)
    )
  }

  /**
   * Add request to batch queue
   */
  async batchRequest(request: Omit<BatchRequest, 'id' | 'timestamp'>): Promise<BatchResponse> {
    if (!this.batchingConfig.enabled || 
        !this.batchingConfig.endpoints.includes(request.endpoint)) {
      // Execute immediately if batching is disabled or endpoint not configured
      return this.executeRequest(request)
    }

    const batchKey = `${request.endpoint}:${request.method}`
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const batchRequest: BatchRequest = {
      ...request,
      id: requestId,
      timestamp: Date.now()
    }

    // Add to batch queue
    if (!this.batchQueue.has(batchKey)) {
      this.batchQueue.set(batchKey, [])
    }
    
    const queue = this.batchQueue.get(batchKey)!
    queue.push(batchRequest)

    // Sort by priority
    queue.sort((a, b) => b.priority - a.priority)

    // Set up batch timer if not already set
    if (!this.batchTimers.has(batchKey)) {
      const timer = setTimeout(() => {
        this.processBatch(batchKey)
      }, this.batchingConfig.batchTimeout)
      
      this.batchTimers.set(batchKey, timer)
    }

    // Process immediately if batch is full
    if (queue.length >= this.batchingConfig.maxBatchSize) {
      this.processBatch(batchKey)
    }

    // Return a promise that resolves when the request is processed
    return new Promise((resolve) => {
      batchRequest.resolve = resolve
    }) as any
  }

  /**
   * Process a batch of requests
   */
  private async processBatch(batchKey: string): Promise<void> {
    const queue = this.batchQueue.get(batchKey)
    if (!queue || queue.length === 0) return

    // Clear timer
    const timer = this.batchTimers.get(batchKey)
    if (timer) {
      clearTimeout(timer)
      this.batchTimers.delete(batchKey)
    }

    // Take requests from queue
    const requests = queue.splice(0, this.batchingConfig.maxBatchSize)
    
    logger.debug('Processing batch', {
      batchKey,
      size: requests.length
    })

    // Create batches based on concurrency limit
    const batches = this.createConcurrencyBatches(requests, this.batchingConfig.concurrencyLimit)

    for (const batch of batches) {
      const promises = batch.map(request => this.executeRequestWithRetry(request))
      await Promise.allSettled(promises)
    }

    // Schedule next batch if queue still has items
    if (queue.length > 0) {
      const timer = setTimeout(() => {
        this.processBatch(batchKey)
      }, this.batchingConfig.batchTimeout)
      
      this.batchTimers.set(batchKey, timer)
    }
  }

  /**
   * Execute a single request with retry logic
   */
  private async executeRequestWithRetry(request: BatchRequest): Promise<void> {
    const { retryPolicy } = this.batchingConfig
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        const response = await this.executeRequest(request)
        
        if (request.resolve) {
          request.resolve(response)
        }
        
        return
      } catch (error) {
        lastError = error as Error
        
        if (attempt < retryPolicy.maxRetries) {
          const delay = Math.min(
            retryPolicy.baseDelay * Math.pow(retryPolicy.backoffMultiplier, attempt),
            retryPolicy.maxDelay
          )
          
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // All retries failed
    const errorResponse: BatchResponse = {
      id: request.id,
      status: 500,
      error: lastError?.message || 'Request failed after retries',
      responseTime: 0,
      fromCache: false
    }

    if (request.resolve) {
      request.resolve(errorResponse)
    }
  }

  /**
   * Execute a single request
   */
  private async executeRequest(request: Omit<BatchRequest, 'id' | 'timestamp'>): Promise<BatchResponse> {
    const startTime = Date.now()
    const requestKey = this.generateRequestKey(request)

    try {
      // Check cache first
      const cached = await multiLayerCache.get(requestKey)
      if (cached) {
        return {
          id: 'cached',
          status: 200,
          data: cached,
          responseTime: Date.now() - startTime,
          fromCache: true
        }
      }

      // Check if same request is already in progress
      if (this.activeRequests.has(requestKey)) {
        const result = await this.activeRequests.get(requestKey)!
        return {
          id: 'deduped',
          status: 200,
          data: result,
          responseTime: Date.now() - startTime,
          fromCache: false
        }
      }

      // Execute request
      const requestPromise = this.performRequest(request)
      this.activeRequests.set(requestKey, requestPromise)

      const result = await requestPromise
      
      // Cache successful response
      if (result.status === 200) {
        await multiLayerCache.set(requestKey, result.data, {
          ttl: this.getCacheTTLForEndpoint(request.endpoint)
        })
      }

      this.activeRequests.delete(requestKey)

      return {
        ...result,
        responseTime: Date.now() - startTime,
        fromCache: false
      }
    } catch (error) {
      this.activeRequests.delete(requestKey)
      throw error
    }
  }

  /**
   * Perform the actual HTTP request
   */
  private async performRequest(request: Omit<BatchRequest, 'id' | 'timestamp'>): Promise<BatchResponse> {
    // This would integrate with your actual API implementation
    // For now, return a mock response
    
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100)) // Simulate network delay
    
    return {
      id: 'executed',
      status: 200,
      data: { result: 'success', endpoint: request.endpoint },
      responseTime: 0,
      fromCache: false
    }
  }

  /**
   * Generate cache key for request
   */
  private generateRequestKey(request: Omit<BatchRequest, 'id' | 'timestamp'>): string {
    const parts = [
      request.endpoint,
      request.method,
      request.body ? JSON.stringify(request.body) : ''
    ]
    
    const crypto = require('crypto')
    return crypto.createHash('md5').update(parts.join('|')).digest('hex')
  }

  /**
   * Get cache TTL for endpoint
   */
  private getCacheTTLForEndpoint(endpoint: string): number {
    const ttlMap: Record<string, number> = {
      '/api/credit/analyze': CacheTTL.LONG,
      '/api/documents/process': CacheTTL.MEDIUM,
      '/api/dashboard/data': CacheTTL.SHORT,
      default: CacheTTL.MEDIUM
    }

    return ttlMap[endpoint] || ttlMap.default
  }

  /**
   * Create batches for concurrent execution
   */
  private createConcurrencyBatches<T>(items: T[], concurrency: number): T[][] {
    const batches: T[][] = []
    
    for (let i = 0; i < items.length; i += concurrency) {
      batches.push(items.slice(i, i + concurrency))
    }
    
    return batches
  }

  /**
   * Check rate limit for request
   */
  async checkRateLimit(
    key: string, 
    tier: string = 'free'
  ): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    retryAfter?: number
  }> {
    if (!this.rateLimitConfig.enabled) {
      return { allowed: true, remaining: Infinity, resetTime: 0 }
    }

    const tierConfig = this.rateLimitConfig.tiers.find(t => t.name === tier)
    if (!tierConfig) {
      return { allowed: false, remaining: 0, resetTime: 0 }
    }

    const now = Date.now()
    const windowStart = now - tierConfig.windowMs
    const quotaKey = `${key}:${tier}`

    // Get or create quota
    let quota = this.rateLimitConfig.quotas.get(quotaKey)
    if (!quota || quota.resetTime <= now) {
      quota = {
        requests: 0,
        remaining: tierConfig.maxRequests,
        resetTime: now + tierConfig.windowMs
      }
      this.rateLimitConfig.quotas.set(quotaKey, quota)
    }

    // Check if request is allowed
    if (quota.remaining <= 0) {
      const retryAfter = Math.ceil((quota.resetTime - now) / 1000)
      return {
        allowed: false,
        remaining: 0,
        resetTime: quota.resetTime,
        retryAfter
      }
    }

    // Allow request and update quota
    quota.requests++
    quota.remaining--

    return {
      allowed: true,
      remaining: quota.remaining,
      resetTime: quota.resetTime
    }
  }

  /**
   * Record request metrics
   */
  recordMetrics(metrics: Omit<RequestMetrics, 'timestamp'>): void {
    const metric: RequestMetrics = {
      ...metrics,
      timestamp: new Date()
    }

    this.metrics.push(metric)

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }

    // Log performance warnings
    if (metrics.responseTime > 5000) {
      logger.warn('Slow API response detected', {
        endpoint: metrics.endpoint,
        responseTime: metrics.responseTime
      })
    }

    logger.debug('API metrics recorded', metric)
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(): {
    averageResponseTime: number
    totalRequests: number
    cacheHitRate: number
    compressionSavings: number
    rateLimitedRequests: number
    endpointStats: Array<{
      endpoint: string
      avgResponseTime: number
      requests: number
      cacheHitRate: number
    }>
  } {
    const total = this.metrics.length
    if (total === 0) {
      return {
        averageResponseTime: 0,
        totalRequests: 0,
        cacheHitRate: 0,
        compressionSavings: 0,
        rateLimitedRequests: 0,
        endpointStats: []
      }
    }

    const totalResponseTime = this.metrics.reduce((sum, m) => sum + m.responseTime, 0)
    const cacheHits = this.metrics.filter(m => m.cacheHit).length
    const rateLimited = this.metrics.filter(m => m.rateLimited).length
    
    const compressionSavings = this.metrics.reduce((sum, m) => {
      if (m.compressionRatio && m.compressionRatio > 1) {
        return sum + (m.responseSize * (1 - 1/m.compressionRatio))
      }
      return sum
    }, 0)

    // Group by endpoint
    const endpointGroups = new Map<string, RequestMetrics[]>()
    this.metrics.forEach(metric => {
      if (!endpointGroups.has(metric.endpoint)) {
        endpointGroups.set(metric.endpoint, [])
      }
      endpointGroups.get(metric.endpoint)!.push(metric)
    })

    const endpointStats = Array.from(endpointGroups.entries()).map(([endpoint, metrics]) => {
      const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length
      const cacheHits = metrics.filter(m => m.cacheHit).length
      
      return {
        endpoint,
        avgResponseTime,
        requests: metrics.length,
        cacheHitRate: (cacheHits / metrics.length) * 100
      }
    })

    return {
      averageResponseTime: totalResponseTime / total,
      totalRequests: total,
      cacheHitRate: (cacheHits / total) * 100,
      compressionSavings,
      rateLimitedRequests: rateLimited,
      endpointStats
    }
  }

  /**
   * Configure compression settings
   */
  configureCompression(config: Partial<CompressionConfig>): void {
    this.compressionConfig = { ...this.compressionConfig, ...config }
    logger.info('Compression configuration updated', this.compressionConfig)
  }

  /**
   * Configure batching settings
   */
  configureBatching(config: Partial<BatchingConfig>): void {
    this.batchingConfig = { ...this.batchingConfig, ...config }
    logger.info('Batching configuration updated', this.batchingConfig)
  }

  /**
   * Configure rate limiting settings
   */
  configureRateLimit(config: Partial<RateLimitConfig>): void {
    this.rateLimitConfig = { ...this.rateLimitConfig, ...config }
    logger.info('Rate limiting configuration updated', this.rateLimitConfig)
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): {
    totalQueued: number
    queuesByEndpoint: Array<{
      endpoint: string
      queued: number
      processing: boolean
    }>
  } {
    const queuesByEndpoint = Array.from(this.batchQueue.entries()).map(([key, queue]) => ({
      endpoint: key,
      queued: queue.length,
      processing: this.batchTimers.has(key)
    }))

    const totalQueued = queuesByEndpoint.reduce((sum, q) => sum + q.queued, 0)

    return {
      totalQueued,
      queuesByEndpoint
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear all batch timers
    this.batchTimers.forEach(timer => clearTimeout(timer))
    this.batchTimers.clear()
    
    // Clear queues
    this.batchQueue.clear()
    this.activeRequests.clear()
    
    // Clear metrics
    this.metrics.length = 0
    
    logger.info('API performance optimizer cleanup completed')
  }
}

/**
 * Express.js middleware for API optimization
 */
export function createAPIOptimizationMiddleware() {
  const optimizer = APIPerformanceOptimizer.getInstance()

  return async (req: any, res: any, next: any) => {
    const startTime = Date.now()

    // Rate limiting check
    const userKey = req.user?.id || req.ip || 'anonymous'
    const userTier = req.user?.subscription?.tier || 'free'
    
    const rateLimit = await optimizer.checkRateLimit(userKey, userTier)
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': rateLimit.remaining + (rateLimit.allowed ? 1 : 0),
      'X-RateLimit-Remaining': rateLimit.remaining,
      'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
    })

    if (!rateLimit.allowed) {
      res.set('Retry-After', rateLimit.retryAfter?.toString() || '60')
      return res.status(429).json({
        error: 'Too Many Requests',
        retryAfter: rateLimit.retryAfter
      })
    }

    // Override res.json to add compression
    const originalJson = res.json
    res.json = async function(data: any) {
      const jsonString = JSON.stringify(data)
      const acceptEncoding = req.get('Accept-Encoding') || ''
      const contentType = 'application/json'

      const compressed = await optimizer.compressResponse(jsonString, acceptEncoding, contentType)
      
      // Set compression headers
      if (compressed.encoding !== 'identity') {
        res.set('Content-Encoding', compressed.encoding)
        res.set('Vary', 'Accept-Encoding')
      }
      
      res.set('Content-Length', compressed.data.length.toString())
      
      // Record metrics
      optimizer.recordMetrics({
        endpoint: req.originalUrl,
        method: req.method,
        responseTime: Date.now() - startTime,
        responseSize: compressed.originalSize,
        compressionRatio: compressed.ratio,
        cacheHit: false,
        rateLimited: false,
        userId: req.user?.id
      })

      return res.send(compressed.data)
    }

    next()
  }
}

/**
 * Global API optimizer instance
 */
export const apiOptimizer = APIPerformanceOptimizer.getInstance()

/**
 * Utility functions for API optimization
 */
export async function optimizedAPICall(
  endpoint: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
    priority?: number
    timeout?: number
  } = {}
): Promise<any> {
  const request = {
    endpoint,
    method: options.method || 'GET',
    body: options.body,
    headers: options.headers || {},
    priority: options.priority || 1,
    timeout: options.timeout || 30000,
    retry: 0
  }

  const response = await apiOptimizer.batchRequest(request)
  
  if (response.status !== 200) {
    throw new Error(response.error || 'API request failed')
  }
  
  return response.data
}

export function configureAPIPerformance(config: {
  compression?: Partial<CompressionConfig>
  batching?: Partial<BatchingConfig>
  rateLimit?: Partial<RateLimitConfig>
}): void {
  const optimizer = APIPerformanceOptimizer.getInstance()
  
  if (config.compression) {
    optimizer.configureCompression(config.compression)
  }
  
  if (config.batching) {
    optimizer.configureBatching(config.batching)
  }
  
  if (config.rateLimit) {
    optimizer.configureRateLimit(config.rateLimit)
  }
}