'use client'

import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { 
  ArrowLeft, 
  FileText, 
  TrendingUp, 
  Calendar,
  CreditCard,
  AlertCircle
} from 'lucide-react'

export default function ReportsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Credit Reports
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                View and analyze your credit reports
              </p>
            </div>
            <Button
              onClick={() => router.push('/upload')}
              className="inline-flex items-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              Upload New Report
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Credit Reports Yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Upload your first credit report to start analyzing your credit and generating dispute letters.
          </p>
          <Button
            onClick={() => router.push('/upload')}
            size="lg"
            className="inline-flex items-center"
          >
            <FileText className="w-5 h-5 mr-2" />
            Upload Credit Report
          </Button>
        </div>

        {/* Features Preview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Multi-Bureau Support
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Upload reports from Equifax, Experian, and TransUnion for comprehensive analysis.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Score Tracking
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Track your credit score improvements over time with detailed analytics.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Error Detection
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              AI-powered analysis identifies errors and opportunities for credit improvement.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 