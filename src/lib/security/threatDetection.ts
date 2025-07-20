/**
 * Advanced Threat Detection and Security Monitoring System
 * Provides real-time threat detection, anomaly detection, and security alerts
 */

import { auditLogger, AuditEventType, RiskLevel, AuditEvent } from './auditLogger';
import crypto from 'crypto';

/**
 * Threat types
 */
export enum ThreatType {
  BRUTE_FORCE = 'brute_force',
  DDOS = 'ddos',
  SUSPICIOUS_LOGIN = 'suspicious_login',
  DATA_EXFILTRATION = 'data_exfiltration',
  MALICIOUS_REQUEST = 'malicious_request',
  ACCOUNT_TAKEOVER = 'account_takeover',
  INSIDER_THREAT = 'insider_threat',
  BOT_ACTIVITY = 'bot_activity',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior'
}

/**
 * Threat severity levels
 */
export enum ThreatSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Threat detection rule
 */
export interface ThreatDetectionRule {
  id: string;
  name: string;
  description: string;
  type: ThreatType;
  severity: ThreatSeverity;
  enabled: boolean;
  conditions: ThreatCondition[];
  actions: ThreatAction[];
  cooldownMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Threat condition
 */
export interface ThreatCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'regex';
  value: any;
  timeWindow?: number; // in minutes
}

/**
 * Threat action
 */
export interface ThreatAction {
  type: 'block_ip' | 'block_user' | 'alert' | 'log' | 'escalate' | 'quarantine';
  duration?: number; // in minutes
  parameters?: Record<string, any>;
}

/**
 * Security alert
 */
export interface SecurityAlert {
  id: string;
  type: ThreatType;
  severity: ThreatSeverity;
  title: string;
  description: string;
  source: string;
  metadata: Record<string, any>;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  escalated: boolean;
  relatedEvents: string[]; // Event IDs
}

/**
 * User behavior profile
 */
export interface UserBehaviorProfile {
  userId: string;
  normalPatterns: {
    loginTimes: number[]; // Hour of day (0-23)
    locations: string[]; // Country codes
    devices: string[]; // Device fingerprints
    ipRanges: string[]; // IP address ranges
    userAgents: string[];
    activityLevel: number; // Requests per hour
  };
  anomalyScores: {
    location: number;
    time: number;
    device: number;
    activity: number;
    overall: number;
  };
  lastUpdated: Date;
  learningPeriod: boolean;
}

/**
 * Threat intelligence feed
 */
export interface ThreatIntelligence {
  type: 'ip' | 'domain' | 'hash' | 'user_agent';
  value: string;
  category: 'malware' | 'phishing' | 'bot' | 'proxy' | 'tor' | 'suspicious';
  confidence: number; // 0-1
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  metadata?: Record<string, any>;
}

/**
 * Default threat detection rules
 */
const DEFAULT_THREAT_RULES: ThreatDetectionRule[] = [
  {
    id: 'brute-force-login',
    name: 'Brute Force Login Detection',
    description: 'Detects multiple failed login attempts from same IP',
    type: ThreatType.BRUTE_FORCE,
    severity: ThreatSeverity.HIGH,
    enabled: true,
    conditions: [
      {
        field: 'eventType',
        operator: 'equals',
        value: AuditEventType.FAILED_LOGIN
      },
      {
        field: 'ipAddress',
        operator: 'greater_than',
        value: 5,
        timeWindow: 15 // 5 failures in 15 minutes
      }
    ],
    actions: [
      {
        type: 'block_ip',
        duration: 60 // Block for 1 hour
      },
      {
        type: 'alert'
      }
    ],
    cooldownMinutes: 30,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'ddos-detection',
    name: 'DDoS Attack Detection',
    description: 'Detects abnormally high request rates',
    type: ThreatType.DDOS,
    severity: ThreatSeverity.CRITICAL,
    enabled: true,
    conditions: [
      {
        field: 'eventType',
        operator: 'equals',
        value: AuditEventType.API_ACCESS
      },
      {
        field: 'ipAddress',
        operator: 'greater_than',
        value: 100,
        timeWindow: 5 // 100+ requests in 5 minutes
      }
    ],
    actions: [
      {
        type: 'block_ip',
        duration: 120 // Block for 2 hours
      },
      {
        type: 'alert'
      },
      {
        type: 'escalate'
      }
    ],
    cooldownMinutes: 60,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'suspicious-login-location',
    name: 'Suspicious Login Location',
    description: 'Detects logins from unusual geographic locations',
    type: ThreatType.SUSPICIOUS_LOGIN,
    severity: ThreatSeverity.MEDIUM,
    enabled: true,
    conditions: [
      {
        field: 'eventType',
        operator: 'equals',
        value: AuditEventType.USER_LOGIN
      },
      {
        field: 'location.anomalyScore',
        operator: 'greater_than',
        value: 0.8
      }
    ],
    actions: [
      {
        type: 'alert'
      },
      {
        type: 'log'
      }
    ],
    cooldownMinutes: 60,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'data-exfiltration',
    name: 'Data Exfiltration Detection',
    description: 'Detects unusual data access patterns',
    type: ThreatType.DATA_EXFILTRATION,
    severity: ThreatSeverity.CRITICAL,
    enabled: true,
    conditions: [
      {
        field: 'eventType',
        operator: 'equals',
        value: AuditEventType.DATA_ACCESS
      },
      {
        field: 'userId',
        operator: 'greater_than',
        value: 50,
        timeWindow: 60 // 50+ data access events in 1 hour
      }
    ],
    actions: [
      {
        type: 'block_user',
        duration: 60
      },
      {
        type: 'alert'
      },
      {
        type: 'escalate'
      }
    ],
    cooldownMinutes: 30,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

/**
 * Threat Intelligence Database (simplified)
 */
const THREAT_INTELLIGENCE: ThreatIntelligence[] = [
  // Known malicious IPs, user agents, etc.
  // In production, this would be populated from external threat feeds
];

/**
 * Advanced Threat Detection Service
 */
export class ThreatDetectionService {
  private rules = new Map<string, ThreatDetectionRule>();
  private alerts = new Map<string, SecurityAlert>();
  private userProfiles = new Map<string, UserBehaviorProfile>();
  private blockedIPs = new Map<string, Date>(); // IP -> unblock time
  private blockedUsers = new Map<string, Date>(); // User ID -> unblock time
  private threatIntelligence = new Map<string, ThreatIntelligence>();
  private eventBuffer = new Map<string, AuditEvent[]>(); // For time-window analysis
  private ruleLastTriggered = new Map<string, Date>();
  
  constructor() {
    // Initialize with default rules
    DEFAULT_THREAT_RULES.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
    
    // Load threat intelligence
    THREAT_INTELLIGENCE.forEach(intel => {
      this.threatIntelligence.set(intel.value, intel);
    });
    
    // Start background processors
    this.startEventProcessor();
    this.startCleanupProcessor();
    this.startBehaviorAnalyzer();
  }
  
  /**
   * Process security event for threat detection
   */
  async processEvent(event: AuditEvent): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    
    try {
      // Add event to buffer for time-window analysis
      this.addEventToBuffer(event);
      
      // Check threat intelligence
      const intelAlerts = this.checkThreatIntelligence(event);
      alerts.push(...intelAlerts);
      
      // Check user behavior anomalies
      const behaviorAlerts = await this.checkUserBehaviorAnomalies(event);
      alerts.push(...behaviorAlerts);
      
      // Check detection rules
      const ruleAlerts = await this.checkDetectionRules(event);
      alerts.push(...ruleAlerts);
      
      // Process generated alerts
      for (const alert of alerts) {
        await this.processAlert(alert, event);
      }
      
      return alerts;
      
    } catch (error) {
      console.error('Error processing security event:', error);
      return [];
    }
  }
  
  /**
   * Check threat intelligence feeds
   */
  private checkThreatIntelligence(event: AuditEvent): SecurityAlert[] {
    const alerts: SecurityAlert[] = [];
    
    // Check IP address
    if (event.ipAddress) {
      const ipIntel = this.threatIntelligence.get(event.ipAddress);
      if (ipIntel && ipIntel.confidence > 0.7) {
        alerts.push(this.createAlert(
          ThreatType.MALICIOUS_REQUEST,
          ThreatSeverity.HIGH,
          'Malicious IP Address Detected',
          `Request from known malicious IP: ${event.ipAddress}`,
          'threat_intelligence',
          {
            ipAddress: event.ipAddress,
            category: ipIntel.category,
            confidence: ipIntel.confidence,
            source: ipIntel.source,
            eventId: event.id
          }
        ));
      }
    }
    
    // Check User-Agent
    if (event.userAgent) {
      const uaIntel = this.threatIntelligence.get(event.userAgent);
      if (uaIntel && uaIntel.confidence > 0.8) {
        alerts.push(this.createAlert(
          ThreatType.BOT_ACTIVITY,
          ThreatSeverity.MEDIUM,
          'Malicious User Agent Detected',
          `Request from known bot/malicious user agent`,
          'threat_intelligence',
          {
            userAgent: event.userAgent,
            category: uaIntel.category,
            confidence: uaIntel.confidence,
            source: uaIntel.source,
            eventId: event.id
          }
        ));
      }
    }
    
    return alerts;
  }
  
  /**
   * Check user behavior anomalies
   */
  private async checkUserBehaviorAnomalies(event: AuditEvent): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    
    if (!event.userId) return alerts;
    
    const profile = this.getUserProfile(event.userId);
    const anomalies = this.detectBehaviorAnomalies(event, profile);
    
    // Check for significant anomalies
    if (anomalies.overall > 0.8) {
      alerts.push(this.createAlert(
        ThreatType.ANOMALOUS_BEHAVIOR,
        anomalies.overall > 0.9 ? ThreatSeverity.HIGH : ThreatSeverity.MEDIUM,
        'Anomalous User Behavior Detected',
        `User behavior significantly deviates from normal patterns`,
        'behavior_analysis',
        {
          userId: event.userId,
          anomalyScores: anomalies,
          eventId: event.id,
          patterns: this.getAnomalyDetails(event, profile, anomalies)
        }
      ));
    }
    
    // Update user profile
    this.updateUserProfile(event.userId, event, profile);
    
    return alerts;
  }
  
  /**
   * Check detection rules
   */
  private async checkDetectionRules(event: AuditEvent): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      
      // Check cooldown
      const lastTriggered = this.ruleLastTriggered.get(rule.id);
      if (lastTriggered) {
        const cooldownExpired = Date.now() - lastTriggered.getTime() > rule.cooldownMinutes * 60 * 1000;
        if (!cooldownExpired) continue;
      }
      
      // Check if rule conditions are met
      if (this.evaluateRuleConditions(rule, event)) {
        const alert = this.createAlert(
          rule.type,
          rule.severity,
          rule.name,
          rule.description,
          'detection_rule',
          {
            ruleId: rule.id,
            eventId: event.id,
            conditions: rule.conditions
          }
        );
        
        alerts.push(alert);
        this.ruleLastTriggered.set(rule.id, new Date());
        
        // Execute rule actions
        await this.executeRuleActions(rule, event, alert);
      }
    }
    
    return alerts;
  }
  
  /**
   * Evaluate rule conditions
   */
  private evaluateRuleConditions(rule: ThreatDetectionRule, event: AuditEvent): boolean {
    return rule.conditions.every(condition => {
      if (condition.timeWindow) {
        // Time-window based condition
        return this.evaluateTimeWindowCondition(condition, event);
      } else {
        // Simple field comparison
        return this.evaluateFieldCondition(condition, event);
      }
    });
  }
  
  /**
   * Evaluate time-window condition
   */
  private evaluateTimeWindowCondition(condition: ThreatCondition, event: AuditEvent): boolean {
    const windowStart = Date.now() - (condition.timeWindow! * 60 * 1000);
    const relevantEvents = this.getEventsInTimeWindow(windowStart, event);
    
    // Filter events by the condition field
    let filteredEvents = relevantEvents;
    
    if (condition.field === 'eventType') {
      filteredEvents = relevantEvents.filter(e => e.eventType === condition.value);
    } else if (condition.field === 'ipAddress') {
      filteredEvents = relevantEvents.filter(e => e.ipAddress === event.ipAddress);
    } else if (condition.field === 'userId') {
      filteredEvents = relevantEvents.filter(e => e.userId === event.userId);
    }
    
    // Check count against threshold
    switch (condition.operator) {
      case 'greater_than':
        return filteredEvents.length > condition.value;
      case 'less_than':
        return filteredEvents.length < condition.value;
      case 'equals':
        return filteredEvents.length === condition.value;
      default:
        return false;
    }
  }
  
  /**
   * Evaluate field condition
   */
  private evaluateFieldCondition(condition: ThreatCondition, event: AuditEvent): boolean {
    const fieldValue = this.getFieldValue(event, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'not_contains':
        return !String(fieldValue).includes(String(condition.value));
      case 'regex':
        return new RegExp(condition.value).test(String(fieldValue));
      default:
        return false;
    }
  }
  
  /**
   * Execute rule actions
   */
  private async executeRuleActions(
    rule: ThreatDetectionRule,
    event: AuditEvent,
    alert: SecurityAlert
  ): Promise<void> {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'block_ip':
            if (event.ipAddress) {
              const unblockTime = new Date(Date.now() + (action.duration || 60) * 60 * 1000);
              this.blockedIPs.set(event.ipAddress, unblockTime);
              
              auditLogger.logEvent(
                AuditEventType.IP_BLOCKED,
                {},
                {
                  ipAddress: event.ipAddress,
                  reason: rule.name,
                  duration: action.duration,
                  unblockTime
                },
                RiskLevel.HIGH
              );
            }
            break;
            
          case 'block_user':
            if (event.userId) {
              const unblockTime = new Date(Date.now() + (action.duration || 60) * 60 * 1000);
              this.blockedUsers.set(event.userId, unblockTime);
              
              auditLogger.logEvent(
                AuditEventType.SUSPICIOUS_ACTIVITY,
                { userId: event.userId },
                {
                  reason: rule.name,
                  duration: action.duration,
                  unblockTime
                },
                RiskLevel.HIGH
              );
            }
            break;
            
          case 'alert':
            // Alert is already created
            break;
            
          case 'escalate':
            alert.escalated = true;
            await this.escalateAlert(alert);
            break;
            
          case 'quarantine':
            await this.quarantineUser(event.userId, action.duration || 60);
            break;
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
  }
  
  /**
   * Create security alert
   */
  private createAlert(
    type: ThreatType,
    severity: ThreatSeverity,
    title: string,
    description: string,
    source: string,
    metadata: Record<string, any>
  ): SecurityAlert {
    const alert: SecurityAlert = {
      id: crypto.randomUUID(),
      type,
      severity,
      title,
      description,
      source,
      metadata,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      escalated: false,
      relatedEvents: metadata.eventId ? [metadata.eventId] : []
    };
    
    this.alerts.set(alert.id, alert);
    return alert;
  }
  
  /**
   * Process alert (send notifications, etc.)
   */
  private async processAlert(alert: SecurityAlert, event: AuditEvent): Promise<void> {
    // Log the alert
    auditLogger.logEvent(
      AuditEventType.SECURITY_THREAT_DETECTED,
      {
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent
      },
      {
        alertId: alert.id,
        threatType: alert.type,
        severity: alert.severity,
        title: alert.title,
        source: alert.source
      },
      this.getAlertRiskLevel(alert.severity)
    );
    
    // Send notifications for high severity alerts
    if (alert.severity === ThreatSeverity.HIGH || alert.severity === ThreatSeverity.CRITICAL) {
      await this.sendSecurityNotification(alert);
    }
  }
  
  /**
   * Get user behavior profile
   */
  private getUserProfile(userId: string): UserBehaviorProfile {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        normalPatterns: {
          loginTimes: [],
          locations: [],
          devices: [],
          ipRanges: [],
          userAgents: [],
          activityLevel: 0
        },
        anomalyScores: {
          location: 0,
          time: 0,
          device: 0,
          activity: 0,
          overall: 0
        },
        lastUpdated: new Date(),
        learningPeriod: true
      };
      
      this.userProfiles.set(userId, profile);
    }
    
    return profile;
  }
  
  /**
   * Detect behavior anomalies
   */
  private detectBehaviorAnomalies(
    event: AuditEvent,
    profile: UserBehaviorProfile
  ): UserBehaviorProfile['anomalyScores'] {
    const scores = { ...profile.anomalyScores };
    
    // Time-based anomaly (hour of day)
    const eventHour = new Date(event.timestamp).getHours();
    const timeScore = this.calculateTimeAnomalyScore(eventHour, profile.normalPatterns.loginTimes);
    scores.time = timeScore;
    
    // Location-based anomaly
    const locationScore = this.calculateLocationAnomalyScore(
      event.ipAddress,
      profile.normalPatterns.ipRanges
    );
    scores.location = locationScore;
    
    // Device-based anomaly
    const deviceScore = this.calculateDeviceAnomalyScore(
      event.userAgent,
      profile.normalPatterns.userAgents
    );
    scores.device = deviceScore;
    
    // Activity level anomaly
    const activityScore = this.calculateActivityAnomalyScore(
      userId => this.getRecentUserActivity(userId),
      profile.normalPatterns.activityLevel
    );
    scores.activity = activityScore;
    
    // Overall anomaly score (weighted average)
    scores.overall = (
      timeScore * 0.2 +
      locationScore * 0.3 +
      deviceScore * 0.2 +
      activityScore * 0.3
    );
    
    return scores;
  }
  
  /**
   * Helper methods for anomaly detection
   */
  private calculateTimeAnomalyScore(hour: number, normalTimes: number[]): number {
    if (normalTimes.length === 0) return 0;
    
    const hourCounts = new Array(24).fill(0);
    normalTimes.forEach(h => hourCounts[h]++);
    
    const total = normalTimes.length;
    const probability = hourCounts[hour] / total;
    
    return 1 - probability; // Higher score for less common times
  }
  
  private calculateLocationAnomalyScore(ipAddress: string | undefined, normalIPs: string[]): number {
    if (!ipAddress || normalIPs.length === 0) return 0;
    
    // Simple check - in production, would use GeoIP and IP range analysis
    const ipPrefix = ipAddress.split('.').slice(0, 3).join('.');
    const isKnownPrefix = normalIPs.some(ip => ip.startsWith(ipPrefix));
    
    return isKnownPrefix ? 0 : 0.8;
  }
  
  private calculateDeviceAnomalyScore(userAgent: string | undefined, normalUAs: string[]): number {
    if (!userAgent || normalUAs.length === 0) return 0;
    
    const similarity = normalUAs.some(ua => {
      const uaWords = ua.toLowerCase().split(' ');
      const eventWords = userAgent.toLowerCase().split(' ');
      const commonWords = uaWords.filter(word => eventWords.includes(word));
      return commonWords.length / Math.max(uaWords.length, eventWords.length) > 0.5;
    });
    
    return similarity ? 0 : 0.7;
  }
  
  private calculateActivityAnomalyScore(
    getActivity: (userId: string) => number,
    normalActivity: number
  ): number {
    if (normalActivity === 0) return 0;
    
    const currentActivity = getActivity('current');
    const deviation = Math.abs(currentActivity - normalActivity) / normalActivity;
    
    return Math.min(deviation, 1);
  }
  
  /**
   * Utility methods
   */
  private addEventToBuffer(event: AuditEvent): void {
    const key = `${event.ipAddress || 'unknown'}-${event.userId || 'anonymous'}`;
    
    if (!this.eventBuffer.has(key)) {
      this.eventBuffer.set(key, []);
    }
    
    const buffer = this.eventBuffer.get(key)!;
    buffer.push(event);
    
    // Keep only last 1000 events per key
    if (buffer.length > 1000) {
      buffer.splice(0, buffer.length - 1000);
    }
  }
  
  private getEventsInTimeWindow(windowStart: number, currentEvent: AuditEvent): AuditEvent[] {
    const key = `${currentEvent.ipAddress || 'unknown'}-${currentEvent.userId || 'anonymous'}`;
    const buffer = this.eventBuffer.get(key) || [];
    
    return buffer.filter(event => {
      const eventTime = new Date(event.timestamp).getTime();
      return eventTime >= windowStart;
    });
  }
  
  private getFieldValue(event: AuditEvent, field: string): any {
    const keys = field.split('.');
    let value: any = event;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    return value;
  }
  
  private getAlertRiskLevel(severity: ThreatSeverity): RiskLevel {
    switch (severity) {
      case ThreatSeverity.LOW:
        return RiskLevel.LOW;
      case ThreatSeverity.MEDIUM:
        return RiskLevel.MEDIUM;
      case ThreatSeverity.HIGH:
        return RiskLevel.HIGH;
      case ThreatSeverity.CRITICAL:
        return RiskLevel.CRITICAL;
    }
  }
  
  private getRecentUserActivity(userId: string): number {
    // Simplified activity calculation
    const events = Array.from(this.eventBuffer.values())
      .flat()
      .filter(event => event.userId === userId);
    
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentEvents = events.filter(event => {
      return new Date(event.timestamp).getTime() > oneHourAgo;
    });
    
    return recentEvents.length;
  }
  
  private updateUserProfile(
    userId: string,
    event: AuditEvent,
    profile: UserBehaviorProfile
  ): void {
    // Update normal patterns based on the event
    const hour = new Date(event.timestamp).getHours();
    if (!profile.normalPatterns.loginTimes.includes(hour)) {
      profile.normalPatterns.loginTimes.push(hour);
    }
    
    if (event.ipAddress && !profile.normalPatterns.ipRanges.includes(event.ipAddress)) {
      profile.normalPatterns.ipRanges.push(event.ipAddress);
    }
    
    if (event.userAgent && !profile.normalPatterns.userAgents.includes(event.userAgent)) {
      profile.normalPatterns.userAgents.push(event.userAgent);
    }
    
    profile.lastUpdated = new Date();
    
    // Exit learning period after sufficient data
    if (profile.learningPeriod && profile.normalPatterns.loginTimes.length > 10) {
      profile.learningPeriod = false;
    }
    
    this.userProfiles.set(userId, profile);
  }
  
  private getAnomalyDetails(
    event: AuditEvent,
    profile: UserBehaviorProfile,
    anomalies: UserBehaviorProfile['anomalyScores']
  ): Record<string, any> {
    return {
      unusualTime: anomalies.time > 0.7 ? `Login at hour ${new Date(event.timestamp).getHours()}` : null,
      unusualLocation: anomalies.location > 0.7 ? `New IP address: ${event.ipAddress}` : null,
      unusualDevice: anomalies.device > 0.7 ? `New user agent detected` : null,
      unusualActivity: anomalies.activity > 0.7 ? `Activity level deviation` : null
    };
  }
  
  private async escalateAlert(alert: SecurityAlert): Promise<void> {
    // In production, this would send notifications to security team
    console.log(`ESCALATED ALERT: ${alert.title} - ${alert.description}`);
  }
  
  private async quarantineUser(userId: string | undefined, durationMinutes: number): Promise<void> {
    if (userId) {
      // In production, this would disable user account temporarily
      console.log(`User ${userId} quarantined for ${durationMinutes} minutes`);
    }
  }
  
  private async sendSecurityNotification(alert: SecurityAlert): Promise<void> {
    // In production, this would send email/SMS/Slack notifications
    console.log(`SECURITY ALERT: ${alert.title} - Severity: ${alert.severity}`);
  }
  
  /**
   * Background processors
   */
  private startEventProcessor(): void {
    // Process events in batches for better performance
    setInterval(() => {
      // Batch processing logic would go here
    }, 5000); // Every 5 seconds
  }
  
  private startCleanupProcessor(): void {
    setInterval(() => {
      const now = new Date();
      
      // Clean up expired IP blocks
      for (const [ip, unblockTime] of this.blockedIPs.entries()) {
        if (unblockTime <= now) {
          this.blockedIPs.delete(ip);
        }
      }
      
      // Clean up expired user blocks
      for (const [userId, unblockTime] of this.blockedUsers.entries()) {
        if (unblockTime <= now) {
          this.blockedUsers.delete(userId);
        }
      }
      
      // Clean up old events from buffer
      const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
      for (const [key, events] of this.eventBuffer.entries()) {
        const filteredEvents = events.filter(event => {
          return new Date(event.timestamp).getTime() > cutoff;
        });
        
        if (filteredEvents.length === 0) {
          this.eventBuffer.delete(key);
        } else {
          this.eventBuffer.set(key, filteredEvents);
        }
      }
    }, 300000); // Every 5 minutes
  }
  
  private startBehaviorAnalyzer(): void {
    setInterval(() => {
      // Analyze user behavior patterns and update profiles
      for (const profile of this.userProfiles.values()) {
        if (!profile.learningPeriod) {
          // Perform advanced behavior analysis
          this.analyzeUserBehaviorTrends(profile);
        }
      }
    }, 3600000); // Every hour
  }
  
  private analyzeUserBehaviorTrends(profile: UserBehaviorProfile): void {
    // Advanced behavior analysis would go here
    // This could include machine learning models for anomaly detection
  }
  
  /**
   * Public API methods
   */
  isIPBlocked(ipAddress: string): boolean {
    const unblockTime = this.blockedIPs.get(ipAddress);
    return unblockTime ? unblockTime > new Date() : false;
  }
  
  isUserBlocked(userId: string): boolean {
    const unblockTime = this.blockedUsers.get(userId);
    return unblockTime ? unblockTime > new Date() : false;
  }
  
  getActiveAlerts(status?: SecurityAlert['status']): SecurityAlert[] {
    const alerts = Array.from(this.alerts.values());
    return status ? alerts.filter(alert => alert.status === status) : alerts;
  }
  
  updateAlertStatus(alertId: string, status: SecurityAlert['status'], assignedTo?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    
    alert.status = status;
    alert.updatedAt = new Date();
    
    if (assignedTo) {
      alert.assignedTo = assignedTo;
    }
    
    if (status === 'resolved') {
      alert.resolvedAt = new Date();
    }
    
    this.alerts.set(alertId, alert);
    return true;
  }
  
  addThreatIntelligence(intel: ThreatIntelligence): void {
    this.threatIntelligence.set(intel.value, intel);
  }
  
  updateDetectionRule(rule: ThreatDetectionRule): void {
    rule.updatedAt = new Date();
    this.rules.set(rule.id, rule);
  }
  
  getDetectionRules(): ThreatDetectionRule[] {
    return Array.from(this.rules.values());
  }
  
  getPublicUserProfile(userId: string): UserBehaviorProfile | undefined {
    return this.userProfiles.get(userId);
  }
}

// Export singleton instance
export const threatDetectionService = new ThreatDetectionService();
