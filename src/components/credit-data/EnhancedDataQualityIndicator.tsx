'use client'

import React, { useState } from 'react'
import { DataQualityIndicatorProps } from '@/types/credit-ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Eye,
  RefreshCw,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  FileSearch,
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react'

export function EnhancedDataQualityIndicator({
  overallConfidence,
  sectionConfidence,
  processingMethod,
  missingData,
  onRequestManualReview
}: DataQualityIndicatorProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const getConfidenceLevel = (confidence: number): {
    label: string
    color: string
    bgColor: string
    icon: any
  } => {
    if (confidence >= 85) return {
      label: 'High Quality',
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      icon: CheckCircle
    }
    if (confidence >= 70) return {
      label: 'Good Quality',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      icon: Info
    }
    return {
      label: 'Needs Review',
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      icon: AlertTriangle
    }
  }

  const getProcessingMethodDetails = (method: string) => {
    const methods = {
      'google-documentai': {
        label: 'Google Document AI',
        tier: 'Premium',
        description: 'Advanced AI-powered document analysis',
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
        icon: Sparkles
      },
      'google-vision': {
        label: 'Google Vision API',
        tier: 'Standard',
        description: 'Optical character recognition',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/20',
        icon: FileSearch
      },
      'tesseract': {
        label: 'Tesseract OCR',
        tier: 'Basic',
        description: 'Open-source text extraction',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
        icon: Activity
      },
      'fallback': {
        label: 'Fallback Processing',
        tier: 'Limited',
        description: 'Basic data extraction only',
        color: 'text-red-600',
        bgColor: 'bg-red-100 dark:bg-red-900/20',
        icon: AlertCircle
      }
    }
    return methods[method as keyof typeof methods] || methods.fallback
  }

  const confidenceLevel = getConfidenceLevel(overallConfidence)
  const processingDetails = getProcessingMethodDetails(processingMethod)
  const shouldShowWarning = overallConfidence < 70 || processingMethod === 'fallback'
  const shouldShowManualReview = overallConfidence < 60 || missingData.length > 2

  const sections = [
    { key: 'personalInfo', label: 'Personal Information', icon: Shield },
    { key: 'creditScores', label: 'Credit Scores', icon: TrendingUp },
    { key: 'accounts', label: 'Accounts', icon: Activity },
    { key: 'negativeItems', label: 'Negative Items', icon: AlertTriangle },
    { key: 'inquiries', label: 'Inquiries', icon: Eye }
  ]

  return (
    <div className="space-y-6">
      {/* Main Quality Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden">
          {/* Gradient Header */}
          <div className={`h-2 bg-gradient-to-r ${
            overallConfidence >= 85 ? 'from-green-400 to-green-600' :
            overallConfidence >= 70 ? 'from-yellow-400 to-yellow-600' :
            'from-red-400 to-red-600'
          }`} />
          
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Data Quality Assessment
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Overall Score Display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className={`p-4 rounded-full ${confidenceLevel.bgColor}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <confidenceLevel.icon className={`w-8 h-8 ${confidenceLevel.color}`} />
                </motion.div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {confidenceLevel.label}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Overall confidence in extracted data
                  </p>
                </div>
              </div>
              <div className="text-right">
                <motion.div
                  className={`text-4xl font-bold ${confidenceLevel.color}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                >
                  {overallConfidence.toFixed(0)}%
                </motion.div>
                <p className="text-xs text-gray-500 mt-1">Confidence Score</p>
              </div>
            </div>

            {/* Processing Method Badge */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <processingDetails.icon className={`w-5 h-5 ${processingDetails.color}`} />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {processingDetails.label}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {processingDetails.description}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${processingDetails.bgColor} ${processingDetails.color}`}>
                {processingDetails.tier}
              </span>
            </div>

            {/* Detailed Sections */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Section Quality Breakdown
                  </h4>
                  {sections.map((section) => {
                    const confidence = sectionConfidence[section.key] || 0
                    const isExpanded = expandedSection === section.key
                    const Icon = section.icon
                    
                    return (
                      <motion.div
                        key={section.key}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                        whileHover={{ scale: 1.01 }}
                      >
                        <button
                          onClick={() => setExpandedSection(isExpanded ? null : section.key)}
                          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {section.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <motion.div
                                  className={`h-2 rounded-full ${
                                    confidence >= 85 ? 'bg-green-500' :
                                    confidence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${confidence}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                />
                              </div>
                              <span className={`text-sm font-medium ${
                                confidence >= 85 ? 'text-green-600' :
                                confidence >= 70 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {confidence.toFixed(0)}%
                              </span>
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="px-4 pb-4"
                            >
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {confidence >= 85 
                                  ? 'Excellent data quality. All fields extracted with high confidence.'
                                  : confidence >= 70
                                  ? 'Good data quality. Most fields extracted successfully.'
                                  : 'Low confidence. Consider manual review for accuracy.'
                                }
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Warning Alert */}
      <AnimatePresence>
        {shouldShowWarning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
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
                  <p className="flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5" />
                    Advanced AI processing was not available. Basic text extraction was used instead.
                  </p>
                )}
                {missingData.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">Missing or incomplete data:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {missingData.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Review Option */}
      <AnimatePresence>
        {shouldShowManualReview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Eye className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                      Professional Manual Review Available
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                      Our credit experts can manually review your report to ensure 100% accuracy. 
                      This service includes detailed analysis and personalized recommendations.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={onRequestManualReview}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Request Manual Review
                      </Button>
                      <Button
                        variant="outline"
                        className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Learn More
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quality Improvement Tips */}
      {overallConfidence < 85 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Tips for Better Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: CheckCircle,
                  title: 'Use High-Quality Files',
                  description: 'Upload clear PDFs or high-resolution images'
                },
                {
                  icon: FileSearch,
                  title: 'Complete Reports Only',
                  description: 'Ensure all pages are included'
                },
                {
                  icon: Shield,
                  title: 'Official Sources',
                  description: 'Use reports directly from credit bureaus'
                },
                {
                  icon: RefreshCw,
                  title: 'Recent Reports',
                  description: 'Upload reports less than 60 days old'
                }
              ].map((tip, index) => (
                <motion.div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <tip.icon className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {tip.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {tip.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}