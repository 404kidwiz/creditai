/**
 * Security Monitoring and Analytics Service
 * Provides real-time security metrics, dashboards, and reporting
 */

import { auditLogger, AuditEventType, RiskLevel, AuditEvent } from './auditLogger';
import { threatDetectionService, ThreatType, ThreatSeverity, SecurityAlert } from './threatDetection';
import { enhancedRateLimitStore } from './enhancedRateLimiter';

/**
 * Security metrics
 */
export interface SecurityMetrics {
  // Threat statistics
  totalThreats: number;
  threatsByType: Record<ThreatType, number>;
  threatsBySeverity: Record<ThreatSeverity, number>;
  
  // Alert statistics
  totalAlerts: number;
  openAlerts: number;
  resolvedAlerts: number;
  escalatedAlerts: number;
  
  // Rate limiting statistics
  totalRequests: number;
  blockedRequests: number;
  rateLimitViolations: number;
  
  // Authentication statistics
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  mfaChallenges: number;
  
  // User behavior
  activeUsers: number;
  suspiciousUsers: number;
  blockedUsers: number;
  
  // System health
  systemErrors: number;
  performanceIssues: number;
  uptime: number;
  
  // Compliance metrics
  dataAccess: number;
  dataModifications: number;
  privacyViolations: number;
  
  // Time range
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Security trend data
 */
export interface SecurityTrend {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * Security dashboard data
 */
export interface SecurityDashboard {
  metrics: SecurityMetrics;
  trends: {
    threats: SecurityTrend[];
    alerts: SecurityTrend[];
    logins: SecurityTrend[];
    requests: SecurityTrend[];
  };
  topThreats: Array<{
    type: ThreatType;
    count: number;
    severity: ThreatSeverity;
    trend: 'up' | 'down' | 'stable';
  }>;
  criticalAlerts: SecurityAlert[];
  recentActivity: AuditEvent[];
  systemStatus: {
    overall: 'healthy' | 'warning' | 'critical';
    components: Record<string, 'operational' | 'degraded' | 'down'>;
  };
}

/**
 * Security report configuration
 */
export interface SecurityReportConfig {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  dateRange: {
    start: Date;
    end: Date;
  };
  includeMetrics: boolean;
  includeTrends: boolean;
  includeIncidents: boolean;
  includeRecommendations: boolean;
  format: 'json' | 'pdf' | 'html';
  recipients?: string[];
}

/**
 * Security incident
 */
export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'investigating' | 'contained' | 'resolved';
  category: string;
  assignedTo?: string;
  affectedSystems: string[];
  timeline: Array<{
    timestamp: Date;
    action: string;
    details: string;
    user?: string;
  }>;
  rootCause?: string;
  resolution?: string;
  lessonsLearned?: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

/**
 * Security Monitoring Service
 */
export class SecurityMonitoringService {
  private metrics: SecurityMetrics;
  private trends = new Map<string, SecurityTrend[]>();
  private incidents = new Map<string, SecurityIncident>();
  private realTimeSubscribers = new Set<(dashboard: SecurityDashboard) => void>();
  
  constructor() {
    this.metrics = this.initializeMetrics();
    
    // Start real-time monitoring
    this.startRealTimeMonitoring();
    this.startMetricsCollection();
    this.startTrendAnalysis();
  }
  
  /**
   * Get current security dashboard
   */
  async getSecurityDashboard(): Promise<SecurityDashboard> {
    const now = new Date();
    const metrics = await this.calculateCurrentMetrics();
    const trends = this.getTrendData();
    const topThreats = this.getTopThreats();
    const criticalAlerts = this.getCriticalAlerts();
    const recentActivity = this.getRecentActivity();
    const systemStatus = this.getSystemStatus();
    
    return {
      metrics,
      trends,
      topThreats,
      criticalAlerts,
      recentActivity,
      systemStatus
    };
  }
  
  /**
   * Calculate current security metrics
   */
  private async calculateCurrentMetrics(): Promise<SecurityMetrics> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Get recent events
    const recentEvents = auditLogger.getEvents(10000); // Get more events for analysis
    const dayEvents = recentEvents.filter(event => 
      new Date(event.timestamp) >= dayAgo
    );
    
    // Get alerts
    const alerts = threatDetectionService.getActiveAlerts();
    const openAlerts = alerts.filter(alert => alert.status === 'open');
    const resolvedAlerts = alerts.filter(alert => alert.status === 'resolved');
    const escalatedAlerts = alerts.filter(alert => alert.escalated);
    
    // Calculate threat statistics
    const threatsByType = this.calculateThreatsByType(alerts);
    const threatsBySeverity = this.calculateThreatsBySeverity(alerts);
    
    // Calculate authentication statistics
    const authStats = this.calculateAuthStats(dayEvents);
    
    // Calculate rate limiting statistics
    const rateLimitStats = this.calculateRateLimitStats(dayEvents);
    
    // Calculate user behavior statistics
    const userStats = this.calculateUserStats(dayEvents);
    
    // Calculate system health statistics
    const systemStats = this.calculateSystemStats(dayEvents);
    
    // Calculate compliance statistics
    const complianceStats = this.calculateComplianceStats(dayEvents);
    
    return {
      totalThreats: alerts.length,
      threatsByType,
      threatsBySeverity,
      
      totalAlerts: alerts.length,
      openAlerts: openAlerts.length,
      resolvedAlerts: resolvedAlerts.length,
      escalatedAlerts: escalatedAlerts.length,
      
      totalRequests: rateLimitStats.totalRequests,
      blockedRequests: rateLimitStats.blockedRequests,
      rateLimitViolations: rateLimitStats.violations,
      
      totalLogins: authStats.totalLogins,
      successfulLogins: authStats.successfulLogins,
      failedLogins: authStats.failedLogins,
      mfaChallenges: authStats.mfaChallenges,
      
      activeUsers: userStats.activeUsers,
      suspiciousUsers: userStats.suspiciousUsers,
      blockedUsers: userStats.blockedUsers,
      
      systemErrors: systemStats.errors,
      performanceIssues: systemStats.performanceIssues,
      uptime: systemStats.uptime,
      
      dataAccess: complianceStats.dataAccess,
      dataModifications: complianceStats.dataModifications,
      privacyViolations: complianceStats.privacyViolations,
      
      timeRange: {
        start: dayAgo,
        end: now
      }
    };
  }
  
  /**
   * Get trend data for charts
   */
  private getTrendData(): SecurityDashboard['trends'] {
    const threatsData = this.trends.get('threats') || [];
    const alertsData = this.trends.get('alerts') || [];
    const loginsData = this.trends.get('logins') || [];
    const requestsData = this.trends.get('requests') || [];
    
    return {
      threats: threatsData.slice(-24), // Last 24 hours
      alerts: alertsData.slice(-24),
      logins: loginsData.slice(-24),
      requests: requestsData.slice(-24)
    };
  }
  
  /**
   * Get top threats
   */
  private getTopThreats(): SecurityDashboard['topThreats'] {
    const alerts = threatDetectionService.getActiveAlerts();
    const threatCounts = new Map<ThreatType, { count: number; severity: ThreatSeverity }>();
    
    alerts.forEach(alert => {
      const current = threatCounts.get(alert.type) || { count: 0, severity: alert.severity };
      current.count++;
      
      // Keep the highest severity
      if (this.getSeverityLevel(alert.severity) > this.getSeverityLevel(current.severity)) {
        current.severity = alert.severity;
      }
      
      threatCounts.set(alert.type, current);
    });
    
    return Array.from(threatCounts.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        severity: data.severity,
        trend: this.calculateThreatTrend(type) as 'up' | 'down' | 'stable'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
  
  /**
   * Get critical alerts
   */
  private getCriticalAlerts(): SecurityAlert[] {
    return threatDetectionService.getActiveAlerts()
      .filter(alert => 
        alert.severity === ThreatSeverity.CRITICAL || 
        alert.severity === ThreatSeverity.HIGH
      )
      .filter(alert => alert.status === 'open')
      .sort((a, b) => {
        const severityA = this.getSeverityLevel(a.severity);
        const severityB = this.getSeverityLevel(b.severity);
        if (severityA !== severityB) {
          return severityB - severityA;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 10);
  }
  
  /**
   * Get recent security activity
   */
  private getRecentActivity(): AuditEvent[] {
    const securityEvents = [
      AuditEventType.SECURITY_THREAT_DETECTED,
      AuditEventType.FAILED_LOGIN,
      AuditEventType.RATE_LIMIT_EXCEEDED,
      AuditEventType.SUSPICIOUS_ACTIVITY,
      AuditEventType.IP_BLOCKED,
      AuditEventType.MFA_FAILURE
    ];
    
    return auditLogger.getEvents(1000)
      .filter(event => securityEvents.includes(event.eventType))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  }
  
  /**
   * Get system status
   */
  private getSystemStatus(): SecurityDashboard['systemStatus'] {
    const recentEvents = auditLogger.getEvents(100);
    const errorEvents = recentEvents.filter(event => 
      event.eventType === AuditEventType.SYSTEM_ERROR
    );
    
    const criticalAlerts = threatDetectionService.getActiveAlerts()
      .filter(alert => alert.severity === ThreatSeverity.CRITICAL && alert.status === 'open');
    
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (criticalAlerts.length > 0) {
      overall = 'critical';
    } else if (errorEvents.length > 5) {
      overall = 'warning';
    }
    
    return {
      overall,
      components: {
        'Authentication': errorEvents.some(e => e.details?.action?.includes('auth')) ? 'degraded' : 'operational',
        'API Gateway': errorEvents.some(e => e.details?.action?.includes('api')) ? 'degraded' : 'operational',
        'Database': errorEvents.some(e => e.details?.action?.includes('database')) ? 'degraded' : 'operational',
        'Encryption': errorEvents.some(e => e.details?.action?.includes('encrypt')) ? 'degraded' : 'operational',
        'Monitoring': 'operational'
      }
    };
  }
  
  /**
   * Generate security report
   */
  async generateSecurityReport(config: SecurityReportConfig): Promise<{
    success: boolean;
    report?: any;
    error?: string;
  }> {
    try {
      const events = auditLogger.getEvents(50000)
        .filter(event => {
          const eventDate = new Date(event.timestamp);
          return eventDate >= config.dateRange.start && eventDate <= config.dateRange.end;
        });
      
      const alerts = threatDetectionService.getActiveAlerts()
        .filter(alert => {
          const alertDate = new Date(alert.createdAt);
          return alertDate >= config.dateRange.start && alertDate <= config.dateRange.end;
        });
      
      const report: any = {
        metadata: {
          type: config.type,
          dateRange: config.dateRange,
          generatedAt: new Date(),
          totalEvents: events.length,
          totalAlerts: alerts.length
        }
      };
      
      if (config.includeMetrics) {
        report.metrics = await this.calculateMetricsForPeriod(
          config.dateRange.start,
          config.dateRange.end
        );
      }
      
      if (config.includeTrends) {
        report.trends = this.calculateTrendsForPeriod(
          config.dateRange.start,
          config.dateRange.end
        );
      }
      
      if (config.includeIncidents) {
        report.incidents = this.getIncidentsForPeriod(
          config.dateRange.start,
          config.dateRange.end
        );
      }
      
      if (config.includeRecommendations) {
        report.recommendations = this.generateSecurityRecommendations(events, alerts);
      }
      
      // Format the report
      let formattedReport;
      switch (config.format) {
        case 'json':
          formattedReport = JSON.stringify(report, null, 2);
          break;
        case 'html':
          formattedReport = this.formatReportAsHTML(report);
          break;
        case 'pdf':
          formattedReport = await this.formatReportAsPDF(report);
          break;
        default:
          formattedReport = report;
      }
      
      // Send to recipients if specified
      if (config.recipients && config.recipients.length > 0) {
        await this.sendReportToRecipients(formattedReport, config);
      }
      
      return {
        success: true,
        report: formattedReport
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report'
      };
    }
  }
  
  /**
   * Subscribe to real-time dashboard updates
   */
  subscribeToRealTimeUpdates(callback: (dashboard: SecurityDashboard) => void): () => void {
    this.realTimeSubscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.realTimeSubscribers.delete(callback);
    };
  }
  
  /**
   * Create security incident
   */
  createIncident(
    title: string,
    description: string,
    severity: SecurityIncident['severity'],
    category: string,
    affectedSystems: string[]
  ): SecurityIncident {
    const incident: SecurityIncident = {
      id: crypto.randomUUID(),
      title,
      description,
      severity,
      status: 'investigating',
      category,
      affectedSystems,
      timeline: [{
        timestamp: new Date(),
        action: 'incident_created',
        details: 'Security incident created and investigation initiated'
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.incidents.set(incident.id, incident);
    
    // Log incident creation
    auditLogger.logEvent(
      AuditEventType.SECURITY_THREAT_DETECTED,
      {},
      {
        incidentId: incident.id,
        title,
        severity,
        category,
        affectedSystems
      },
      severity === 'critical' ? RiskLevel.CRITICAL : 
      severity === 'high' ? RiskLevel.HIGH : 
      severity === 'medium' ? RiskLevel.MEDIUM : RiskLevel.LOW
    );
    
    return incident;
  }
  
  /**
   * Update security incident
   */
  updateIncident(
    incidentId: string,
    updates: Partial<SecurityIncident>,
    timelineEntry?: { action: string; details: string; user?: string }
  ): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    
    // Apply updates
    Object.assign(incident, updates);
    incident.updatedAt = new Date();
    
    if (updates.status === 'resolved') {
      incident.resolvedAt = new Date();
    }
    
    // Add timeline entry
    if (timelineEntry) {
      incident.timeline.push({
        timestamp: new Date(),
        ...timelineEntry
      });
    }
    
    this.incidents.set(incidentId, incident);
    return true;
  }
  
  /**
   * Get security incidents
   */
  getIncidents(status?: SecurityIncident['status']): SecurityIncident[] {
    const incidents = Array.from(this.incidents.values());
    return status ? incidents.filter(incident => incident.status === status) : incidents;
  }
  
  /**
   * Private helper methods
   */
  private initializeMetrics(): SecurityMetrics {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return {
      totalThreats: 0,
      threatsByType: {} as Record<ThreatType, number>,
      threatsBySeverity: {} as Record<ThreatSeverity, number>,
      totalAlerts: 0,
      openAlerts: 0,
      resolvedAlerts: 0,
      escalatedAlerts: 0,
      totalRequests: 0,
      blockedRequests: 0,
      rateLimitViolations: 0,
      totalLogins: 0,
      successfulLogins: 0,
      failedLogins: 0,
      mfaChallenges: 0,
      activeUsers: 0,
      suspiciousUsers: 0,
      blockedUsers: 0,
      systemErrors: 0,
      performanceIssues: 0,
      uptime: 99.9,
      dataAccess: 0,
      dataModifications: 0,
      privacyViolations: 0,
      timeRange: {
        start: dayAgo,
        end: now
      }
    };
  }
  
  private calculateThreatsByType(alerts: SecurityAlert[]): Record<ThreatType, number> {
    const counts = {} as Record<ThreatType, number>;
    
    alerts.forEach(alert => {
      counts[alert.type] = (counts[alert.type] || 0) + 1;
    });
    
    return counts;
  }
  
  private calculateThreatsBySeverity(alerts: SecurityAlert[]): Record<ThreatSeverity, number> {
    const counts = {} as Record<ThreatSeverity, number>;
    
    alerts.forEach(alert => {
      counts[alert.severity] = (counts[alert.severity] || 0) + 1;
    });
    
    return counts;
  }
  
  private calculateAuthStats(events: AuditEvent[]) {
    const loginEvents = events.filter(e => 
      e.eventType === AuditEventType.USER_LOGIN || 
      e.eventType === AuditEventType.FAILED_LOGIN
    );
    
    const mfaEvents = events.filter(e => 
      e.eventType === AuditEventType.MFA_CHALLENGE_INITIATED ||
      e.eventType === AuditEventType.MFA_SUCCESS ||
      e.eventType === AuditEventType.MFA_FAILURE
    );
    
    return {
      totalLogins: loginEvents.length,
      successfulLogins: events.filter(e => e.eventType === AuditEventType.USER_LOGIN).length,
      failedLogins: events.filter(e => e.eventType === AuditEventType.FAILED_LOGIN).length,
      mfaChallenges: mfaEvents.length
    };
  }
  
  private calculateRateLimitStats(events: AuditEvent[]) {
    const apiEvents = events.filter(e => e.eventType === AuditEventType.API_ACCESS);
    const rateLimitEvents = events.filter(e => e.eventType === AuditEventType.RATE_LIMIT_EXCEEDED);
    
    return {
      totalRequests: apiEvents.length,
      blockedRequests: rateLimitEvents.length,
      violations: rateLimitEvents.length
    };
  }
  
  private calculateUserStats(events: AuditEvent[]) {
    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean));
    const suspiciousEvents = events.filter(e => e.eventType === AuditEventType.SUSPICIOUS_ACTIVITY);
    const suspiciousUsers = new Set(suspiciousEvents.map(e => e.userId).filter(Boolean));
    
    return {
      activeUsers: uniqueUsers.size,
      suspiciousUsers: suspiciousUsers.size,
      blockedUsers: 0 // Would need to check blocked users list
    };
  }
  
  private calculateSystemStats(events: AuditEvent[]) {
    const errorEvents = events.filter(e => e.eventType === AuditEventType.SYSTEM_ERROR);
    
    return {
      errors: errorEvents.length,
      performanceIssues: 0, // Would need performance monitoring
      uptime: 99.9 // Would calculate from system uptime
    };
  }
  
  private calculateComplianceStats(events: AuditEvent[]) {
    const dataAccessEvents = events.filter(e => e.eventType === AuditEventType.DATA_ACCESS);
    const dataEncryptionEvents = events.filter(e => e.eventType === AuditEventType.DATA_ENCRYPTED);
    
    return {
      dataAccess: dataAccessEvents.length,
      dataModifications: dataEncryptionEvents.length,
      privacyViolations: 0 // Would need privacy violation detection
    };
  }
  
  private getSeverityLevel(severity: ThreatSeverity): number {
    switch (severity) {
      case ThreatSeverity.LOW: return 1;
      case ThreatSeverity.MEDIUM: return 2;
      case ThreatSeverity.HIGH: return 3;
      case ThreatSeverity.CRITICAL: return 4;
    }
  }
  
  private calculateThreatTrend(type: ThreatType): 'up' | 'down' | 'stable' {
    // Simplified trend calculation
    const trends = this.trends.get('threats') || [];
    const recentTrends = trends.slice(-24); // Last 24 data points
    
    if (recentTrends.length < 2) return 'stable';
    
    const recent = recentTrends.slice(-6).reduce((sum, trend) => sum + trend.value, 0);
    const previous = recentTrends.slice(-12, -6).reduce((sum, trend) => sum + trend.value, 0);
    
    if (recent > previous * 1.2) return 'up';
    if (recent < previous * 0.8) return 'down';
    return 'stable';
  }
  
  private async calculateMetricsForPeriod(start: Date, end: Date): Promise<SecurityMetrics> {
    // Implementation would filter events by date range and calculate metrics
    return this.metrics; // Simplified
  }
  
  private calculateTrendsForPeriod(start: Date, end: Date): any {
    // Implementation would calculate trends for the specified period
    return {};
  }
  
  private getIncidentsForPeriod(start: Date, end: Date): SecurityIncident[] {
    return Array.from(this.incidents.values())
      .filter(incident => 
        incident.createdAt >= start && incident.createdAt <= end
      );
  }
  
  private generateSecurityRecommendations(events: AuditEvent[], alerts: SecurityAlert[]): string[] {
    const recommendations: string[] = [];
    
    // Analyze patterns and generate recommendations
    const failedLogins = events.filter(e => e.eventType === AuditEventType.FAILED_LOGIN);
    if (failedLogins.length > 50) {
      recommendations.push('Consider implementing stronger rate limiting for login attempts');
    }
    
    const highSeverityAlerts = alerts.filter(a => a.severity === ThreatSeverity.HIGH || a.severity === ThreatSeverity.CRITICAL);
    if (highSeverityAlerts.length > 10) {
      recommendations.push('Review and strengthen security policies due to high number of critical alerts');
    }
    
    const systemErrors = events.filter(e => e.eventType === AuditEventType.SYSTEM_ERROR);
    if (systemErrors.length > 20) {
      recommendations.push('Investigate system stability issues causing frequent errors');
    }
    
    return recommendations;
  }
  
  private formatReportAsHTML(report: any): string {
    // Simple HTML formatting - in production would use a proper template engine
    return `
    <html>
      <head><title>Security Report</title></head>
      <body>
        <h1>Security Report</h1>
        <pre>${JSON.stringify(report, null, 2)}</pre>
      </body>
    </html>
    `;
  }
  
  private async formatReportAsPDF(report: any): Promise<Buffer> {
    // In production, would use a PDF generation library
    return Buffer.from(JSON.stringify(report));
  }
  
  private async sendReportToRecipients(report: any, config: SecurityReportConfig): Promise<void> {
    // In production, would send email/notifications
    console.log(`Security report sent to ${config.recipients?.length} recipients`);
  }
  
  /**
   * Background monitoring processes
   */
  private startRealTimeMonitoring(): void {
    setInterval(async () => {
      if (this.realTimeSubscribers.size > 0) {
        const dashboard = await this.getSecurityDashboard();
        this.realTimeSubscribers.forEach(callback => {
          try {
            callback(dashboard);
          } catch (error) {
            console.error('Error in real-time dashboard callback:', error);
          }
        });
      }
    }, 30000); // Update every 30 seconds
  }
  
  private startMetricsCollection(): void {
    setInterval(async () => {
      this.metrics = await this.calculateCurrentMetrics();
    }, 60000); // Update metrics every minute
  }
  
  private startTrendAnalysis(): void {
    setInterval(() => {
      const now = new Date();
      
      // Collect trend data points
      const alerts = threatDetectionService.getActiveAlerts();
      const recentEvents = auditLogger.getEvents(1000);
      
      // Update trends
      this.addTrendPoint('threats', alerts.length);
      this.addTrendPoint('alerts', alerts.filter(a => a.status === 'open').length);
      this.addTrendPoint('logins', recentEvents.filter(e => e.eventType === AuditEventType.USER_LOGIN).length);
      this.addTrendPoint('requests', recentEvents.filter(e => e.eventType === AuditEventType.API_ACCESS).length);
      
      // Cleanup old trend data
      this.cleanupTrendData();
    }, 3600000); // Update trends every hour
  }
  
  private addTrendPoint(metric: string, value: number): void {
    if (!this.trends.has(metric)) {
      this.trends.set(metric, []);
    }
    
    const trends = this.trends.get(metric)!;
    trends.push({
      timestamp: new Date(),
      value
    });
    
    // Keep only last 168 hours (7 days)
    if (trends.length > 168) {
      trends.splice(0, trends.length - 168);
    }
    
    this.trends.set(metric, trends);
  }
  
  private cleanupTrendData(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    for (const [metric, trends] of this.trends.entries()) {
      const filteredTrends = trends.filter(trend => trend.timestamp >= cutoff);
      this.trends.set(metric, filteredTrends);
    }
  }
}

// Export singleton instance
export const securityMonitoringService = new SecurityMonitoringService();
