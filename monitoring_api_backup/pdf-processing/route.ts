/**
 * PDF Processing Monitoring API
 * Provides access to PDF processing metrics and monitoring data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pdfProcessingMonitor } from '@/lib/monitoring/pdfProcessingMonitor'
import { auditLogger } from '@/lib/security/auditLogger'
import { createLogger } from '@/lib/logging/logger'

const logger = createLogger('api:monitoring:pdf-processing')

/**
 * GET /api/monitoring/pdf-processing
 * Returns PDF processing monitoring metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin role (for full metrics access)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    
    // Get query parameters
    const url = new URL(request.url)
    const timeframe = url.searchParams.get('timeframe') || '24h'
    const metric = url.searchParams.get('metric') || 'all'

    // Validate timeframe
    const validTimeframes = ['1h', '24h', '7d', '30d']
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe. Must be one of: 1h, 24h, 7d, 30d' },
        { status: 400 }
      )
    }

    let responseData: any = {}

    // Get metrics based on requested type
    switch (metric) {
      case 'success':
        responseData = {
          success: pdfProcessingMonitor.getSuccessMetrics(timeframe)
        }
        break
        
      case 'confidence':
        responseData = {
          confidence: pdfProcessingMonitor.getConfidenceMetrics(timeframe)
        }
        break
        
      case 'performance':
        responseData = {
          performance: pdfProcessingMonitor.getPerformanceMetrics(timeframe)
        }
        break
        
      case 'errors':
        responseData = {
          errors: pdfProcessingMonitor.getErrorMetrics(timeframe)
        }
        break
        
      case 'dashboard':
        responseData = pdfProcessingMonitor.getDashboardData(timeframe)
        break
        
      case 'all':
      default:
        responseData = {
          success: pdfProcessingMonitor.getSuccessMetrics(timeframe),
          confidence: pdfProcessingMonitor.getConfidenceMetrics(timeframe),
          performance: pdfProcessingMonitor.getPerformanceMetrics(timeframe),
          errors: pdfProcessingMonitor.getErrorMetrics(timeframe),
          timeframe
        }
        break
    }

    // Add audit summary for admins
    if (isAdmin && (metric === 'all' || metric === 'audit')) {
      responseData.audit = await auditLogger.generateAuditSummary(timeframe)
    }

    // Filter sensitive data for non-admin users
    if (!isAdmin) {
      // Remove detailed error messages and user-specific data
      if (responseData.errors) {
        delete responseData.errors.errorTypes
        delete responseData.errors.serviceFailures
      }
      
      if (responseData.recentActivity) {
        responseData.recentActivity = responseData.recentActivity.map((activity: any) => ({
          ...activity,
          userId: undefined,
          errorMessage: undefined
        }))
      }
    }

    logger.info('PDF processing metrics requested', {
      userId: user.id,
      timeframe,
      metric,
      isAdmin
    })

    return NextResponse.json({
      success: true,
      data: responseData,
      metadata: {
        timeframe,
        metric,
        timestamp: new Date().toISOString(),
        isAdmin
      }
    })

  } catch (error) {
    logger.error('Failed to get PDF processing metrics', error as Error)
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve monitoring metrics',
        details: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : String(error)
          : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/monitoring/pdf-processing/alerts
 * Acknowledge system alerts (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { alertIds } = body

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json(
        { error: 'Alert IDs array required' },
        { status: 400 }
      )
    }

    // Acknowledge alerts
    const { error: updateError } = await supabase
      .from('system_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: user.id,
        acknowledged_at: new Date().toISOString()
      })
      .in('id', alertIds)

    if (updateError) {
      throw updateError
    }

    logger.info('System alerts acknowledged', {
      userId: user.id,
      alertCount: alertIds.length,
      alertIds
    })

    return NextResponse.json({
      success: true,
      message: `${alertIds.length} alerts acknowledged`,
      acknowledgedBy: user.id,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Failed to acknowledge alerts', error as Error)
    
    return NextResponse.json(
      {
        error: 'Failed to acknowledge alerts',
        details: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : String(error)
          : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}