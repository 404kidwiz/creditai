'use client'

import React from 'react'
import { CreditReportUpload } from '@/components/upload/CreditReportUpload'
import { ExtractedText } from '@/lib/ocr/textExtractor'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

export default function UploadPage() {
  const router = useRouter()

  const handleUploadComplete = (result: {
    fileUrl: string
    extractedText: ExtractedText
  }) => {
    // Store the extracted text in localStorage for the next step
    localStorage.setItem('extractedCreditData', JSON.stringify(result.extractedText))
    localStorage.setItem('uploadedFileUrl', result.fileUrl)
    
    toast.success('Credit report uploaded successfully!')
    
    // Redirect to analysis page
    router.push('/analysis')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 md:p-8">
          <CreditReportUpload onComplete={handleUploadComplete} />
        </div>
        
        {/* Additional Information */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              📱 Mobile Optimized
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Take photos directly with your camera for instant OCR processing. 
              Perfect for on-the-go credit report uploads.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              🔒 Secure Storage
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your files are encrypted and stored securely in Supabase. 
              Only you have access to your credit reports.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              🤖 AI Analysis
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Advanced OCR technology extracts and analyzes your credit data 
              for automated dispute letter generation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 