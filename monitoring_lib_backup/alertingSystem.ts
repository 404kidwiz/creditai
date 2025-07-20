/**
 * Comprehensive Alerting System
 * Supports multiple notification channels: email, Slack, webhook, SMS
 */

import { createLogger } from '../logging'
import { HealthAlert, SystemHealthReport } from './googleCloudHealthMonitor'

// Initialize logger
const logger = createLogger('monitoring:alerting')

/**
 * Alert configuration
 */
export interface AlertConfig {
  id: string
  name: string
  enabled: boolean
  channels: AlertChannel[]
  rules: AlertRule[]
  cooldownMinutes: number
  escalationRules?: EscalationRule[]
}

/**
 * Alert channel
 */
export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'teams' | 'discord'
  name: string
  enabled: boolean
  config: Record<string, any>
  retryConfig?: RetryConfig
}

/**
 * Alert rule
 */
export interface AlertRule {
  id: string
  name: string
  condition: AlertCondition
  severity: 'low' | 'medium' | 'high' | 'critical'
  services?: string[]
  metrics?: MetricThreshold[]
}

/**
 * Alert condition
 */
export interface AlertCondition {
  type: 'service_down' | 'quota_exceeded' | 'performance_degraded' | 'high_error_rate' | 'custom'
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains'
  value: any
  duration?: number // minutes
}

/**
 * Metric threshold
 */
export interface MetricThreshold {
  metric: string
  operator: 'gt' | 'lt' | 'gte' | 'lte'
  value: number
  duration: number // minutes
}

/**
 * Escalation rule
 */
export interface EscalationRule {
  afterMinutes: number
  channels: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number
  retryDelayMs: number
  exponentialBackoff: boolean
}

/**
 * Alert notification
 */
export interface AlertNotification {
  id: string
  alertId: string
  channelType: string
  channelName: string
  status: 'pending' | 'sent' | 'failed' | 'retrying'
  sentAt?: string
  error?: string
  retryCount: number
  nextRetryAt?: string
}

/**
 * Alert history
 */
export interface AlertHistory {
  alertId: string
  status: 'triggered' | 'resolved' | 'escalated' | 'suppressed'
  timestamp: string
  details: Record<string, any>
}

/**
 * Alerting System
 */
export class AlertingSystem {
  private static instance: AlertingSystem
  private configs: Map<string, AlertConfig> = new Map()
  private notifications: Map<string, AlertNotification> = new Map()
  private history: AlertHistory[] = []
  private cooldowns: Map<string, Date> = new Map()
  
  // Default configurations
  private readonly DEFAULT_COOLDOWN_MINUTES = 15
  private readonly MAX_HISTORY_ENTRIES = 10000
  private readonly NOTIFICATION_TIMEOUT_MS = 30000

  private constructor() {
    this.initializeDefaultConfigs()
    this.startBackgroundTasks()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AlertingSystem {
    if (!AlertingSystem.instance) {
      AlertingSystem.instance = new AlertingSystem()
    }
    return AlertingSystem.instance
  }

  /**
   * Initialize default alert configurations
   */
  private initializeDefaultConfigs(): void {
    // Critical service alerts
    this.addAlertConfig({
      id: 'critical-service-alerts',
      name: 'Critical Service Alerts',
      enabled: true,
      cooldownMinutes: 5,
      channels: this.getDefaultChannels(),
      rules: [
        {
          id: 'service-down',
          name: 'Service Down',
          condition: {
            type: 'service_down',
            operator: 'eq',
            value: true
          },
          severity: 'critical'
        },
        {
          id: 'quota-critical',
          name: 'Quota Critical',
          condition: {
            type: 'quota_exceeded',
            operator: 'gte',
            value: 95
          },
          severity: 'critical'
        }
      ],
      escalationRules: [
        {
          afterMinutes: 15,
          channels: ['email-admin', 'slack-critical'],
          severity: 'critical'
        }
      ]
    })

    // Performance alerts
    this.addAlertConfig({
      id: 'performance-alerts',
      name: 'Performance Degradation Alerts',
      enabled: true,
      cooldownMinutes: 10,
      channels: this.getDefaultChannels(),
      rules: [
        {
          id: 'performance-degraded',
          name: 'Performance Degraded',
          condition: {
            type: 'performance_degraded',
            operator: 'gt',
            value: 5000,
            duration: 5
          },
          severity: 'medium'
        },
        {
          id: 'high-error-rate',
          name: 'High Error Rate',
          condition: {
            type: 'high_error_rate',
            operator: 'gt',
            value: 10,
            duration: 5
          },
          severity: 'high'
        }
      ]
    })

    // Quota warnings
    this.addAlertConfig({
      id: 'quota-warnings',
      name: 'Quota Warning Alerts',
      enabled: true,
      cooldownMinutes: 30,
      channels: this.getDefaultChannels().filter(c => c.type !== 'sms'), // No SMS for warnings
      rules: [
        {
          id: 'quota-warning',
          name: 'Quota Warning',
          condition: {
            type: 'quota_exceeded',
            operator: 'gte',
            value: 80
          },
          severity: 'medium'
        }
      ]
    })

    logger.info('Default alert configurations initialized')
  }

  /**
   * Get default notification channels
   */
  private getDefaultChannels(): AlertChannel[] {
    const channels: AlertChannel[] = []

    // Email channel
    if (process.env.SMTP_HOST) {
      channels.push({
        type: 'email',
        name: 'email-admin',
        enabled: true,
        config: {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          recipients: (process.env.ALERT_EMAIL_RECIPIENTS || '').split(',').filter(Boolean)
        },
        retryConfig: {
          maxRetries: 3,
          retryDelayMs: 5000,
          exponentialBackoff: true
        }
      })
    }

    // Slack channel
    if (process.env.SLACK_WEBHOOK_URL) {
      channels.push({
        type: 'slack',
        name: 'slack-alerts',
        enabled: true,
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || '#alerts',
          username: 'CreditAI Monitor',
          iconEmoji: ':warning:'
        },
        retryConfig: {
          maxRetries: 3,
          retryDelayMs: 2000,
          exponentialBackoff: true
        }
      })

      // Critical Slack channel
      if (process.env.SLACK_CRITICAL_WEBHOOK_URL) {
        channels.push({
          type: 'slack',
          name: 'slack-critical',
          enabled: true,
          config: {
            webhookUrl: process.env.SLACK_CRITICAL_WEBHOOK_URL,
            channel: process.env.SLACK_CRITICAL_CHANNEL || '#critical-alerts',
            username: 'CreditAI Monitor',
            iconEmoji: ':rotating_light:'
          },
          retryConfig: {
            maxRetries: 5,
            retryDelayMs: 1000,
            exponentialBackoff: true
          }
        })
      }
    }

    // Webhook channel
    if (process.env.ALERT_WEBHOOK_URL) {
      channels.push({
        type: 'webhook',
        name: 'webhook-alerts',
        enabled: true,
        config: {
          url: process.env.ALERT_WEBHOOK_URL,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.ALERT_WEBHOOK_AUTH
          }
        },
        retryConfig: {
          maxRetries: 3,
          retryDelayMs: 3000,
          exponentialBackoff: true
        }
      })
    }

    // SMS channel (using Twilio)
    if (process.env.TWILIO_ACCOUNT_SID) {
      channels.push({
        type: 'sms',
        name: 'sms-critical',
        enabled: true,
        config: {
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          fromNumber: process.env.TWILIO_FROM_NUMBER,
          recipients: (process.env.ALERT_SMS_RECIPIENTS || '').split(',').filter(Boolean)
        },
        retryConfig: {
          maxRetries: 2,
          retryDelayMs: 5000,
          exponentialBackoff: false
        }
      })
    }

    return channels
  }

  /**
   * Start background tasks
   */
  private startBackgroundTasks(): void {
    // Process notification queue
    setInterval(() => {
      this.processNotificationQueue()
    }, 5000) // Every 5 seconds

    // Clean up old history
    setInterval(() => {
      this.cleanupHistory()
    }, 3600000) // Every hour

    // Check escalations
    setInterval(() => {
      this.checkEscalations()
    }, 60000) // Every minute

    logger.info('Alerting system background tasks started')
  }

  /**
   * Process health report and trigger alerts
   */
  public async processHealthReport(report: SystemHealthReport): Promise<void> {
    try {
      for (const alert of report.alerts) {
        await this.processAlert(alert)
      }
    } catch (error) {
      logger.error('Failed to process health report alerts', error as Error)
    }
  }

  /**
   * Process individual alert
   */
  public async processAlert(alert: HealthAlert): Promise<void> {
    try {
      // Check if alert is in cooldown
      const cooldownKey = `${alert.type}-${alert.service}`
      const cooldownEnd = this.cooldowns.get(cooldownKey)
      
      if (cooldownEnd && new Date() < cooldownEnd) {
        logger.debug('Alert suppressed due to cooldown', { alertId: alert.id, cooldownKey })
        this.addToHistory(alert.id, 'suppressed', { reason: 'cooldown' })
        return
      }

      // Find matching configurations
      const matchingConfigs = this.findMatchingConfigs(alert)
      
      if (matchingConfigs.length === 0) {
        logger.debug('No matching alert configurations found', { alertId: alert.id })
        return
      }

      // Send notifications for each matching config
      for (const config of matchingConfigs) {
        if (!config.enabled) continue

        await this.sendAlertNotifications(alert, config)
        
        // Set cooldown
        const cooldownEnd = new Date(Date.now() + (config.cooldownMinutes || this.DEFAULT_COOLDOWN_MINUTES) * 60000)
        this.cooldowns.set(cooldownKey, cooldownEnd)
      }

      this.addToHistory(alert.id, 'triggered', { configs: matchingConfigs.map(c => c.id) })
      
    } catch (error) {
      logger.error('Failed to process alert', { alertId: alert.id, error })
    }
  }

  /**
   * Find matching alert configurations
   */
  private findMatchingConfigs(alert: HealthAlert): AlertConfig[] {
    const matching: AlertConfig[] = []
    
    for (const config of this.configs.values()) {
      if (!config.enabled) continue
      
      for (const rule of config.rules) {
        if (this.evaluateRule(rule, alert)) {
          matching.push(config)
          break
        }
      }
    }
    
    return matching
  }

  /**
   * Evaluate alert rule
   */
  private evaluateRule(rule: AlertRule, alert: HealthAlert): boolean {
    // Check service filter
    if (rule.services && !rule.services.includes(alert.service)) {
      return false
    }

    // Check alert type
    if (rule.condition.type !== alert.type) {
      return false
    }

    // Check severity
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 }
    if (severityLevels[alert.severity] < severityLevels[rule.severity]) {
      return false
    }

    // Evaluate condition
    return this.evaluateCondition(rule.condition, alert)
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(condition: AlertCondition, alert: HealthAlert): boolean {
    const { operator, value } = condition
    let alertValue: any

    // Extract value based on alert type
    switch (condition.type) {
      case 'service_down':
        alertValue = true
        break
      case 'quota_exceeded':
        alertValue = alert.metadata?.quota?.usagePercentage || 0
        break
      case 'performance_degraded':
        alertValue = alert.metadata?.responseTime || 0
        break
      case 'high_error_rate':
        alertValue = alert.metadata?.metrics?.errorRate || 0
        break
      default:
        return false
    }

    // Apply operator
    switch (operator) {
      case 'eq':
        return alertValue === value
      case 'gt':
        return alertValue > value
      case 'lt':
        return alertValue < value
      case 'gte':
        return alertValue >= value
      case 'lte':
        return alertValue <= value
      case 'contains':
        return String(alertValue).includes(String(value))
      default:
        return false
    }
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alert: HealthAlert, config: AlertConfig): Promise<void> {
    for (const channel of config.channels) {
      if (!channel.enabled) continue

      const notification: AlertNotification = {
        id: `${alert.id}-${channel.name}-${Date.now()}`,
        alertId: alert.id,
        channelType: channel.type,
        channelName: channel.name,
        status: 'pending',
        retryCount: 0
      }

      this.notifications.set(notification.id, notification)
      await this.sendNotification(notification, alert, channel)
    }
  }

  /**
   * Send individual notification
   */
  private async sendNotification(notification: AlertNotification, alert: HealthAlert, channel: AlertChannel): Promise<void> {
    try {
      notification.status = 'pending'
      
      switch (channel.type) {
        case 'email':
          await this.sendEmailNotification(alert, channel)
          break
        case 'slack':
          await this.sendSlackNotification(alert, channel)
          break
        case 'webhook':
          await this.sendWebhookNotification(alert, channel)
          break
        case 'sms':
          await this.sendSMSNotification(alert, channel)
          break
        case 'teams':
          await this.sendTeamsNotification(alert, channel)
          break
        case 'discord':
          await this.sendDiscordNotification(alert, channel)
          break
        default:
          throw new Error(`Unsupported channel type: ${channel.type}`)
      }

      notification.status = 'sent'
      notification.sentAt = new Date().toISOString()
      
      logger.info('Alert notification sent successfully', {
        alertId: alert.id,
        channelType: channel.type,
        channelName: channel.name
      })

    } catch (error) {
      notification.status = 'failed'
      notification.error = error instanceof Error ? error.message : 'Unknown error'
      
      logger.error('Failed to send alert notification', {
        alertId: alert.id,
        channelType: channel.type,
        channelName: channel.name,
        error: notification.error
      })

      // Schedule retry if configured
      if (channel.retryConfig && notification.retryCount < channel.retryConfig.maxRetries) {
        this.scheduleRetry(notification, channel)
      }
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: HealthAlert, channel: AlertChannel): Promise<void> {
    const nodemailer = require('nodemailer')
    
    const transporter = nodemailer.createTransporter(channel.config)
    
    const subject = `CreditAI Alert: ${alert.type} - ${alert.service}`
    const html = this.generateEmailHTML(alert)
    
    for (const recipient of channel.config.recipients) {
      await transporter.sendMail({
        from: channel.config.auth.user,
        to: recipient,
        subject,
        html
      })
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(alert: HealthAlert, channel: AlertChannel): Promise<void> {
    const payload = {
      channel: channel.config.channel,
      username: channel.config.username,
      icon_emoji: channel.config.iconEmoji,
      attachments: [{
        color: this.getSlackColor(alert.severity),
        title: `${alert.type.replace('_', ' ').toUpperCase()}: ${alert.service}`,
        text: alert.message,
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Service',
            value: alert.service,
            short: true
          },
          {
            title: 'Time',
            value: new Date(alert.timestamp).toLocaleString(),
            short: true
          }
        ],
        footer: 'CreditAI Monitoring',
        ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
      }]
    }

    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Slack API returned ${response.status}: ${response.statusText}`)
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: HealthAlert, channel: AlertChannel): Promise<void> {
    const payload = {
      alert,
      timestamp: new Date().toISOString(),
      source: 'creditai-monitoring'
    }

    const response = await fetch(channel.config.url, {
      method: channel.config.method || 'POST',
      headers: channel.config.headers || { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.NOTIFICATION_TIMEOUT_MS)
    })

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${response.statusText}`)
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(alert: HealthAlert, channel: AlertChannel): Promise<void> {
    const twilio = require('twilio')
    const client = twilio(channel.config.accountSid, channel.config.authToken)
    
    const message = `CreditAI Alert: ${alert.service} - ${alert.type.replace('_', ' ')} (${alert.severity}). ${alert.message}`
    
    for (const recipient of channel.config.recipients) {
      await client.messages.create({
        body: message.substring(0, 160), // SMS length limit
        from: channel.config.fromNumber,
        to: recipient
      })
    }
  }

  /**
   * Send Teams notification
   */
  private async sendTeamsNotification(alert: HealthAlert, channel: AlertChannel): Promise<void> {
    const payload = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: this.getTeamsColor(alert.severity),
      summary: `CreditAI Alert: ${alert.service}`,
      sections: [{
        activityTitle: `${alert.type.replace('_', ' ').toUpperCase()}`,
        activitySubtitle: alert.service,
        text: alert.message,
        facts: [
          { name: 'Severity', value: alert.severity.toUpperCase() },
          { name: 'Service', value: alert.service },
          { name: 'Time', value: new Date(alert.timestamp).toLocaleString() }
        ]
      }]
    }

    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Teams webhook returned ${response.status}: ${response.statusText}`)
    }
  }

  /**
   * Send Discord notification
   */
  private async sendDiscordNotification(alert: HealthAlert, channel: AlertChannel): Promise<void> {
    const payload = {
      embeds: [{
        title: `${alert.type.replace('_', ' ').toUpperCase()}: ${alert.service}`,
        description: alert.message,
        color: this.getDiscordColor(alert.severity),
        fields: [
          { name: 'Severity', value: alert.severity.toUpperCase(), inline: true },
          { name: 'Service', value: alert.service, inline: true },
          { name: 'Time', value: new Date(alert.timestamp).toLocaleString(), inline: true }
        ],
        footer: { text: 'CreditAI Monitoring' },
        timestamp: alert.timestamp
      }]
    }

    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Discord webhook returned ${response.status}: ${response.statusText}`)
    }
  }

  /**
   * Generate email HTML
   */
  private generateEmailHTML(alert: HealthAlert): string {
    const severityColor = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545'
    }[alert.severity]

    return `
      <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="border-left: 4px solid ${severityColor}; padding-left: 20px; margin-bottom: 20px;">
              <h1 style="color: #333; margin: 0; font-size: 24px;">CreditAI Alert</h1>
              <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">${new Date(alert.timestamp).toLocaleString()}</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
              <h2 style="color: #333; margin: 0 0 10px 0; font-size: 18px;">${alert.type.replace('_', ' ').toUpperCase()}</h2>
              <p style="color: #666; margin: 0; font-size: 16px;">${alert.message}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Service:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${alert.service}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Severity:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                  <span style="background-color: ${severityColor}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; text-transform: uppercase;">
                    ${alert.severity}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Alert ID:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${alert.id}</td>
              </tr>
            </table>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
              <p>This alert was generated by CreditAI Monitoring System. If you believe this is a false positive, please check the system dashboard.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  /**
   * Get Slack color for severity
   */
  private getSlackColor(severity: string): string {
    const colors = {
      low: 'good',
      medium: 'warning',
      high: '#ff6b35',
      critical: 'danger'
    }
    return colors[severity as keyof typeof colors] || 'warning'
  }

  /**
   * Get Teams color for severity
   */
  private getTeamsColor(severity: string): string {
    const colors = {
      low: '28a745',
      medium: 'ffc107',
      high: 'fd7e14',
      critical: 'dc3545'
    }
    return colors[severity as keyof typeof colors] || 'ffc107'
  }

  /**
   * Get Discord color for severity
   */
  private getDiscordColor(severity: string): number {
    const colors = {
      low: 0x28a745,
      medium: 0xffc107,
      high: 0xfd7e14,
      critical: 0xdc3545
    }
    return colors[severity as keyof typeof colors] || 0xffc107
  }

  /**
   * Schedule notification retry
   */
  private scheduleRetry(notification: AlertNotification, channel: AlertChannel): void {
    if (!channel.retryConfig) return

    const delay = channel.retryConfig.exponentialBackoff
      ? channel.retryConfig.retryDelayMs * Math.pow(2, notification.retryCount)
      : channel.retryConfig.retryDelayMs

    notification.nextRetryAt = new Date(Date.now() + delay).toISOString()
    notification.status = 'retrying'
    notification.retryCount++

    logger.info('Scheduled notification retry', {
      notificationId: notification.id,
      retryCount: notification.retryCount,
      nextRetryAt: notification.nextRetryAt
    })
  }

  /**
   * Process notification queue (retries)
   */
  private async processNotificationQueue(): Promise<void> {
    const now = new Date()
    
    for (const notification of this.notifications.values()) {
      if (notification.status === 'retrying' && notification.nextRetryAt) {
        if (new Date(notification.nextRetryAt) <= now) {
          // Find the original alert and channel
          // This would require storing more context in notification
          logger.debug('Processing retry for notification', { notificationId: notification.id })
        }
      }
    }
  }

  /**
   * Check for alert escalations
   */
  private checkEscalations(): Promise<void> {
    // Implementation for escalation logic
    return Promise.resolve()
  }

  /**
   * Add alert configuration
   */
  public addAlertConfig(config: AlertConfig): void {
    this.configs.set(config.id, config)
    logger.info('Alert configuration added', { configId: config.id, name: config.name })
  }

  /**
   * Remove alert configuration
   */
  public removeAlertConfig(configId: string): void {
    this.configs.delete(configId)
    logger.info('Alert configuration removed', { configId })
  }

  /**
   * Get alert configurations
   */
  public getAlertConfigs(): AlertConfig[] {
    return Array.from(this.configs.values())
  }

  /**
   * Add to history
   */
  private addToHistory(alertId: string, status: AlertHistory['status'], details: Record<string, any>): void {
    this.history.push({
      alertId,
      status,
      timestamp: new Date().toISOString(),
      details
    })

    // Keep history size manageable
    if (this.history.length > this.MAX_HISTORY_ENTRIES) {
      this.history.shift()
    }
  }

  /**
   * Clean up old history
   */
  private cleanupHistory(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
    this.history = this.history.filter(h => new Date(h.timestamp) > cutoff)
    
    // Clean up old notifications
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.sentAt && new Date(notification.sentAt) < cutoff) {
        this.notifications.delete(id)
      }
    }

    logger.debug('Cleaned up old alert history and notifications')
  }

  /**
   * Get alert history
   */
  public getAlertHistory(alertId?: string): AlertHistory[] {
    if (alertId) {
      return this.history.filter(h => h.alertId === alertId)
    }
    return [...this.history]
  }

  /**
   * Get notification status
   */
  public getNotificationStatus(): AlertNotification[] {
    return Array.from(this.notifications.values())
  }

  /**
   * Test alert configuration
   */
  public async testAlertConfig(configId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const config = this.configs.get(configId)
      if (!config) {
        return { success: false, error: 'Configuration not found' }
      }

      // Create test alert
      const testAlert: HealthAlert = {
        id: `test-${Date.now()}`,
        type: 'service_down',
        severity: 'medium',
        service: 'test-service',
        message: 'This is a test alert to verify configuration',
        timestamp: new Date().toISOString(),
        resolved: false
      }

      await this.sendAlertNotifications(testAlert, config)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

// Export singleton instance
export const alertingSystem = AlertingSystem.getInstance()