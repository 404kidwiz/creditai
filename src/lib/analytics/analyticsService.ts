import { supabase } from '@/lib/supabase/client'
import { ANALYTICS_EVENTS } from '@/lib/constants'

export interface AnalyticsEvent {
  event_type: string
  event_data?: Record<string, any>
  page_url?: string
  session_id?: string
}

export interface UploadAnalytics {
  file_name: string
  file_size: number
  file_type: string
  upload_status: 'success' | 'failed' | 'processing'
  ocr_status?: 'pending' | 'processing' | 'success' | 'failed'
  ocr_confidence?: number
  processing_time_ms?: number
  error_message?: string
}

export interface AnalyticsStats {
  upload_success_rate: number
  avg_processing_time_ms: number
  ocr_accuracy_rate: number
  avg_ocr_confidence: number
  high_confidence_rate: number
  total_uploads: number
  successful_uploads: number
  total_ocr_attempts: number
  successful_ocr: number
}

export class AnalyticsService {
  private sessionId: string

  constructor() {
    this.sessionId = this.generateSessionId()
  }

  /**
   * Track a user event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.log('Analytics: Supabase not configured, skipping event tracking')
        return
      }

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('Analytics: No authenticated user, skipping event tracking')
        return
      }

      // Check if user has a profile (required for foreign key constraint)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()
      
      if (!profile) {
        console.log('Analytics: User profile not found, skipping event tracking')
        return
      }

      const { error } = await supabase.rpc('track_user_event', {
        event_type_param: event.event_type,
        event_data_param: event.event_data || {},
        page_url_param: event.page_url || window.location.pathname,
        session_id_param: event.session_id || this.sessionId
      })

      if (error) {
        console.error('Failed to track event:', error)
      }
    } catch (error) {
      // Don't log errors in development when Supabase is not set up
      if (process.env.NODE_ENV === 'development') {
        console.log('Analytics: Supabase not available in development, skipping event tracking')
      } else {
        console.error('Analytics tracking error:', error)
      }
    }
  }

  /**
   * Track upload analytics
   */
  async trackUpload(analytics: UploadAnalytics): Promise<void> {
    try {
      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.log('Analytics: Supabase not configured, skipping upload tracking')
        return
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('Analytics: No authenticated user, skipping upload tracking')
        return
      }

      // Check if user has a profile (required for foreign key constraint)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()
      
      if (!profile) {
        console.log('Analytics: User profile not found, skipping upload tracking')
        return
      }

      const { error } = await supabase
        .from('upload_analytics')
        .insert({
          user_id: user.id,
          file_name: analytics.file_name,
          file_size: analytics.file_size,
          file_type: analytics.file_type,
          upload_status: analytics.upload_status,
          ocr_status: analytics.ocr_status,
          ocr_confidence: analytics.ocr_confidence,
          processing_time_ms: analytics.processing_time_ms,
          error_message: analytics.error_message
        })

      if (error) {
        console.error('Failed to track upload:', error)
      }
    } catch (error) {
      // Don't log errors in development when Supabase is not set up
      if (process.env.NODE_ENV === 'development') {
        console.log('Analytics: Supabase not available in development, skipping upload tracking')
      } else {
        console.error('Upload analytics error:', error)
      }
    }
  }

  /**
   * Get upload success rate statistics
   */
  async getUploadStats(daysBack: number = 30): Promise<AnalyticsStats | null> {
    try {
      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.log('Analytics: Supabase not configured, returning mock stats')
        return {
          upload_success_rate: 0,
          avg_processing_time_ms: 0,
          ocr_accuracy_rate: 0,
          avg_ocr_confidence: 0,
          high_confidence_rate: 0,
          total_uploads: 0,
          successful_uploads: 0,
          total_ocr_attempts: 0,
          successful_ocr: 0
        }
      }

      const { data: uploadStats, error: uploadError } = await supabase.rpc('get_upload_success_rate', {
        days_back: daysBack
      })

      const { data: ocrStats, error: ocrError } = await supabase.rpc('get_ocr_accuracy_stats', {
        days_back: daysBack
      })

      if (uploadError || ocrError) {
        console.error('Failed to get analytics stats:', { uploadError, ocrError })
        return null
      }

      const upload = uploadStats?.[0]
      const ocr = ocrStats?.[0]

      if (!upload || !ocr) {
        return null
      }

      return {
        upload_success_rate: upload.success_rate || 0,
        avg_processing_time_ms: upload.avg_processing_time_ms || 0,
        ocr_accuracy_rate: ocr.successful_ocr > 0 ? (ocr.successful_ocr / ocr.total_ocr_attempts) * 100 : 0,
        avg_ocr_confidence: ocr.avg_confidence || 0,
        high_confidence_rate: ocr.high_confidence_rate || 0,
        total_uploads: upload.total_uploads || 0,
        successful_uploads: upload.successful_uploads || 0,
        total_ocr_attempts: ocr.total_ocr_attempts || 0,
        successful_ocr: ocr.successful_ocr || 0
      }
    } catch (error) {
      // Don't log errors in development when Supabase is not set up
      if (process.env.NODE_ENV === 'development') {
        console.log('Analytics: Supabase not available in development, returning mock stats')
        return {
          upload_success_rate: 0,
          avg_processing_time_ms: 0,
          ocr_accuracy_rate: 0,
          avg_ocr_confidence: 0,
          high_confidence_rate: 0,
          total_uploads: 0,
          successful_uploads: 0,
          total_ocr_attempts: 0,
          successful_ocr: 0
        }
      } else {
        console.error('Failed to get upload stats:', error)
        return null
      }
    }
  }

  /**
   * Track page view
   */
  async trackPageView(pageUrl?: string): Promise<void> {
    await this.trackEvent({
      event_type: ANALYTICS_EVENTS.PAGE_VIEW,
      event_data: {
        page_title: document.title,
        referrer: document.referrer
      },
      ...(pageUrl && { page_url: pageUrl })
    })
  }

  /**
   * Track file upload start
   */
  async trackUploadStart(file: File): Promise<void> {
    await this.trackEvent({
      event_type: ANALYTICS_EVENTS.DOCUMENT_UPLOADED,
      event_data: {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        action: 'start'
      }
    })
  }

  /**
   * Track file upload success
   */
  async trackUploadSuccess(file: File, processingTime: number): Promise<void> {
    await this.trackUpload({
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      upload_status: 'success',
      processing_time_ms: processingTime
    })

    await this.trackEvent({
      event_type: ANALYTICS_EVENTS.DOCUMENT_UPLOADED,
      event_data: {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        action: 'success',
        processing_time_ms: processingTime
      }
    })
  }

  /**
   * Track file upload failure
   */
  async trackUploadFailure(file: File, error: string): Promise<void> {
    await this.trackUpload({
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      upload_status: 'failed',
      error_message: error
    })

    await this.trackEvent({
      event_type: ANALYTICS_EVENTS.DOCUMENT_UPLOADED,
      event_data: {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        action: 'failed',
        error: error
      }
    })
  }

  /**
   * Track OCR processing start
   */
  async trackOCRStart(file: File): Promise<void> {
    await this.trackEvent({
      event_type: 'ocr_started',
      event_data: {
        file_name: file.name,
        file_type: file.type
      }
    })
  }

  /**
   * Track OCR processing success
   */
  async trackOCRSuccess(file: File, confidence: number, processingTime: number): Promise<void> {
    await this.trackUpload({
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      upload_status: 'success',
      ocr_status: 'success',
      ocr_confidence: confidence,
      processing_time_ms: processingTime
    })

    await this.trackEvent({
      event_type: 'ocr_completed',
      event_data: {
        file_name: file.name,
        file_type: file.type,
        confidence: confidence,
        processing_time_ms: processingTime
      }
    })
  }

  /**
   * Track OCR processing failure
   */
  async trackOCRFailure(file: File, error: string): Promise<void> {
    await this.trackUpload({
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      upload_status: 'success',
      ocr_status: 'failed',
      error_message: error
    })

    await this.trackEvent({
      event_type: 'ocr_failed',
      event_data: {
        file_name: file.name,
        file_type: file.type,
        error: error
      }
    })
  }

  /**
   * Track user engagement
   */
  async trackEngagement(action: string, data?: Record<string, any>): Promise<void> {
    await this.trackEvent({
      event_type: ANALYTICS_EVENTS.FEATURE_USED,
      event_data: {
        action,
        ...data
      }
    })
  }

  /**
   * Track error
   */
  async trackError(error: Error, context?: Record<string, any>): Promise<void> {
    await this.trackEvent({
      event_type: 'error',
      event_data: {
        message: error.message,
        stack: error.stack,
        ...context
      }
    })
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService()

// Auto-track page views (delayed to ensure auth is ready)
if (typeof window !== 'undefined') {
  // Wait for page to be fully loaded and auth to be initialized
  setTimeout(() => {
    analyticsService.trackPageView()

    // Track navigation changes
    let currentPath = window.location.pathname
    const observer = new MutationObserver(() => {
      if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname
        analyticsService.trackPageView()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }, 2000) // Wait 2 seconds for auth to initialize
} 