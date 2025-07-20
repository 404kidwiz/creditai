import { NextRequest, NextResponse } from 'next/server';
import { healthMonitor } from '@/lib/monitoring/health';
import { createLogger } from '@/lib/monitoring/logging';

const logger = createLogger({ component: 'health-api' });

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get query parameters
    const url = new URL(request.url);
    const checkName = url.searchParams.get('check');
    const detailed = url.searchParams.get('detailed') === 'true';

    // Run specific check if requested
    if (checkName) {
      try {
        const result = await healthMonitor.runCheck(checkName);
        const duration = Date.now() - startTime;
        
        logger.info(`Health check completed: ${checkName}`, {
          status: result.status,
          duration: result.duration,
          requestDuration: duration,
        });

        const statusCode = result.status === 'healthy' ? 200 : 
                          result.status === 'degraded' ? 200 : 503;

        return NextResponse.json({
          check: checkName,
          ...result,
          requestDuration: duration,
        }, { status: statusCode });
      } catch (error) {
        logger.error(`Health check failed: ${checkName}`, error);
        return NextResponse.json({
          check: checkName,
          status: 'unhealthy',
          error: (error as Error).message,
          duration: Date.now() - startTime,
        }, { status: 503 });
      }
    }

    // Get full system status
    const systemStatus = await healthMonitor.getSystemStatus();
    const duration = Date.now() - startTime;

    logger.info('System health check completed', {
      status: systemStatus.status,
      summary: systemStatus.summary,
      duration,
    });

    // Filter response based on detailed parameter
    const response = detailed ? {
      ...systemStatus,
      requestDuration: duration,
    } : {
      status: systemStatus.status,
      timestamp: systemStatus.timestamp,
      uptime: systemStatus.uptime,
      version: systemStatus.version,
      environment: systemStatus.environment,
      summary: systemStatus.summary,
      requestDuration: duration,
    };

    const statusCode = systemStatus.status === 'healthy' ? 200 : 
                      systemStatus.status === 'degraded' ? 200 : 503;

    return NextResponse.json(response, { status: statusCode });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Health check endpoint error', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      requestDuration: duration,
    }, { status: 503 });
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}