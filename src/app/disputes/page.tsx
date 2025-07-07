'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { DisputeLetterGenerator } from '@/components/disputes/DisputeLetterGenerator'
import { disputeLetterGenerator, DisputeLetter } from '@/lib/disputes/disputeLetterGenerator'
import { DisputeRecommendation } from '@/lib/ai/creditAnalyzer'
import { 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  FileText,
  Send
} from 'lucide-react'

export default function DisputesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [disputeLetters, setDisputeLetters] = useState<DisputeLetter[]>([])
  const [recommendations, setRecommendations] = useState<DisputeRecommendation[]>([])
  const [isLoadingLetters, setIsLoadingLetters] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)

  useEffect(() => {
    if (user) {
      loadDisputeLetters()
      loadRecommendations()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadDisputeLetters = async () => {
    if (!user) return
    
    setIsLoadingLetters(true)
    try {
      const letters = await disputeLetterGenerator.getUserDisputeLetters(user.id)
      setDisputeLetters(letters)
    } catch (error) {
      console.error('Error loading dispute letters:', error)
    } finally {
      setIsLoadingLetters(false)
    }
  }

  const loadRecommendations = async () => {
    // This would load recommendations from the latest credit report analysis
    // For now, we'll use sample data
    const sampleRecommendations: DisputeRecommendation[] = [
      {
        negativeItemId: 'sample-1',
        priority: 'high',
        disputeReason: 'Inaccurate late payment reported',
        legalBasis: 'FCRA Section 611 - Dispute procedures',
        expectedImpact: 'Could improve score by 20-30 points',
        letterTemplate: 'inaccurate_information'
      },
      {
        negativeItemId: 'sample-2',
        priority: 'medium',
        disputeReason: 'Collection account past 7-year limit',
        legalBasis: 'FCRA Section 605 - Obsolete information',
        expectedImpact: 'Could improve score by 15-25 points',
        letterTemplate: 'outdated_information'
      }
    ]
    setRecommendations(sampleRecommendations)
  }

  const handleLetterGenerated = (letter: DisputeLetter) => {
    setDisputeLetters(prev => [letter, ...prev])
    setShowGenerator(false)
  }

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
                Dispute Letters
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage your credit dispute letters and track their progress
              </p>
            </div>
            <div className="flex space-x-4">
              <Button
                onClick={() => setShowGenerator(!showGenerator)}
                variant="outline"
                className="inline-flex items-center"
              >
                <FileText className="w-4 h-4 mr-2" />
                {showGenerator ? 'Hide Generator' : 'Generate New Letter'}
              </Button>
              <Button
                onClick={() => router.push('/upload')}
                className="inline-flex items-center"
              >
                <FileText className="w-4 h-4 mr-2" />
                Upload Credit Report
              </Button>
            </div>
          </div>
        </div>

        {/* Letter Generator */}
        {showGenerator && (
          <div className="mb-8">
            <DisputeLetterGenerator
              recommendations={recommendations}
              onLetterGenerated={handleLetterGenerated}
            />
          </div>
        )}

        {/* Existing Dispute Letters */}
        {disputeLetters.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Your Dispute Letters
            </h2>
            <div className="space-y-4">
              {disputeLetters.map((letter) => (
                <div key={letter.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {letter.creditorName}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          letter.status === 'generated' ? 'bg-green-100 text-green-800' :
                          letter.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          letter.status === 'responded' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {letter.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {letter.disputeReason}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Created: {letter.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => navigator.clipboard.writeText(letter.letterContent)}
                        variant="outline"
                        size="sm"
                      >
                        Copy
                      </Button>
                      <Button
                        onClick={() => {
                          const blob = new Blob([letter.letterContent], { type: 'text/plain' })
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `dispute-letter-${letter.id}.txt`
                          a.click()
                          window.URL.revokeObjectURL(url)
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {disputeLetters.length === 0 && !showGenerator && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Dispute Letters Yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Upload a credit report to automatically generate personalized dispute letters for errors and inaccuracies.
            </p>
            <Button
              onClick={() => setShowGenerator(true)}
              size="lg"
              className="inline-flex items-center"
            >
              <FileText className="w-5 h-5 mr-2" />
              Generate First Letter
            </Button>
          </div>
        )}

        {/* Features Preview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
              <Send className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Auto-Generated Letters
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              AI-powered dispute letters tailored to your specific credit report findings.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Progress Tracking
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Track the status of your disputes and monitor responses from credit bureaus.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Follow-up Reminders
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Get notified when it's time to follow up on disputes or send additional letters.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 