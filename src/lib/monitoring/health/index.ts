// Enhanced Health Check System
// Comprehensive service health monitoring

import { createClient } from '@/lib/supabase/server';
import { aiModelMonitor } from '@/lib/ai/monitoring';
import { createLogger } from '../logging';

const logger = createLogger({ component: 'health-checks' });

export interface HealthCheck {
  name: string;
  description: string;
  check: () => Promise<HealthCheckResult>;
  timeout?: number;
  critical?: boolean;
  tags?: string[];
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  duration: number;
  details?: Record<string, any>;
  error?: string;
}

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: Record<string, HealthCheckResult>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    critical_failures: number;
  };
}

export class HealthMonitor {
  private checks: Map<string, HealthCheck> = new Map();
  private lastResults: Map<string, HealthCheckResult> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.registerDefaultChecks();
  }

  private registerDefaultChecks() {
    // Database connectivity check
    this.register({
      name: 'database',
      description: 'Database connectivity and responsiveness',
      critical: true,
      tags: ['database', 'critical'],
      timeout: 5000,
      check: async () => {
        const start = Date.now();
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('profiles')
            .select('count')
            .limit(1);

          const duration = Date.now() - start;

          if (error) {
            return {
              status: 'unhealthy',
              duration,
              error: error.message,
              message: 'Database query failed',
            };
          }

          if (duration > 1000) {
            return {
              status: 'degraded',
              duration,
              message: 'Database response time is slow',
              details: { response_time_ms: duration },
            };
          }

          return {
            status: 'healthy',
            duration,
            message: 'Database is responsive',
            details: { response_time_ms: duration },
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            duration: Date.now() - start,
            error: (error as Error).message,
            message: 'Database connection failed',
          };
        }
      },
    });

    // AI Models health check
    this.register({
      name: 'ai_models',
      description: 'AI model availability and performance',
      critical: true,
      tags: ['ai', 'critical'],
      timeout: 10000,
      check: async () => {
        const start = Date.now();
        try {
          const status = await aiModelMonitor.getSystemStatus();
          const duration = Date.now() - start;

          const healthyModels = Object.values(status.models).filter(
            m => m.availability > 0.95
          ).length;
          const totalModels = Object.keys(status.models).length;

          if (status.overall === 'healthy') {
            return {
              status: 'healthy',
              duration,
              message: `All ${totalModels} AI models are healthy`,
              details: {
                healthy_models: healthyModels,
                total_models: totalModels,
                overall_availability: status.overall,
              },
            };
          } else if (status.overall === 'degraded') {
            return {
              status: 'degraded',
              duration,
              message: `${healthyModels}/${totalModels} AI models are healthy`,
              details: {
                healthy_models: healthyModels,
                total_models: totalModels,
                overall_availability: status.overall,
              },
            };
          } else {
            return {
              status: 'unhealthy',
              duration,
              message: `AI models are down (${healthyModels}/${totalModels} healthy)`,
              details: {
                healthy_models: healthyModels,
                total_models: totalModels,
                overall_availability: status.overall,
              },
            };
          }
        } catch (error) {
          return {
            status: 'unhealthy',
            duration: Date.now() - start,
            error: (error as Error).message,
            message: 'Failed to check AI model status',
          };
        }
      },
    });

    // Memory usage check
    this.register({
      name: 'memory',
      description: 'Process memory usage',
      critical: false,
      tags: ['system', 'performance'],
      check: async () => {
        const start = Date.now();
        const memUsage = process.memoryUsage();
        const duration = Date.now() - start;

        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
        const usage = memUsage.heapUsed / memUsage.heapTotal;

        const details = {
          heap_used_mb: heapUsedMB,
          heap_total_mb: heapTotalMB,
          usage_percent: Math.round(usage * 100),
          external_mb: Math.round(memUsage.external / 1024 / 1024),
          rss_mb: Math.round(memUsage.rss / 1024 / 1024),
        };

        if (usage > 0.9) {
          return {
            status: 'unhealthy',
            duration,
            message: `High memory usage: ${Math.round(usage * 100)}%`,
            details,
          };
        } else if (usage > 0.8) {
          return {
            status: 'degraded',
            duration,
            message: `Elevated memory usage: ${Math.round(usage * 100)}%`,
            details,
          };
        }

        return {
          status: 'healthy',
          duration,
          message: `Memory usage: ${Math.round(usage * 100)}%`,
          details,
        };
      },
    });

    // File system check
    this.register({
      name: 'filesystem',
      description: 'File system read/write access',
      critical: false,
      tags: ['system', 'storage'],
      check: async () => {
        const start = Date.now();
        try {
          const fs = require('fs').promises;
          const testFile = '/tmp/health-check-test.txt';
          const testData = `health-check-${Date.now()}`;

          // Write test
          await fs.writeFile(testFile, testData);
          
          // Read test
          const readData = await fs.readFile(testFile, 'utf8');
          
          // Cleanup
          await fs.unlink(testFile);

          const duration = Date.now() - start;

          if (readData !== testData) {
            return {
              status: 'unhealthy',
              duration,
              message: 'File system data integrity issue',
            };
          }

          return {
            status: 'healthy',
            duration,
            message: 'File system is accessible',
            details: { write_read_time_ms: duration },
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            duration: Date.now() - start,
            error: (error as Error).message,
            message: 'File system access failed',
          };
        }
      },
    });

    // Environment variables check
    this.register({
      name: 'environment',
      description: 'Required environment variables',
      critical: true,
      tags: ['config', 'critical'],
      check: async () => {
        const start = Date.now();
        const requiredVars = [
          'DATABASE_URL',
          'GOOGLE_AI_API_KEY',
          'NEXTAUTH_SECRET',
          'STRIPE_SECRET_KEY',
        ];

        const missing = requiredVars.filter(envVar => !process.env[envVar]);
        const duration = Date.now() - start;

        if (missing.length > 0) {
          return {
            status: 'unhealthy',
            duration,
            message: `Missing required environment variables: ${missing.join(', ')}`,
            details: { missing_variables: missing },
          };
        }

        return {
          status: 'healthy',
          duration,
          message: 'All required environment variables are set',
          details: { total_required: requiredVars.length },
        };
      },
    });

    // External API connectivity check
    this.register({
      name: 'external_apis',
      description: 'External API connectivity',
      critical: false,
      tags: ['external', 'connectivity'],
      timeout: 10000,
      check: async () => {
        const start = Date.now();
        const checks = [];

        // Check Google AI API
        if (process.env.GOOGLE_AI_API_KEY) {
          try {
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
              headers: {
                'x-goog-api-key': process.env.GOOGLE_AI_API_KEY,
              },
            });
            checks.push({
              service: 'google_ai',
              status: response.ok ? 'healthy' : 'unhealthy',
              response_code: response.status,
            });
          } catch (error) {
            checks.push({
              service: 'google_ai',
              status: 'unhealthy',
              error: (error as Error).message,
            });
          }
        }

        // Check Stripe API
        if (process.env.STRIPE_SECRET_KEY) {
          try {
            const response = await fetch('https://api.stripe.com/v1/customers?limit=1', {
              headers: {
                'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
              },
            });
            checks.push({
              service: 'stripe',
              status: response.ok ? 'healthy' : 'unhealthy',
              response_code: response.status,
            });
          } catch (error) {
            checks.push({
              service: 'stripe',
              status: 'unhealthy',
              error: (error as Error).message,
            });
          }
        }

        const duration = Date.now() - start;
        const unhealthyServices = checks.filter(c => c.status === 'unhealthy');

        if (unhealthyServices.length === checks.length) {
          return {
            status: 'unhealthy',
            duration,
            message: 'All external APIs are unreachable',
            details: { checks },
          };
        } else if (unhealthyServices.length > 0) {
          return {
            status: 'degraded',
            duration,
            message: `${unhealthyServices.length}/${checks.length} external APIs are unhealthy`,
            details: { checks },
          };
        }

        return {
          status: 'healthy',
          duration,
          message: 'All external APIs are accessible',
          details: { checks },
        };
      },
    });
  }

  register(check: HealthCheck) {
    this.checks.set(check.name, check);
    logger.debug(`Health check registered: ${check.name}`);
  }

  unregister(name: string) {
    this.checks.delete(name);
    this.lastResults.delete(name);
    logger.debug(`Health check unregistered: ${name}`);
  }

  async runCheck(name: string): Promise<HealthCheckResult> {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check '${name}' not found`);
    }

    const timeout = check.timeout || 5000;
    
    try {
      const result = await Promise.race([
        check.check(),
        new Promise<HealthCheckResult>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), timeout)
        ),
      ]);

      this.lastResults.set(name, result);
      
      logger.debug(`Health check completed: ${name}`, {
        status: result.status,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        status: 'unhealthy',
        duration: timeout,
        error: (error as Error).message,
        message: `Health check failed: ${(error as Error).message}`,
      };

      this.lastResults.set(name, result);
      
      logger.error(`Health check failed: ${name}`, error);
      
      return result;
    }
  }

  async runAllChecks(): Promise<Record<string, HealthCheckResult>> {
    const results: Record<string, HealthCheckResult> = {};
    const promises = Array.from(this.checks.keys()).map(async (name) => {
      const result = await this.runCheck(name);
      results[name] = result;
    });

    await Promise.all(promises);
    return results;
  }

  async getSystemStatus(): Promise<SystemHealthStatus> {
    const checks = await this.runAllChecks();
    
    const summary = {
      total: Object.keys(checks).length,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      critical_failures: 0,
    };

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    for (const [name, result] of Object.entries(checks)) {
      const check = this.checks.get(name);
      
      switch (result.status) {
        case 'healthy':
          summary.healthy++;
          break;
        case 'degraded':
          summary.degraded++;
          if (overallStatus === 'healthy') {
            overallStatus = 'degraded';
          }
          break;
        case 'unhealthy':
          summary.unhealthy++;
          if (check?.critical) {
            summary.critical_failures++;
          }
          overallStatus = 'unhealthy';
          break;
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      summary,
    };
  }

  startPeriodicChecks(intervalSeconds: number = 60) {
    if (this.checkInterval) {
      return;
    }

    this.checkInterval = setInterval(async () => {
      try {
        const status = await this.getSystemStatus();
        logger.info('Periodic health check completed', {
          overall_status: status.status,
          summary: status.summary,
        });

        // Log critical failures
        if (status.summary.critical_failures > 0) {
          logger.error('Critical health check failures detected', {
            critical_failures: status.summary.critical_failures,
            failed_checks: Object.entries(status.checks)
              .filter(([name, result]) => {
                const check = this.checks.get(name);
                return result.status === 'unhealthy' && check?.critical;
              })
              .map(([name]) => name),
          });
        }
      } catch (error) {
        logger.error('Failed to run periodic health checks', error);
      }
    }, intervalSeconds * 1000);

    logger.info(`Periodic health checks started (interval: ${intervalSeconds}s)`);
  }

  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Periodic health checks stopped');
    }
  }

  getLastResults(): Record<string, HealthCheckResult> {
    return Object.fromEntries(this.lastResults);
  }

  getCheckNames(): string[] {
    return Array.from(this.checks.keys());
  }

  getChecksByTag(tag: string): string[] {
    return Array.from(this.checks.entries())
      .filter(([_, check]) => check.tags?.includes(tag))
      .map(([name]) => name);
  }
}

// Singleton instance
export const healthMonitor = new HealthMonitor();