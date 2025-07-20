import { NextRequest, NextResponse } from 'next/server';
import { monitoringSystem } from '@/lib/monitoring';
import { createLogger } from '@/lib/monitoring/logging';

const logger = createLogger({ component: 'metrics-api' });

export async function GET(request: NextRequest) {
  try {
    // Check if Prometheus metrics are enabled
    const status = monitoringSystem.getStatus();
    if (!status.components.prometheus) {
      return NextResponse.json({
        error: 'Prometheus metrics not enabled'
      }, { status: 503 });
    }

    // Get metrics in Prometheus format
    const metrics = await monitoringSystem.getMetrics();
    
    logger.debug('Metrics endpoint accessed', {
      metricsLength: metrics.length,
    });

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    logger.error('Failed to get metrics', error);
    
    return NextResponse.json({
      error: 'Failed to retrieve metrics',
      message: (error as Error).message,
    }, { status: 500 });
  }
}