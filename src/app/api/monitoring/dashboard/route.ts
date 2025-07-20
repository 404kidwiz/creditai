import { NextRequest, NextResponse } from 'next/server';
import { healthMonitor } from '@/lib/monitoring/health';
import { alertManager } from '@/lib/monitoring/alerts';
import { monitoringSystem } from '@/lib/monitoring';
import { createLogger } from '@/lib/monitoring/logging';

const logger = createLogger({ component: 'dashboard-api' });

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Get system health status
    const healthStatus = await healthMonitor.getSystemStatus();

    // Get alert statistics
    const alertStats = alertManager.getAlertStats();
    const activeAlerts = alertManager.getActiveAlerts();

    // Get monitoring system status
    const monitoringStatus = monitoringSystem.getStatus();

    // Calculate performance metrics
    const performanceMetrics = {
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        usage_percent: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
      },
      cpu: {
        usage: process.cpuUsage(),
      },
    };

    // System overview
    const overview = {
      status: healthStatus.status,
      version: healthStatus.version,
      environment: healthStatus.environment,
      uptime: healthStatus.uptime,
      timestamp: new Date().toISOString(),
    };

    // Recent activity summary
    const recentActivity = {
      total_checks: Object.keys(healthStatus.checks).length,
      healthy_checks: healthStatus.summary.healthy,
      degraded_checks: healthStatus.summary.degraded,
      unhealthy_checks: healthStatus.summary.unhealthy,
      critical_failures: healthStatus.summary.critical_failures,
      active_alerts: activeAlerts.length,
      alert_trend: {
        last_1h: alertManager.getAlertHistory(1).length,
        last_24h: alertStats.last24h.total,
      },
    };

    // Component statuses
    const components = {
      monitoring_system: {
        status: monitoringStatus.initialized ? 'healthy' : 'unhealthy',
        initialized: monitoringStatus.initialized,
        components: monitoringStatus.components,
      },
      health_monitoring: {
        status: 'healthy',
        total_checks: healthMonitor.getCheckNames().length,
        check_names: healthMonitor.getCheckNames(),
      },
      alerting: {
        status: 'healthy',
        active_alerts: activeAlerts.length,
        rules_count: Object.keys(alertManager['rules'] || {}).length,
      },
    };

    // Dashboard data
    const dashboardData = {
      overview,
      performance: performanceMetrics,
      recent_activity: recentActivity,
      components,
      health: {
        status: healthStatus.status,
        checks: healthStatus.checks,
        summary: healthStatus.summary,
      },
      alerts: {
        active: activeAlerts.slice(0, 10), // Latest 10 active alerts
        stats: alertStats,
      },
      request_duration: Date.now() - startTime,
    };

    logger.info('Dashboard data accessed', {
      status: overview.status,
      activeAlerts: activeAlerts.length,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(dashboardData);
  } catch (error) {
    logger.error('Failed to get dashboard data', error);
    
    return NextResponse.json({
      error: 'Failed to retrieve dashboard data',
      message: (error as Error).message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}