/**
 * Security Monitoring System with Anomaly Detection
 * Real-time security monitoring, anomaly detection, and threat analysis
 */

import { createLogger } from '../logging/logger'
import { createClient } from '../supabase/client'
import { enhancedAuditLogger, EnhancedAuditEventType, RiskLevel } from './enhancedAuditLogger'
import { sessionManager } from './sessionManager'

const logger = createLogger('security:monitor')

/**
 * Anomaly types that can be detected
 */
export enum AnomalyType {
  UNUSUAL_LOGIN_PATTERN = 'unusual_login_pattern',
  SUSPICIOUS_LOCATION = 'suspicious_location',
  ABNORMAL_DATA_ACCESS = 'abnormal_data_access',
  RAPID_FILE_UPLOADS = 'rapid_file_uploads',
  FAILED_AUTH_SPIKE = 'failed_auth_spike',
  UNUSUAL_API_USAGE = 'unusual_api_usage',
  OFF_HOURS_ACCESS = 'off_hours_access',
  MULTIPLE_DEVICE_ACCESS = 'multiple_device_access',
  DATA_EXFILTRATION = 'data_exfiltration',
  PRIVILEGE_ESCALATION = 'privilege_escalation'
}

/**
 * Security alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Security alert interface
 */
export interface SecurityAlert {
  id: string
  alertType: AnomalyType
  severity: AlertSeverity
  userId?: string
  ipAddress?: string
  userAgent?: string
  description: string
  evidence: Record<string, any>
  recommendations: string[]
  autoMitigated: boolean
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
  createdAt: string
  resolvedAt?: string
}

/**
 * User behavior profile
 */
export interface UserBehaviorProfile {
  userId: string
  normalLoginHours: number[]
  commonLocations: string[]
  avgSessionDuration: number
  avgFilesPerSession: number
  commonDevices: string[]
  lastUpdated: string
}

/**
 * Security metrics for monitoring
 */
export interface SecurityMetrics {
  activeUsers: number
  failedLogins: number
  successfulLogins: number
  dataAccessEvents: number
  fileUploads: number
  suspiciousActivities: number
  activeAlerts: number
  resolvedAlerts: number
  avgSessionDuration: number
}

/**
 * Threat intelligence data
 */
export interface ThreatIntelligence {
  maliciousIPs: Set<string>
  suspiciousUserAgents: Set<string>
  knownAttackPatterns: Map<string, RegExp>
  geoBlockedCountries: Set<string>
}

/**
 * Security monitoring configuration
 */
export interface SecurityMonitorConfig {
  anomalyDetection: {
    enabled: boolean
    sensitivityLevel: 'low' | 'medium' | 'high'
    lookbackPeriodHours: number
    minEventsForBaseline: number
  }
  alerting: {
    enabled: boolean
    realTimeAlerting: boolean
    emailNotifications: boolean
    slackNotifications: boolean
    webhookUrl?: string
  }
  autoMitigation: {
    enabled: boolean
    blockSuspiciousIPs: boolean
    lockSuspiciousAccounts: boolean
    requireMFAOnAnomaly: boolean
  }
  behaviorProfiling: {
    enabled: boolean
    learningPeriodDays: number
    updateFrequencyHours: number
  }
}

/**
 * Security Monitor class
 */
export class SecurityMonitor {
  private static instance: SecurityMonitor
  private config: SecurityMonitorConfig
  private userProfiles = new Map<string, UserBehaviorProfile>()
  private threatIntel: ThreatIntelligence
  private alertQueue: SecurityAlert[] = []
  private isProcessing = false
  
  private constructor() {
    this.config = this.loadConfiguration()
    this.threatIntel = this.initializeThreatIntelligence()
    this.initializeMonitoring()
  }
  
  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor()
    }
    return SecurityMonitor.instance
  }
  
  /**
   * Initialize security monitoring
   */
  private initializeMonitoring(): void {
    // Start real-time monitoring
    if (this.config.anomalyDetection.enabled) {
      this.startAnomalyDetection()
    }
    
    // Start behavior profiling updates
    if (this.config.behaviorProfiling.enabled) {
      this.startBehaviorProfiling()
    }
    
    // Process alert queue
    setInterval(() => {
      this.processAlertQueue()
    }, 5000) // Process alerts every 5 seconds
    
    logger.info('Security monitoring initialized', {
      anomalyDetection: this.config.anomalyDetection.enabled,
      behaviorProfiling: this.config.behaviorProfiling.enabled,
      autoMitigation: this.config.autoMitigation.enabled
    })
  }
  
  /**
   * Monitor user login for anomalies
   */
  async monitorLogin(
    userId: string,
    ipAddress: string,
    userAgent: string,
    location?: { country: string; city: string },
    deviceFingerprint?: string
  ): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = []
    
    try {
      const userProfile = await this.getUserBehaviorProfile(userId)
      
      // Check for unusual login patterns
      const loginAnomalies = await this.detectLoginAnomalies(
        userId,
        ipAddress,
        userAgent,
        location,
        deviceFingerprint,
        userProfile
      )
      
      alerts.push(...loginAnomalies)
      
      // Check against threat intelligence
      const threatAlerts = this.checkThreatIntelligence(ipAddress, userAgent)
      alerts.push(...threatAlerts)
      
      // Queue alerts for processing
      alerts.forEach(alert => this.queueAlert(alert))
      
      return alerts
      
    } catch (error) {
      logger.error('Error monitoring login', error)
      return []
    }
  }
  
  /**
   * Monitor data access patterns
   */
  async monitorDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    dataSize: number,
    ipAddress: string
  ): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = []
    
    try {
      // Check for unusual data access patterns
      const accessAnomalies = await this.detectDataAccessAnomalies(
        userId,
        resourceType,
        dataSize
      )
      
      alerts.push(...accessAnomalies)
      
      // Check for potential data exfiltration
      const exfiltrationAlert = await this.detectDataExfiltration(
        userId,
        resourceType,
        dataSize
      )
      
      if (exfiltrationAlert) {
        alerts.push(exfiltrationAlert)
      }
      
      // Queue alerts for processing
      alerts.forEach(alert => this.queueAlert(alert))
      
      return alerts
      
    } catch (error) {
      logger.error('Error monitoring data access', error)
      return []
    }
  }
  
  /**
   * Monitor file upload activities
   */
  async monitorFileUpload(
    userId: string,
    fileName: string,
    fileSize: number,
    fileType: string,
    ipAddress: string
  ): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = []
    
    try {
      // Check for rapid file uploads
      const rapidUploadAlert = await this.detectRapidFileUploads(userId)
      if (rapidUploadAlert) {
        alerts.push(rapidUploadAlert)
      }
      
      // Check for suspicious file patterns
      const suspiciousFileAlert = this.detectSuspiciousFilePatterns(
        fileName,
        fileSize,
        fileType
      )
      
      if (suspiciousFileAlert) {
        alerts.push(suspiciousFileAlert)
      }
      
      // Queue alerts for processing
      alerts.forEach(alert => this.queueAlert(alert))
      
      return alerts
      
    } catch (error) {
      logger.error('Error monitoring file upload', error)
      return []
    }
  }
  
  /**
   * Monitor API usage patterns
   */
  async monitorAPIUsage(
    userId: string,
    endpoint: string,
    requestCount: number,
    timeWindow: number
  ): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = []
    
    try {
      // Check for unusual API usage
      const apiAnomalies = await this.detectUnusualAPIUsage(
        userId,
        endpoint,
        requestCount,
        timeWindow
      )
      
      alerts.push(...apiAnomalies)
      
      // Queue alerts for processing
      alerts.forEach(alert => this.queueAlert(alert))
      
      return alerts
      
    } catch (error) {
      logger.error('Error monitoring API usage', error)
      return []
    }
  }
  
  /**
   * Detect login anomalies
   */
  private async detectLoginAnomalies(
    userId: string,
    ipAddress: string,
    userAgent: string,
    location?: { country: string; city: string },
    deviceFingerprint?: string,
    userProfile?: UserBehaviorProfile
  ): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = []
    
    if (!userProfile) return alerts
    
    // Check for off-hours access
    const currentHour = new Date().getHours()
    if (!userProfile.normalLoginHours.includes(currentHour)) {
      alerts.push(this.createAlert(
        AnomalyType.OFF_HOURS_ACCESS,
        AlertSeverity.MEDIUM,
        userId,
        ipAddress,
        userAgent,
        'User logging in during unusual hours',
        {
          currentHour,
          normalHours: userProfile.normalLoginHours,
          location
        },
        ['Monitor user activity closely', 'Consider requiring additional verification']
      ))
    }
    
    // Check for suspicious location
    if (location && !userProfile.commonLocations.includes(location.country)) {
      alerts.push(this.createAlert(
        AnomalyType.SUSPICIOUS_LOCATION,
        AlertSeverity.HIGH,
        userId,
        ipAddress,
        userAgent,
        'User logging in from unusual location',
        {
          newLocation: location,
          commonLocations: userProfile.commonLocations
        },
        ['Verify user identity', 'Consider requiring MFA', 'Monitor for account takeover']
      ))
    }
    
    // Check for multiple device access
    if (deviceFingerprint && !userProfile.commonDevices.includes(deviceFingerprint)) {
      alerts.push(this.createAlert(
        AnomalyType.MULTIPLE_DEVICE_ACCESS,
        AlertSeverity.MEDIUM,
        userId,
        ipAddress,
        userAgent,
        'User logging in from new device',
        {
          newDevice: deviceFingerprint,
          commonDevices: userProfile.commonDevices.length
        },
        ['Verify device ownership', 'Monitor for unauthorized access']
      ))
    }
    
    return alerts
  }
  
  /**
   * Detect data access anomalies
   */
  private async detectDataAccessAnomalies(
    userId: string,
    resourceType: string,
    dataSize: number
  ): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = []
    
    try {
      const supabase = createClient()
      
      // Get recent data access patterns
      const { data: recentAccess } = await supabase
        .from('enhanced_security_audit_log')
        .select('*')
        .eq('user_id', userId)
        .eq('event_type', EnhancedAuditEventType.DATA_ACCESS)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
      
      if (recentAccess && recentAccess.length > 0) {
        // Check for abnormal data access patterns
        const avgDataSize = recentAccess.reduce((sum, record) => 
          sum + (record.event_details.dataSize || 0), 0
        ) / recentAccess.length
        
        if (dataSize > avgDataSize * 5) { // 5x normal access
          alerts.push(this.createAlert(
            AnomalyType.ABNORMAL_DATA_ACCESS,
            AlertSeverity.HIGH,
            userId,
            undefined,
            undefined,
            'User accessing unusually large amount of data',
            {
              currentDataSize: dataSize,
              averageDataSize: avgDataSize,
              resourceType
            },
            ['Investigate data access purpose', 'Monitor for data exfiltration', 'Consider data loss prevention measures']
          ))
        }
      }
      
      return alerts
      
    } catch (error) {
      logger.error('Error detecting data access anomalies', error)
      return []
    }
  }
  
  /**
   * Detect potential data exfiltration
   */
  private async detectDataExfiltration(
    userId: string,
    resourceType: string,
    dataSize: number
  ): Promise<SecurityAlert | null> {
    try {
      const supabase = createClient()
      
      // Check data access volume in the last hour
      const { data: hourlyAccess } = await supabase
        .from('enhanced_security_audit_log')
        .select('event_details')
        .eq('user_id', userId)
        .eq('event_type', EnhancedAuditEventType.DATA_ACCESS)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      
      if (hourlyAccess) {
        const totalDataAccessed = hourlyAccess.reduce((sum, record) => 
          sum + (record.event_details.dataSize || 0), 0
        )
        
        // Threshold for potential data exfiltration (100MB in 1 hour)
        const EXFILTRATION_THRESHOLD = 100 * 1024 * 1024
        
        if (totalDataAccessed > EXFILTRATION_THRESHOLD) {
          return this.createAlert(
            AnomalyType.DATA_EXFILTRATION,
            AlertSeverity.CRITICAL,
            userId,
            undefined,
            undefined,
            'Potential data exfiltration detected',
            {
              totalDataAccessed,
              threshold: EXFILTRATION_THRESHOLD,
              timeWindow: '1 hour',
              accessCount: hourlyAccess.length
            },
            [
              'Immediately investigate user activity',
              'Consider suspending user account',
              'Review all recent data access',
              'Implement data loss prevention measures',
              'Contact security team'
            ]
          )
        }
      }
      
      return null
      
    } catch (error) {
      logger.error('Error detecting data exfiltration', error)
      return null
    }
  }
  
  /**
   * Detect rapid file uploads
   */
  private async detectRapidFileUploads(userId: string): Promise<SecurityAlert | null> {
    try {
      const supabase = createClient()
      
      // Check file uploads in the last 10 minutes
      const { data: recentUploads } = await supabase
        .from('enhanced_security_audit_log')
        .select('*')
        .eq('user_id', userId)
        .eq('event_type', EnhancedAuditEventType.DOCUMENT_UPLOADED)
        .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      
      if (recentUploads && recentUploads.length > 20) { // More than 20 uploads in 10 minutes
        return this.createAlert(
          AnomalyType.RAPID_FILE_UPLOADS,
          AlertSeverity.MEDIUM,
          userId,
          undefined,
          undefined,
          'User uploading files at unusual rate',
          {
            uploadCount: recentUploads.length,
            timeWindow: '10 minutes',
            threshold: 20
          },
          ['Monitor user activity', 'Check for automated behavior', 'Verify legitimate business purpose']
        )
      }
      
      return null
      
    } catch (error) {
      logger.error('Error detecting rapid file uploads', error)
      return null
    }
  }
  
  /**
   * Detect suspicious file patterns
   */
  private detectSuspiciousFilePatterns(
    fileName: string,
    fileSize: number,
    fileType: string
  ): SecurityAlert | null {
    // Check for suspicious file extensions
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.vbs', '.js']
    const extension = fileName.toLowerCase().split('.').pop()
    
    if (extension && suspiciousExtensions.includes(`.${extension}`)) {
      return this.createAlert(
        AnomalyType.UNUSUAL_API_USAGE, // Reuse for file pattern anomalies
        AlertSeverity.HIGH,
        undefined,
        undefined,
        undefined,
        'Suspicious file type uploaded',
        {
          fileName: fileName.replace(/[^.]/g, '*'), // Mask filename but keep extension
          fileType,
          fileSize,
          suspiciousExtension: extension
        },
        ['Quarantine file immediately', 'Scan for malware', 'Investigate user intent']
      )
    }
    
    // Check for unusually large files (>50MB)
    if (fileSize > 50 * 1024 * 1024) {
      return this.createAlert(
        AnomalyType.ABNORMAL_DATA_ACCESS,
        AlertSeverity.MEDIUM,
        undefined,
        undefined,
        undefined,
        'Unusually large file uploaded',
        {
          fileSize,
          threshold: 50 * 1024 * 1024,
          fileType
        },
        ['Verify file legitimacy', 'Check storage capacity', 'Monitor processing resources']
      )
    }
    
    return null
  }
  
  /**
   * Detect unusual API usage
   */
  private async detectUnusualAPIUsage(
    userId: string,
    endpoint: string,
    requestCount: number,
    timeWindow: number
  ): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = []
    
    // Define normal thresholds per endpoint
    const thresholds: Record<string, number> = {
      '/api/upload': 50,     // 50 requests per hour
      '/api/analysis': 100,  // 100 requests per hour
      '/api/download': 200,  // 200 requests per hour
      default: 1000          // 1000 requests per hour for other endpoints
    }
    
    const threshold = thresholds[endpoint] || thresholds.default
    
    if (requestCount > threshold) {
      alerts.push(this.createAlert(
        AnomalyType.UNUSUAL_API_USAGE,
        AlertSeverity.MEDIUM,
        userId,
        undefined,
        undefined,
        'Unusual API usage pattern detected',
        {
          endpoint,
          requestCount,
          threshold,
          timeWindow
        },
        ['Monitor API usage', 'Check for automated scripts', 'Consider rate limiting']
      ))
    }
    
    return alerts
  }
  
  /**
   * Check against threat intelligence
   */
  private checkThreatIntelligence(
    ipAddress: string,
    userAgent: string
  ): SecurityAlert[] {
    const alerts: SecurityAlert[] = []
    
    // Check malicious IPs
    if (this.threatIntel.maliciousIPs.has(ipAddress)) {
      alerts.push(this.createAlert(
        AnomalyType.SUSPICIOUS_LOCATION,
        AlertSeverity.CRITICAL,
        undefined,
        ipAddress,
        userAgent,
        'Access from known malicious IP address',
        {
          ipAddress,
          threatType: 'malicious_ip'
        },
        ['Block IP immediately', 'Investigate user account', 'Review recent activity']
      ))
    }
    
    // Check suspicious user agents
    for (const suspiciousUA of this.threatIntel.suspiciousUserAgents) {
      if (userAgent.includes(suspiciousUA)) {
        alerts.push(this.createAlert(
          AnomalyType.UNUSUAL_API_USAGE,
          AlertSeverity.HIGH,
          undefined,
          ipAddress,
          userAgent,
          'Suspicious user agent detected',
          {
            userAgent: userAgent.substring(0, 100), // Truncate for security
            suspiciousPattern: suspiciousUA
          },
          ['Monitor user behavior', 'Check for bot activity', 'Consider blocking']
        ))
      }
    }
    
    return alerts
  }
  
  /**
   * Get or create user behavior profile
   */
  private async getUserBehaviorProfile(userId: string): Promise<UserBehaviorProfile | null> {
    try {
      // Check cache first
      if (this.userProfiles.has(userId)) {
        return this.userProfiles.get(userId)!
      }
      
      // Load from database
      const supabase = createClient()
      const { data: profile } = await supabase
        .from('user_behavior_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (profile) {
        const behaviorProfile: UserBehaviorProfile = {
          userId: profile.user_id,
          normalLoginHours: profile.normal_login_hours || [],
          commonLocations: profile.common_locations || [],
          avgSessionDuration: profile.avg_session_duration || 0,
          avgFilesPerSession: profile.avg_files_per_session || 0,
          commonDevices: profile.common_devices || [],
          lastUpdated: profile.last_updated
        }
        
        this.userProfiles.set(userId, behaviorProfile)
        return behaviorProfile
      }
      
      return null
      
    } catch (error) {
      logger.error('Error loading user behavior profile', error)
      return null
    }
  }
  
  /**
   * Create security alert
   */
  private createAlert(
    alertType: AnomalyType,
    severity: AlertSeverity,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    description?: string,
    evidence?: Record<string, any>,
    recommendations?: string[]
  ): SecurityAlert {
    return {
      id: crypto.randomUUID(),
      alertType,
      severity,
      userId,
      ipAddress,
      userAgent,
      description: description || `${alertType} detected`,
      evidence: evidence || {},
      recommendations: recommendations || [],
      autoMitigated: false,
      acknowledged: false,
      createdAt: new Date().toISOString()
    }
  }
  
  /**
   * Queue alert for processing
   */
  private queueAlert(alert: SecurityAlert): void {
    this.alertQueue.push(alert)
    
    // Immediate processing for critical alerts
    if (alert.severity === AlertSeverity.CRITICAL) {
      this.processAlert(alert)
    }
  }
  
  /**
   * Process alert queue
   */
  private async processAlertQueue(): Promise<void> {
    if (this.alertQueue.length === 0 || this.isProcessing) {
      return
    }
    
    this.isProcessing = true
    
    try {
      const alerts = [...this.alertQueue]
      this.alertQueue = []
      
      for (const alert of alerts) {
        await this.processAlert(alert)
      }
      
    } catch (error) {
      logger.error('Error processing alert queue', error)
    } finally {
      this.isProcessing = false
    }
  }
  
  /**
   * Process individual alert
   */
  private async processAlert(alert: SecurityAlert): Promise<void> {
    try {
      // Store alert in database
      await this.storeAlert(alert)
      
      // Log to enhanced audit system
      await enhancedAuditLogger.logSecurityIncident(
        {
          userId: alert.userId,
          ipAddress: alert.ipAddress,
          userAgent: alert.userAgent
        },
        {
          incidentType: alert.alertType,
          severity: alert.severity,
          affectedSystems: ['web_application'],
          potentialImpact: alert.description
        },
        alert.evidence
      )
      
      // Auto-mitigation if enabled
      if (this.config.autoMitigation.enabled) {
        await this.attemptAutoMitigation(alert)
      }
      
      // Send notifications
      if (this.config.alerting.enabled) {
        await this.sendAlertNotifications(alert)
      }
      
    } catch (error) {
      logger.error('Error processing alert', error)
    }
  }
  
  /**
   * Store alert in database
   */
  private async storeAlert(alert: SecurityAlert): Promise<void> {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('security_alerts')
        .insert({
          id: alert.id,
          alert_type: alert.alertType,
          severity: alert.severity,
          user_id: alert.userId,
          ip_address: alert.ipAddress,
          user_agent: alert.userAgent,
          description: alert.description,
          evidence: alert.evidence,
          recommendations: alert.recommendations,
          auto_mitigated: alert.autoMitigated,
          acknowledged: alert.acknowledged,
          created_at: alert.createdAt
        })
      
      if (error) {
        logger.error('Failed to store security alert', error)
      }
      
    } catch (error) {
      logger.error('Error storing alert', error)
    }
  }
  
  /**
   * Attempt automatic mitigation
   */
  private async attemptAutoMitigation(alert: SecurityAlert): Promise<void> {
    try {
      let mitigated = false
      
      // Block suspicious IPs
      if (this.config.autoMitigation.blockSuspiciousIPs && alert.ipAddress) {
        if (alert.alertType === AnomalyType.SUSPICIOUS_LOCATION && 
            alert.severity === AlertSeverity.CRITICAL) {
          // Add to blocked IPs (implementation depends on infrastructure)
          logger.info(`Auto-blocking suspicious IP: ${alert.ipAddress}`)
          mitigated = true
        }
      }
      
      // Lock suspicious accounts
      if (this.config.autoMitigation.lockSuspiciousAccounts && alert.userId) {
        if (alert.alertType === AnomalyType.DATA_EXFILTRATION ||
            alert.severity === AlertSeverity.CRITICAL) {
          // Terminate user sessions
          await sessionManager.terminateAllUserSessions(alert.userId)
          logger.info(`Auto-terminated sessions for user: ${alert.userId}`)
          mitigated = true
        }
      }
      
      alert.autoMitigated = mitigated
      
    } catch (error) {
      logger.error('Error in auto-mitigation', error)
    }
  }
  
  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alert: SecurityAlert): Promise<void> {
    try {
      // Email notifications
      if (this.config.alerting.emailNotifications) {
        // Implementation depends on email service
        logger.info(`Email alert sent for: ${alert.alertType}`)
      }
      
      // Slack notifications
      if (this.config.alerting.slackNotifications) {
        // Implementation depends on Slack integration
        logger.info(`Slack alert sent for: ${alert.alertType}`)
      }
      
      // Webhook notifications
      if (this.config.alerting.webhookUrl) {
        // Implementation depends on webhook configuration
        logger.info(`Webhook alert sent for: ${alert.alertType}`)
      }
      
    } catch (error) {
      logger.error('Error sending alert notifications', error)
    }
  }
  
  /**
   * Load configuration
   */
  private loadConfiguration(): SecurityMonitorConfig {
    return {
      anomalyDetection: {
        enabled: process.env.SECURITY_ANOMALY_DETECTION === 'true',
        sensitivityLevel: (process.env.SECURITY_SENSITIVITY_LEVEL as any) || 'medium',
        lookbackPeriodHours: parseInt(process.env.SECURITY_LOOKBACK_HOURS || '24'),
        minEventsForBaseline: parseInt(process.env.SECURITY_MIN_EVENTS || '10')
      },
      alerting: {
        enabled: process.env.SECURITY_ALERTING === 'true',
        realTimeAlerting: process.env.SECURITY_REALTIME_ALERTS === 'true',
        emailNotifications: process.env.SECURITY_EMAIL_ALERTS === 'true',
        slackNotifications: process.env.SECURITY_SLACK_ALERTS === 'true',
        webhookUrl: process.env.SECURITY_WEBHOOK_URL
      },
      autoMitigation: {
        enabled: process.env.SECURITY_AUTO_MITIGATION === 'true',
        blockSuspiciousIPs: process.env.SECURITY_BLOCK_IPS === 'true',
        lockSuspiciousAccounts: process.env.SECURITY_LOCK_ACCOUNTS === 'true',
        requireMFAOnAnomaly: process.env.SECURITY_REQUIRE_MFA === 'true'
      },
      behaviorProfiling: {
        enabled: process.env.SECURITY_BEHAVIOR_PROFILING === 'true',
        learningPeriodDays: parseInt(process.env.SECURITY_LEARNING_DAYS || '30'),
        updateFrequencyHours: parseInt(process.env.SECURITY_UPDATE_FREQUENCY || '24')
      }
    }
  }
  
  /**
   * Initialize threat intelligence
   */
  private initializeThreatIntelligence(): ThreatIntelligence {
    return {
      maliciousIPs: new Set([
        // Add known malicious IPs here
        // These would typically be loaded from threat intelligence feeds
      ]),
      suspiciousUserAgents: new Set([
        'sqlmap',
        'nikto',
        'nessus',
        'burpsuite',
        'python-requests',
        'curl/7', // Basic curl attempts
        'wget',
        'bot',
        'crawler',
        'scanner'
      ]),
      knownAttackPatterns: new Map([
        ['sql_injection', /(\b(union|select|insert|delete|drop|create|alter)\b.*\b(from|into|table|database)\b)/i],
        ['xss', /<script|javascript:|on\w+\s*=/i],
        ['path_traversal', /\.\.[\/\\]/],
        ['command_injection', /[;&|`$()]/]
      ]),
      geoBlockedCountries: new Set([
        // Add countries to block if needed
      ])
    }
  }
  
  /**
   * Start anomaly detection monitoring
   */
  private startAnomalyDetection(): void {
    // Run anomaly detection every 5 minutes
    setInterval(async () => {
      await this.runAnomalyDetection()
    }, 5 * 60 * 1000)
    
    logger.info('Anomaly detection monitoring started')
  }
  
  /**
   * Start behavior profiling updates
   */
  private startBehaviorProfiling(): void {
    // Update behavior profiles every hour
    setInterval(async () => {
      await this.updateBehaviorProfiles()
    }, this.config.behaviorProfiling.updateFrequencyHours * 60 * 60 * 1000)
    
    logger.info('Behavior profiling started')
  }
  
  /**
   * Run anomaly detection
   */
  private async runAnomalyDetection(): Promise<void> {
    try {
      // Implementation of ML-based anomaly detection
      // This would analyze patterns in the audit logs
      logger.debug('Running anomaly detection')
      
      // For now, this is a placeholder for more sophisticated ML algorithms
      
    } catch (error) {
      logger.error('Error running anomaly detection', error)
    }
  }
  
  /**
   * Update behavior profiles
   */
  private async updateBehaviorProfiles(): Promise<void> {
    try {
      logger.debug('Updating user behavior profiles')
      
      // Implementation would analyze user behavior patterns
      // and update profiles in the database
      
    } catch (error) {
      logger.error('Error updating behavior profiles', error)
    }
  }
  
  /**
   * Get current security metrics
   */
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    try {
      const supabase = createClient()
      const now = new Date()
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      
      // Get metrics from the last hour
      const [
        { data: activeUsers },
        { data: failedLogins },
        { data: successfulLogins },
        { data: dataAccess },
        { data: fileUploads },
        { data: suspiciousActivities },
        { data: activeAlerts },
        { data: resolvedAlerts }
      ] = await Promise.all([
        supabase.from('enhanced_security_audit_log')
          .select('user_id')
          .gte('created_at', hourAgo.toISOString())
          .not('user_id', 'is', null),
        
        supabase.from('enhanced_security_audit_log')
          .select('*')
          .eq('event_type', EnhancedAuditEventType.FAILED_LOGIN)
          .gte('created_at', hourAgo.toISOString()),
        
        supabase.from('enhanced_security_audit_log')
          .select('*')
          .eq('event_type', EnhancedAuditEventType.USER_LOGIN)
          .gte('created_at', hourAgo.toISOString()),
        
        supabase.from('enhanced_security_audit_log')
          .select('*')
          .eq('event_type', EnhancedAuditEventType.DATA_ACCESS)
          .gte('created_at', hourAgo.toISOString()),
        
        supabase.from('enhanced_security_audit_log')
          .select('*')
          .eq('event_type', EnhancedAuditEventType.DOCUMENT_UPLOADED)
          .gte('created_at', hourAgo.toISOString()),
        
        supabase.from('enhanced_security_audit_log')
          .select('*')
          .gte('risk_score', RiskLevel.MEDIUM)
          .gte('created_at', hourAgo.toISOString()),
        
        supabase.from('security_alerts')
          .select('*')
          .eq('acknowledged', false),
        
        supabase.from('security_alerts')
          .select('*')
          .eq('acknowledged', true)
          .gte('created_at', hourAgo.toISOString())
      ])
      
      const uniqueActiveUsers = new Set(activeUsers?.map(u => u.user_id) || []).size
      
      return {
        activeUsers: uniqueActiveUsers,
        failedLogins: failedLogins?.length || 0,
        successfulLogins: successfulLogins?.length || 0,
        dataAccessEvents: dataAccess?.length || 0,
        fileUploads: fileUploads?.length || 0,
        suspiciousActivities: suspiciousActivities?.length || 0,
        activeAlerts: activeAlerts?.length || 0,
        resolvedAlerts: resolvedAlerts?.length || 0,
        avgSessionDuration: 0 // Calculate from session data
      }
      
    } catch (error) {
      logger.error('Error getting security metrics', error)
      return {
        activeUsers: 0,
        failedLogins: 0,
        successfulLogins: 0,
        dataAccessEvents: 0,
        fileUploads: 0,
        suspiciousActivities: 0,
        activeAlerts: 0,
        resolvedAlerts: 0,
        avgSessionDuration: 0
      }
    }
  }
}

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance()

// Export types and enums
export {
  AnomalyType,
  AlertSeverity,
  type SecurityAlert,
  type UserBehaviorProfile,
  type SecurityMetrics,
  type SecurityMonitorConfig
}