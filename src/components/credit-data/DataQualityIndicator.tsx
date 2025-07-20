'use client'

import React from 'react'
import { DataQualityIndicatorProps } from '@/types/credit-ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Eye,
  RefreshCw,
  TrendingUp
} from 'lucide-react'

export function DataQualityIndicator({
  overallConfidence,
  sectionConfidence,
  processingMethod,
  missingData,
  onRequestManualReview
}: DataQualityIndicatorProps) {
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 85) return 'text-green-600 bg-green-100 border-green-200 dark:bg-green-900/20 dark:border-green-800'
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-100 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
    return 'text-red-600 bg-red-100 border-red-200 dark:bg-red-900/20 dark:border-red-800'
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 85) return <CheckCircle className="w-5 h-5" />
    if (confidence >= 70) return <Info className="w-5 h-5" />
    return <AlertTriangle className="w-5 h-5" />
  }

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 85) return 'High Quality'
    if (confidence >= 70) return 'Good Quality'
    return 'Needs Review'
  }

  const getProcessingMethodLabel = (method: string): string => {
    switch (method) {
      case 'google-documentai':
        return 'Google Document AI (Premium)'
      case 'google-vision':
        return 'Google Vision API (Standard)'
      case 'tesseract':
        return 'Tesseract OCR (Basic)'
      case 'fallback':
        return 'Fallback Processing (Limited)'
      default:
        return method
    }
  }

  const getProcessingMethodColor = (method: string): string => {
    switch (method) {
      case 'google-documentai':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'google-vision':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'tesseract':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'fallback':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const shouldShowWarning = overallConfidence < 70 || processingMethod === 'fallback'
  const shouldShowManualReview = overallConfidence < 60 || missingData.length > 2

  return (
    <div className="space-y-4">
      {/* Main Quality Indicator */}
      <Card className={`border-2 ${getConfidenceColor(overallConfidence).split(' ').slice(2).join(' ')}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Data Quality Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Confidence */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getConfidenceIcon(overallConfidence)}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Overall Confidence
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {getConfidenceLabel(overallConfidence)}
                </p>
              </div>
            </div>
            <div className={`text-2xl font-bold ${getConfidenceColor(overallConfidence).split(' ')[0]}`}>
              {overallConfidence.toFixed(1)}%
            </div>
          </div>

          {/* Processing Method */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Processing Method
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How your document was analyzed
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getProcessingMethodColor(processingMethod)}`}>
              {getProcessingMethodLabel(processingMethod)}
            </span>
          </div>

          {/* Section Breakdown */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Section Quality Breakdown
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(sectionConfidence).map(([section, confidence]) => (
                <div key={section} className="text-center">
                  <div className={`text-lg font-bold ${
                    confidence >= 85 ? 'text-green-600' :
                    confidence >= 70 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {confidence.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                    {section.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning Alert */}
      {shouldShowWarning && (
        <Alert variant={overallConfidence < 50 ? 'destructive' : 'warning'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {overallConfidence < 50 ? 'Low Quality Data Detected' : 'Data Quality Notice'}
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              {overallConfidence < 50 
                ? 'The extracted data has low confidence scores and may contain significant inaccuracies.'
                : 'Some sections of your credit report may have been processed with limited accuracy.'
              }
            </p>
            {processingMethod === 'fallback' && (
              <p>
                Advanced AI processing was not available, so basic text extraction was used instead.
              </p>
            )}
            {missingData.length > 0 && (
              <div>
                <p className="font-medium">Missing or incomplete data:</p>
                <ul className="list-disc list-inside text-sm">
                  {missingData.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Manual Review Option */}
      {shouldShowManualReview && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-800 dark:text-blue-200">
                  Consider Manual Review
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  For the most accurate analysis, our experts can manually review your credit report 
                  and provide detailed insights with higher confidence.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={onRequestManualReview}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Request Manual Review
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality Improvement Tips */}
      {overallConfidence < 85 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Improve Data Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                To get better analysis results in the future:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Upload high-resolution, clear images or PDFs</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Ensure all text is clearly readable</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Use official credit reports from major bureaus</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Avoid screenshots or photos when possible</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}