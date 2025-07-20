/**
 * Cache Warming and Preloading Mechanisms
 * PERF-4.3: Intelligent cache warming strategies
 */

import { multiLayerCache } from '@/lib/cache/multiLayerCache'
import { RedisCache, CacheKeys, CacheTTL } from '@/lib/cache/redisCache'
import { logger } from '@/lib/logging'
import { createClient } from '@/lib/supabase/server'

export interface WarmupStrategy {
  name: string
  priority: number
  trigger: 'user-login' | 'route-navigation' | 'scheduled' | 'predictive'
  resources: WarmupResource[]
  conditions?: WarmupCondition[]
  schedule?: {
    interval: number // minutes
    times: string[] // HH:MM format
  }
}

export interface WarmupResource {
  key: string
  generator: () => Promise<any>
  dependencies?: string[]
  tags?: string[]
  ttl?: number
  priority: number
  estimatedSize?: number
  userSpecific: boolean
}

export interface WarmupCondition {
  type: 'time' | 'usage' | 'cache-miss-rate' | 'user-segment'
  value: any
  operator: 'gt' | 'lt' | 'eq' | 'in' | 'between'
}

export interface WarmupMetrics {
  totalAttempts: number
  successfulWarmups: number
  failedWarmups: number
  averageWarmupTime: number
  dataPreloaded: number // bytes
  cacheHitImprovement: number // percentage
  strategies: Array<{
    name: string
    executions: number
    success: number
    averageTime: number
  }>
}

export interface PredictiveModel {
  userRoutePatterns: Map<string, Array<{ route: string; probability: number }>>
  dataAccessPatterns: Map<string, Array<{ dataType: string; frequency: number }>>
  timeBasedPatterns: Map<string, Array<{ hour: number; resources: string[] }>>
}

/**
 * Cache Warmup Manager
 */
export class CacheWarmupManager {
  private static instance: CacheWarmupManager
  private cache: RedisCache
  private strategies: Map<string, WarmupStrategy> = new Map()
  private metrics: WarmupMetrics
  private activeWarmups = new Set<string>()
  private scheduledTasks = new Map<string, NodeJS.Timeout>()
  private predictiveModel: PredictiveModel

  private constructor() {
    this.cache = RedisCache.getInstance()
    this.metrics = {
      totalAttempts: 0,
      successfulWarmups: 0,
      failedWarmups: 0,
      averageWarmupTime: 0,
      dataPreloaded: 0,
      cacheHitImprovement: 0,
      strategies: []
    }
    this.predictiveModel = {
      userRoutePatterns: new Map(),
      dataAccessPatterns: new Map(),
      timeBasedPatterns: new Map()
    }

    this.initializeStrategies()
    this.startScheduledWarmups()
  }

  static getInstance(): CacheWarmupManager {
    if (!CacheWarmupManager.instance) {
      CacheWarmupManager.instance = new CacheWarmupManager()
    }
    return CacheWarmupManager.instance
  }

  /**
   * Initialize default warmup strategies
   */
  private initializeStrategies(): void {
    // User login warmup strategy
    this.addStrategy({
      name: 'user-login-warmup',
      priority: 100,
      trigger: 'user-login',
      resources: [
        {
          key: 'user-dashboard-data',
          generator: () => this.generateUserDashboardData(),
          tags: ['dashboard', 'user-data'],
          ttl: CacheTTL.MEDIUM,
          priority: 100,
          estimatedSize: 50000,
          userSpecific: true
        },
        {
          key: 'user-credit-summary',
          generator: () => this.generateUserCreditSummary(),
          dependencies: ['user-dashboard-data'],
          tags: ['credit', 'summary'],
          ttl: CacheTTL.MEDIUM,
          priority: 90,
          estimatedSize: 30000,
          userSpecific: true
        },
        {
          key: 'recent-credit-reports',
          generator: () => this.generateRecentCreditReports(),
          tags: ['credit-reports'],
          ttl: CacheTTL.SHORT,
          priority: 80,
          estimatedSize: 100000,
          userSpecific: true
        }
      ]
    })

    // Route navigation warmup
    this.addStrategy({
      name: 'route-navigation-warmup',
      priority: 80,
      trigger: 'route-navigation',
      resources: [
        {
          key: 'component-assets',
          generator: () => this.preloadComponentAssets(),
          tags: ['components', 'assets'],
          ttl: CacheTTL.LONG,
          priority: 70,
          estimatedSize: 200000,
          userSpecific: false
        },
        {
          key: 'route-specific-data',
          generator: () => this.generateRouteSpecificData(),
          tags: ['route-data'],
          ttl: CacheTTL.MEDIUM,
          priority: 60,
          estimatedSize: 75000,
          userSpecific: true
        }
      ]
    })

    // Predictive warmup strategy
    this.addStrategy({
      name: 'predictive-warmup',
      priority: 60,
      trigger: 'predictive',
      resources: [
        {
          key: 'predicted-user-data',
          generator: () => this.generatePredictedUserData(),
          tags: ['predicted', 'user-data'],
          ttl: CacheTTL.SHORT,
          priority: 50,
          estimatedSize: 40000,
          userSpecific: true
        }
      ],
      conditions: [
        {
          type: 'cache-miss-rate',
          value: 0.3,
          operator: 'gt'
        }
      ]
    })

    // Scheduled warmup strategy
    this.addStrategy({
      name: 'scheduled-warmup',
      priority: 40,
      trigger: 'scheduled',
      resources: [
        {
          key: 'global-statistics',
          generator: () => this.generateGlobalStatistics(),
          tags: ['global', 'statistics'],
          ttl: CacheTTL.LONG,
          priority: 40,
          estimatedSize: 25000,
          userSpecific: false
        },
        {
          key: 'system-health-data',
          generator: () => this.generateSystemHealthData(),
          tags: ['system', 'health'],
          ttl: CacheTTL.MEDIUM,
          priority: 30,
          estimatedSize: 15000,
          userSpecific: false
        }
      ],
      schedule: {
        interval: 60, // Every hour
        times: ['06:00', '12:00', '18:00'] // Peak times
      }
    })
  }

  /**
   * Add a warmup strategy
   */
  addStrategy(strategy: WarmupStrategy): void {
    this.strategies.set(strategy.name, strategy)
    
    // Initialize metrics for the strategy
    this.metrics.strategies.push({
      name: strategy.name,
      executions: 0,
      success: 0,
      averageTime: 0
    })

    logger.info('Warmup strategy added', {
      name: strategy.name,
      priority: strategy.priority,
      trigger: strategy.trigger,
      resources: strategy.resources.length
    })
  }

  /**
   * Execute warmup for user login
   */
  async warmupOnUserLogin(userId: string): Promise<void> {
    const strategy = this.strategies.get('user-login-warmup')
    if (!strategy) return

    logger.info('Starting user login warmup', { userId })

    await this.executeStrategy(strategy, { userId })
    
    // Update predictive model with user login
    this.updatePredictiveModel('login', userId)
  }

  /**
   * Execute warmup for route navigation
   */
  async warmupOnRouteNavigation(
    route: string, 
    userId?: string, 
    previousRoute?: string
  ): Promise<void> {
    const strategy = this.strategies.get('route-navigation-warmup')
    if (!strategy) return

    logger.info('Starting route navigation warmup', { route, userId })

    await this.executeStrategy(strategy, { route, userId, previousRoute })

    // Update predictive model
    if (userId) {
      this.updatePredictiveModel('navigation', userId, { route, previousRoute })
    }

    // Trigger predictive warmup if conditions are met
    await this.checkPredictiveWarmup(route, userId)
  }

  /**
   * Execute a warmup strategy
   */
  private async executeStrategy(
    strategy: WarmupStrategy,
    context: Record<string, any> = {}
  ): Promise<void> {
    const startTime = Date.now()
    let successCount = 0

    try {
      this.metrics.totalAttempts++
      
      // Check conditions
      if (strategy.conditions && !await this.checkConditions(strategy.conditions)) {
        logger.debug('Warmup strategy conditions not met', { 
          strategy: strategy.name 
        })
        return
      }

      // Sort resources by priority
      const sortedResources = strategy.resources.sort((a, b) => b.priority - a.priority)

      // Execute warmup resources in parallel with concurrency limit
      const concurrencyLimit = 3
      const batches = this.createBatches(sortedResources, concurrencyLimit)

      for (const batch of batches) {
        const promises = batch.map(resource => 
          this.warmupResource(resource, context)
        )
        
        const results = await Promise.allSettled(promises)
        successCount += results.filter(r => r.status === 'fulfilled').length
      }

      this.metrics.successfulWarmups++
      
      logger.info('Warmup strategy completed', {
        strategy: strategy.name,
        duration: Date.now() - startTime,
        successfulResources: successCount,
        totalResources: strategy.resources.length
      })
    } catch (error) {
      this.metrics.failedWarmups++
      logger.error('Warmup strategy failed', error)
    } finally {
      this.updateStrategyMetrics(strategy.name, Date.now() - startTime, successCount > 0)
    }
  }

  /**
   * Warmup a specific resource
   */
  private async warmupResource(
    resource: WarmupResource,
    context: Record<string, any>
  ): Promise<void> {
    const warmupKey = `${resource.key}:${context.userId || 'global'}`
    
    if (this.activeWarmups.has(warmupKey)) {
      logger.debug('Resource already being warmed up', { key: warmupKey })
      return
    }

    this.activeWarmups.add(warmupKey)

    try {
      // Check if already cached
      const cacheKey = this.buildCacheKey(resource, context)
      const existing = await multiLayerCache.get(cacheKey)
      
      if (existing) {
        logger.debug('Resource already cached, skipping warmup', { key: cacheKey })
        return
      }

      // Check dependencies
      if (resource.dependencies) {
        const dependenciesMet = await this.checkDependencies(resource.dependencies, context)
        if (!dependenciesMet) {
          logger.warn('Resource dependencies not met', {
            key: resource.key,
            dependencies: resource.dependencies
          })
          return
        }
      }

      // Generate and cache the data
      const data = await resource.generator()
      
      await multiLayerCache.set(cacheKey, data, {
        ttl: resource.ttl || CacheTTL.MEDIUM,
        tags: resource.tags,
        dependencies: resource.dependencies
      })

      // Update metrics
      if (resource.estimatedSize) {
        this.metrics.dataPreloaded += resource.estimatedSize
      }

      logger.debug('Resource warmed up successfully', {
        key: cacheKey,
        size: resource.estimatedSize,
        tags: resource.tags
      })
    } catch (error) {
      logger.error('Resource warmup failed', {
        key: resource.key,
        error: (error as Error).message
      })
    } finally {
      this.activeWarmups.delete(warmupKey)
    }
  }

  /**
   * Build cache key for resource
   */
  private buildCacheKey(resource: WarmupResource, context: Record<string, any>): string {
    if (resource.userSpecific && context.userId) {
      return `${resource.key}:${context.userId}`
    }
    
    if (context.route) {
      return `${resource.key}:${context.route}`
    }
    
    return resource.key
  }

  /**
   * Check if conditions are met for strategy execution
   */
  private async checkConditions(conditions: WarmupCondition[]): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition)
      if (!result) {
        return false
      }
    }
    return true
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: WarmupCondition): Promise<boolean> {
    switch (condition.type) {
      case 'time':
        const currentHour = new Date().getHours()
        return this.compareValues(currentHour, condition.value, condition.operator)
      
      case 'cache-miss-rate':
        const cacheStats = await this.cache.getStats()
        const missRate = cacheStats.misses / (cacheStats.hits + cacheStats.misses)
        return this.compareValues(missRate, condition.value, condition.operator)
      
      case 'usage':
        // Could check system load, active users, etc.
        return true
      
      case 'user-segment':
        // Could check user properties
        return true
      
      default:
        return true
    }
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: any, expected: any, operator: string): boolean {
    switch (operator) {
      case 'gt': return actual > expected
      case 'lt': return actual < expected
      case 'eq': return actual === expected
      case 'in': return Array.isArray(expected) && expected.includes(actual)
      case 'between': 
        return Array.isArray(expected) && 
               actual >= expected[0] && 
               actual <= expected[1]
      default: return false
    }
  }

  /**
   * Check if dependencies are available in cache
   */
  private async checkDependencies(
    dependencies: string[], 
    context: Record<string, any>
  ): Promise<boolean> {
    for (const dependency of dependencies) {
      const cacheKey = context.userId ? `${dependency}:${context.userId}` : dependency
      const cached = await multiLayerCache.get(cacheKey)
      
      if (!cached) {
        return false
      }
    }
    return true
  }

  /**
   * Create batches for parallel execution
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    
    return batches
  }

  /**
   * Start scheduled warmups
   */
  private startScheduledWarmups(): void {
    this.strategies.forEach((strategy, name) => {
      if (strategy.trigger === 'scheduled' && strategy.schedule) {
        this.scheduleStrategy(name, strategy)
      }
    })
  }

  /**
   * Schedule a strategy for periodic execution
   */
  private scheduleStrategy(name: string, strategy: WarmupStrategy): void {
    if (!strategy.schedule) return

    const { interval, times } = strategy.schedule

    // Schedule interval-based execution
    const intervalTimer = setInterval(() => {
      this.executeStrategy(strategy)
    }, interval * 60 * 1000)

    this.scheduledTasks.set(`${name}:interval`, intervalTimer)

    // Schedule time-based execution
    times.forEach((time, index) => {
      const [hours, minutes] = time.split(':').map(Number)
      const timer = setInterval(() => {
        const now = new Date()
        if (now.getHours() === hours && now.getMinutes() === minutes) {
          this.executeStrategy(strategy)
        }
      }, 60 * 1000) // Check every minute

      this.scheduledTasks.set(`${name}:time:${index}`, timer)
    })
  }

  /**
   * Update predictive model with user behavior
   */
  private updatePredictiveModel(
    eventType: 'login' | 'navigation',
    userId: string,
    data?: any
  ): void {
    switch (eventType) {
      case 'login':
        // Track login patterns
        const loginHour = new Date().getHours()
        const existingPattern = this.predictiveModel.timeBasedPatterns.get(userId) || []
        
        // Add to time-based patterns
        this.predictiveModel.timeBasedPatterns.set(userId, [
          ...existingPattern,
          { hour: loginHour, resources: ['dashboard', 'credit-summary'] }
        ])
        break
      
      case 'navigation':
        if (data?.route && data?.previousRoute) {
          // Track route transitions
          const routePatterns = this.predictiveModel.userRoutePatterns.get(userId) || []
          const existingPattern = routePatterns.find(p => p.route === data.route)
          
          if (existingPattern) {
            existingPattern.probability = Math.min(existingPattern.probability + 0.1, 1.0)
          } else {
            routePatterns.push({ route: data.route, probability: 0.3 })
          }
          
          this.predictiveModel.userRoutePatterns.set(userId, routePatterns)
        }
        break
    }
  }

  /**
   * Check if predictive warmup should be triggered
   */
  private async checkPredictiveWarmup(route: string, userId?: string): Promise<void> {
    if (!userId) return

    const routePatterns = this.predictiveModel.userRoutePatterns.get(userId)
    if (!routePatterns) return

    // Find high-probability next routes
    const likelyNextRoutes = routePatterns
      .filter(pattern => pattern.probability > 0.5)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3)

    if (likelyNextRoutes.length > 0) {
      const strategy = this.strategies.get('predictive-warmup')
      if (strategy) {
        await this.executeStrategy(strategy, { 
          userId, 
          currentRoute: route,
          predictedRoutes: likelyNextRoutes 
        })
      }
    }
  }

  /**
   * Update strategy metrics
   */
  private updateStrategyMetrics(
    strategyName: string,
    executionTime: number,
    success: boolean
  ): void {
    const strategyMetrics = this.metrics.strategies.find(s => s.name === strategyName)
    if (strategyMetrics) {
      strategyMetrics.executions++
      if (success) {
        strategyMetrics.success++
      }
      
      // Update average time
      const totalTime = strategyMetrics.averageTime * (strategyMetrics.executions - 1) + executionTime
      strategyMetrics.averageTime = totalTime / strategyMetrics.executions
    }

    // Update global metrics
    const totalTime = this.metrics.averageWarmupTime * (this.metrics.totalAttempts - 1) + executionTime
    this.metrics.averageWarmupTime = totalTime / this.metrics.totalAttempts
  }

  /**
   * Resource generators
   */
  private async generateUserDashboardData(): Promise<any> {
    // Mock dashboard data generation
    return {
      creditScore: 750,
      recentActivity: [],
      alerts: [],
      recommendations: []
    }
  }

  private async generateUserCreditSummary(): Promise<any> {
    return {
      totalAccounts: 10,
      negativeItems: 2,
      inquiries: 1,
      lastUpdate: new Date()
    }
  }

  private async generateRecentCreditReports(): Promise<any> {
    return {
      reports: [],
      count: 0
    }
  }

  private async preloadComponentAssets(): Promise<any> {
    return {
      components: ['Dashboard', 'CreditReport', 'Upload'],
      assets: ['styles.css', 'scripts.js']
    }
  }

  private async generateRouteSpecificData(): Promise<any> {
    return {
      routeData: 'cached',
      timestamp: Date.now()
    }
  }

  private async generatePredictedUserData(): Promise<any> {
    return {
      predictions: [],
      confidence: 0.8
    }
  }

  private async generateGlobalStatistics(): Promise<any> {
    return {
      totalUsers: 10000,
      averageCreditScore: 720,
      systemHealth: 'good'
    }
  }

  private async generateSystemHealthData(): Promise<any> {
    return {
      uptime: '99.9%',
      responseTime: 120,
      errorRate: 0.1
    }
  }

  /**
   * Get warmup metrics
   */
  getMetrics(): WarmupMetrics {
    return { ...this.metrics }
  }

  /**
   * Get predictive model insights
   */
  getPredictiveInsights(userId?: string): {
    userPatterns?: any
    globalPatterns: any
    recommendations: string[]
  } {
    const insights = {
      globalPatterns: {
        totalUsers: this.predictiveModel.userRoutePatterns.size,
        commonRoutes: this.getCommonRoutes(),
        peakHours: this.getPeakHours()
      },
      recommendations: this.generateWarmupRecommendations()
    }

    if (userId) {
      return {
        userPatterns: {
          routes: this.predictiveModel.userRoutePatterns.get(userId),
          timePatterns: this.predictiveModel.timeBasedPatterns.get(userId)
        },
        ...insights
      }
    }

    return insights
  }

  private getCommonRoutes(): Array<{ route: string; frequency: number }> {
    const routeFrequency = new Map<string, number>()
    
    this.predictiveModel.userRoutePatterns.forEach(patterns => {
      patterns.forEach(pattern => {
        routeFrequency.set(
          pattern.route, 
          (routeFrequency.get(pattern.route) || 0) + 1
        )
      })
    })

    return Array.from(routeFrequency.entries())
      .map(([route, frequency]) => ({ route, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)
  }

  private getPeakHours(): number[] {
    const hourFrequency = new Map<number, number>()
    
    this.predictiveModel.timeBasedPatterns.forEach(patterns => {
      patterns.forEach(pattern => {
        hourFrequency.set(
          pattern.hour,
          (hourFrequency.get(pattern.hour) || 0) + 1
        )
      })
    })

    return Array.from(hourFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hour]) => hour)
  }

  private generateWarmupRecommendations(): string[] {
    const recommendations: string[] = []
    
    if (this.metrics.failedWarmups / this.metrics.totalAttempts > 0.1) {
      recommendations.push('Consider reducing warmup resource size or complexity')
    }
    
    if (this.metrics.averageWarmupTime > 5000) {
      recommendations.push('Optimize warmup resource generators for better performance')
    }
    
    if (this.metrics.cacheHitImprovement < 10) {
      recommendations.push('Review warmup strategies effectiveness and adjust priorities')
    }

    return recommendations
  }

  /**
   * Cleanup scheduled tasks
   */
  cleanup(): void {
    this.scheduledTasks.forEach(timer => clearInterval(timer))
    this.scheduledTasks.clear()
    this.activeWarmups.clear()
  }
}

/**
 * Global cache warmup manager
 */
export const cacheWarmupManager = CacheWarmupManager.getInstance()

/**
 * React hook for cache warmup
 */
export function useCacheWarmup(
  resources: string[],
  dependencies: any[] = []
) {
  React.useEffect(() => {
    // Trigger warmup for specified resources
    resources.forEach(resource => {
      // Implementation would depend on specific resource types
    })
  }, dependencies)
}

/**
 * Utility functions
 */
export async function warmupUserSession(userId: string): Promise<void> {
  await cacheWarmupManager.warmupOnUserLogin(userId)
}

export async function warmupRoute(route: string, userId?: string): Promise<void> {
  await cacheWarmupManager.warmupOnRouteNavigation(route, userId)
}

// Import React for hooks
import React from 'react'