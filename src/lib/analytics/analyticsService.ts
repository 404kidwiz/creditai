// Build-safe analytics service - simplified for build process

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

export interface ProcessingAnalytics {
  processing_method: 'google_cloud' | 'tesseract' | 'fallback'
  confidence_score: number
  processing_time_ms: number
  pages_processed: number
  success_rate: number
}

export class AnalyticsService {
  /**
   * Track a general user event
   */
  async trackEvent(
    eventType: string,
    eventData?: Record<string, any>,
    pageUrl?: string,
    supabaseClient?: any
  ): Promise<void> {
    if (!supabaseClient) {
      console.log(`Analytics event skipped (no client): ${eventType}`)
      return
    }

    try {
      console.log(`Analytics: ${eventType}`, eventData)
      // Implementation would go here in production
    } catch (error) {
      console.error('Analytics tracking failed:', error)
    }
  }

  /**
   * Track PDF processing start
   */
  async trackPDFProcessingStart(
    file: File,
    userId: string,
    supabaseClient?: any
  ): Promise<void> {
    if (!supabaseClient) {
      console.log('PDF processing start tracking skipped (no client)')
      return
    }

    console.log(`PDF processing started for ${file.name} (${file.size} bytes)`)
  }

  /**
   * Track successful PDF processing
   */
  async trackPDFProcessingSuccess(
    file: File,
    userId: string,
    processingTime: number,
    supabaseClient?: any
  ): Promise<void> {
    if (!supabaseClient) {
      console.log('PDF processing success tracking skipped (no client)')
      return
    }

    console.log(`PDF processing succeeded for ${file.name} in ${processingTime}ms`)
  }

  /**
   * Track PDF processing failure
   */
  async trackPDFProcessingFailure(
    file: File,
    userId: string,
    errorMessage: string,
    supabaseClient?: any
  ): Promise<void> {
    if (!supabaseClient) {
      console.log('PDF processing failure tracking skipped (no client)')
      return
    }

    console.error(`PDF processing failed for ${file.name}: ${errorMessage}`)
  }

  /**
   * Track upload start
   */
  async trackUploadStart(file: File, supabaseClient?: any): Promise<void> {
    if (!supabaseClient) {
      console.log('Upload start tracking skipped (no client)')
      return
    }

    console.log(`Upload started for ${file.name} (${file.size} bytes)`)
  }

  /**
   * Track upload success
   */
  async trackUploadSuccess(file: File, url: string, supabaseClient?: any): Promise<void> {
    if (!supabaseClient) {
      console.log('Upload success tracking skipped (no client)')
      return
    }

    console.log(`Upload succeeded for ${file.name}: ${url}`)
  }

  /**
   * Track upload failure
   */
  async trackUploadFailure(file: File, error: string, supabaseClient?: any): Promise<void> {
    if (!supabaseClient) {
      console.log('Upload failure tracking skipped (no client)')
      return
    }

    console.error(`Upload failed for ${file.name}: ${error}`)
  }

  /**
   * Track upload analytics
   */
  async trackUpload(
    uploadData: UploadAnalytics,
    userId: string,
    supabaseClient?: any
  ): Promise<void> {
    if (!supabaseClient) {
      console.log('Upload tracking skipped (no client)')
      return
    }

    console.log(`Upload tracked: ${uploadData.file_name} (${uploadData.upload_status})`)
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboardData(userId: string, supabaseClient?: any): Promise<any> {
    if (!supabaseClient) {
      console.log('Dashboard data request skipped (no client)')
      return {
        totalUploads: 0,
        successfulUploads: 0,
        uploadSuccessRate: 0,
        averageOcrAccuracy: 0,
        totalProcessingTime: 0,
        recentActivity: []
      }
    }

    // Return mock data for build
    return {
      totalUploads: 0,
      successfulUploads: 0,
      uploadSuccessRate: 0,
      averageOcrAccuracy: 0,
      totalProcessingTime: 0,
      recentActivity: []
    }
  }

  /**
   * Track OCR start
   */
  async trackOCRStart(file: File, supabaseClient?: any): Promise<void> {
    if (!supabaseClient) {
      console.log('OCR start tracking skipped (no client)')
      return
    }

    console.log(`OCR started for ${file.name}`)
  }

  /**
   * Track OCR processing
   */
  async trackOCR(
    fileName: string,
    confidence: number,
    processingTime: number,
    userId: string,
    supabaseClient?: any
  ): Promise<void> {
    if (!supabaseClient) {
      console.log('OCR tracking skipped (no client)')
      return
    }

    console.log(`OCR tracked: ${fileName} (confidence: ${confidence}%, time: ${processingTime}ms)`)
  }

  /**
   * Track OCR success
   */
  async trackOCRSuccess(
    file: File,
    confidence: number,
    processingTime: number,
    supabaseClient?: any
  ): Promise<void> {
    if (!supabaseClient) {
      console.log('OCR success tracking skipped (no client)')
      return
    }

    console.log(`OCR succeeded for ${file.name} (confidence: ${confidence}%, time: ${processingTime}ms)`)
  }

  /**
   * Track OCR failure
   */
  async trackOCRFailure(
    file: File,
    error: string,
    supabaseClient?: any
  ): Promise<void> {
    if (!supabaseClient) {
      console.log('OCR failure tracking skipped (no client)')
      return
    }

    console.error(`OCR failed for ${file.name}: ${error}`)
  }

  /**
   * Track AI analysis
   */
  async trackAIAnalysis(
    analysisType: string,
    confidence: number,
    processingTime: number,
    userId: string,
    supabaseClient?: any
  ): Promise<void> {
    if (!supabaseClient) {
      console.log('AI analysis tracking skipped (no client)')
      return
    }

    console.log(`AI analysis tracked: ${analysisType} (confidence: ${confidence}%, time: ${processingTime}ms)`)
  }

  /**
   * Track page view
   */
  async trackPageView(
    pagePath: string,
    userId?: string,
    supabaseClient?: any
  ): Promise<void> {
    if (!supabaseClient) {
      console.log(`Page view tracking skipped (no client): ${pagePath}`)
      return
    }

    console.log(`Page view: ${pagePath}`)
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService()