// Main Monitoring System
// Orchestrates all monitoring components

import { initializeOpenTelemetry, shutdownOpenTelemetry } from './opentelemetry';
import { register, startSystemMetricsCollection } from './prometheus/metrics';
import { alertManager } from './alerts';
import { healthMonitor } from './health';
import { createLogger } from './logging';

const logger = createLogger({ component: 'monitoring-system' });

export interface MonitoringConfig {
  opentelemetry: {
    enabled: boolean;
    endpoint?: string;
  };
  prometheus: {
    enabled: boolean;
    port?: number;
  };
  alerts: {
    enabled: boolean;
    evaluationInterval?: number;
  };
  health: {
    enabled: boolean;
    checkInterval?: number;
  };
  logging: {
    level: string;
    enableFileLogging?: boolean;
  };
}

export class MonitoringSystem {
  private config: MonitoringConfig;
  private initialized = false;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      opentelemetry: {
        enabled: process.env.OTEL_ENABLED === 'true',
        endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      },
      prometheus: {
        enabled: process.env.PROMETHEUS_ENABLED !== 'false',
        port: parseInt(process.env.PROMETHEUS_PORT || '9090'),
      },
      alerts: {
        enabled: process.env.ALERTS_ENABLED !== 'false',
        evaluationInterval: parseInt(process.env.ALERT_EVALUATION_INTERVAL || '30'),
      },
      health: {
        enabled: process.env.HEALTH_CHECKS_ENABLED !== 'false',
        checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60'),
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
      },
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Monitoring system already initialized');
      return;
    }

    logger.info('Initializing monitoring system', this.config);

    try {
      // Initialize OpenTelemetry
      if (this.config.opentelemetry.enabled) {
        await initializeOpenTelemetry();
        logger.info('OpenTelemetry initialized');
      }

      // Start Prometheus metrics collection
      if (this.config.prometheus.enabled) {
        startSystemMetricsCollection();
        logger.info('Prometheus metrics collection started');
      }

      // Start alert manager
      if (this.config.alerts.enabled) {
        alertManager.start(this.config.alerts.evaluationInterval);
        logger.info('Alert manager started');
      }

      // Start health monitoring
      if (this.config.health.enabled) {
        healthMonitor.startPeriodicChecks(this.config.health.checkInterval);
        logger.info('Health monitoring started');
      }

      this.initialized = true;
      logger.info('Monitoring system initialized successfully');

      // Log initial system status
      setTimeout(async () => {
        try {
          const status = await healthMonitor.getSystemStatus();
          logger.info('Initial system health status', {
            status: status.status,
            summary: status.summary,
          });
        } catch (error) {
          logger.error('Failed to get initial system status', error);
        }
      }, 5000);

    } catch (error) {
      logger.error('Failed to initialize monitoring system', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    logger.info('Shutting down monitoring system');

    try {
      // Stop health monitoring
      healthMonitor.stopPeriodicChecks();

      // Stop alert manager
      alertManager.stop();

      // Shutdown OpenTelemetry
      if (this.config.opentelemetry.enabled) {
        await shutdownOpenTelemetry();
      }

      this.initialized = false;
      logger.info('Monitoring system shut down successfully');
    } catch (error) {
      logger.error('Error during monitoring system shutdown', error);
      throw error;
    }
  }

  getStatus() {
    return {
      initialized: this.initialized,
      config: this.config,
      components: {
        opentelemetry: this.config.opentelemetry.enabled,
        prometheus: this.config.prometheus.enabled,
        alerts: this.config.alerts.enabled,
        health: this.config.health.enabled,
      },
    };
  }

  // Convenience methods for accessing monitoring components
  getHealthMonitor() {
    return healthMonitor;
  }

  getAlertManager() {
    return alertManager;
  }

  getPrometheusRegistry() {
    return register;
  }

  // Quick health check for load balancers
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.initialized) {
        return false;
      }

      const status = await healthMonitor.getSystemStatus();
      return status.status !== 'unhealthy' && status.summary.critical_failures === 0;
    } catch (error) {
      logger.error('Health check failed', error);
      return false;
    }
  }

  // Get metrics for external monitoring systems
  async getMetrics(): Promise<string> {
    if (!this.config.prometheus.enabled) {
      throw new Error('Prometheus metrics not enabled');
    }

    return register.metrics();
  }
}

// Default monitoring system instance
export const monitoringSystem = new MonitoringSystem();

// Auto-initialize in production
if (process.env.NODE_ENV === 'production' && process.env.AUTO_INIT_MONITORING !== 'false') {
  monitoringSystem.initialize().catch((error) => {
    console.error('Failed to auto-initialize monitoring system:', error);
  });
}

// Graceful shutdown handlers
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down monitoring system`);
  try {
    await monitoringSystem.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Export all monitoring components
export * from './opentelemetry';
export * from './prometheus/metrics';
export * from './alerts';
export * from './health';
export * from './logging';