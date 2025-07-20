/**
 * Database Performance Monitor
 * PERF-4.1: Advanced database performance monitoring and optimization
 */

import { createClient } from '@/lib/supabase/server'
import { RedisCache, CacheKeys, CacheTTL } from '@/lib/cache/redisCache'
import { logger } from '@/lib/logging'

export interface DatabaseMetrics {
  connectionCount: number
  activeQueries: number
  cacheHitRatio: number
  averageQueryTime: number
  slowQueries: SlowQuery[]
  indexUsage: IndexUsage[]
  connectionPoolStats: ConnectionPoolStats
  timestamp: Date
}

export interface SlowQuery {
  queryType: string
  avgExecutionTimeMs: number
  maxExecutionTimeMs: number
  executionCount: number
  cacheHitRate: number
}

export interface IndexUsage {
  schemaName: string
  tableName: string
  indexName: string
  tupRead: number
  tupFetch: number
  usageLevel: 'Never Used' | 'Low Usage' | 'Medium Usage' | 'High Usage'
}

export interface ConnectionPoolStats {
  active: number
  idle: number
  waiting: number
  total: number
  peak: number
  utilization: number
}

export interface QueryPerformanceConfig {
  slowQueryThreshold: number // milliseconds
  monitoringInterval: number // seconds
  retentionPeriod: number // days
  enableQueryPlanCapture: boolean
  enableRealTimeAlerts: boolean
}

export class DatabasePerformanceMonitor {
  private cache: RedisCache
  private config: QueryPerformanceConfig
  private monitoringInterval?: NodeJS.Timeout
  private alertThresholds = {
    maxConnectionUtilization: 80, // percent
    maxAverageQueryTime: 1000, // milliseconds
    minCacheHitRatio: 85, // percent
    maxSlowQueries: 10 // count per minute
  }

  constructor(config: Partial<QueryPerformanceConfig> = {}) {
    this.cache = RedisCache.getInstance()
    this.config = {
      slowQueryThreshold: 1000,
      monitoringInterval: 30,
      retentionPeriod: 30,
      enableQueryPlanCapture: true,
      enableRealTimeAlerts: true,
      ...config
    }
  }

  /**
   * Start continuous database performance monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      this.stopMonitoring()
    }

    logger.info('Starting database performance monitoring', {
      interval: this.config.monitoringInterval,
      component: 'DatabasePerformanceMonitor'
    })

    this.monitoringInterval = setInterval(
      () => this.collectAndStoreMetrics(),
      this.config.monitoringInterval * 1000
    )

    // Initial collection
    this.collectAndStoreMetrics()
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
      logger.info('Stopped database performance monitoring')
    }
  }

  /**
   * Get current database performance metrics
   */
  async getCurrentMetrics(): Promise<DatabaseMetrics> {
    const startTime = Date.now()

    try {
      // Try to get from cache first
      const cached = await this.cache.get<DatabaseMetrics>(
        CacheKeys.rateLimitCounter('db_metrics', 'current')
      )

      if (cached && Date.now() - cached.timestamp.getTime() < 30000) {
        return cached
      }

      // Collect fresh metrics
      const metrics = await this.collectMetrics()
      
      // Cache for 30 seconds
      await this.cache.set(
        CacheKeys.rateLimitCounter('db_metrics', 'current'),
        metrics,
        30
      )

      // Log performance collection time
      const collectionTime = Date.now() - startTime
      await this.logQueryPerformance('metrics_collection', collectionTime)

      return metrics
    } catch (error) {
      logger.error('Failed to get database metrics', error)
      throw error
    }
  }

  /**
   * Collect comprehensive database metrics
   */
  private async collectMetrics(): Promise<DatabaseMetrics> {
    const supabase = createClient()
    
    const [
      performanceMetrics,
      slowQueries,
      indexUsage,
      connectionStats
    ] = await Promise.all([
      this.getBasicPerformanceMetrics(supabase),
      this.getSlowQueriesReport(supabase),
      this.getIndexUsageAnalysis(supabase),
      this.getConnectionPoolStats(supabase)
    ])

    return {
      connectionCount: connectionStats.total,
      activeQueries: connectionStats.active,
      cacheHitRatio: performanceMetrics.cacheHitRatio,
      averageQueryTime: performanceMetrics.averageQueryTime,
      slowQueries,
      indexUsage,
      connectionPoolStats: connectionStats,
      timestamp: new Date()
    }
  }

  /**
   * Get basic performance metrics from database
   */
  private async getBasicPerformanceMetrics(supabase: any): Promise<{
    cacheHitRatio: number
    averageQueryTime: number
  }> {
    const { data, error } = await supabase
      .rpc('get_basic_performance_metrics')
      .single()

    if (error) {
      // Fallback to direct query if function doesn't exist
      const { data: metrics } = await supabase
        .from('database_performance_metrics')
        .select('*')

      const cacheHitMetric = metrics?.find(m => m.metric_name === 'Cache Hit Ratio')
      const queryTimeMetric = metrics?.find(m => m.metric_name === 'Average Query Time (ms)')

      return {
        cacheHitRatio: cacheHitMetric?.current_value || 0,
        averageQueryTime: queryTimeMetric?.current_value || 0
      }
    }

    return {
      cacheHitRatio: data.cache_hit_ratio || 0,
      averageQueryTime: data.average_query_time || 0
    }
  }

  /**
   * Get slow queries report
   */
  private async getSlowQueriesReport(supabase: any): Promise<SlowQuery[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_slow_queries_report', {
          time_range: '1 hour'
        })

      if (error) {
        logger.warn('Failed to get slow queries report', error)
        return []
      }

      return data?.map((query: any) => ({
        queryType: query.query_type,
        avgExecutionTimeMs: query.avg_execution_time_ms,
        maxExecutionTimeMs: query.max_execution_time_ms,
        executionCount: query.execution_count,
        cacheHitRate: query.cache_hit_rate
      })) || []
    } catch (error) {
      logger.error('Error getting slow queries report', error)
      return []
    }
  }

  /**
   * Get index usage analysis
   */
  private async getIndexUsageAnalysis(supabase: any): Promise<IndexUsage[]> {
    try {
      const { data, error } = await supabase
        .from('index_usage_analysis')
        .select('*')
        .order('idx_tup_read', { ascending: false })
        .limit(20)

      if (error) {
        logger.warn('Failed to get index usage analysis', error)
        return []
      }

      return data?.map((index: any) => ({
        schemaName: index.schemaname,
        tableName: index.tablename,
        indexName: index.indexname,
        tupRead: index.idx_tup_read,
        tupFetch: index.idx_tup_fetch,
        usageLevel: index.usage_level
      })) || []
    } catch (error) {
      logger.error('Error getting index usage analysis', error)
      return []
    }
  }

  /**
   * Get connection pool statistics
   */
  private async getConnectionPoolStats(supabase: any): Promise<ConnectionPoolStats> {
    try {
      const { data, error } = await supabase
        .from('connection_pool_metrics')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        // Fallback to current connection count
        const { data: connectionData } = await supabase
          .rpc('get_current_connection_count')

        const connectionCount = connectionData || 0
        return {
          active: connectionCount,
          idle: 0,
          waiting: 0,
          total: connectionCount,
          peak: connectionCount,
          utilization: connectionCount > 0 ? (connectionCount / 100) * 100 : 0
        }
      }

      const utilization = data.total_connections > 0 
        ? (data.active_connections / data.total_connections) * 100 
        : 0

      return {
        active: data.active_connections,
        idle: data.idle_connections,
        waiting: data.waiting_connections,
        total: data.total_connections,
        peak: data.peak_connections,
        utilization
      }
    } catch (error) {
      logger.error('Error getting connection pool stats', error)
      return {
        active: 0,
        idle: 0,
        waiting: 0,
        total: 0,
        peak: 0,
        utilization: 0
      }
    }
  }

  /**
   * Log query performance metrics
   */
  async logQueryPerformance(
    queryType: string,
    executionTimeMs: number,
    rowsAffected?: number,
    userId?: string,
    cacheHit: boolean = false
  ): Promise<void> {
    try {
      const supabase = createClient()
      
      await supabase
        .rpc('log_query_performance', {
          p_query_type: queryType,
          p_execution_time_ms: executionTimeMs,
          p_rows_affected: rowsAffected,
          p_user_id: userId,
          p_cache_hit: cacheHit
        })

      // Also store in Redis for real-time monitoring
      const key = CacheKeys.rateLimitCounter(`query_perf:${queryType}`, 'recent')
      await this.cache.set(key, {
        type: queryType,
        time: executionTimeMs,
        rows: rowsAffected,
        cache: cacheHit,
        timestamp: new Date()
      }, CacheTTL.SHORT)

      // Check for performance alerts
      if (this.config.enableRealTimeAlerts) {
        await this.checkPerformanceAlerts(queryType, executionTimeMs)
      }
    } catch (error) {
      logger.error('Failed to log query performance', error)
    }
  }

  /**
   * Check for performance alerts
   */
  private async checkPerformanceAlerts(
    queryType: string,
    executionTimeMs: number
  ): Promise<void> {
    // Alert on slow queries
    if (executionTimeMs > this.alertThresholds.maxAverageQueryTime) {
      logger.warn('Slow query detected', {
        queryType,
        executionTimeMs,
        threshold: this.alertThresholds.maxAverageQueryTime,
        component: 'DatabasePerformanceMonitor'
      })

      // Store alert in cache for dashboard
      await this.cache.set(
        CacheKeys.rateLimitCounter('perf_alert', Date.now().toString()),
        {
          type: 'slow_query',
          queryType,
          executionTimeMs,
          timestamp: new Date()
        },
        CacheTTL.MEDIUM
      )
    }
  }

  /**
   * Collect and store metrics (internal monitoring loop)
   */
  private async collectAndStoreMetrics(): Promise<void> {
    try {
      const metrics = await this.collectMetrics()
      
      // Store in database for historical analysis
      const supabase = createClient()
      await supabase
        .from('connection_pool_metrics')
        .insert({
          active_connections: metrics.connectionPoolStats.active,
          idle_connections: metrics.connectionPoolStats.idle,
          waiting_connections: metrics.connectionPoolStats.waiting,
          total_connections: metrics.connectionPoolStats.total,
          peak_connections: metrics.connectionPoolStats.peak
        })

      // Check for alerts
      if (this.config.enableRealTimeAlerts) {
        await this.checkSystemAlerts(metrics)
      }

      logger.debug('Database metrics collected', {
        activeConnections: metrics.connectionPoolStats.active,
        cacheHitRatio: metrics.cacheHitRatio,
        averageQueryTime: metrics.averageQueryTime
      })
    } catch (error) {
      logger.error('Failed to collect database metrics', error)
    }
  }

  /**
   * Check for system-level performance alerts
   */
  private async checkSystemAlerts(metrics: DatabaseMetrics): Promise<void> {
    const alerts: Array<{ type: string; message: string; severity: 'warning' | 'critical' }> = []

    // Connection utilization alert
    if (metrics.connectionPoolStats.utilization > this.alertThresholds.maxConnectionUtilization) {
      alerts.push({
        type: 'high_connection_utilization',
        message: `Database connection utilization is ${metrics.connectionPoolStats.utilization.toFixed(1)}%`,
        severity: 'warning'
      })
    }

    // Cache hit ratio alert
    if (metrics.cacheHitRatio < this.alertThresholds.minCacheHitRatio) {
      alerts.push({
        type: 'low_cache_hit_ratio',
        message: `Database cache hit ratio is ${metrics.cacheHitRatio.toFixed(1)}%`,
        severity: 'warning'
      })
    }

    // Slow queries alert
    const recentSlowQueries = metrics.slowQueries.filter(
      q => q.avgExecutionTimeMs > this.config.slowQueryThreshold
    )
    
    if (recentSlowQueries.length > this.alertThresholds.maxSlowQueries) {
      alerts.push({
        type: 'excessive_slow_queries',
        message: `${recentSlowQueries.length} slow queries detected in the last hour`,
        severity: 'critical'
      })
    }

    // Log and store alerts
    for (const alert of alerts) {
      logger.warn('Database performance alert', {
        type: alert.type,
        message: alert.message,
        severity: alert.severity,
        metrics: {
          connectionUtilization: metrics.connectionPoolStats.utilization,
          cacheHitRatio: metrics.cacheHitRatio,
          averageQueryTime: metrics.averageQueryTime,
          slowQueriesCount: recentSlowQueries.length
        }
      })

      // Store alert for dashboard
      await this.cache.set(
        CacheKeys.rateLimitCounter('system_alert', Date.now().toString()),
        {
          ...alert,
          timestamp: new Date(),
          metrics: metrics
        },
        CacheTTL.LONG
      )
    }
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(timeRange: '1h' | '24h' | '7d' | '30d'): Promise<{
    queryTimes: Array<{ timestamp: Date; avgTime: number }>
    cacheHitRates: Array<{ timestamp: Date; hitRate: number }>
    connectionUtilization: Array<{ timestamp: Date; utilization: number }>
  }> {
    const cacheKey = CacheKeys.rateLimitCounter('perf_trends', timeRange)
    const cached = await this.cache.get(cacheKey)
    
    if (cached) {
      return cached
    }

    try {
      const supabase = createClient()
      
      // Get time-based aggregations from query performance log
      const interval = timeRange === '1h' ? '5 minutes' 
                    : timeRange === '24h' ? '1 hour'
                    : timeRange === '7d' ? '6 hours'
                    : '1 day'

      const [queryTrends, connectionTrends] = await Promise.all([
        supabase.rpc('get_query_time_trends', { 
          time_range: timeRange,
          interval: interval 
        }),
        supabase.rpc('get_connection_trends', { 
          time_range: timeRange,
          interval: interval 
        })
      ])

      const trends = {
        queryTimes: queryTrends.data || [],
        cacheHitRates: queryTrends.data || [],
        connectionUtilization: connectionTrends.data || []
      }

      // Cache trends data
      const cacheTTL = timeRange === '1h' ? CacheTTL.SHORT
                     : timeRange === '24h' ? CacheTTL.MEDIUM
                     : CacheTTL.LONG

      await this.cache.set(cacheKey, trends, cacheTTL)
      
      return trends
    } catch (error) {
      logger.error('Failed to get performance trends', error)
      return {
        queryTimes: [],
        cacheHitRates: [],
        connectionUtilization: []
      }
    }
  }

  /**
   * Get database health score (0-100)
   */
  async getDatabaseHealthScore(): Promise<{
    score: number
    factors: Array<{ name: string; score: number; weight: number; status: 'good' | 'warning' | 'critical' }>
  }> {
    const metrics = await this.getCurrentMetrics()
    
    const factors = [
      {
        name: 'Cache Hit Ratio',
        score: Math.min(100, metrics.cacheHitRatio),
        weight: 0.25,
        status: metrics.cacheHitRatio >= 90 ? 'good' 
              : metrics.cacheHitRatio >= 80 ? 'warning' : 'critical' as 'good' | 'warning' | 'critical'
      },
      {
        name: 'Query Performance',
        score: Math.max(0, 100 - (metrics.averageQueryTime / 10)),
        weight: 0.30,
        status: metrics.averageQueryTime <= 500 ? 'good'
              : metrics.averageQueryTime <= 1000 ? 'warning' : 'critical' as 'good' | 'warning' | 'critical'
      },
      {
        name: 'Connection Utilization',
        score: Math.max(0, 100 - metrics.connectionPoolStats.utilization),
        weight: 0.20,
        status: metrics.connectionPoolStats.utilization <= 70 ? 'good'
              : metrics.connectionPoolStats.utilization <= 85 ? 'warning' : 'critical' as 'good' | 'warning' | 'critical'
      },
      {
        name: 'Index Efficiency',
        score: Math.min(100, (metrics.indexUsage.filter(i => i.usageLevel !== 'Never Used').length / Math.max(1, metrics.indexUsage.length)) * 100),
        weight: 0.15,
        status: 'good' as 'good' | 'warning' | 'critical'
      },
      {
        name: 'Query Complexity',
        score: Math.max(0, 100 - metrics.slowQueries.length * 5),
        weight: 0.10,
        status: metrics.slowQueries.length <= 2 ? 'good'
              : metrics.slowQueries.length <= 5 ? 'warning' : 'critical' as 'good' | 'warning' | 'critical'
      }
    ]

    const weightedScore = factors.reduce((total, factor) => {
      return total + (factor.score * factor.weight)
    }, 0)

    return {
      score: Math.round(weightedScore),
      factors
    }
  }

  /**
   * Cleanup old performance data
   */
  async cleanup(): Promise<void> {
    try {
      const supabase = createClient()
      await supabase.rpc('cleanup_performance_logs')
      
      logger.info('Database performance data cleanup completed')
    } catch (error) {
      logger.error('Failed to cleanup performance data', error)
    }
  }
}

/**
 * Global database performance monitor instance
 */
export const databaseMonitor = new DatabasePerformanceMonitor({
  slowQueryThreshold: 1000,
  monitoringInterval: 30,
  retentionPeriod: 30,
  enableQueryPlanCapture: true,
  enableRealTimeAlerts: true
})

/**
 * Performance monitoring decorator for database queries
 */
export function withDatabasePerformanceLogging<T extends (...args: any[]) => Promise<any>>(
  queryType: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now()
    let error: Error | null = null
    let result: any = null
    
    try {
      result = await fn(...args)
      return result
    } catch (err) {
      error = err as Error
      throw err
    } finally {
      const executionTime = Date.now() - startTime
      
      // Log performance
      await databaseMonitor.logQueryPerformance(
        queryType,
        executionTime,
        Array.isArray(result) ? result.length : undefined,
        undefined,
        false
      ).catch(logError => {
        logger.error('Failed to log query performance', logError)
      })
      
      // Log error if present
      if (error) {
        logger.error(`Database query failed: ${queryType}`, {
          error: error.message,
          executionTime,
          args: args.length
        })
      }
    }
  }) as T
}

/**
 * Initialize database performance monitoring
 */
export async function initializeDatabaseMonitoring(): Promise<void> {
  try {
    // Start monitoring in production
    if (process.env.NODE_ENV === 'production') {
      databaseMonitor.startMonitoring()
    }
    
    logger.info('Database performance monitoring initialized')
  } catch (error) {
    logger.error('Failed to initialize database monitoring', error)
  }
}