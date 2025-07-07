'use client'

import React, { useState, useEffect } from 'react'
import { CreditReportUpload } from '@/components/upload/CreditReportUpload'
import { ExtractedText } from '@/lib/ocr/textExtractor'
import { analyticsService, AnalyticsStats } from '@/lib/analytics/analyticsService'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { BarChart3, Upload, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react'

export default function TestUploadPage() {
  const [uploadResults, setUploadResults] = useState<Array<{
    fileUrl: string
    extractedText: ExtractedText
    timestamp: Date
  }>>([])
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticsStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const handleUploadComplete = (result: {
    fileUrl: string
    extractedText: ExtractedText
  }) => {
    console.log('Upload completed:', result)
    
    // Add to results
    setUploadResults(prev => [...prev, {
      ...result,
      timestamp: new Date()
    }])
    
    // Track engagement
    analyticsService.trackEngagement('test_upload_completed', {
      confidence: result.extractedText.confidence,
      has_score: !!result.extractedText.creditData.score,
      accounts_found: result.extractedText.creditData.accounts.length
    })
  }

  const loadAnalyticsStats = async () => {
    setLoadingStats(true)
    try {
      const stats = await analyticsService.getUploadStats(7) // Last 7 days
      setAnalyticsStats(stats)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    loadAnalyticsStats()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            Credit Report Upload Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Test the upload system with sample credit reports and view analytics
          </p>
        </div>

        {/* Analytics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Upload Success Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsStats ? `${analyticsStats.upload_success_rate.toFixed(1)}%` : '--'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">OCR Accuracy</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsStats ? `${analyticsStats.ocr_accuracy_rate.toFixed(1)}%` : '--'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsStats ? `${analyticsStats.avg_ocr_confidence.toFixed(1)}%` : '--'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Processing Time</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsStats ? `${analyticsStats.avg_processing_time_ms}ms` : '--'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Upload Component */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <CreditReportUpload onComplete={handleUploadComplete} />
        </div>

        {/* Test Results */}
        {uploadResults.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Test Results ({uploadResults.length})
            </h2>
            
            <div className="space-y-4">
              {uploadResults.map((result, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        result.extractedText.confidence >= 80 
                          ? 'bg-green-100 dark:bg-green-900/20' 
                          : 'bg-yellow-100 dark:bg-yellow-900/20'
                      }`}>
                        {result.extractedText.confidence >= 80 ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          Upload #{index + 1}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {result.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Confidence</p>
                      <p className={`font-bold ${
                        result.extractedText.confidence >= 80 
                          ? 'text-green-600' 
                          : 'text-yellow-600'
                      }`}>
                        {result.extractedText.confidence.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Credit Score</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {result.extractedText.creditData.score || 'Not found'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Accounts Found</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {result.extractedText.creditData.accounts.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Public Records</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {result.extractedText.creditData.publicRecords.length}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Analytics & Testing
            </h2>
            <Button
              onClick={loadAnalyticsStats}
              disabled={loadingStats}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {loadingStats ? 'Loading...' : 'Refresh Stats'}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Upload Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Uploads:</span>
                  <span className="font-medium">{analyticsStats?.total_uploads || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Successful:</span>
                  <span className="font-medium text-green-600">{analyticsStats?.successful_uploads || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">OCR Attempts:</span>
                  <span className="font-medium">{analyticsStats?.total_ocr_attempts || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">OCR Success:</span>
                  <span className="font-medium text-green-600">{analyticsStats?.successful_ocr || 0}</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Performance Metrics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">High Confidence Rate:</span>
                  <span className="font-medium">{analyticsStats?.high_confidence_rate.toFixed(1) || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Avg Processing Time:</span>
                  <span className="font-medium">{analyticsStats?.avg_processing_time_ms || 0}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Success Rate:</span>
                  <span className="font-medium text-green-600">{analyticsStats?.upload_success_rate.toFixed(1) || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">OCR Accuracy:</span>
                  <span className="font-medium text-green-600">{analyticsStats?.ocr_accuracy_rate.toFixed(1) || 0}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
          <div className="space-y-2">
            <p className="font-medium">Testing Instructions:</p>
            <ul className="text-sm space-y-1">
              <li>• Upload sample credit report images to test OCR accuracy</li>
              <li>• Monitor analytics dashboard for performance metrics</li>
              <li>• Check confidence scores and extracted data quality</li>
              <li>• Use different image qualities to test robustness</li>
            </ul>
          </div>
        </Alert>
      </div>
    </div>
  )
} 