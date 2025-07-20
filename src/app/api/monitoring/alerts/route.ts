import { NextRequest, NextResponse } from 'next/server';
import { alertManager } from '@/lib/monitoring/alerts';
import { createLogger } from '@/lib/monitoring/logging';

const logger = createLogger({ component: 'alerts-api' });

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const state = url.searchParams.get('state'); // 'active' or 'all'
    const hours = parseInt(url.searchParams.get('hours') || '24');

    let alerts;
    if (state === 'active') {
      alerts = alertManager.getActiveAlerts();
    } else {
      alerts = alertManager.getAlertHistory(hours);
    }

    const stats = alertManager.getAlertStats();

    logger.debug('Alerts endpoint accessed', {
      state,
      hours,
      alertCount: alerts.length,
    });

    return NextResponse.json({
      alerts,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get alerts', error);
    
    return NextResponse.json({
      error: 'Failed to retrieve alerts',
      message: (error as Error).message,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { metric, value, labels } = body;

    if (!metric || value === undefined) {
      return NextResponse.json({
        error: 'Missing required fields: metric, value',
      }, { status: 400 });
    }

    // Record metric for alert evaluation
    alertManager.recordMetric(metric, value, labels);

    logger.debug('Metric recorded for alerting', {
      metric,
      value,
      labels,
    });

    return NextResponse.json({
      success: true,
      message: 'Metric recorded',
    });
  } catch (error) {
    logger.error('Failed to record metric', error);
    
    return NextResponse.json({
      error: 'Failed to record metric',
      message: (error as Error).message,
    }, { status: 500 });
  }
}