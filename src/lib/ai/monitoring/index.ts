// AI Model Monitoring System
// Production monitoring and alerting

import { aiModelManager } from '../config/manager';
import { AI_DEPLOYMENT_CONFIG } from '../config/deployment';

export interface ModelMetrics {
  model: string;
  requests: number;
  errors: number;
  avgResponseTime: number;
  availability: number;
  tokenUsage: number;
  cacheHitRate: number;
}

export interface AlertConfig {
  type: 'error_rate' | 'response_time' | 'availability' | 'token_usage';
  threshold: number;
  duration: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class AIModelMonitor {
  private alerts: AlertConfig[] = [
    {
      type: 'error_rate',
      threshold: AI_DEPLOYMENT_CONFIG.monitoring.alerts.errorRate,
      duration: 5,
      severity: 'high'
    },
    {
      type: 'response_time',
      threshold: AI_DEPLOYMENT_CONFIG.monitoring.alerts.responseTime,
      duration: 5,
      severity: 'medium'
    },
    {
      type: 'availability',
      threshold: AI_DEPLOYMENT_CONFIG.monitoring.alerts.availability,
      duration: 10,
      severity: 'critical'
    }
  ];
  
  private alertHistory: Map<string, number> = new Map();
  
  constructor() {
    this.startMonitoring();
  }
  
  private startMonitoring() {
    if (!AI_DEPLOYMENT_CONFIG.monitoring.metrics.enabled) {
      return;
    }
    
    setInterval(async () => {
      await this.collectMetrics();
      await this.checkAlerts();
    }, AI_DEPLOYMENT_CONFIG.monitoring.metrics.interval);
  }
  
  private async collectMetrics(): Promise<void> {
    try {
      for (const modelKey of Object.keys(AI_DEPLOYMENT_CONFIG.models)) {
        const metrics = await this.getModelMetrics(modelKey);
        
        await aiModelManager.logMetric('model_metrics', {
          model: modelKey,
          timestamp: Date.now(),
          ...metrics
        });
      }
    } catch (error) {
      console.error('Metrics collection error:', error);
    }
  }
  
  private async getModelMetrics(model: string): Promise<Partial<ModelMetrics>> {
    const timeRange = 300000; // 5 minutes
    
    try {
      const requests = await aiModelManager.getMetrics(`model_request_${model}`, timeRange);
      const errors = await aiModelManager.getMetrics(`model_error_${model}`, timeRange);
      const responseTimes = await aiModelManager.getMetrics(`model_response_time_${model}`, timeRange);
      
      const requestCount = requests.length;
      const errorCount = errors.length;
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, r) => sum + r.duration, 0) / responseTimes.length 
        : 0;
      
      return {
        requests: requestCount,
        errors: errorCount,
        avgResponseTime,
        availability: requestCount > 0 ? (requestCount - errorCount) / requestCount : 1,
        tokenUsage: requests.reduce((sum, r) => sum + (r.tokens || 0), 0)
      };
    } catch (error) {
      console.error(`Error getting metrics for ${model}:`, error);
      return {};
    }
  }
  
  private async checkAlerts(): Promise<void> {
    for (const alert of this.alerts) {
      try {
        const shouldAlert = await this.evaluateAlert(alert);
        
        if (shouldAlert) {
          const alertKey = `${alert.type}_${alert.severity}`;
          const lastAlert = this.alertHistory.get(alertKey) || 0;
          const now = Date.now();
          
          // Prevent alert spam - minimum 15 minutes between same alerts
          if (now - lastAlert > 900000) {
            await this.sendAlert(alert);
            this.alertHistory.set(alertKey, now);
          }
        }
      } catch (error) {
        console.error(`Alert check error for ${alert.type}:`, error);
      }
    }
  }
  
  private async evaluateAlert(alert: AlertConfig): Promise<boolean> {
    const timeRange = alert.duration * 60000;
    
    switch (alert.type) {
      case 'error_rate':
        return await this.checkErrorRate(alert.threshold, timeRange);
      case 'response_time':
        return await this.checkResponseTime(alert.threshold, timeRange);
      case 'availability':
        return await this.checkAvailability(alert.threshold, timeRange);
      default:
        return false;
    }
  }
  
  private async checkErrorRate(threshold: number, timeRange: number): Promise<boolean> {
    try {
      const allRequests = await aiModelManager.getMetrics('model_request', timeRange);
      const allErrors = await aiModelManager.getMetrics('model_error', timeRange);
      
      if (allRequests.length === 0) return false;
      
      const errorRate = allErrors.length / allRequests.length;
      return errorRate > threshold;
    } catch (error) {
      return false;
    }
  }
  
  private async checkResponseTime(threshold: number, timeRange: number): Promise<boolean> {
    try {
      const responseTimes = await aiModelManager.getMetrics('model_response_time', timeRange);
      
      if (responseTimes.length === 0) return false;
      
      const avgResponseTime = responseTimes.reduce((sum, r) => sum + r.duration, 0) / responseTimes.length;
      return avgResponseTime > threshold;
    } catch (error) {
      return false;
    }
  }
  
  private async checkAvailability(threshold: number, timeRange: number): Promise<boolean> {
    try {
      const healthChecks = await aiModelManager.getMetrics('model_health', timeRange);
      
      if (healthChecks.length === 0) return false;
      
      const healthyChecks = healthChecks.filter(h => h.healthy).length;
      const availability = healthyChecks / healthChecks.length;
      return availability < threshold;
    } catch (error) {
      return false;
    }
  }
  
  private async sendAlert(alert: AlertConfig): Promise<void> {
    const alertMessage = {
      type: alert.type,
      severity: alert.severity,
      threshold: alert.threshold,
      timestamp: new Date().toISOString(),
      message: this.getAlertMessage(alert)
    };
    
    await aiModelManager.logMetric('alert', alertMessage);
    console.warn(`🚨 AI Model Alert [${alert.severity.toUpperCase()}]: ${alertMessage.message}`);
  }
  
  private getAlertMessage(alert: AlertConfig): string {
    switch (alert.type) {
      case 'error_rate':
        return `AI model error rate exceeded ${alert.threshold * 100}% over ${alert.duration} minutes`;
      case 'response_time':
        return `AI model response time exceeded ${alert.threshold}ms over ${alert.duration} minutes`;
      case 'availability':
        return `AI model availability dropped below ${alert.threshold * 100}% over ${alert.duration} minutes`;
      default:
        return `AI model alert: ${alert.type}`;
    }
  }
  
  async getSystemStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'down';
    models: Record<string, ModelMetrics>;
    alerts: any[];
  }> {
    try {
      const models: Record<string, ModelMetrics> = {};
      let healthyModels = 0;
      
      for (const modelKey of Object.keys(AI_DEPLOYMENT_CONFIG.models)) {
        const metrics = await this.getModelMetrics(modelKey);
        models[modelKey] = {
          model: modelKey,
          requests: metrics.requests || 0,
          errors: metrics.errors || 0,
          avgResponseTime: metrics.avgResponseTime || 0,
          availability: metrics.availability || 0,
          tokenUsage: metrics.tokenUsage || 0,
          cacheHitRate: 0
        };
        
        if (models[modelKey].availability > 0.95) {
          healthyModels++;
        }
      }
      
      const totalModels = Object.keys(AI_DEPLOYMENT_CONFIG.models).length;
      const healthRatio = healthyModels / totalModels;
      
      let overall: 'healthy' | 'degraded' | 'down';
      if (healthRatio >= 0.8) {
        overall = 'healthy';
      } else if (healthRatio >= 0.5) {
        overall = 'degraded';
      } else {
        overall = 'down';
      }
      
      const recentAlerts = await aiModelManager.getMetrics('alert', 3600000);
      
      return {
        overall,
        models,
        alerts: recentAlerts
      };
    } catch (error) {
      console.error('Error getting system status:', error);
      return {
        overall: 'down',
        models: {},
        alerts: []
      };
    }
  }
}

export const aiModelMonitor = new AIModelMonitor();