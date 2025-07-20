'use client'

import React, { useState, useCallback } from 'react'
import { useAnalytics } from '@/context/AnalyticsContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { FileDropzone } from './FileDropzone'
import { CameraCapture } from './CameraCapture'
import { UploadProgress } from './UploadProgress'
import { EnhancedCreditProcessing, CreditProcessingState } from './EnhancedCreditProcessing'
import { ExtractedText } from '@/lib/ocr/textExtractor'
import { AlertTriangle, CheckCircle, Eye, Info } from 'lucide-react'

// Confidence threshold configuration (matches analysis results page)
const CONFIDENCE_THRESHOLDS = {
  HIGH: 85,
  MEDIUM: 70,
  LOW: 50
} as const

type ConfidenceLevel = 'high' | 'medium' | 'low'

// Quality assessment helper functions
const getConfidenceLevel = (confidence: number): ConfidenceLevel => {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'high'
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium'
  return 'low'
}

const getConfidenceColor = (level: ConfidenceLevel): string => {
  switch (level) {
    case 'high': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    case 'low': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  }
}

const getProcessingMethodColor = (method: string): string => {
  switch (method) {
    case 'google-documentai': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
    case 'google-vision': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
    case 'tesseract': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
    case 'fallback': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

interface CreditReportUploadProps {
  onComplete?: (result: { fileUrl: string; extractedText: ExtractedText; aiAnalysis: any }) => void;
  className?: string;
}

export function CreditReportUpload({ onComplete, className }: CreditReportUploadProps) {
  const { trackFileUpload, trackCustomEvent } = useAnalytics()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [extractedText, setExtractedText] = useState<ExtractedText | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processingState, setProcessingState] = useState<CreditProcessingState>({
    phase: 'upload',
    progress: 0,
    currentStep: 'upload',
    estimatedTime: 0,
    elapsedTime: 0,
    metadata: {}
  })
  const [showManualReviewRequest, setShowManualReviewRequest] = useState(false)
  const [manualReviewSubmitted, setManualReviewSubmitted] = useState(false)

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true)
    setError(null)
    setExtractedText(null)

    // Initialize processing state
    setProcessingState({
      phase: 'upload',
      progress: 10,
      fileSize: file.size,
      metadata: {
        fileName: file.name,
        fileType: file.type,
        pageCount: file.type === 'application/pdf' ? undefined : 1
      }
    })

    // Track file upload start
    trackFileUpload(file.name, file.size, file.type)
    trackCustomEvent('file_upload_started', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

    try {
      let finalExtractedText: ExtractedText

      if (file.type.startsWith('image/')) {
        console.log('Processing image file...')
        setProcessingState(prev => ({
          ...prev,
          phase: 'ocr',
          progress: 25
        }))

        // Convert image to base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            resolve(result.split(',')[1])
          }
          reader.readAsDataURL(file)
        })

        // Process image using the API route
        const response = await fetch('/api/process-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageData: base64,
            fileName: file.name,
            fileType: 'image'
          }),
        })

        if (!response.ok) {
          throw new Error(`Image processing failed: ${response.status}`)
        }

        const result = await response.json()
        console.log('Image processing result:', result)

        finalExtractedText = {
          text: result.text,
          confidence: result.confidence,
          words: [],
          creditData: result.extractedData || {
            accounts: [],
            inquiries: [],
            publicRecords: []
          },
          processingMethod: result.processingMethod,
          aiAnalysis: result.aiAnalysis || null
        }

        setExtractedText(finalExtractedText)

        // Update processing state to analysis phase
        setProcessingState(prev => ({
          ...prev,
          phase: 'analysis',
          progress: 70,
          metadata: {
            ...prev.metadata,
            accountCount: result.extractedData?.accounts?.length || 0,
            issueCount: result.aiAnalysis?.negativeItems?.length || 0
          }
        }))

      } else if (file.type === 'application/pdf') {
        console.log('Processing PDF file...')
        setProcessingState(prev => ({
          ...prev,
          phase: 'ocr',
          progress: 25
        }))
        
        try {
          // Process PDF using the API route
          const formData = new FormData()
          formData.append('file', file)
          
          const response = await fetch('/api/process-pdf', {
            method: 'POST',
            body: formData,
          })
          
          if (!response.ok) {
            throw new Error(`PDF processing failed: ${response.status}`)
          }
          
          const pdfResult = await response.json()
          console.log('PDF processing result:', pdfResult);
          if (pdfResult.aiAnalysis) {
            console.log('Storing analysis result in localStorage');
            localStorage.setItem('analysisResult', JSON.stringify(pdfResult.aiAnalysis));
          }
          
          // Convert PDF result to ExtractedText format with AI analysis
          finalExtractedText = {
            text: pdfResult.text,
            confidence: pdfResult.confidence,
            words: [],
            creditData: pdfResult.extractedData || {
              accounts: [],
              inquiries: [],
              publicRecords: []
            },
            processingMethod: pdfResult.processingMethod,
            aiAnalysis: pdfResult.aiAnalysis || null
          }
          
          setExtractedText(finalExtractedText)
          
          setOcrProgress({
            status: 'complete',
            progress: 100,
            message: `PDF processed using ${pdfResult.processingMethod}`
          })
          
        } catch (error) {
          console.error('PDF processing error:', error)
          setError(error instanceof Error ? error.message : 'PDF processing failed')
          setOcrProgress({
            status: 'error',
            progress: 0,
            message: 'PDF processing failed'
          })
          return
        }
      } else {
        throw new Error('Unsupported file type. Please upload an image or PDF.')
      }

      // Update to completion state
      setProcessingState(prev => ({
        ...prev,
        phase: 'complete',
        progress: 100
      }))

      // Track successful file processing
      trackCustomEvent('file_upload_completed', {
        fileName: file.name,
        fileType: file.type,
        processingMethod: finalExtractedText.processingMethod,
        confidence: finalExtractedText.confidence,
        hasAiAnalysis: !!finalExtractedText.aiAnalysis
      })

      if (onComplete) {
        if (finalExtractedText.aiAnalysis) {
          localStorage.setItem('analysisResult', JSON.stringify(finalExtractedText.aiAnalysis));
        }
        onComplete({
          fileUrl: URL.createObjectURL(file),
          extractedText: finalExtractedText,
          aiAnalysis: finalExtractedText.aiAnalysis
        });
      }

    } catch (error) {
      console.error('File processing error:', error)
      
      // Track failed file processing
      trackCustomEvent('file_upload_failed', {
        fileName: file.name,
        fileType: file.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      const errorMessage = error instanceof Error ? error.message : 'File processing failed'
      setError(errorMessage)
      setProcessingState(prev => ({
        ...prev,
        phase: 'upload',
        progress: 0,
        error: errorMessage
      }))
    } finally {
      setIsProcessing(false)
    }
  }, [onComplete])

  const handleManualReviewRequest = () => {
    setShowManualReviewRequest(true)
    // In a real implementation, this would send the request to the backend
    console.log('Manual review requested for upload:', {
      confidence: extractedText?.confidence,
      processingMethod: extractedText?.processingMethod,
      fileName: 'uploaded_file'
    })
    setManualReviewSubmitted(true)
    setShowManualReviewRequest(false)
  }

  return (
    <div className={className}>
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Upload Credit Report
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Upload a credit report image or PDF to analyze and extract information
            </p>
          </div>

          <FileDropzone onFileSelect={processFile} disabled={isProcessing} />

          <div className="text-center">
            <span className="text-gray-500 dark:text-gray-400">or</span>
          </div>

          <CameraCapture 
            onCapture={processFile} 
            onClose={() => setIsCameraOpen(false)}
            isOpen={isCameraOpen}
          />

          {isProcessing && (
            <EnhancedCreditProcessing
              state={processingState}
              onComplete={(result) => {
                console.log('Processing completed:', result)
                setProcessingState(prev => ({
                  ...prev,
                  phase: 'complete',
                  progress: 100
                }))
              }}
              onError={(error) => {
                console.error('Processing error:', error)
                setError(error)
              }}
              compact={false}
              showTimeEstimates={true}
              showSubSteps={true}
            />
          )}

          {error && (
            <Alert variant="destructive">
              <div className="font-medium">Error</div>
              <div className="text-sm">{error}</div>
            </Alert>
          )}

          {extractedText && (
            <div className="space-y-4">
              {/* AI Quota Warning */}
              {extractedText.confidence < CONFIDENCE_THRESHOLDS.MEDIUM && extractedText.processingMethod === 'fallback' && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Limited Analysis Mode</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>
                        Your credit report has been processed using basic text analysis due to high system demand. 
                        This may result in generic creditor names and reduced accuracy.
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        For the most accurate analysis with real creditor names and detailed dispute recommendations, 
                        please try again later or consider requesting manual review.
                      </p>
                      <Button
                        onClick={handleManualReviewRequest}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Request Manual Review
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Quality Assessment */}
              {extractedText.confidence < CONFIDENCE_THRESHOLDS.MEDIUM && extractedText.processingMethod !== 'fallback' && !manualReviewSubmitted && (
                <Alert variant={extractedText.confidence < CONFIDENCE_THRESHOLDS.LOW ? 'destructive' : 'warning'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Low Confidence Extraction</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>
                        The text extraction confidence is {extractedText.confidence.toFixed(1)}%, which may result in 
                        inaccurate analysis. Consider requesting manual review for better results.
                      </p>
                      <Button
                        onClick={handleManualReviewRequest}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Request Manual Review
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Manual Review Success */}
              {manualReviewSubmitted && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800 dark:text-green-200">Manual Review Requested</AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    Your request has been submitted. Our team will manually process your document within 24-48 hours.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Extraction Results
                </h3>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getConfidenceColor(getConfidenceLevel(extractedText.confidence))}`}>
                    {extractedText.confidence.toFixed(1)}% confidence
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getProcessingMethodColor(extractedText.processingMethod)}`}>
                    {extractedText.processingMethod}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {extractedText.text}
                </pre>
              </div>
              
              {/* Processing Method Information */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Processing Method: {extractedText.processingMethod}</p>
                    <p className="text-blue-700 dark:text-blue-300">
                      {extractedText.processingMethod === 'google-documentai' && 'Processed using Google Document AI for high accuracy'}
                      {extractedText.processingMethod === 'google-vision' && 'Processed using Google Vision API with good accuracy'}
                      {extractedText.processingMethod === 'tesseract' && 'Processed using Tesseract OCR as fallback - lower accuracy expected'}
                      {extractedText.processingMethod === 'fallback' && 'Processed using fallback method - consider manual review'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
