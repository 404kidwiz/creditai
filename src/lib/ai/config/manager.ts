// AI Model Manager
// Production deployment configuration

import { AI_DEPLOYMENT_CONFIG, MODEL_PRIORITY, MODEL_CAPABILITIES } from './deployment';

export interface ModelHealth {
  model: string;
  healthy: boolean;
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
}

export class AIModelManager {
  private static instance: AIModelManager;
  private modelHealth: Map<string, boolean> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private metrics: Map<string, any[]> = new Map();
  
  static getInstance(): AIModelManager {
    if (!AIModelManager.instance) {
      AIModelManager.instance = new AIModelManager();
    }
    return AIModelManager.instance;
  }
  
  constructor() {
    this.initializeRateLimiters();
    this.startHealthChecks();
  }
  
  private initializeRateLimiters() {
    for (const [modelKey, config] of Object.entries(AI_DEPLOYMENT_CONFIG.models)) {
      this.rateLimiters.set(modelKey, new RateLimiter(config.rateLimits));
      this.modelHealth.set(modelKey, true);
    }
  }
  
  private async startHealthChecks() {
    setInterval(async () => {
      for (const [modelKey, config] of Object.entries(AI_DEPLOYMENT_CONFIG.models)) {
        try {
          const isHealthy = await this.checkModelHealth(modelKey, config);
          this.modelHealth.set(modelKey, isHealthy);
          
          if (!isHealthy) {
            console.warn(`Model ${modelKey} health check failed`);
            await this.logMetric('model_health', { model: modelKey, healthy: false });
          }
        } catch (error) {
          console.error(`Health check error for ${modelKey}:`, error);
          this.modelHealth.set(modelKey, false);
        }
      }
    }, 30000); // Check every 30 seconds
  }
  
  private async checkModelHealth(_modelKey: string, _config: any): Promise<boolean> {
    try {
      // Simple health check - would be replaced with actual API calls
      // For now, just return true as a placeholder
      return await Promise.resolve(true);
    } catch (error) {
      return false;
    }
  }
  
  async getAvailableModel(capability: string): Promise<string | null> {
    for (const modelKey of MODEL_PRIORITY) {
      if (this.modelHealth.get(modelKey) && 
          MODEL_CAPABILITIES[modelKey]?.includes(capability as any) &&
          await this.rateLimiters.get(modelKey)?.checkLimit()) {
        return modelKey;
      }
    }
    return null;
  }
  
  async logMetric(metric: string, data: any): Promise<void> {
    const metricKey = `${metric}:${Date.now()}`;
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    
    const metricArray = this.metrics.get(metric)!;
    metricArray.push({ ...data, timestamp: Date.now() });
    
    // Keep only recent metrics (last hour)
    const oneHourAgo = Date.now() - 3600000;
    this.metrics.set(metric, metricArray.filter(m => m.timestamp > oneHourAgo));
  }
  
  async getMetrics(metric: string, timeRange: number = 3600000): Promise<any[]> {
    const metricArray = this.metrics.get(metric) || [];
    const cutoff = Date.now() - timeRange;
    return metricArray.filter(m => m.timestamp > cutoff);
  }
  
  async cacheResult(key: string, result: any, ttl?: number): Promise<void> {
    // Placeholder for Redis caching
    console.log(`Caching result for key: ${key}`);
  }
  
  async getCachedResult(key: string): Promise<any | null> {
    // Placeholder for Redis cache retrieval
    return null;
  }
}

class RateLimiter {
  private requests: number[] = [];
  private tokens: number = 0;
  private lastRefill: number = Date.now();
  
  constructor(private limits: { requestsPerMinute: number; tokensPerMinute: number }) {}
  
  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    
    // Clean old requests (older than 1 minute)
    this.requests = this.requests.filter(time => (now - time) < 60000);
    
    // Refill tokens
    const timeSinceRefill = now - this.lastRefill;
    if (timeSinceRefill >= 60000) {
      this.tokens = this.limits.tokensPerMinute;
      this.lastRefill = now;
    }
    
    // Check limits
    if (this.requests.length >= this.limits.requestsPerMinute) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }
  
  consumeTokens(count: number): boolean {
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }
}

export const aiModelManager = AIModelManager.getInstance();