import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PIIMasker } from '@/lib/security/piiMasker'
import { EnhancedPIIMasker, PIISeverity } from '@/lib/security/enhancedPIIMasker'
import { maskPIIWithAudit, maskObjectWithAudit } from '@/lib/security/piiAuditIntegration'
import { DataEncryption } from '@/lib/security/encryption'
import { FileCleanup } from '@/lib/security/fileCleanup'
import { FileValidator } from '@/lib/security/fileValidator'
// import { pdfProcessingMonitor } from '@/lib/monitoring/pdfProcessingMonitor'
import { auditLogger, AuditEventType, RiskLevel } from '@/lib/security/auditLogger'
import { ImprovedConfidenceCalculator } from '@/lib/ai/improvedConfidenceCalculator'
import { EnhancedTextParser } from '@/lib/ai/enhancedTextParser'
import { ABTestingManager } from '@/lib/ai/abTestingConfig'
import crypto from 'crypto'

// A/B testing configuration for improved confidence calculator
function shouldUseImprovedConfidence(userId?: string, sessionId?: string): boolean {
  return ABTestingManager.shouldUseImprovedConfidence(userId, sessionId)
}

// Helper function to convert enhanced parser format to legacy format
function convertEnhancedToLegacyFormat(parsedReport: any): any {
  return {
    personalInfo: {
      name: parsedReport.personalInfo?.name || '',
      address: parsedReport.personalInfo?.address || '',
      ssn: parsedReport.personalInfo?.ssn,
      dateOfBirth: parsedReport.personalInfo?.dateOfBirth
    },
    creditScore: parsedReport.creditScores?.[0] ? {
      score: parsedReport.creditScores[0].score,
      bureau: parsedReport.creditScores[0].bureau,
      date: parsedReport.creditScores[0].date,
      scoreRange: { min: 300, max: 850 }
    } : {
      score: 650,
      bureau: 'Unknown',
      date: new Date().toISOString().split('T')[0],
      scoreRange: { min: 300, max: 850 }
    },
    accounts: parsedReport.accounts?.map((account: any, index: number) => ({
      creditorName: account.creditor || 'Unknown',
      accountNumber: account.accountNumber || `****${index}`,
      accountType: account.accountType || 'credit_card',
      balance: account.balance || 0,
      paymentStatus: account.status || 'Unknown',
      openDate: account.openDate || new Date().toISOString().split('T')[0],
      lastActivity: account.lastActivity || new Date().toISOString().split('T')[0]
    })) || [],
    negativeItems: parsedReport.negativeItems?.map((item: any, index: number) => ({
      creditorName: item.creditor || 'Unknown',
      accountNumber: item.accountNumber || `****${index}`,
      itemType: item.type || 'Unknown',
      dateReported: item.date || new Date().toISOString().split('T')[0],
      balance: item.amount || 0,
      status: item.status || 'Unknown'
    })) || [],
    inquiries: parsedReport.inquiries?.map((inquiry: any) => ({
      creditorName: inquiry.creditor || 'Unknown',
      date: inquiry.date || new Date().toISOString().split('T')[0],
      type: inquiry.type || 'unknown'
    })) || [],
    publicRecords: parsedReport.publicRecords?.map((record: any) => ({
      recordType: record.type || 'Unknown',
      court: record.court || 'Unknown',
      date: record.date || new Date().toISOString().split('T')[0],
      amount: record.amount || 0,
      status: record.status || 'Unknown'
    })) || []
  }
}

export async function POST(request: NextRequest) {
  const processingId = crypto.randomUUID()
  const startTime = performance.now()
  let userId: string | undefined
  let file: File | null = null
  
  // Extract security context
  const securityContext = {
    userId: undefined as string | undefined,
    sessionId: request.headers.get('x-session-id') || undefined,
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    requestId: processingId
  }
  
  try {
    console.log('PDF processing endpoint called')
    
    // Check if this is a JSON request (for image data) or form data (for PDF)
    const contentType = request.headers.get('content-type')

    if (contentType?.includes('application/json')) {
      // Handle image data from JSON body
      const body = await request.json()
      const { imageData, fileName, fileType } = body
      
      if (!imageData || !fileName) {
        return NextResponse.json(
          { error: 'Image data and filename required' },
          { status: 400 }
        )
      }

      // Convert base64 to File object
      const buffer = Buffer.from(imageData, 'base64')
      const blob = new Blob([buffer], { type: fileType === 'image' ? 'image/png' : 'application/pdf' })
      file = new File([blob], fileName, { type: blob.type })
    } else {
      // Handle form data (PDF)
      const formData = await request.formData()
      file = formData.get('file') as File
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Comprehensive file validation
    console.log(`Validating file: ${file.name}, type: ${file.type}, size: ${file.size}`)
    const validationResult = await FileValidator.validateFile(file, {
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
      maxFileSize: 15 * 1024 * 1024, // 15MB limit
      validateSignature: true,
      scanForMalware: true,
      validateContent: true
    })

    if (!validationResult.isValid) {
      // Log validation failure with details
      await auditLogger.logEvent(
        AuditEventType.FILE_UPLOAD,
        securityContext,
        {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          metadata: validationResult.metadata
        },
        RiskLevel.HIGH
      )

      return NextResponse.json(
        { 
          error: 'File validation failed',
          details: validationResult.errors,
          warnings: validationResult.warnings
        },
        { status: 400 }
      )
    }

    console.log(`File validation successful: ${file.name}, type: ${file.type}, size: ${file.size}`)

    // Create Supabase client
    const supabase = createClient()

    // Get user (if authenticated)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
      securityContext.userId = userId
    } catch (error) {
      console.log('No authenticated user found')
    }

    // Log document upload event
    await auditLogger.logDocumentEvent(
      AuditEventType.DOCUMENT_UPLOADED,
      securityContext,
      'success',
      {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    )

    // Import the PDF processor
    console.log('Importing PDF processor...')
    const { pdfProcessor } = await import('@/lib/google-cloud/pdfProcessor')
    console.log('PDF processor imported successfully')
    
    // Process the PDF using the actual processor
    console.log('🚀 [ULTRAFIX-V2] PDF ROUTE PROCESSING STARTED!')
    console.log('🚀 [ULTRAFIX-V2] This should appear in browser console if new code is running!')
    console.log('🔍 [PDF ROUTE] File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      userId: userId
    })
    
    const processingResult = await pdfProcessor.processPDF(file, supabase, userId)
    
    // Enhanced confidence calculation with A/B testing
    const sessionId = securityContext.sessionId
    const useImprovedConfidence = shouldUseImprovedConfidence(userId, sessionId)
    const useEnhancedParser = ABTestingManager.shouldUseEnhancedTextParser(userId, sessionId)
    let enhancedConfidenceResult = null
    let parsedReport = null
    
    if (useImprovedConfidence && processingResult.text) {
      console.log('🔍 [CONFIDENCE] Using improved confidence calculator')
      
      const originalConfidence = processingResult.confidence
      
      // Parse text with enhanced parser if enabled
      if (useEnhancedParser) {
        console.log('🔍 [PARSER] Using enhanced text parser')
        parsedReport = EnhancedTextParser.parseText(processingResult.text)
        
        // Use parsed data if available and higher quality
        if (parsedReport.confidence > 60) {
          console.log('🔍 [PARSER] Using enhanced parser results')
          // Convert enhanced parser format to legacy format for compatibility
          processingResult.extractedData = convertEnhancedToLegacyFormat(parsedReport)
        }
      }
      
      // Calculate improved confidence
      enhancedConfidenceResult = ImprovedConfidenceCalculator.calculateConfidence(
        processingResult.extractedData,
        processingResult.text,
        processingResult.processingMethod
      )
      
      // Update processing result with enhanced confidence
      processingResult.confidence = enhancedConfidenceResult.confidence
      processingResult.confidenceBreakdown = enhancedConfidenceResult.breakdown
      processingResult.qualityIndicators = enhancedConfidenceResult.qualityIndicators
      processingResult.minimumApplied = enhancedConfidenceResult.minimumApplied
      
      console.log('🔍 [CONFIDENCE] Enhanced confidence result:', {
        originalConfidence,
        newConfidence: enhancedConfidenceResult.confidence,
        breakdown: enhancedConfidenceResult.breakdown,
        method: enhancedConfidenceResult.method,
        minimumApplied: enhancedConfidenceResult.minimumApplied,
        qualityIndicators: enhancedConfidenceResult.qualityIndicators.length,
        usedEnhancedParser: useEnhancedParser,
        parsedReportConfidence: parsedReport?.confidence
      })
      
      // Log A/B test participation
      await auditLogger.logSystemEvent(
        AuditEventType.SYSTEM_INFO,
        'info',
        {
          component: 'confidence-calculator',
          event: 'ab-test-participation',
          userId: userId || 'anonymous',
          sessionId,
          variant: 'improved',
          originalConfidence,
          improvedConfidence: enhancedConfidenceResult.confidence,
          confidenceImprovement: enhancedConfidenceResult.confidence - originalConfidence,
          usedEnhancedParser: useEnhancedParser,
          parsedReportConfidence: parsedReport?.confidence
        }
      )
    } else {
      console.log('🔍 [CONFIDENCE] Using legacy confidence calculation')
      
      // Log A/B test participation for control group
      await auditLogger.logSystemEvent(
        AuditEventType.SYSTEM_INFO,
        'info',
        {
          component: 'confidence-calculator',
          event: 'ab-test-participation',
          userId: userId || 'anonymous',
          sessionId,
          variant: 'legacy',
          confidence: processingResult.confidence
        }
      )
    }
    
    console.log('🔍 [PDF ROUTE] Processing result structure:', {
      hasText: !!processingResult.text,
      textLength: processingResult.text?.length || 0,
      textPreview: processingResult.text?.substring(0, 200) || 'No text',
      hasExtractedData: !!processingResult.extractedData,
      hasAiAnalysis: !!processingResult.aiAnalysis,
      method: processingResult.processingMethod,
      confidence: processingResult.confidence,
      processingTime: processingResult.processingTime
    })
    
    // Log extracted data details
    if (processingResult.extractedData) {
      console.log('🔍 [PDF ROUTE] Extracted data details:', {
        personalInfo: processingResult.extractedData.personalInfo,
        accountsCount: processingResult.extractedData.accounts?.length || 0,
        negativeItemsCount: processingResult.extractedData.negativeItems?.length || 0,
        inquiriesCount: processingResult.extractedData.inquiries?.length || 0,
        creditScore: processingResult.extractedData.creditScore
      })
    }
    
    // Log AI analysis details
    if (processingResult.aiAnalysis) {
      console.log('🔍 [PDF ROUTE] AI analysis details:', {
        hasExtractedData: !!processingResult.aiAnalysis.extractedData,
        recommendationsCount: processingResult.aiAnalysis.recommendations?.length || 0,
        scoreAnalysis: processingResult.aiAnalysis.scoreAnalysis,
        confidence: processingResult.aiAnalysis.confidence,
        summary: processingResult.aiAnalysis.summary?.substring(0, 100)
      })
    }

    const processingTime = performance.now() - startTime

    // Apply enhanced PII masking to extracted text with comprehensive protection and audit logging
    const enhancedMaskingResult = await maskPIIWithAudit(
      processingResult.text,
      userId,
      `PDF Processing: ${file.name}`,
      {
        ipAddress: securityContext.ipAddress,
        userAgent: securityContext.userAgent,
        sessionId: securityContext.sessionId
      }
    )
    
    // For backward compatibility, also use the legacy masker
    const legacyMaskingResult = PIIMasker.maskPII(processingResult.text, {
      maskSSN: true,
      maskAccountNumbers: true,
      maskPhoneNumbers: true,
      maskAddresses: false, // Keep for analysis
      maskNames: false, // Keep for analysis
      maskDOB: true,
      maskDriversLicense: true,
      maskPassportNumber: true,
      maskEmailAddresses: true,
      preserveFormat: true
    })

    // Log PII detection for security monitoring with enhanced details
    const enhancedResult = EnhancedPIIMasker.maskPII(processingResult.text)
    if (enhancedResult.piiDetected) {
      console.log('Enhanced PII detection results:', {
        detectedTypes: enhancedResult.detectedTypes,
        detectionCount: enhancedResult.detectionCount,
        severity: enhancedResult.severity,
        confidence: enhancedResult.confidence,
        userId: userId || 'anonymous'
      })
      
      // Log high sensitivity document event for critical or high severity
      if (enhancedResult.severity === PIISeverity.CRITICAL || enhancedResult.severity === PIISeverity.HIGH) {
        await auditLogger.logDocumentEvent(
          AuditEventType.HIGH_SENSITIVITY_DOCUMENT,
          securityContext,
          'success',
          {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            processingMethod: processingResult.processingMethod,
            confidence: processingResult.confidence,
            severity: enhancedResult.severity
          }
        )
      }
    }

    // Apply comprehensive PII masking to structured data with audit logging
    const maskedExtractedData = await maskObjectWithAudit(
      processingResult.extractedData,
      userId,
      `PDF Processing: ${file.name} - Extracted Data`,
      {
        ipAddress: securityContext.ipAddress,
        userAgent: securityContext.userAgent,
        sessionId: securityContext.sessionId
      }
    )
    
    // Encrypt sensitive data for storage with user-specific isolation
    let encryptedData = null
    if (userId && maskedExtractedData) {
      try {
        // Use user-specific encryption with additional authenticated data
        encryptedData = DataEncryption.encryptCreditReportData(maskedExtractedData, userId)
        console.log('Sensitive data encrypted for storage with user isolation')
        
        // Log data encryption event
        await auditLogger.logDocumentEvent(
          AuditEventType.DATA_ENCRYPTED,
          securityContext,
          'success',
          {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            processingMethod: processingResult.processingMethod
          },
          {
            encryptionVersion: encryptedData.version,
            dataSize: JSON.stringify(maskedExtractedData).length
          }
        )
        
        // Generate user hash for additional security
        const userHash = DataEncryption.hashIdentifier(userId)
        
        // Store encrypted data with metadata
        if (encryptedData) {
          await supabase
            .from('credit_reports')
            .insert({
              user_id: userId,
              user_hash: userHash,
              encrypted_data: encryptedData.encryptedData,
              encryption_iv: encryptedData.iv,
              encryption_auth_tag: encryptedData.authTag,
              encryption_version: encryptedData.version,
              encryption_checksum: encryptedData.checksum,
              processing_method: processingResult.processingMethod,
              confidence_score: processingResult.confidence,
              file_name: file.name,
              file_size: file.size,
              processing_time: processingResult.processingTime,
              created_at: new Date().toISOString()
            })
        }
      } catch (encryptionError) {
        console.warn('Failed to encrypt data for storage:', encryptionError)
        
        // Log encryption failure
        await auditLogger.logSystemEvent(
          AuditEventType.SYSTEM_ERROR,
          'error',
          {
            component: 'data-encryption',
            error: encryptionError instanceof Error ? encryptionError.message : String(encryptionError),
            userId: userId,
            fileName: file.name
          }
        )
      }
    }

    // Transform the result to match the expected API format
    // Use masked text for client response to prevent PII exposure
    const apiResult = {
      success: true,
      extractedText: enhancedMaskingResult, // Use enhanced masked text instead of raw text
      analysis: maskedExtractedData, // Use masked data instead of raw data
      confidence: processingResult.confidence,
      processingTime: processingResult.processingTime,
      processingMethod: processingResult.processingMethod,
      // Enhanced confidence information
      confidenceBreakdown: enhancedConfidenceResult?.breakdown,
      qualityIndicators: enhancedConfidenceResult?.qualityIndicators,
      minimumApplied: enhancedConfidenceResult?.minimumApplied,
      confidenceVersion: enhancedConfidenceResult ? 'improved' : 'legacy',
      // Enhanced parsing information
      parsingVersion: useEnhancedParser ? 'enhanced' : 'legacy',
      parsedReportConfidence: parsedReport?.confidence,
      detectedFormat: parsedReport?.format,
      securityInfo: {
        piiMasked: enhancedResult.piiDetected,
        dataEncrypted: !!encryptedData,
        piiSummary: {
          hasPII: enhancedResult.piiDetected,
          piiTypes: enhancedResult.detectedTypes,
          sensitivityScore: enhancedResult.severity === PIISeverity.CRITICAL ? 10 :
                           enhancedResult.severity === PIISeverity.HIGH ? 8 :
                           enhancedResult.severity === PIISeverity.MEDIUM ? 5 : 2,
          detectedItems: enhancedResult.detectionCount
        }
      },
      // Structure the AI analysis in the expected format
      aiAnalysis: processingResult.aiAnalysis || {
        extractedData: maskedExtractedData, // Use masked data
        recommendations: [],
        scoreAnalysis: {
          currentScore: (maskedExtractedData as any).creditScores?.experian?.score || 
                       (maskedExtractedData as any).creditScores?.equifax?.score || 
                       (maskedExtractedData as any).creditScores?.transunion?.score ||
                       maskedExtractedData.creditScore?.score || 650,
          factors: [
            { factor: 'Payment History', impact: 'positive', weight: 35 },
            { factor: 'Credit Utilization', impact: 'neutral', weight: 30 },
            { factor: 'Length of Credit History', impact: 'positive', weight: 15 },
            { factor: 'Credit Mix', impact: 'neutral', weight: 10 },
            { factor: 'New Credit', impact: 'neutral', weight: 10 }
          ],
          improvementPotential: 50,
          timelineEstimate: '3-6 months'
        },
        summary: `Credit report processed successfully using ${processingResult.processingMethod}. Found ${maskedExtractedData.accounts.length} accounts, ${maskedExtractedData.negativeItems.length} negative items, and ${maskedExtractedData.inquiries.length} inquiries.`,
        confidence: processingResult.confidence,
        processingTime: processingResult.processingTime
      }
    }

    // Schedule cleanup of temporary files for this user session
    if (userId) {
      setTimeout(async () => {
        try {
          await FileCleanup.cleanupUserSession(userId)
          console.log(`Cleaned up temporary files for user: ${userId}`)
        } catch (cleanupError) {
          console.warn(`Failed to cleanup files for user ${userId}:`, cleanupError)
        }
      }, 5000) // Cleanup after 5 seconds
    }

    console.log('PDF processing completed successfully:', {
      method: processingResult.processingMethod,
      confidence: processingResult.confidence,
      pages: processingResult.pages,
      textLength: processingResult.text.length,
      piiMasked: enhancedResult.piiDetected,
      piiSeverity: enhancedResult.severity,
      piiDetectionCount: enhancedResult.detectionCount,
      dataEncrypted: !!encryptedData
    })

    // Record processing metrics
    // await pdfProcessingMonitor.recordProcessingMetrics({
    //   processingId,
    //   userId,
    //   fileName: file.name,
    //   fileSize: file.size,
    //   fileType: file.type,
    //   processingMethod: processingResult.processingMethod,
    //   processingTime: Math.round(processingTime),
    //   confidence: processingResult.confidence,
    //   success: true,
    //   piiDetected: maskingResult.maskingApplied,
    //   piiSensitivityScore: maskingResult.sensitivityScore,
    //   dataEncrypted: !!encryptedData,
    //   extractedDataQuality: {
    //     accountsFound: maskedExtractedData.accounts?.length || 0,
    //     negativeItemsFound: maskedExtractedData.negativeItems?.length || 0,
    //     inquiriesFound: maskedExtractedData.inquiries?.length || 0,
    //     creditScoresFound: Object.keys(maskedExtractedData.creditScores || {}).length,
    //     personalInfoComplete: !!(maskedExtractedData.personalInfo?.name && maskedExtractedData.personalInfo?.address)
    //   },
    //   timestamp: new Date().toISOString()
    // })

    // Log successful document processing
    await auditLogger.logDocumentEvent(
      AuditEventType.DOCUMENT_PROCESSED,
      securityContext,
      'success',
      {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        processingMethod: processingResult.processingMethod,
        confidence: processingResult.confidence,
        piiDetected: maskingResult.maskingApplied,
        sensitivityScore: maskingResult.sensitivityScore
      },
      {
        processingTime: Math.round(processingTime),
        extractedDataQuality: {
          accountsFound: maskedExtractedData.accounts?.length || 0,
          negativeItemsFound: maskedExtractedData.negativeItems?.length || 0,
          inquiriesFound: maskedExtractedData.inquiries?.length || 0,
          creditScoresFound: Object.keys(maskedExtractedData.creditScores || {}).length
        }
      }
    )
    
    return NextResponse.json(apiResult)

  } catch (error) {
    console.error('=== PDF Processing Error Details ===')
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : 'No stack available'
    const processingTime = performance.now() - startTime
    
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('Error message:', errorMessage)
    console.error('Error stack:', errorStack)
    
    // Sanitize error message to prevent PII leakage
    const sanitizedErrorMessage = PIIMasker.maskPII(errorMessage).maskedText
    
    // Determine error type for monitoring
    let errorType = 'unknown_error'
    if (errorMessage.includes('Google Cloud')) {
      errorType = 'google_cloud_service_failure'
    } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      errorType = 'network_error'
    } else if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
      errorType = 'authentication_error'
    } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      errorType = 'validation_error'
    } else if (errorMessage.includes('memory') || errorMessage.includes('size')) {
      errorType = 'resource_error'
    } else {
      errorType = 'processing_error'
    }

    // Record failed processing metrics
    if (file) {
      // await pdfProcessingMonitor.recordProcessingMetrics({
      //   processingId,
      //   userId,
      //   fileName: file.name,
      //   fileSize: file.size,
      //   fileType: file.type,
      //   processingMethod: 'failed',
      //   processingTime: Math.round(processingTime),
      //   confidence: 0,
      //   success: false,
      //   errorType,
      //   errorMessage: sanitizedErrorMessage,
      //   piiDetected: false,
      //   piiSensitivityScore: 0,
      //   dataEncrypted: false,
      //   extractedDataQuality: {
      //     accountsFound: 0,
      //     negativeItemsFound: 0,
      //     inquiriesFound: 0,
      //     creditScoresFound: 0,
      //     personalInfoComplete: false
      //   },
      //   timestamp: new Date().toISOString()
      // })
    }

    // Log system error event
    await auditLogger.logSystemEvent(
      AuditEventType.SYSTEM_ERROR,
      'error',
      {
        component: 'pdf-processing',
        errorType,
        error: sanitizedErrorMessage,
        processingTime: Math.round(processingTime),
        fileName: file?.name,
        fileSize: file?.size,
        userId: userId || 'anonymous'
      }
    )

    // Log service failure if it's a service-related error
    if (errorType.includes('service') || errorType.includes('network')) {
      await auditLogger.logSystemEvent(
        AuditEventType.SERVICE_FAILURE,
        'error',
        {
          service: errorType.includes('google_cloud') ? 'google-cloud' : 'unknown',
          errorType,
          error: sanitizedErrorMessage,
          critical: errorType === 'google_cloud_service_failure'
        }
      )
    }
    
    // Clean up any temporary files on error
    if (userId) {
      setTimeout(async () => {
        try {
          await FileCleanup.cleanupUserSession(userId!)
          console.log(`Emergency cleanup completed for user: ${userId}`)
        } catch (cleanupError) {
          console.warn(`Emergency cleanup failed for user ${userId}:`, cleanupError)
        }
      }, 1000)
    }
    
    return NextResponse.json(
      {
        error: 'PDF processing failed',
        details: process.env.NODE_ENV === 'development' 
          ? `Error during PDF processing: ${sanitizedErrorMessage}`
          : 'An error occurred while processing your document. Please try again.',
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
        timestamp: new Date().toISOString(),
        requestId: processingId
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
