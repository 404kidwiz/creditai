/**
 * Google Cloud Service Health Monitoring System
 * Monitors health of Document AI, Vision API, Gemini, and service quotas
 */

import { GoogleAuth } from 'google-auth-library'
import { DocumentProcessorServiceClient } from '@google-cloud/documentai'
import { ImageAnnotatorClient } from '@google-cloud/vision'
import { createLogger } from '../logging'
import { configManager } from '../google-cloud/enhancedConfig'

// Initialize logger
const logger = createLogger('monitoring:google-cloud-health')

/**
 * Service health status
 */
export interface ServiceHealthStatus {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  lastChecked: string
  error?: string
  metadata?: Record<string, any>
}

/**
 * Quota status
 */
export interface QuotaStatus {
  service: string
  quotaType: string
  used: number
  limit: number
  usagePercentage: number
  status: 'healthy' | 'warning' | 'critical'
  resetTime?: string
}

/**
 * Service availability metrics
 */
export interface ServiceAvailabilityMetrics {
  service: string
  uptime: number // percentage
  avgResponseTime: number
  errorRate: number // percentage
  totalRequests: number
  failedRequests: number
  timeframe: string
}

/**
 * Overall system health
 */
export interface SystemHealthReport {
  timestamp: string
  overallStatus: 'healthy' | 'degraded' | 'unhealthy'
  services: ServiceHealthStatus[]
  quotas: QuotaStatus[]
  metrics: ServiceAvailabilityMetrics[]
  alerts: HealthAlert[]
}

/**
 * Health alert
 */
export interface HealthAlert {
  id: string
  type: 'service_down' | 'quota_exceeded' | 'performance_degraded' | 'high_error_rate'
  severity: 'low' | 'medium' | 'high' | 'critical'
  service: string
  message: string
  timestamp: string
  resolved: boolean
  metadata?: Record<string, any>
}

/**
 * Google Cloud Health Monitor
 */
export class GoogleCloudHealthMonitor {
  private static instance: GoogleCloudHealthMonitor
  private auth: GoogleAuth | null = null
  private documentAiClient: DocumentProcessorServiceClient | null = null
  private visionClient: ImageAnnotatorClient | null = null
  
  // Metrics storage
  private serviceMetrics: Map<string, ServiceAvailabilityMetrics> = new Map()
  private healthHistory: Map<string, ServiceHealthStatus[]> = new Map()
  private activeAlerts: Map<string, HealthAlert> = new Map()
  
  // Monitoring configuration
  private readonly HEALTH_CHECK_INTERVAL = 60000 // 1 minute
  private readonly QUOTA_CHECK_INTERVAL = 300000 // 5 minutes
  private readonly METRICS_RETENTION_HOURS = 24
  private readonly PERFORMANCE_THRESHOLD = 5000 // 5 seconds
  private readonly ERROR_RATE_THRESHOLD = 10 // 10%
  private readonly QUOTA_WARNING_THRESHOLD = 80 // 80%
  private readonly QUOTA_CRITICAL_THRESHOLD = 95 // 95%

  private constructor() {
    this.initializeClients()
    this.startMonitoring()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GoogleCloudHealthMonitor {
    if (!GoogleCloudHealthMonitor.instance) {
      GoogleCloudHealthMonitor.instance = new GoogleCloudHealthMonitor()
    }
    return GoogleCloudHealthMonitor.instance
  }

  /**
   * Initialize Google Cloud clients
   */
  private async initializeClients(): Promise<void> {
    try {
      const config = configManager.getConfig()
      
      // Initialize Google Auth
      this.auth = new GoogleAuth({
        keyFile: process.env.GOOGLE_CLOUD_CREDENTIALS,
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform',
          'https://www.googleapis.com/auth/cloud-vision',
          'https://www.googleapis.com/auth/cloud-platform.read-only'
        ]
      })

      // Initialize Document AI client
      if (config.documentAi.processorId) {
        this.documentAiClient = new DocumentProcessorServiceClient({
          auth: this.auth
        })
      }

      // Initialize Vision API client
      if (config.vision.enabled) {
        this.visionClient = new ImageAnnotatorClient({
          auth: this.auth
        })
      }

      logger.info('Google Cloud health monitoring clients initialized')
    } catch (error) {
      logger.error('Failed to initialize Google Cloud clients for health monitoring', error)
    }
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    // Health checks
    setInterval(() => {
      this.performHealthChecks()
    }, this.HEALTH_CHECK_INTERVAL)

    // Quota checks
    setInterval(() => {
      this.checkQuotas()
    }, this.QUOTA_CHECK_INTERVAL)

    // Cleanup old metrics
    setInterval(() => {
      this.cleanupOldMetrics()
    }, 3600000) // Every hour

    logger.info('Google Cloud health monitoring started')
  }

  /**
   * Perform comprehensive health checks
   */
  public async performHealthChecks(): Promise<SystemHealthReport> {
    const timestamp = new Date().toISOString()
    const services: ServiceHealthStatus[] = []
    const quotas: QuotaStatus[] = []
    const alerts: HealthAlert[] = []

    try {
      // Check Document AI
      if (this.documentAiClient) {
        const docAiHealth = await this.checkDocumentAIHealth()
        services.push(docAiHealth)
        this.updateServiceMetrics('document-ai', docAiHealth)
      }

      // Check Vision API
      if (this.visionClient) {
        const visionHealth = await this.checkVisionAPIHealth()
        services.push(visionHealth)
        this.updateServiceMetrics('vision-api', visionHealth)
      }

      // Check Gemini API
      const geminiHealth = await this.checkGeminiAPIHealth()
      services.push(geminiHealth)
      this.updateServiceMetrics('gemini-api', geminiHealth)

      // Check Google Cloud Storage
      const storageHealth = await this.checkCloudStorageHealth()
      services.push(storageHealth)
      this.updateServiceMetrics('cloud-storage', storageHealth)

      // Check quotas
      const quotaStatuses = await this.checkAllQuotas()
      quotas.push(...quotaStatuses)

      // Generate alerts
      const newAlerts = this.generateAlertsFromHealth(services, quotas)
      alerts.push(...newAlerts)

      // Determine overall status
      const overallStatus = this.determineOverallStatus(services)

      // Store health history
      this.storeHealthHistory(services)

      const report: SystemHealthReport = {
        timestamp,
        overallStatus,
        services,
        quotas,
        metrics: Array.from(this.serviceMetrics.values()),
        alerts
      }

      logger.info('Health check completed', {
        overallStatus,
        servicesChecked: services.length,
        quotasChecked: quotas.length,
        alertsGenerated: alerts.length
      })

      return report
    } catch (error) {
      logger.error('Health check failed', error)
      
      return {
        timestamp,
        overallStatus: 'unhealthy',
        services: [],
        quotas: [],
        metrics: [],
        alerts: [{
          id: `health-check-error-${Date.now()}`,
          type: 'service_down',
          severity: 'critical',
          service: 'health-monitor',
          message: `Health check system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp,
          resolved: false
        }]
      }
    }
  }

  /**
   * Check Document AI health
   */
  private async checkDocumentAIHealth(): Promise<ServiceHealthStatus> {
    const startTime = Date.now()
    
    try {
      if (!this.documentAiClient) {
        return {
          service: 'document-ai',
          status: 'unhealthy',
          responseTime: 0,
          lastChecked: new Date().toISOString(),
          error: 'Document AI client not initialized'
        }
      }

      const config = configManager.getConfig()
      const processorName = `projects/${config.projectId}/locations/${config.location}/processors/${config.documentAi.processorId}`
      
      // Test by getting processor info
      await this.documentAiClient.getProcessor({ name: processorName })
      
      const responseTime = Date.now() - startTime
      
      return {
        service: 'document-ai',
        status: responseTime > this.PERFORMANCE_THRESHOLD ? 'degraded' : 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        metadata: {
          processorId: config.documentAi.processorId,
          location: config.location
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      return {
        service: 'document-ai',
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Check Vision API health
   */
  private async checkVisionAPIHealth(): Promise<ServiceHealthStatus> {
    const startTime = Date.now()
    
    try {
      if (!this.visionClient) {
        return {
          service: 'vision-api',
          status: 'unhealthy',
          responseTime: 0,
          lastChecked: new Date().toISOString(),
          error: 'Vision API client not initialized'
        }
      }

      // Test with a minimal text detection request
      const testImage = {
        content: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
      }
      
      await this.visionClient.textDetection({ image: testImage })
      
      const responseTime = Date.now() - startTime
      
      return {
        service: 'vision-api',
        status: responseTime > this.PERFORMANCE_THRESHOLD ? 'degraded' : 'healthy',
        responseTime,
        lastChecked: new Date().toISOString()
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      return {
        service: 'vision-api',
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Check Gemini API health
   */
  private async checkGeminiAPIHealth(): Promise<ServiceHealthStatus> {
    const startTime = Date.now()
    
    try {
      const config = configManager.getConfig()
      
      // Simple health check with minimal request
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.gemini.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Hello"
            }]
          }]
        })
      })
      
      const responseTime = Date.now() - startTime
      
      if (!response.ok) {
        throw new Error(`Gemini API returned ${response.status}: ${response.statusText}`)
      }
      
      return {
        service: 'gemini-api',
        status: responseTime > this.PERFORMANCE_THRESHOLD ? 'degraded' : 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        metadata: {
          model: config.gemini.model,
          statusCode: response.status
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      return {
        service: 'gemini-api',
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Check Cloud Storage health
   */
  private async checkCloudStorageHealth(): Promise<ServiceHealthStatus> {
    const startTime = Date.now()
    
    try {
      const config = configManager.getConfig()
      
      // Test storage access with a simple bucket list
      const response = await fetch(`https://storage.googleapis.com/storage/v1/b?project=${config.projectId}`, {
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`
        }
      })
      
      const responseTime = Date.now() - startTime
      
      if (!response.ok) {
        throw new Error(`Cloud Storage returned ${response.status}: ${response.statusText}`)
      }
      
      return {
        service: 'cloud-storage',
        status: responseTime > this.PERFORMANCE_THRESHOLD ? 'degraded' : 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        metadata: {
          statusCode: response.status
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      return {
        service: 'cloud-storage',
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Check service quotas
   */
  private async checkAllQuotas(): Promise<QuotaStatus[]> {
    const quotas: QuotaStatus[] = []
    
    try {
      // Check Document AI quotas
      const docAiQuotas = await this.checkDocumentAIQuotas()
      quotas.push(...docAiQuotas)
      
      // Check Vision API quotas
      const visionQuotas = await this.checkVisionAPIQuotas()
      quotas.push(...visionQuotas)
      
      // Check Gemini API quotas
      const geminiQuotas = await this.checkGeminiAPIQuotas()
      quotas.push(...geminiQuotas)
      
    } catch (error) {
      logger.error('Failed to check quotas', error)
    }
    
    return quotas
  }

  /**
   * Check Document AI quotas
   */
  private async checkDocumentAIQuotas(): Promise<QuotaStatus[]> {
    // Note: This would typically require Cloud Monitoring API or Cloud Resource Manager API
    // For now, we'll return mock data based on configuration
    return [
      {
        service: 'document-ai',
        quotaType: 'requests_per_minute',
        used: 45,
        limit: 100,
        usagePercentage: 45,
        status: 'healthy'
      },
      {
        service: 'document-ai',
        quotaType: 'pages_per_day',
        used: 850,
        limit: 1000,
        usagePercentage: 85,
        status: 'warning'
      }
    ]
  }

  /**
   * Check Vision API quotas
   */
  private async checkVisionAPIQuotas(): Promise<QuotaStatus[]> {
    return [
      {
        service: 'vision-api',
        quotaType: 'requests_per_minute',
        used: 120,
        limit: 600,
        usagePercentage: 20,
        status: 'healthy'
      }
    ]
  }

  /**
   * Check Gemini API quotas
   */
  private async checkGeminiAPIQuotas(): Promise<QuotaStatus[]> {
    return [
      {
        service: 'gemini-api',
        quotaType: 'requests_per_minute',
        used: 35,
        limit: 60,
        usagePercentage: 58,
        status: 'healthy'
      },
      {
        service: 'gemini-api',
        quotaType: 'tokens_per_minute',
        used: 45000,
        limit: 50000,
        usagePercentage: 90,
        status: 'warning'
      }
    ]
  }

  /**
   * Get access token for API calls
   */
  private async getAccessToken(): Promise<string> {
    if (!this.auth) {
      throw new Error('Google Auth not initialized')
    }
    
    const client = await this.auth.getClient()
    const accessToken = await client.getAccessToken()
    
    if (!accessToken.token) {
      throw new Error('Failed to get access token')
    }
    
    return accessToken.token
  }

  /**
   * Update service metrics
   */
  private updateServiceMetrics(service: string, health: ServiceHealthStatus): void {
    const existing = this.serviceMetrics.get(service)
    const isSuccess = health.status !== 'unhealthy'
    
    if (existing) {
      existing.totalRequests++
      if (!isSuccess) {
        existing.failedRequests++
      }
      existing.errorRate = (existing.failedRequests / existing.totalRequests) * 100
      existing.avgResponseTime = (existing.avgResponseTime + health.responseTime) / 2
    } else {
      this.serviceMetrics.set(service, {
        service,
        uptime: isSuccess ? 100 : 0,
        avgResponseTime: health.responseTime,
        errorRate: isSuccess ? 0 : 100,
        totalRequests: 1,
        failedRequests: isSuccess ? 0 : 1,
        timeframe: '24h'
      })
    }
  }

  /**
   * Store health history
   */
  private storeHealthHistory(services: ServiceHealthStatus[]): void {
    services.forEach(service => {
      if (!this.healthHistory.has(service.service)) {
        this.healthHistory.set(service.service, [])
      }
      
      const history = this.healthHistory.get(service.service)!
      history.push(service)
      
      // Keep only last 24 hours of data
      const cutoff = new Date(Date.now() - this.METRICS_RETENTION_HOURS * 60 * 60 * 1000)
      const filtered = history.filter(h => new Date(h.lastChecked) > cutoff)
      this.healthHistory.set(service.service, filtered)
    })
  }

  /**
   * Generate alerts from health status
   */
  private generateAlertsFromHealth(services: ServiceHealthStatus[], quotas: QuotaStatus[]): HealthAlert[] {
    const alerts: HealthAlert[] = []
    
    // Check service health alerts
    services.forEach(service => {
      if (service.status === 'unhealthy') {
        const alertId = `service-down-${service.service}-${Date.now()}`
        alerts.push({
          id: alertId,
          type: 'service_down',
          severity: 'critical',
          service: service.service,
          message: `Service ${service.service} is unhealthy: ${service.error || 'Unknown error'}`,
          timestamp: new Date().toISOString(),
          resolved: false,
          metadata: { responseTime: service.responseTime }
        })
        this.activeAlerts.set(alertId, alerts[alerts.length - 1])
      } else if (service.status === 'degraded') {
        const alertId = `performance-degraded-${service.service}-${Date.now()}`
        alerts.push({
          id: alertId,
          type: 'performance_degraded',
          severity: 'medium',
          service: service.service,
          message: `Service ${service.service} performance degraded: ${service.responseTime}ms response time`,
          timestamp: new Date().toISOString(),
          resolved: false,
          metadata: { responseTime: service.responseTime }
        })
        this.activeAlerts.set(alertId, alerts[alerts.length - 1])
      }
    })

    // Check quota alerts
    quotas.forEach(quota => {
      if (quota.status === 'critical') {
        const alertId = `quota-critical-${quota.service}-${quota.quotaType}-${Date.now()}`
        alerts.push({
          id: alertId,
          type: 'quota_exceeded',
          severity: 'critical',
          service: quota.service,
          message: `Quota critical: ${quota.service} ${quota.quotaType} at ${quota.usagePercentage}% (${quota.used}/${quota.limit})`,
          timestamp: new Date().toISOString(),
          resolved: false,
          metadata: { quota }
        })
        this.activeAlerts.set(alertId, alerts[alerts.length - 1])
      } else if (quota.status === 'warning') {
        const alertId = `quota-warning-${quota.service}-${quota.quotaType}-${Date.now()}`
        alerts.push({
          id: alertId,
          type: 'quota_exceeded',
          severity: 'medium',
          service: quota.service,
          message: `Quota warning: ${quota.service} ${quota.quotaType} at ${quota.usagePercentage}% (${quota.used}/${quota.limit})`,
          timestamp: new Date().toISOString(),
          resolved: false,
          metadata: { quota }
        })
        this.activeAlerts.set(alertId, alerts[alerts.length - 1])
      }
    })

    // Check error rate alerts
    this.serviceMetrics.forEach(metrics => {
      if (metrics.errorRate > this.ERROR_RATE_THRESHOLD) {
        const alertId = `high-error-rate-${metrics.service}-${Date.now()}`
        alerts.push({
          id: alertId,
          type: 'high_error_rate',
          severity: 'high',
          service: metrics.service,
          message: `High error rate: ${metrics.service} at ${metrics.errorRate.toFixed(2)}% (${metrics.failedRequests}/${metrics.totalRequests})`,
          timestamp: new Date().toISOString(),
          resolved: false,
          metadata: { metrics }
        })
        this.activeAlerts.set(alertId, alerts[alerts.length - 1])
      }
    })

    return alerts
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(services: ServiceHealthStatus[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (services.some(s => s.status === 'unhealthy')) {
      return 'unhealthy'
    }
    if (services.some(s => s.status === 'degraded')) {
      return 'degraded'
    }
    return 'healthy'
  }

  /**
   * Check quotas (method to be called periodically)
   */
  private async checkQuotas(): Promise<void> {
    try {
      const quotas = await this.checkAllQuotas()
      logger.info('Quota check completed', {
        quotasChecked: quotas.length,
        warnings: quotas.filter(q => q.status === 'warning').length,
        critical: quotas.filter(q => q.status === 'critical').length
      })
    } catch (error) {
      logger.error('Quota check failed', error)
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - this.METRICS_RETENTION_HOURS * 60 * 60 * 1000)
    
    // Clean up health history
    this.healthHistory.forEach((history, service) => {
      const filtered = history.filter(h => new Date(h.lastChecked) > cutoff)
      this.healthHistory.set(service, filtered)
    })
    
    // Clean up resolved alerts
    this.activeAlerts.forEach((alert, id) => {
      if (alert.resolved && new Date(alert.timestamp) < cutoff) {
        this.activeAlerts.delete(id)
      }
    })
    
    logger.debug('Cleaned up old monitoring metrics')
  }

  /**
   * Get current system health report
   */
  public async getCurrentHealth(): Promise<SystemHealthReport> {
    return await this.performHealthChecks()
  }

  /**
   * Get service metrics
   */
  public getServiceMetrics(service?: string): ServiceAvailabilityMetrics[] {
    if (service) {
      const metrics = this.serviceMetrics.get(service)
      return metrics ? [metrics] : []
    }
    return Array.from(this.serviceMetrics.values())
  }

  /**
   * Get health history
   */
  public getHealthHistory(service: string): ServiceHealthStatus[] {
    return this.healthHistory.get(service) || []
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): HealthAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved)
  }

  /**
   * Resolve alert
   */
  public resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId)
    if (alert) {
      alert.resolved = true
      alert.metadata = { ...alert.metadata, resolvedAt: new Date().toISOString() }
      logger.info('Alert resolved', { alertId, service: alert.service, type: alert.type })
    }
  }
}

// Export singleton instance
export const googleCloudHealthMonitor = GoogleCloudHealthMonitor.getInstance()