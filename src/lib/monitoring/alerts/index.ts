// Alert Management System
// Handles alert rules, notifications, and escalations

import { EventEmitter } from 'events';
import { createClient } from '@/lib/supabase/server';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'above' | 'below' | 'equals' | 'not_equals';
  threshold: number;
  duration: number; // seconds
  severity: 'info' | 'warning' | 'error' | 'critical';
  channels: AlertChannel[];
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  enabled: boolean;
  cooldown?: number; // seconds between alerts
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'console';
  config: Record<string, any>;
  filter?: {
    severities?: string[];
    rules?: string[];
  };
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  status: 'firing' | 'resolved';
  value: number;
  threshold: number;
  message: string;
  startTime: Date;
  endTime?: Date;
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

export class AlertManager extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private evaluationInterval: NodeJS.Timeout | null = null;
  private metrics: Map<string, { value: number; timestamp: number }[]> = new Map();

  constructor() {
    super();
    this.loadDefaultRules();
  }

  private loadDefaultRules() {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Error rate is above 5% for 5 minutes',
        metric: 'error_rate',
        condition: 'above',
        threshold: 0.05,
        duration: 300,
        severity: 'error',
        channels: [{ type: 'console', config: {} }],
        enabled: true,
        cooldown: 900, // 15 minutes
      },
      {
        id: 'high_response_time',
        name: 'High Response Time',
        description: 'Average response time is above 2 seconds for 5 minutes',
        metric: 'response_time_avg',
        condition: 'above',
        threshold: 2000,
        duration: 300,
        severity: 'warning',
        channels: [{ type: 'console', config: {} }],
        enabled: true,
        cooldown: 600, // 10 minutes
      },
      {
        id: 'low_availability',
        name: 'Low Service Availability',
        description: 'Service availability is below 99% for 10 minutes',
        metric: 'availability',
        condition: 'below',
        threshold: 0.99,
        duration: 600,
        severity: 'critical',
        channels: [{ type: 'console', config: {} }],
        enabled: true,
        cooldown: 1800, // 30 minutes
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        description: 'Memory usage is above 90% for 5 minutes',
        metric: 'memory_usage_percent',
        condition: 'above',
        threshold: 0.9,
        duration: 300,
        severity: 'warning',
        channels: [{ type: 'console', config: {} }],
        enabled: true,
        cooldown: 900,
      },
      {
        id: 'high_cpu_usage',
        name: 'High CPU Usage',
        description: 'CPU usage is above 80% for 5 minutes',
        metric: 'cpu_usage_percent',
        condition: 'above',
        threshold: 0.8,
        duration: 300,
        severity: 'warning',
        channels: [{ type: 'console', config: {} }],
        enabled: true,
        cooldown: 900,
      },
      {
        id: 'database_connection_pool_exhausted',
        name: 'Database Connection Pool Exhausted',
        description: 'Available database connections below 10%',
        metric: 'db_connections_available_percent',
        condition: 'below',
        threshold: 0.1,
        duration: 60,
        severity: 'critical',
        channels: [{ type: 'console', config: {} }],
        enabled: true,
        cooldown: 300,
      },
      {
        id: 'ai_model_failure',
        name: 'AI Model Failure Rate High',
        description: 'AI model failure rate above 10% for 5 minutes',
        metric: 'ai_model_error_rate',
        condition: 'above',
        threshold: 0.1,
        duration: 300,
        severity: 'error',
        channels: [{ type: 'console', config: {} }],
        enabled: true,
        cooldown: 600,
      },
      {
        id: 'payment_processing_errors',
        name: 'Payment Processing Errors',
        description: 'Payment processing error rate above 2%',
        metric: 'payment_error_rate',
        condition: 'above',
        threshold: 0.02,
        duration: 180,
        severity: 'critical',
        channels: [{ type: 'console', config: {} }],
        enabled: true,
        cooldown: 300,
      },
    ];

    defaultRules.forEach(rule => this.addRule(rule));
  }

  start(intervalSeconds: number = 30) {
    if (this.evaluationInterval) {
      return;
    }

    this.evaluationInterval = setInterval(() => {
      this.evaluateRules();
    }, intervalSeconds * 1000);

    console.log(`Alert manager started with ${intervalSeconds}s evaluation interval`);
  }

  stop() {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }
  }

  addRule(rule: AlertRule) {
    this.rules.set(rule.id, rule);
    this.emit('rule:added', rule);
  }

  removeRule(ruleId: string) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.delete(ruleId);
      this.emit('rule:removed', rule);
    }
  }

  updateRule(ruleId: string, updates: Partial<AlertRule>) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      const updatedRule = { ...rule, ...updates };
      this.rules.set(ruleId, updatedRule);
      this.emit('rule:updated', updatedRule);
    }
  }

  recordMetric(name: string, value: number, labels?: Record<string, string>) {
    const key = this.getMetricKey(name, labels);
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metricHistory = this.metrics.get(key)!;
    metricHistory.push({ value, timestamp: Date.now() });

    // Keep only last 30 minutes of data
    const cutoff = Date.now() - 30 * 60 * 1000;
    const filtered = metricHistory.filter(m => m.timestamp > cutoff);
    this.metrics.set(key, filtered);
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    
    return `${name}{${labelStr}}`;
  }

  private async evaluateRules() {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      try {
        await this.evaluateRule(rule);
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }
  }

  private async evaluateRule(rule: AlertRule) {
    const metricKey = this.getMetricKey(rule.metric, rule.labels);
    const metricHistory = this.metrics.get(metricKey);

    if (!metricHistory || metricHistory.length === 0) {
      return;
    }

    const now = Date.now();
    const windowStart = now - rule.duration * 1000;
    const windowData = metricHistory.filter(m => m.timestamp >= windowStart);

    if (windowData.length === 0) {
      return;
    }

    // Calculate average value in the window
    const avgValue = windowData.reduce((sum, m) => sum + m.value, 0) / windowData.length;
    const currentValue = windowData[windowData.length - 1].value;

    const shouldFire = this.checkCondition(currentValue, rule.condition, rule.threshold);
    const alertKey = this.getAlertKey(rule);
    const existingAlert = this.activeAlerts.get(alertKey);

    if (shouldFire && !existingAlert) {
      // Check cooldown
      const lastAlert = this.alertHistory
        .filter(a => a.ruleId === rule.id && a.status === 'resolved')
        .sort((a, b) => b.endTime!.getTime() - a.endTime!.getTime())[0];

      if (lastAlert && rule.cooldown) {
        const timeSinceLastAlert = now - lastAlert.endTime!.getTime();
        if (timeSinceLastAlert < rule.cooldown * 1000) {
          return; // Still in cooldown period
        }
      }

      // Fire new alert
      const alert: Alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        status: 'firing',
        value: currentValue,
        threshold: rule.threshold,
        message: this.formatAlertMessage(rule, currentValue),
        startTime: new Date(),
        labels: rule.labels || {},
        annotations: rule.annotations || {},
      };

      this.activeAlerts.set(alertKey, alert);
      this.alertHistory.push(alert);
      await this.sendAlert(alert, rule);
      this.emit('alert:firing', alert);

    } else if (!shouldFire && existingAlert) {
      // Resolve existing alert
      existingAlert.status = 'resolved';
      existingAlert.endTime = new Date();
      this.activeAlerts.delete(alertKey);
      await this.sendAlert(existingAlert, rule);
      this.emit('alert:resolved', existingAlert);
    }
  }

  private checkCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'above':
        return value > threshold;
      case 'below':
        return value < threshold;
      case 'equals':
        return Math.abs(value - threshold) < 0.0001;
      case 'not_equals':
        return Math.abs(value - threshold) >= 0.0001;
      default:
        return false;
    }
  }

  private getAlertKey(rule: AlertRule): string {
    const labelStr = rule.labels ? JSON.stringify(rule.labels) : '';
    return `${rule.id}_${labelStr}`;
  }

  private formatAlertMessage(rule: AlertRule, value: number): string {
    const condition = rule.condition === 'above' ? 'exceeded' :
                     rule.condition === 'below' ? 'dropped below' :
                     rule.condition === 'equals' ? 'equals' : 'does not equal';
    
    return `${rule.name}: ${rule.metric} has ${condition} threshold ${rule.threshold} (current: ${value})`;
  }

  private async sendAlert(alert: Alert, rule: AlertRule) {
    for (const channel of rule.channels) {
      try {
        await this.sendToChannel(alert, channel);
      } catch (error) {
        console.error(`Failed to send alert to ${channel.type}:`, error);
      }
    }

    // Store alert in database
    try {
      const supabase = createClient();
      await supabase.from('alerts').insert({
        rule_id: alert.ruleId,
        rule_name: alert.ruleName,
        severity: alert.severity,
        status: alert.status,
        value: alert.value,
        threshold: alert.threshold,
        message: alert.message,
        started_at: alert.startTime,
        resolved_at: alert.endTime,
        labels: alert.labels,
        annotations: alert.annotations,
      });
    } catch (error) {
      console.error('Failed to store alert in database:', error);
    }
  }

  private async sendToChannel(alert: Alert, channel: AlertChannel) {
    switch (channel.type) {
      case 'console':
        const icon = alert.severity === 'critical' ? '🚨' :
                    alert.severity === 'error' ? '❌' :
                    alert.severity === 'warning' ? '⚠️' : 'ℹ️';
        
        console.log(`${icon} [${alert.severity.toUpperCase()}] ${alert.status === 'firing' ? 'FIRING' : 'RESOLVED'}: ${alert.message}`);
        break;

      case 'email':
        // TODO: Implement email notifications
        break;

      case 'slack':
        // TODO: Implement Slack notifications
        break;

      case 'webhook':
        // TODO: Implement webhook notifications
        break;

      case 'pagerduty':
        // TODO: Implement PagerDuty integration
        break;
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory(hours: number = 24): Alert[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.alertHistory.filter(a => a.startTime.getTime() > cutoff);
  }

  getAlertStats() {
    const activeByeSeverity = new Map<string, number>();
    const historyBySeverity = new Map<string, number>();

    for (const alert of this.activeAlerts.values()) {
      activeByeSeverity.set(alert.severity, (activeByeSeverity.get(alert.severity) || 0) + 1);
    }

    for (const alert of this.getAlertHistory(24)) {
      historyBySeverity.set(alert.severity, (historyBySeverity.get(alert.severity) || 0) + 1);
    }

    return {
      active: {
        total: this.activeAlerts.size,
        bySeverity: Object.fromEntries(activeByeSeverity),
      },
      last24h: {
        total: this.getAlertHistory(24).length,
        bySeverity: Object.fromEntries(historyBySeverity),
      },
    };
  }
}

// Singleton instance
export const alertManager = new AlertManager();