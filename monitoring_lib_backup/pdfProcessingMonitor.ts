/**
 * PDF Processing Monitoring System
 * Tracks success rates, confidence scores, performance metrics, and security events
 */

import { createLogger } from '../logging/logger'
import { Sentry } from '../logging/logger'
import { supabase } from '../supabase/client'

// Initialize logger
const logger = createLogger('monitoring:pdf-processing')

/**
 * PDF Processing metrics interface
 */
export interface PDFProcessingMetrics {
  processingId: string
  userId?: string
  fileName: string
  fileSize: number
  fileType: string
  processingMethod: string
  processingTime: number
  confidence: number
  success: boolean
  errorType?: string
  errorMessage?: string
  piiDetected: boolean
  piiSensitivityScore: number
  dataEncrypted: boolean
  extractedDataQuality: {
    accountsFound: number
    negativeItemsFound: number
    inquiriesFound: number
    creditScoresFound: number
    personalInfoComplete: boolean
  }
  timestamp: string
}

/**
 * Processing success rate metrics
 */
export interface ProcessingSuccessMetrics {
  totalProcessed: number
  successful: number
  failed: number
  successRate: number
  methodBreakdown: Record<string, {
    total: number
    successful: number
    successRate: number
  }>
  timeframe: string
}

/**
 * Confidence score metrics
 */
export interface ConfidenceMetrics {
  averageConfidence: number
  confidenceDistribution: {
    high: number // 80-100%
    medium: number // 50-79%
    low: number // 0-49%
  }
  methodConfidence: Record<string, number>
  timeframe: string
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  averageProcessingTime: number
  medianProcessingTime: number
  p95ProcessingTime: number
  slowestProcessingTime: number
  fastestProcessingTime: number
  methodPerformance: Record<string, {
    average: number
    median: number
    p95: number
  }>
  timeframe: string
}

/**
 * Error rate metrics
 */
export interface ErrorRateMetrics {
  totalErrors: number
  errorRate: number
  errorTypes: Record<string, number>
  criticalErrors: number
  serviceFailures: Record<string, number>
  timeframe: string
}

/**
 * PDF Processing Monitor class
 */
export class PDFProcessingMonitor {
  private static instance: PDFProcessingMonitor
  private metrics: PDFProcessingMetrics[] = []
  private readonly MAX_METRICS_IN_MEMORY = 1000
  
  // Thresholds for alerts
  private readonly SUCCESS_RATE_THRESHOLD = 85 // 85% success rate
  private readonly CONFIDENCE_THRESHOLD = 60 // 60% average confidence
  private readonly PROCESSING_TIME_THRESHOLD = 10000 // 10 seconds
  private readonly ERROR_RATE_THRESHOLD = 15 // 15% error rate
  
  private constructor() {
    this.initializeMonitoring()
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): PDFProcessingMonitor {
    if (!PDFProcessingMonitor.instance) {
      PDFProcessingMonitor.instance = new PDFProcessingMonitor()
    }
    return PDFProcessingMonitor.instance
  }
  
  /**
   * Initialize monitoring system
   */
  private async initializeMonitoring(): Promise<void> {
    try {
      logger.info('Initializing PDF processing monitoring system')
      
      // Set up periodic metrics reporting
      setInterval(() => {
        this.generatePeriodicReport()
      }, 5 * 60 * 1000) // Every 5 minutes
      
      // Set up daily summary reports
      setInterval(() => {
        this.generateDailySummary()
      }, 24 * 60 * 60 * 1000) // Every 24 hours
      
    } catch (error) {
      logger.error('Failed to initialize PDF processing monitoring', error)
    }
  }
  
  /**
   * Record PDF processing metrics
   */
  async recordProcessingMetrics(metrics: PDFProcessingMetrics): Promise<void> {
    try {
      // Store metrics in memory
      this.metrics.push(metrics)
      
      // Keep only recent metrics in memory
      if (this.metrics.length > this.MAX_METRICS_IN_MEMORY) {
        this.metrics.shift()
      }
      
      // Store in database for persistence
      await this.storeMetricsInDatabase(metrics)
      
      // Log processing event
      logger.info('PDF processing completed', {
        processingId: metrics.processingId,
        success: metrics.success,
        processingMethod: metrics.processingMethod,
        processingTime: metrics.processingTime,
        confidence: metrics.confidence,
        fileSize: metrics.fileSize
      })
      
      // Send to Sentry for monitoring
      if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb({
          category: 'pdf_processing',
          message: `PDF processing ${metrics.success ? 'successful' : 'failed'}`,
          level: metrics.success ? 'info' : 'error',
          data: {
            processingId: metrics.processingId,
            processingMethod: metrics.processingMethod,
            confidence: metrics.confidence,
            processingTime: metrics.processingTime,
            piiDetected: metrics.piiDetected
          }
        })
      }
      
      // Check for alerts
      await this.checkForAlerts(metrics)
      
    } catch (error) {
      logger.error('Failed to record PDF processing metrics', error)
    }
  }
  
  /**
   * Store metrics in database
   */
  private async storeMetricsInDatabase(metrics: PDFProcessingMetrics): Promise<void> {
    try {
      // Use imported supabase client
      
      await supabase
        .from('pdf_processing_metrics')
        .insert({
          processing_id: metrics.processingId,
          user_id: metrics.userId,
          file_name: metrics.fileName,
          file_size: metrics.fileSize,
          file_type: metrics.fileType,
          processing_method: metrics.processingMethod,
          processing_time: metrics.processingTime,
          confidence: metrics.confidence,
          success: metrics.success,
          error_type: metrics.errorType,
          error_message: metrics.errorMessage,
          pii_detected: metrics.piiDetected,
          pii_sensitivity_score: metrics.piiSensitivityScore,
          data_encrypted: metrics.dataEncrypted,
          extracted_data_quality: metrics.extractedDataQuality,
          created_at: metrics.timestamp
        })
        
    } catch (error) {
      logger.error('Failed to store metrics in database', error)
    }
  }
  
  /**
   * Get processing success metrics
   */
  getSuccessMetrics(timeframe: string = '24h'): ProcessingSuccessMetrics {
    const filteredMetrics = this.filterMetricsByTimeframe(timeframe)
    
    if (filteredMetrics.length === 0) {
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        successRate: 0,
        methodBreakdown: {},
        timeframe
      }
    }
    
    const totalProcessed = filteredMetrics.length
    const successful = filteredMetrics.filter(m => m.success).length
    const failed = totalProcessed - successful
    const successRate = (successful / totalProcessed) * 100
    
    // Calculate method breakdown
    const methodBreakdown: Record<string, { total: number, successful: number, successRate: number }> = {}
    
    filteredMetrics.forEach(metric => {
      if (!methodBreakdown[metric.processingMethod]) {
        methodBreakdown[metric.processingMethod] = { total: 0, successful: 0, successRate: 0 }
      }
      
      methodBreakdown[metric.processingMethod].total++
      if (metric.success) {
        methodBreakdown[metric.processingMethod].successful++
      }
    })
    
    // Calculate success rates for each method
    Object.keys(methodBreakdown).forEach(method => {
      const { total, successful } = methodBreakdown[method]
      methodBreakdown[method].successRate = (successful / total) * 100
    })
    
    return {
      totalProcessed,
      successful,
      failed,
      successRate,
      methodBreakdown,
      timeframe
    }
  }
  
  /**
   * Get confidence score metrics
   */
  getConfidenceMetrics(timeframe: string = '24h'): ConfidenceMetrics {
    const filteredMetrics = this.filterMetricsByTimeframe(timeframe)
    const successfulMetrics = filteredMetrics.filter(m => m.success)
    
    if (successfulMetrics.length === 0) {
      return {
        averageConfidence: 0,
        confidenceDistribution: { high: 0, medium: 0, low: 0 },
        methodConfidence: {},
        timeframe
      }
    }
    
    // Calculate average confidence
    const averageConfidence = successfulMetrics.reduce((sum, m) => sum + m.confidence, 0) / successfulMetrics.length
    
    // Calculate confidence distribution
    const confidenceDistribution = {
      high: successfulMetrics.filter(m => m.confidence >= 80).length,
      medium: successfulMetrics.filter(m => m.confidence >= 50 && m.confidence < 80).length,
      low: successfulMetrics.filter(m => m.confidence < 50).length
    }
    
    // Calculate method confidence
    const methodConfidence: Record<string, number> = {}
    const methodGroups: Record<string, number[]> = {}
    
    successfulMetrics.forEach(metric => {
      if (!methodGroups[metric.processingMethod]) {
        methodGroups[metric.processingMethod] = []
      }
      methodGroups[metric.processingMethod].push(metric.confidence)
    })
    
    Object.keys(methodGroups).forEach(method => {
      const confidences = methodGroups[method]
      methodConfidence[method] = confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    })
    
    return {
      averageConfidence,
      confidenceDistribution,
      methodConfidence,
      timeframe
    }
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(timeframe: string = '24h'): PerformanceMetrics {
    const filteredMetrics = this.filterMetricsByTimeframe(timeframe)
    
    if (filteredMetrics.length === 0) {
      return {
        averageProcessingTime: 0,
        medianProcessingTime: 0,
        p95ProcessingTime: 0,
        slowestProcessingTime: 0,
        fastestProcessingTime: 0,
        methodPerformance: {},
        timeframe
      }
    }
    
    const processingTimes = filteredMetrics.map(m => m.processingTime).sort((a, b) => a - b)
    
    const averageProcessingTime = processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length
    const medianProcessingTime = processingTimes[Math.floor(processingTimes.length / 2)]
    const p95ProcessingTime = processingTimes[Math.floor(processingTimes.length * 0.95)]
    const slowestProcessingTime = Math.max(...processingTimes)
    const fastestProcessingTime = Math.min(...processingTimes)
    
    // Calculate method performance
    const methodPerformance: Record<string, { average: number, median: number, p95: number }> = {}
    const methodGroups: Record<string, number[]> = {}
    
    filteredMetrics.forEach(metric => {
      if (!methodGroups[metric.processingMethod]) {
        methodGroups[metric.processingMethod] = []
      }
      methodGroups[metric.processingMethod].push(metric.processingTime)
    })
    
    Object.keys(methodGroups).forEach(method => {
      const times = methodGroups[method].sort((a, b) => a - b)
      methodPerformance[method] = {
        average: times.reduce((sum, t) => sum + t, 0) / times.length,
        median: times[Math.floor(times.length / 2)],
        p95: times[Math.floor(times.length * 0.95)]
      }
    })
    
    return {
      averageProcessingTime,
      medianProcessingTime,
      p95ProcessingTime,
      slowestProcessingTime,
      fastestProcessingTime,
      methodPerformance,
      timeframe
    }
  }
  
  /**
   * Get error rate metrics
   */
  getErrorMetrics(timeframe: string = '24h'): ErrorRateMetrics {
    const filteredMetrics = this.filterMetricsByTimeframe(timeframe)
    
    if (filteredMetrics.length === 0) {
      return {
        totalErrors: 0,
        errorRate: 0,
        errorTypes: {},
        criticalErrors: 0,
        serviceFailures: {},
        timeframe
      }
    }
    
    const failedMetrics = filteredMetrics.filter(m => !m.success)
    const totalErrors = failedMetrics.length
    const errorRate = (totalErrors / filteredMetrics.length) * 100
    
    // Calculate error types
    const errorTypes: Record<string, number> = {}
    const serviceFailures: Record<string, number> = {}
    let criticalErrors = 0
    
    failedMetrics.forEach(metric => {
      if (metric.errorType) {
        errorTypes[metric.errorType] = (errorTypes[metric.errorType] || 0) + 1
        
        // Track service failures
        if (metric.errorType.includes('service') || metric.errorType.includes('api')) {
          serviceFailures[metric.errorType] = (serviceFailures[metric.errorType] || 0) + 1
        }
        
        // Track critical errors
        if (metric.errorType.includes('critical') || metric.errorType.includes('security')) {
          criticalErrors++
        }
      }
    })
    
    return {
      totalErrors,
      errorRate,
      errorTypes,
      criticalErrors,
      serviceFailures,
      timeframe
    }
  }
  
  /**
   * Check for alerts based on metrics
   */
  private async checkForAlerts(metrics: PDFProcessingMetrics): Promise<void> {
    try {
      // Check success rate alert
      const successMetrics = this.getSuccessMetrics('1h')
      if (successMetrics.totalProcessed >= 10 && successMetrics.successRate < this.SUCCESS_RATE_THRESHOLD) {
        await this.sendAlert('low_success_rate', {
          successRate: successMetrics.successRate,
          threshold: this.SUCCESS_RATE_THRESHOLD,
          totalProcessed: successMetrics.totalProcessed
        })
      }
      
      // Check confidence alert
      const confidenceMetrics = this.getConfidenceMetrics('1h')
      if (confidenceMetrics.averageConfidence < this.CONFIDENCE_THRESHOLD) {
        await this.sendAlert('low_confidence', {
          averageConfidence: confidenceMetrics.averageConfidence,
          threshold: this.CONFIDENCE_THRESHOLD
        })
      }
      
      // Check processing time alert
      if (metrics.processingTime > this.PROCESSING_TIME_THRESHOLD) {
        await this.sendAlert('slow_processing', {
          processingTime: metrics.processingTime,
          threshold: this.PROCESSING_TIME_THRESHOLD,
          processingMethod: metrics.processingMethod
        })
      }
      
      // Check error rate alert
      const errorMetrics = this.getErrorMetrics('1h')
      if (errorMetrics.errorRate > this.ERROR_RATE_THRESHOLD) {
        await this.sendAlert('high_error_rate', {
          errorRate: errorMetrics.errorRate,
          threshold: this.ERROR_RATE_THRESHOLD,
          totalErrors: errorMetrics.totalErrors
        })
      }
      
      // Check for service failures
      if (!metrics.success && metrics.errorType?.includes('service')) {
        await this.sendAlert('service_failure', {
          errorType: metrics.errorType,
          processingMethod: metrics.processingMethod,
          errorMessage: metrics.errorMessage
        })
      }
      
    } catch (error) {
      logger.error('Failed to check for alerts', error)
    }
  }
  
  /**
   * Send alert
   */
  private async sendAlert(alertType: string, data: any): Promise<void> {
    try {
      logger.warn(`PDF Processing Alert: ${alertType}`, data)
      
      // Send to Sentry
      if (process.env.SENTRY_DSN) {
        Sentry.captureMessage(`PDF Processing Alert: ${alertType}`, {
          level: 'warning',
          tags: {
            alertType,
            component: 'pdf-processing'
          },
          extra: data
        })
      }
      
      // Store alert in database
      // Use imported supabase client
      await supabase
        .from('system_alerts')
        .insert({
          alert_type: alertType,
          component: 'pdf-processing',
          severity: 'warning',
          data: data,
          created_at: new Date().toISOString()
        })
        
    } catch (error) {
      logger.error('Failed to send alert', error)
    }
  }
  
  /**
   * Filter metrics by timeframe
   */
  private filterMetricsByTimeframe(timeframe: string): PDFProcessingMetrics[] {
    const now = new Date()
    let cutoff: Date
    
    switch (timeframe) {
      case '1h':
        cutoff = new Date(now.getTime() - 60 * 60 * 1000)
        break
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
    
    return this.metrics.filter(metric => 
      new Date(metric.timestamp) >= cutoff
    )
  }
  
  /**
   * Generate periodic report
   */
  private async generatePeriodicReport(): Promise<void> {
    try {
      const successMetrics = this.getSuccessMetrics('1h')
      const confidenceMetrics = this.getConfidenceMetrics('1h')
      const performanceMetrics = this.getPerformanceMetrics('1h')
      const errorMetrics = this.getErrorMetrics('1h')
      
      logger.info('PDF Processing Periodic Report', {
        timeframe: '1h',
        successRate: successMetrics.successRate,
        averageConfidence: confidenceMetrics.averageConfidence,
        averageProcessingTime: performanceMetrics.averageProcessingTime,
        errorRate: errorMetrics.errorRate,
        totalProcessed: successMetrics.totalProcessed
      })
      
    } catch (error) {
      logger.error('Failed to generate periodic report', error)
    }
  }
  
  /**
   * Generate daily summary
   */
  private async generateDailySummary(): Promise<void> {
    try {
      const successMetrics = this.getSuccessMetrics('24h')
      const confidenceMetrics = this.getConfidenceMetrics('24h')
      const performanceMetrics = this.getPerformanceMetrics('24h')
      const errorMetrics = this.getErrorMetrics('24h')
      
      const summary = {
        date: new Date().toISOString().split('T')[0],
        totalProcessed: successMetrics.totalProcessed,
        successRate: successMetrics.successRate,
        averageConfidence: confidenceMetrics.averageConfidence,
        averageProcessingTime: performanceMetrics.averageProcessingTime,
        errorRate: errorMetrics.errorRate,
        methodBreakdown: successMetrics.methodBreakdown,
        confidenceDistribution: confidenceMetrics.confidenceDistribution,
        performanceP95: performanceMetrics.p95ProcessingTime,
        topErrors: errorMetrics.errorTypes
      }
      
      logger.info('PDF Processing Daily Summary', summary)
      
      // Store daily summary in database
      // Use imported supabase client
      await supabase
        .from('pdf_processing_daily_summary')
        .insert({
          date: summary.date,
          summary_data: summary,
          created_at: new Date().toISOString()
        })
        
    } catch (error) {
      logger.error('Failed to generate daily summary', error)
    }
  }
  
  /**
   * Get comprehensive monitoring dashboard data
   */
  getDashboardData(timeframe: string = '24h'): {
    success: ProcessingSuccessMetrics
    confidence: ConfidenceMetrics
    performance: PerformanceMetrics
    errors: ErrorRateMetrics
    recentActivity: PDFProcessingMetrics[]
  } {
    return {
      success: this.getSuccessMetrics(timeframe),
      confidence: this.getConfidenceMetrics(timeframe),
      performance: this.getPerformanceMetrics(timeframe),
      errors: this.getErrorMetrics(timeframe),
      recentActivity: this.filterMetricsByTimeframe('1h').slice(-10)
    }
  }
}

// Export singleton instance
export const pdfProcessingMonitor = PDFProcessingMonitor.getInstance()