'use client'

import React, { useState, useCallback } from 'react'
import { Camera, Upload, FileText, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { CameraCapture } from './CameraCapture'
import { FileDropzone } from './FileDropzone'
import { UploadProgress, OCRProgress } from './UploadProgress'
import { fileUploader } from '@/lib/storage/fileUploader'
import { textExtractor, ExtractedText } from '@/lib/ocr/textExtractor'
import { useAuth } from '@/hooks/useAuth'

interface CreditReportUploadProps {
  onComplete?: (result: {
    fileUrl: string
    extractedText: ExtractedText
  }) => void
  className?: string
}

export function CreditReportUpload({ onComplete, className }: CreditReportUploadProps) {
  const { user } = useAuth()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{
    status: 'uploading' | 'processing' | 'analyzing' | 'complete' | 'error'
    progress: number
    message: string
  } | null>(null)
  const [ocrProgress, setOcrProgress] = useState<{
    status: 'loading' | 'recognizing' | 'parsing' | 'analyzing' | 'complete' | 'error'
    progress: number
    message: string
  } | null>(null)
  const [extractedText, setExtractedText] = useState<ExtractedText | null>(null)
  const [showTextPreview, setShowTextPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setError(null)
    setUploadProgress(null)
    setOcrProgress(null)
    setExtractedText(null)
  }, [])

  const handleCameraCapture = useCallback((file: File) => {
    setSelectedFile(file)
    setShowCamera(false)
    setError(null)
    setUploadProgress(null)
    setOcrProgress(null)
    setExtractedText(null)
  }, [])

  const processFile = useCallback(async (file: File) => {
    if (!user) {
      setError('You must be logged in to upload files')
      return
    }

    try {
      // Upload file
      setUploadProgress({
        status: 'uploading',
        progress: 0,
        message: 'Preparing file for upload...'
      })

      const uploadResult = await fileUploader.uploadFile(
        file,
        user.id,
        (progress) => setUploadProgress(progress)
      )

      // Extract text if it's an image
      if (file.type.startsWith('image/')) {
        setOcrProgress({
          status: 'loading',
          progress: 0,
          message: 'Initializing OCR...'
        })

        const extracted = await textExtractor.extractFromImage(
          uploadResult.url,
          (progress) => setOcrProgress(progress)
        )

        setExtractedText(extracted)
      }

      // Call completion callback
      if (onComplete && extractedText) {
        onComplete({
          fileUrl: uploadResult.url,
          extractedText
        })
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setError(errorMessage)
      setUploadProgress({
        status: 'error',
        progress: 0,
        message: errorMessage
      })
    }
  }, [user, onComplete, extractedText])

  const handleUpload = useCallback(() => {
    if (selectedFile) {
      processFile(selectedFile)
    }
  }, [selectedFile, processFile])

  const resetUpload = useCallback(() => {
    setSelectedFile(null)
    setUploadProgress(null)
    setOcrProgress(null)
    setExtractedText(null)
    setError(null)
    setShowTextPreview(false)
  }, [])

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Upload Credit Report
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Upload your credit report for AI-powered analysis and dispute generation
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <span className="text-sm">{error}</span>
        </Alert>
      )}

      {/* Upload Methods */}
      {!selectedFile && (
        <div className="space-y-4">
          {/* Mobile Camera Button */}
          {isMobile && (
            <Button
              onClick={() => setShowCamera(true)}
              className="w-full flex items-center justify-center space-x-2 h-12"
            >
              <Camera className="w-5 h-5" />
              <span>Take Photo</span>
            </Button>
          )}

          {/* File Dropzone */}
          <FileDropzone
            onFileSelect={handleFileSelect}
            disabled={!!uploadProgress}
          />
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && !uploadProgress && (
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              onClick={handleUpload}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload & Process
            </Button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress && (
        <UploadProgress
          status={uploadProgress.status}
          progress={uploadProgress.progress}
          message={uploadProgress.message}
        />
      )}

      {/* OCR Progress */}
      {ocrProgress && (
        <OCRProgress
          status={ocrProgress.status}
          progress={ocrProgress.progress}
          message={ocrProgress.message}
        />
      )}

      {/* Extracted Text Preview */}
      {extractedText && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Extracted Text
            </h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTextPreview(!showTextPreview)}
              >
                {showTextPreview ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                {showTextPreview ? 'Hide' : 'Show'} Text
              </Button>
            </div>
          </div>

          {showTextPreview && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-64 overflow-y-auto">
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {extractedText.text}
              </pre>
            </div>
          )}

          {/* Credit Data Summary */}
          {extractedText.creditData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {extractedText.creditData.score && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Credit Score</h4>
                  <p className="text-2xl font-bold text-blue-600">{extractedText.creditData.score}</p>
                </div>
              )}
              
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-medium text-green-900 dark:text-green-100">Accounts Found</h4>
                <p className="text-2xl font-bold text-green-600">{extractedText.creditData.accounts.length}</p>
              </div>
              
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="font-medium text-yellow-900 dark:text-yellow-100">Public Records</h4>
                <p className="text-2xl font-bold text-yellow-600">{extractedText.creditData.publicRecords.length}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            <span className="text-sm">
              ✅ Credit report uploaded and processed successfully! 
              {extractedText.confidence > 80 ? ' High confidence OCR results.' : ' OCR confidence: ' + extractedText.confidence.toFixed(1) + '%'}
            </span>
          </Alert>
        </div>
      )}

      {/* Reset Button */}
      {selectedFile && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={resetUpload}
            className="text-gray-600 hover:text-gray-800"
          >
            Upload Another File
          </Button>
        </div>
      )}

      {/* Camera Modal */}
      <CameraCapture
        isOpen={showCamera}
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
      />
    </div>
  )
} 