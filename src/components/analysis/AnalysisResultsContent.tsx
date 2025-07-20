'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { LoadingState } from '@/components/ui/Loading'
import { AnalysisEmptyState, ErrorEmptyState } from '@/components/ui/EmptyState'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { 
  ArrowLeft, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Eye,
  EyeOff,
  FileText,
  BarChart3,
  CreditCard,
  DollarSign,
  Building,
  Calendar,
  Shield,
  Download,
  Upload,
  RefreshCw,
  Info,
  Target,
  Zap
} from 'lucide-react'

interface AnalysisData {
  extractedData?: {
    personalInfo?: {
      name?: string
      address?: string
      ssn?: string
      dateOfBirth?: string
    }
    creditScores?: {
      [bureau: string]: {
        score?: number
        bureau?: string
        date?: string
      }
    }
    accounts?: any[]
    negativeItems?: any[]
    inquiries?: any[]
    publicRecords?: any[]
  }
  recommendations?: any[]
  scoreAnalysis?: {
    currentScore?: number
    factors?: Array<{
      factor: string
      impact: string
      weight: number
      description: string
    }>
    improvementPotential?: number
    timelineEstimate?: string
    scoreRange?: string
  }
  summary?: string
  confidence?: number
  processingTime?: number
  processingMethod?: string
}

export function AnalysisResultsContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSensitiveData, setShowSensitiveData] = useState(false)

  useEffect(() => {
    const loadAnalysisResult = async () => {
      try {
        setLoading(true)
        setError(null)

        // Try to load from localStorage
        const stored = localStorage.getItem('analysisResult')
        if (!stored) {
          setError('No analysis results found. Please upload a credit report first.')
          return
        }

        const result = JSON.parse(stored)
        console.log('Loaded analysis result:', result)

        // Validate and clean the data
        const cleanedData = validateAndCleanAnalysisData(result)
        setAnalysisData(cleanedData)

      } catch (err) {
        console.error('Error loading analysis result:', err)
        setError('Failed to load analysis results. The data may be corrupted.')
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      loadAnalysisResult()
    }
  }, [authLoading])

  const validateAndCleanAnalysisData = (data: any): AnalysisData => {
    // Check if this is fallback/placeholder data
    const isFallbackData = (
      data.extractedData?.personalInfo?.name?.includes('Extracted from document') ||
      data.extractedData?.personalInfo?.name?.includes('Document requires manual review') ||
      data.scoreAnalysis?.factors?.some((f: any) => f.description?.includes('Analysis in progress'))
    )

    if (isFallbackData) {
      console.log('Detected fallback/placeholder data, creating better display version')
      return createImprovedFallbackData(data)
    }

    return data
  }

  const createImprovedFallbackData = (originalData: any): AnalysisData => {
    const confidence = originalData.confidence || 60
    const processingMethod = originalData.processingMethod || 'fallback'
    
    return {
      extractedData: {
        personalInfo: {
          name: confidence < 70 ? 'Unable to extract reliably' : 'Personal information found',
          address: confidence < 70 ? 'Address extraction limited' : 'Address information found'
        },
        creditScores: {
          experian: {
            score: confidence < 50 ? undefined : (originalData.extractedData?.creditScores?.experian?.score || 650),
            bureau: 'experian',
            date: new Date().toISOString().split('T')[0]
          }
        },
        accounts: originalData.extractedData?.accounts || [],
        negativeItems: originalData.extractedData?.negativeItems || [],
        inquiries: originalData.extractedData?.inquiries || [],
        publicRecords: originalData.extractedData?.publicRecords || []
      },
      recommendations: originalData.recommendations || [],
      scoreAnalysis: {
        currentScore: confidence < 50 ? undefined : (originalData.scoreAnalysis?.currentScore || 650),
        factors: [
          { factor: 'Payment History', impact: 'unknown', weight: 35, description: 'Limited data available for analysis' },
          { factor: 'Credit Utilization', impact: 'unknown', weight: 30, description: 'Processing limitations affected analysis' },
          { factor: 'Length of Credit History', impact: 'unknown', weight: 15, description: 'Basic extraction only' },
          { factor: 'Credit Mix', impact: 'unknown', weight: 10, description: 'Advanced analysis unavailable' },
          { factor: 'New Credit', impact: 'unknown', weight: 10, description: 'Limited analysis capability' }
        ],
        improvementPotential: confidence < 50 ? undefined : 50,
        timelineEstimate: confidence < 50 ? 'Unable to estimate' : '6-12 months',
        scoreRange: confidence < 50 ? 'unknown' : 'fair'
      },
      summary: confidence < 50 
        ? 'Document processing was limited due to technical constraints. Manual review may be needed for detailed analysis.'
        : 'Basic credit report analysis completed with limited AI capabilities. Some information may be incomplete.',
      confidence,
      processingMethod,
      processingTime: originalData.processingTime || 1000
    }
  }

  const handleRetry = () => {
    setError(null)
    const stored = localStorage.getItem('analysisResult')
    if (stored) {
      try {
        const result = JSON.parse(stored)
        const cleanedData = validateAndCleanAnalysisData(result)
        setAnalysisData(cleanedData)
      } catch (err) {
        setError('Failed to reload analysis results')
      }
    }
  }

  const handleUploadNew = () => {
    router.push('/upload')
  }

  if (authLoading || loading) {
    return <LoadingState title="Loading Analysis Results" description="Processing your credit report analysis..." />
  }

  if (!user) {
    router.push('/login')
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
        <ErrorEmptyState
          title="Analysis Results Error"
          description={error}
          onRetry={handleRetry}
        />
      </div>
    )
  }

  if (!analysisData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
        <AnalysisEmptyState />
      </div>
    )
  }

  const isLimitedAnalysis = (analysisData.confidence || 0) < 70 || analysisData.processingMethod === 'fallback'

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.back()}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Credit Report Analysis
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Analysis completed • Confidence: {(analysisData.confidence || 0).toFixed(1)}%
                    {isLimitedAnalysis && ' • Limited analysis mode'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUploadNew}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New Report
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Processing Warning */}
          {isLimitedAnalysis && (
            <Alert variant="warning" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Limited Analysis Mode</AlertTitle>
              <AlertDescription>
                This analysis was processed with limited capabilities due to technical constraints. 
                Some information may be incomplete or require manual review.
                {analysisData.processingMethod === 'fallback' && ' Advanced AI analysis was not available.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {analysisData.summary}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Confidence</span>
                    <span className={`text-lg font-bold ${
                      (analysisData.confidence || 0) >= 85 ? 'text-green-600' :
                      (analysisData.confidence || 0) >= 70 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {(analysisData.confidence || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Processing Time</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {((analysisData.processingTime || 0) / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Method</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                      {analysisData.processingMethod || 'Standard'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credit Score Analysis */}
          {analysisData.scoreAnalysis && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Credit Score Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysisData.scoreAnalysis.currentScore ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <div className="text-center mb-6">
                        <div className="text-4xl font-bold text-blue-600 mb-2">
                          {analysisData.scoreAnalysis.currentScore}
                        </div>
                        <div className="text-lg text-gray-600 dark:text-gray-400 capitalize">
                          {analysisData.scoreAnalysis.scoreRange} Credit
                        </div>
                      </div>
                      {analysisData.scoreAnalysis.improvementPotential && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-green-800 dark:text-green-300">Improvement Potential</span>
                            <span className="text-lg font-bold text-green-600">
                              +{analysisData.scoreAnalysis.improvementPotential} points
                            </span>
                          </div>
                          <div className="text-sm text-green-600 mt-2">
                            Timeline: {analysisData.scoreAnalysis.timelineEstimate}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold mb-4">Score Factors</h4>
                      <div className="space-y-3">
                        {analysisData.scoreAnalysis.factors?.map((factor, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{factor.factor}</span>
                                <span className="text-xs text-gray-500">{factor.weight}%</span>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {factor.description}
                              </div>
                            </div>
                            <div className={`ml-4 px-2 py-1 rounded text-xs ${
                              factor.impact === 'positive' ? 'bg-green-100 text-green-800' :
                              factor.impact === 'negative' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {factor.impact === 'unknown' ? 'Limited Data' : factor.impact}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Score Analysis Unavailable
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Credit score information could not be extracted reliably from this document.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Personal Information */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Personal Information
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSensitiveData(!showSensitiveData)}
                >
                  {showSensitiveData ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showSensitiveData ? 'Hide' : 'Show'} Details
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysisData.extractedData?.personalInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Name</label>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      {showSensitiveData 
                        ? (analysisData.extractedData.personalInfo.name || 'Not available')
                        : '••••••••'
                      }
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Address</label>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      {showSensitiveData 
                        ? (analysisData.extractedData.personalInfo.address || 'Not available')
                        : '••••••••'
                      }
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Personal information extraction was limited due to processing constraints.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AccountSummaryCard
              title="Credit Accounts"
              count={analysisData.extractedData?.accounts?.length || 0}
              icon={CreditCard}
              color="blue"
              isLimited={isLimitedAnalysis}
            />
            <AccountSummaryCard
              title="Negative Items"
              count={analysisData.extractedData?.negativeItems?.length || 0}
              icon={AlertTriangle}
              color="red"
              isLimited={isLimitedAnalysis}
            />
            <AccountSummaryCard
              title="Credit Inquiries"
              count={analysisData.extractedData?.inquiries?.length || 0}
              icon={Target}
              color="yellow"
              isLimited={isLimitedAnalysis}
            />
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button onClick={handleUploadNew} className="flex-1">
              <Upload className="w-4 h-4 mr-2" />
              Upload New Report
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="flex-1">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Dashboard
            </Button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

function AccountSummaryCard({ 
  title, 
  count, 
  icon: Icon, 
  color, 
  isLimited 
}: { 
  title: string
  count: number
  icon: any
  color: string
  isLimited: boolean
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
    yellow: 'from-yellow-500 to-yellow-600'
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`p-3 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} rounded-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {isLimited ? '?' : count}
            </p>
            {isLimited && (
              <p className="text-xs text-gray-500">Limited extraction</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}