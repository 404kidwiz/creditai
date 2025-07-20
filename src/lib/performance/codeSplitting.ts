/**
 * Advanced Code Splitting and Route-Based Chunking
 * PERF-4.2: Code splitting with intelligent chunk management
 */

import { logger } from '@/lib/logging'
import { RedisCache, CacheKeys, CacheTTL } from '@/lib/cache/redisCache'

export interface ChunkConfig {
  name: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  preload: boolean
  routes: string[]
  dependencies?: string[]
  maxAge?: number
  retries?: number
}

export interface ChunkMetrics {
  chunkName: string
  size: number
  loadTime: number
  cacheHit: boolean
  route: string
  timestamp: Date
  error?: string
}

export interface BundleAnalysis {
  totalSize: number
  totalChunks: number
  criticalChunks: ChunkInfo[]
  unusedChunks: ChunkInfo[]
  redundantCode: Array<{
    code: string
    occurrences: number
    totalSize: number
  }>
  recommendations: string[]
}

export interface ChunkInfo {
  name: string
  size: number
  gzipSize: number
  modules: string[]
  usageFrequency: number
  loadTime?: number
}

/**
 * Advanced Code Splitting Manager
 */
export class CodeSplittingManager {
  private static instance: CodeSplittingManager
  private cache: RedisCache
  private chunkRegistry = new Map<string, ChunkConfig>()
  private loadedChunks = new Set<string>()
  private chunkMetrics: ChunkMetrics[] = []
  private preloadScheduler?: NodeJS.Timeout

  private constructor() {
    this.cache = RedisCache.getInstance()
    this.initializeChunkConfigs()
  }

  static getInstance(): CodeSplittingManager {
    if (!CodeSplittingManager.instance) {
      CodeSplittingManager.instance = new CodeSplittingManager()
    }
    return CodeSplittingManager.instance
  }

  /**
   * Initialize chunk configurations for different routes
   */
  private initializeChunkConfigs(): void {
    const chunkConfigs: ChunkConfig[] = [
      // Critical chunks that should be loaded immediately
      {
        name: 'auth',
        priority: 'critical',
        preload: true,
        routes: ['/login', '/signup', '/auth/callback'],
        maxAge: 86400000 // 24 hours
      },
      {
        name: 'dashboard',
        priority: 'critical',
        preload: true,
        routes: ['/dashboard'],
        dependencies: ['auth'],
        maxAge: 43200000 // 12 hours
      },
      
      // High priority chunks for main features
      {
        name: 'upload',
        priority: 'high',
        preload: false,
        routes: ['/upload', '/(main)/upload'],
        dependencies: ['auth'],
        maxAge: 21600000 // 6 hours
      },
      {
        name: 'analysis',
        priority: 'high',
        preload: false,
        routes: ['/analysis-results', '/analysis'],
        dependencies: ['upload'],
        maxAge: 21600000
      },
      
      // Medium priority chunks
      {
        name: 'credit-data',
        priority: 'medium',
        preload: false,
        routes: ['/dashboard'],
        dependencies: ['dashboard'],
        maxAge: 10800000 // 3 hours
      },
      {
        name: 'billing',
        priority: 'medium',
        preload: false,
        routes: ['/billing', '/pricing'],
        maxAge: 10800000
      },
      
      // Low priority chunks
      {
        name: 'settings',
        priority: 'low',
        preload: false,
        routes: ['/settings', '/profile'],
        maxAge: 3600000 // 1 hour
      },
      {
        name: 'admin',
        priority: 'low',
        preload: false,
        routes: ['/admin'],
        maxAge: 3600000
      }
    ]

    chunkConfigs.forEach(config => {
      this.chunkRegistry.set(config.name, config)
    })
  }

  /**
   * Get chunks that should be preloaded for a specific route
   */
  getPreloadChunks(route: string): ChunkConfig[] {
    const preloadChunks: ChunkConfig[] = []
    
    // Always include critical chunks
    this.chunkRegistry.forEach(config => {
      if (config.priority === 'critical' && config.preload) {
        preloadChunks.push(config)
      }
    })

    // Add route-specific chunks
    this.chunkRegistry.forEach(config => {
      if (config.routes.some(r => route.startsWith(r)) && config.preload) {
        preloadChunks.push(config)
      }
    })

    // Sort by priority
    return preloadChunks.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Intelligently preload chunks based on user behavior and route predictions
   */
  async intelligentPreload(currentRoute: string, userHistory: string[] = []): Promise<void> {
    try {
      // Get prediction from cache or compute
      const predictions = await this.getPredictedRoutes(currentRoute, userHistory)
      
      // Schedule preloading based on predictions
      this.schedulePreload(predictions)
      
      logger.info('Intelligent preload scheduled', {
        currentRoute,
        predictions: predictions.slice(0, 3), // Top 3 predictions
        userHistory: userHistory.slice(-5) // Last 5 routes
      })
    } catch (error) {
      logger.error('Failed to schedule intelligent preload', error)
    }
  }

  /**
   * Predict next routes based on current route and user history
   */
  private async getPredictedRoutes(
    currentRoute: string, 
    userHistory: string[]
  ): Promise<Array<{ route: string; probability: number }>> {
    const cacheKey = CacheKeys.rateLimitCounter('route_predictions', currentRoute)
    const cached = await this.cache.get<Array<{ route: string; probability: number }>>(cacheKey)
    
    if (cached) {
      return cached
    }

    // Route transition patterns based on typical user flows
    const routeTransitions: Record<string, Array<{ route: string; weight: number }>> = {
      '/': [
        { route: '/dashboard', weight: 0.4 },
        { route: '/login', weight: 0.3 },
        { route: '/upload', weight: 0.2 },
        { route: '/pricing', weight: 0.1 }
      ],
      '/login': [
        { route: '/dashboard', weight: 0.7 },
        { route: '/', weight: 0.2 },
        { route: '/signup', weight: 0.1 }
      ],
      '/dashboard': [
        { route: '/upload', weight: 0.4 },
        { route: '/analysis-results', weight: 0.3 },
        { route: '/settings', weight: 0.2 },
        { route: '/billing', weight: 0.1 }
      ],
      '/upload': [
        { route: '/analysis-results', weight: 0.8 },
        { route: '/dashboard', weight: 0.2 }
      ],
      '/analysis-results': [
        { route: '/dashboard', weight: 0.4 },
        { route: '/upload', weight: 0.3 },
        { route: '/billing', weight: 0.2 },
        { route: '/settings', weight: 0.1 }
      ]
    }

    // Get base predictions
    const basePredictions = routeTransitions[currentRoute] || []
    
    // Adjust predictions based on user history
    const adjustedPredictions = basePredictions.map(prediction => {
      const historyBoost = userHistory.filter(r => r === prediction.route).length * 0.1
      return {
        route: prediction.route,
        probability: Math.min(prediction.weight + historyBoost, 1.0)
      }
    })

    // Sort by probability
    const predictions = adjustedPredictions
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5) // Top 5 predictions

    // Cache predictions for 30 minutes
    await this.cache.set(cacheKey, predictions, CacheTTL.MEDIUM)
    
    return predictions
  }

  /**
   * Schedule chunk preloading with intelligent timing
   */
  private schedulePreload(predictions: Array<{ route: string; probability: number }>): void {
    if (this.preloadScheduler) {
      clearTimeout(this.preloadScheduler)
    }

    let delay = 0
    predictions.forEach((prediction, index) => {
      if (prediction.probability > 0.3) { // Only preload if probability > 30%
        this.preloadScheduler = setTimeout(() => {
          this.preloadChunksForRoute(prediction.route)
        }, delay)
        
        // Increase delay for lower probability routes
        delay += (1 - prediction.probability) * 2000
      }
    })
  }

  /**
   * Preload chunks for a specific route
   */
  private async preloadChunksForRoute(route: string): Promise<void> {
    const chunks = this.getPreloadChunks(route)
    
    for (const chunk of chunks) {
      if (!this.loadedChunks.has(chunk.name)) {
        await this.preloadChunk(chunk)
      }
    }
  }

  /**
   * Preload a specific chunk
   */
  private async preloadChunk(config: ChunkConfig): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Check if chunk dependencies are loaded
      if (config.dependencies) {
        const unloadedDeps = config.dependencies.filter(dep => !this.loadedChunks.has(dep))
        if (unloadedDeps.length > 0) {
          logger.warn('Chunk dependencies not loaded', {
            chunk: config.name,
            missingDependencies: unloadedDeps
          })
          return
        }
      }

      // Create link element for preloading
      if (typeof document !== 'undefined') {
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.href = `/_next/static/chunks/${config.name}.js`
        link.onload = () => {
          this.loadedChunks.add(config.name)
          this.recordChunkMetrics({
            chunkName: config.name,
            size: 0, // Would need to be calculated from actual chunk
            loadTime: Date.now() - startTime,
            cacheHit: false,
            route: config.routes[0],
            timestamp: new Date()
          })
        }
        link.onerror = () => {
          this.recordChunkMetrics({
            chunkName: config.name,
            size: 0,
            loadTime: Date.now() - startTime,
            cacheHit: false,
            route: config.routes[0],
            timestamp: new Date(),
            error: 'Preload failed'
          })
        }
        
        document.head.appendChild(link)
      }

      logger.debug('Chunk preload initiated', {
        chunk: config.name,
        priority: config.priority,
        routes: config.routes
      })
    } catch (error) {
      logger.error('Chunk preload failed', error)
    }
  }

  /**
   * Record chunk loading metrics
   */
  private recordChunkMetrics(metrics: ChunkMetrics): void {
    this.chunkMetrics.push(metrics)

    // Keep only last 200 metrics
    if (this.chunkMetrics.length > 200) {
      this.chunkMetrics = this.chunkMetrics.slice(-200)
    }

    // Store in cache for analysis
    this.cache.set(
      CacheKeys.rateLimitCounter('chunk_metrics', metrics.chunkName),
      metrics,
      CacheTTL.LONG
    )
  }

  /**
   * Analyze bundle performance and provide recommendations
   */
  async analyzeBundlePerformance(): Promise<BundleAnalysis> {
    const chunkSizes = await this.getChunkSizes()
    const unusedChunks = await this.detectUnusedChunks()
    const redundantCode = await this.detectRedundantCode()

    const totalSize = chunkSizes.reduce((sum, chunk) => sum + chunk.size, 0)
    const totalChunks = chunkSizes.length

    const criticalChunks = chunkSizes
      .filter(chunk => {
        const config = this.chunkRegistry.get(chunk.name)
        return config?.priority === 'critical'
      })
      .sort((a, b) => b.size - a.size)

    const recommendations = this.generateOptimizationRecommendations(
      chunkSizes,
      unusedChunks,
      redundantCode
    )

    return {
      totalSize,
      totalChunks,
      criticalChunks,
      unusedChunks,
      redundantCode,
      recommendations
    }
  }

  /**
   * Get chunk sizes from webpack stats or build analysis
   */
  private async getChunkSizes(): Promise<ChunkInfo[]> {
    // This would typically read from webpack stats.json or build analysis
    // For now, return mock data based on registered chunks
    return Array.from(this.chunkRegistry.entries()).map(([name, config]) => ({
      name,
      size: this.estimateChunkSize(name),
      gzipSize: this.estimateChunkSize(name) * 0.3, // Estimate 30% compression
      modules: [],
      usageFrequency: this.calculateUsageFrequency(name)
    }))
  }

  /**
   * Estimate chunk size based on configuration
   */
  private estimateChunkSize(chunkName: string): number {
    const sizeMappings: Record<string, number> = {
      auth: 150000,     // 150KB
      dashboard: 300000, // 300KB
      upload: 200000,   // 200KB
      analysis: 250000, // 250KB
      'credit-data': 180000, // 180KB
      billing: 120000,  // 120KB
      settings: 100000, // 100KB
      admin: 150000     // 150KB
    }
    
    return sizeMappings[chunkName] || 100000 // Default 100KB
  }

  /**
   * Calculate usage frequency for a chunk
   */
  private calculateUsageFrequency(chunkName: string): number {
    const chunkMetrics = this.chunkMetrics.filter(m => m.chunkName === chunkName)
    return chunkMetrics.length
  }

  /**
   * Detect unused chunks
   */
  private async detectUnusedChunks(): Promise<ChunkInfo[]> {
    const allChunks = await this.getChunkSizes()
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
    
    return allChunks.filter(chunk => {
      const recentUsage = this.chunkMetrics.filter(
        m => m.chunkName === chunk.name && m.timestamp.getTime() > thirtyDaysAgo
      )
      return recentUsage.length === 0
    })
  }

  /**
   * Detect redundant code across chunks
   */
  private async detectRedundantCode(): Promise<Array<{
    code: string
    occurrences: number
    totalSize: number
  }>> {
    // This would typically analyze actual bundle contents
    // For now, return common patterns that might be duplicated
    return [
      {
        code: 'lodash utilities',
        occurrences: 3,
        totalSize: 45000
      },
      {
        code: 'date formatting functions',
        occurrences: 4,
        totalSize: 12000
      },
      {
        code: 'validation schemas',
        occurrences: 2,
        totalSize: 8000
      }
    ]
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    chunks: ChunkInfo[],
    unusedChunks: ChunkInfo[],
    redundantCode: Array<{ code: string; occurrences: number; totalSize: number }>
  ): string[] {
    const recommendations: string[] = []

    // Large chunk recommendations
    const largeChunks = chunks.filter(chunk => chunk.size > 300000) // > 300KB
    if (largeChunks.length > 0) {
      recommendations.push(
        `Consider splitting large chunks: ${largeChunks.map(c => c.name).join(', ')}. ` +
        `Target size: <300KB per chunk.`
      )
    }

    // Unused chunk recommendations
    if (unusedChunks.length > 0) {
      recommendations.push(
        `Remove or lazy-load unused chunks: ${unusedChunks.map(c => c.name).join(', ')}. ` +
        `This could save ${unusedChunks.reduce((sum, c) => sum + c.size, 0)} bytes.`
      )
    }

    // Redundant code recommendations
    const significantRedundancy = redundantCode.filter(r => r.totalSize > 10000)
    if (significantRedundancy.length > 0) {
      recommendations.push(
        `Extract common code to shared chunks: ${significantRedundancy.map(r => r.code).join(', ')}. ` +
        `This could save ${significantRedundancy.reduce((sum, r) => sum + r.totalSize, 0)} bytes.`
      )
    }

    // Critical chunk optimization
    const oversizedCritical = chunks.filter(chunk => {
      const config = this.chunkRegistry.get(chunk.name)
      return config?.priority === 'critical' && chunk.size > 200000 // > 200KB
    })
    if (oversizedCritical.length > 0) {
      recommendations.push(
        `Optimize critical chunks for faster initial load: ${oversizedCritical.map(c => c.name).join(', ')}. ` +
        `Critical chunks should be <200KB.`
      )
    }

    // Cache optimization
    const lowUsageChunks = chunks.filter(chunk => chunk.usageFrequency < 2)
    if (lowUsageChunks.length > 0) {
      recommendations.push(
        `Consider increasing cache TTL for low-usage chunks: ${lowUsageChunks.map(c => c.name).join(', ')}.`
      )
    }

    return recommendations
  }

  /**
   * Get performance metrics for chunks
   */
  getChunkMetrics(): ChunkMetrics[] {
    return [...this.chunkMetrics]
  }

  /**
   * Get chunk loading statistics
   */
  getChunkStatistics(): {
    totalLoads: number
    averageLoadTime: number
    cacheHitRate: number
    failureRate: number
    slowestChunks: Array<{ name: string; avgLoadTime: number }>
  } {
    const totalLoads = this.chunkMetrics.length
    const successful = this.chunkMetrics.filter(m => !m.error)
    const cacheHits = this.chunkMetrics.filter(m => m.cacheHit)
    const failed = this.chunkMetrics.filter(m => m.error)

    const averageLoadTime = successful.length > 0
      ? successful.reduce((sum, m) => sum + m.loadTime, 0) / successful.length
      : 0

    const cacheHitRate = totalLoads > 0 ? (cacheHits.length / totalLoads) * 100 : 0
    const failureRate = totalLoads > 0 ? (failed.length / totalLoads) * 100 : 0

    // Calculate slowest chunks
    const chunkLoadTimes = new Map<string, number[]>()
    successful.forEach(metric => {
      if (!chunkLoadTimes.has(metric.chunkName)) {
        chunkLoadTimes.set(metric.chunkName, [])
      }
      chunkLoadTimes.get(metric.chunkName)!.push(metric.loadTime)
    })

    const slowestChunks = Array.from(chunkLoadTimes.entries())
      .map(([name, times]) => ({
        name,
        avgLoadTime: times.reduce((sum, time) => sum + time, 0) / times.length
      }))
      .sort((a, b) => b.avgLoadTime - a.avgLoadTime)
      .slice(0, 5)

    return {
      totalLoads,
      averageLoadTime,
      cacheHitRate,
      failureRate,
      slowestChunks
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.preloadScheduler) {
      clearTimeout(this.preloadScheduler)
    }
    this.chunkMetrics.length = 0
    this.loadedChunks.clear()
  }
}

/**
 * Hook for route-based chunk preloading
 */
export function preloadChunksForRoute(currentRoute: string, userHistory: string[] = []) {
  const manager = CodeSplittingManager.getInstance()
  manager.intelligentPreload(currentRoute, userHistory)
}

/**
 * Utility for tracking chunk loading status
 */
export function createChunkLoadingTracker(chunkName: string) {
  const startTime = Date.now()
  
  return {
    chunkName,
    startTime,
    markLoaded: () => {
      const loadTime = Date.now() - startTime
      console.log(`Chunk "${chunkName}" loaded in ${loadTime}ms`)
      return loadTime
    }
  }
}

// Global instance
export const codeSplittingManager = CodeSplittingManager.getInstance()