/**
 * Business Logic Monitoring
 * Monitors credit analysis accuracy and dispute success rates
 */

import { createLogger } from '../logging'
import { Sentry } from './apm'

// Initialize logger
const logger = createLogger('monitoring:business')

/**
 * Credit analysis accuracy metrics
 */
interface CreditAnalysisMetrics {
  analysisId: string
  userId?: string
  expectedScore?: number
  actualScore?: number
  scoreAccuracy?: number
  negativeItemsAccuracy?: number
  accountsAccuracy?: number
  inquiriesAccuracy?: number
  processingMethod: string
  processingTime: number
  confidenceScore: number
  timestamp: string
}

/**
 * Dispute success metrics
 */
interface DisputeMetrics {
  disputeId: string
  userId?: string
  disputeType: string
  creditor: string
  bureau?: string
  isSuccessful: boolean
  responseTime?: number
  responseType?: string
  submissionDate: string
  resolutionDate?: string
  expectedOutcome?: string
  actualOutcome?: string
  strategy?: string
  timestamp: string
}

/**
 * Business metrics storage
 */
class BusinessMetricsStore {
  private static instance: BusinessMetricsStore
  private creditAnalysisMetrics: CreditAnalysisMetrics[] = []
  private disputeMetrics: DisputeMetrics[] = []
  private metricsDb: any = null // Would be a database connection in production

  private constructor() {
    // Initialize metrics storage
    this.initializeStorage()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BusinessMetricsStore {
    if (!BusinessMetricsStore.instance) {
      BusinessMetricsStore.instance = new BusinessMetricsStore()
    }
    return BusinessMetricsStore.instance
  }

  /**
   * Initialize metrics storage
   */
  private async initializeStorage(): Promise<void> {
    try {
      // In production, this would connect to a database
      logger.info('Initializing business metrics storage')
    } catch (error) {
      logger.error('Failed to initialize business metrics storage', error)
    }
  }

  /**
   * Store credit analysis metrics
   */
  async storeCreditAnalysisMetrics(metrics: CreditAnalysisMetrics): Promise<void> {
    try {
      // In production, this would store in a database
      this.creditAnalysisMetrics.push(metrics)
      
      // Keep only the last 1000 metrics in memory
      if (this.creditAnalysisMetrics.length > 1000) {
        this.creditAnalysisMetrics.shift()
      }
      
      logger.info('Stored credit analysis metrics', { 
        analysisId: metrics.analysisId,
        confidenceScore: metrics.confidenceScore,
        processingMethod: metrics.processingMethod
      })
    } catch (error) {
      logger.error('Failed to store credit analysis metrics', error)
    }
  }

  /**
   * Store dispute metrics
   */
  async storeDisputeMetrics(metrics: DisputeMetrics): Promise<void> {
    try {
      // In production, this would store in a database
      this.disputeMetrics.push(metrics)
      
      // Keep only the last 1000 metrics in memory
      if (this.disputeMetrics.length > 1000) {
        this.disputeMetrics.shift()
      }
      
      logger.info('Stored dispute metrics', { 
        disputeId: metrics.disputeId,
        disputeType: metrics.disputeType,
        isSuccessful: metrics.isSuccessful
      })
    } catch (error) {
      logger.error('Failed to store dispute metrics', error)
    }
  }

  /**
   * Get credit analysis accuracy metrics
   */
  getCreditAnalysisMetrics(timeframe?: string): CreditAnalysisMetrics[] {
    if (!timeframe) {
      return this.creditAnalysisMetrics
    }
    
    const now = new Date()
    let cutoff: Date
    
    switch (timeframe) {
      case '24h':
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        cutoff = new Date(0) // All metrics
    }
    
    return this.creditAnalysisMetrics.filter(metric => 
      new Date(metric.timestamp) >= cutoff
    )
  }

  /**
   * Get dispute success metrics
   */
  getDisputeMetrics(timeframe?: string, disputeType?: string): DisputeMetrics[] {
    let metrics = this.disputeMetrics
    
    // Filter by timeframe
    if (timeframe) {
      const now = new Date()
      let cutoff: Date
      
      switch (timeframe) {
        case '24h':
          cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '7d':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          cutoff = new Date(0) // All metrics
      }
      
      metrics = metrics.filter(metric => 
        new Date(metric.timestamp) >= cutoff
      )
    }
    
    // Filter by dispute type
    if (disputeType && disputeType !== 'all') {
      metrics = metrics.filter(metric => 
        metric.disputeType === disputeType
      )
    }
    
    return metrics
  }

  /**
   * Calculate credit analysis accuracy statistics
   */
  calculateCreditAnalysisStats(timeframe?: string): {
    totalAnalyses: number
    averageConfidence: number
    averageScoreAccuracy: number
    averageProcessingTime: number
    methodBreakdown: Record<string, number>
  } {
    const metrics = this.getCreditAnalysisMetrics(timeframe)
    
    if (metrics.length === 0) {
      return {
        totalAnalyses: 0,
        averageConfidence: 0,
        averageScoreAccuracy: 0,
        averageProcessingTime: 0,
        methodBreakdown: {}
      }
    }
    
    // Calculate statistics
    const totalAnalyses = metrics.length
    const averageConfidence = metrics.reduce((sum, metric) => sum + metric.confidenceScore, 0) / totalAnalyses
    
    // Calculate score accuracy (if available)
    const metricsWithScoreAccuracy = metrics.filter(m => m.scoreAccuracy !== undefined)
    const averageScoreAccuracy = metricsWithScoreAccuracy.length > 0
      ? metricsWithScoreAccuracy.reduce((sum, metric) => sum + (metric.scoreAccuracy || 0), 0) / metricsWithScoreAccuracy.length
      : 0
    
    const averageProcessingTime = metrics.reduce((sum, metric) => sum + metric.processingTime, 0) / totalAnalyses
    
    // Calculate method breakdown
    const methodBreakdown: Record<string, number> = {}
    metrics.forEach(metric => {
      methodBreakdown[metric.processingMethod] = (methodBreakdown[metric.processingMethod] || 0) + 1
    })
    
    return {
      totalAnalyses,
      averageConfidence,
      averageScoreAccuracy,
      averageProcessingTime,
      methodBreakdown
    }
  }

  /**
   * Calculate dispute success statistics
   */
  calculateDisputeStats(timeframe?: string, disputeType?: string): {
    totalDisputes: number
    successRate: number
    averageResponseTime: number
    typeBreakdown: Record<string, { total: number, successful: number, rate: number }>
  } {
    const metrics = this.getDisputeMetrics(timeframe, disputeType)
    
    if (metrics.length === 0) {
      return {
        totalDisputes: 0,
        successRate: 0,
        averageResponseTime: 0,
        typeBreakdown: {}
      }
    }
    
    // Calculate statistics
    const totalDisputes = metrics.length
    const successfulDisputes = metrics.filter(m => m.isSuccessful).length
    const successRate = (successfulDisputes / totalDisputes) * 100
    
    // Calculate average response time (if available)
    const metricsWithResponseTime = metrics.filter(m => m.responseTime !== undefined)
    const averageResponseTime = metricsWithResponseTime.length > 0
      ? metricsWithResponseTime.reduce((sum, metric) => sum + (metric.responseTime || 0), 0) / metricsWithResponseTime.length
      : 0
    
    // Calculate type breakdown
    const typeBreakdown: Record<string, { total: number, successful: number, rate: number }> = {}
    metrics.forEach(metric => {
      if (!typeBreakdown[metric.disputeType]) {
        typeBreakdown[metric.disputeType] = { total: 0, successful: 0, rate: 0 }
      }
      
      typeBreakdown[metric.disputeType].total++
      if (metric.isSuccessful) {
        typeBreakdown[metric.disputeType].successful++
      }
    })
    
    // Calculate success rate for each type
    Object.keys(typeBreakdown).forEach(type => {
      const { total, successful } = typeBreakdown[type]
      typeBreakdown[type].rate = (successful / total) * 100
    })
    
    return {
      totalDisputes,
      successRate,
      averageResponseTime,
      typeBreakdown
    }
  }
}

/**
 * Business metrics monitor
 */
export class BusinessMonitor {
  private static readonly ACCURACY_THRESHOLD = 90 // 90% accuracy threshold
  private static readonly SUCCESS_RATE_THRESHOLD = 70 // 70% success rate threshold
  private static readonly PROCESSING_TIME_THRESHOLD = 5000 // 5 seconds processing time threshold
  
  private metricsStore: BusinessMetricsStore
  
  constructor() {
    this.metricsStore = BusinessMetricsStore.getInstance()
  }
  
  /**
   * Monitor credit analysis accuracy
   */
  async monitorCreditAnalysis(metrics: CreditAnalysisMetrics): Promise<void> {
    try {
      // Store metrics
      await this.metricsStore.storeCreditAnalysisMetrics(metrics)
      
      // Log to Sentry for monitoring
      if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb({
          category: 'credit_analysis',
          message: `Credit analysis ${metrics.analysisId}`,
          level: 'info',
          data: {
            analysisId: metrics.analysisId,
            confidenceScore: metrics.confidenceScore,
            processingMethod: metrics.processingMethod,
            processingTime: metrics.processingTime
          }
        })
        
        // Check for issues
        this.checkCreditAnalysisIssues(metrics)
      }
    } catch (error) {
      logger.error('Failed to monitor credit analysis', error)
    }
  }
  
  /**
   * Monitor dispute success
   */
  async monitorDisputeSuccess(metrics: DisputeMetrics): Promise<void> {
    try {
      // Store metrics
      await this.metricsStore.storeDisputeMetrics(metrics)
      
      // Log to Sentry for monitoring
      if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb({
          category: 'dispute_success',
          message: `Dispute ${metrics.disputeId}: ${metrics.isSuccessful ? 'successful' : 'failed'}`,
          level: metrics.isSuccessful ? 'info' : 'warning',
          data: {
            disputeId: metrics.disputeId,
            disputeType: metrics.disputeType,
            isSuccessful: metrics.isSuccessful,
            creditor: metrics.creditor,
            bureau: metrics.bureau
          }
        })
        
        // Check for issues
        this.checkDisputeIssues(metrics)
      }
    } catch (error) {
      logger.error('Failed to monitor dispute success', error)
    }
  }
  
  /**
   * Check for credit analysis issues
   */
  private checkCreditAnalysisIssues(metrics: CreditAnalysisMetrics): void {
    // Check confidence score
    if (metrics.confidenceScore < 50) {
      Sentry.captureMessage(`Low confidence credit analysis: ${metrics.analysisId}`, {
        level: 'warning',
        tags: {
          analysisId: metrics.analysisId,
          confidenceScore: String(metrics.confidenceScore),
          processingMethod: metrics.processingMethod
        }
      })
    }
    
    // Check score accuracy if available
    if (metrics.scoreAccuracy !== undefined && metrics.scoreAccuracy < this.ACCURACY_THRESHOLD) {
      Sentry.captureMessage(`Low accuracy credit analysis: ${metrics.analysisId}`, {
        level: 'warning',
        tags: {
          analysisId: metrics.analysisId,
          scoreAccuracy: String(metrics.scoreAccuracy),
          processingMethod: metrics.processingMethod
        }
      })
    }
    
    // Check processing time
    if (metrics.processingTime > this.PROCESSING_TIME_THRESHOLD) {
      Sentry.captureMessage(`Slow credit analysis: ${metrics.analysisId}`, {
        level: 'warning',
        tags: {
          analysisId: metrics.analysisId,
          processingTime: String(metrics.processingTime),
          processingMethod: metrics.processingMethod
        }
      })
    }
  }
  
  /**
   * Check for dispute issues
   */
  private checkDisputeIssues(metrics: DisputeMetrics): void {
    // Check for failed disputes
    if (!metrics.isSuccessful) {
      Sentry.captureMessage(`Failed dispute: ${metrics.disputeId}`, {
        level: 'warning',
        tags: {
          disputeId: metrics.disputeId,
          disputeType: metrics.disputeType,
          creditor: metrics.creditor,
          bureau: metrics.bureau || 'unknown'
        }
      })
    }
    
    // Check for slow responses if available
    if (metrics.responseTime !== undefined && metrics.responseTime > 30) { // 30 days
      Sentry.captureMessage(`Slow dispute response: ${metrics.disputeId}`, {
        level: 'warning',
        tags: {
          disputeId: metrics.disputeId,
          disputeType: metrics.disputeType,
          responseTime: String(metrics.responseTime),
          creditor: metrics.creditor
        }
      })
    }
  }
  
  /**
   * Get credit analysis statistics
   */
  getCreditAnalysisStats(timeframe?: string): ReturnType<typeof BusinessMetricsStore.prototype.calculateCreditAnalysisStats> {
    return this.metricsStore.calculateCreditAnalysisStats(timeframe)
  }
  
  /**
   * Get dispute statistics
   */
  getDisputeStats(timeframe?: string, disputeType?: string): ReturnType<typeof BusinessMetricsStore.prototype.calculateDisputeStats> {
    return this.metricsStore.calculateDisputeStats(timeframe, disputeType)
  }
  
  /**
   * Generate business metrics report
   */
  generateBusinessMetricsReport(): {
    creditAnalysis: ReturnType<typeof BusinessMetricsStore.prototype.calculateCreditAnalysisStats>
    disputes: ReturnType<typeof BusinessMetricsStore.prototype.calculateDisputeStats>
    timestamp: string
  } {
    return {
      creditAnalysis: this.getCreditAnalysisStats('30d'),
      disputes: this.getDisputeStats('30d'),
      timestamp: new Date().toISOString()
    }
  }
}

// Export singleton instance
export const businessMonitor = new BusinessMonitor()