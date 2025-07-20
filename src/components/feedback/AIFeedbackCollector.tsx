'use client'

import React, { useState, useCallback } from 'react'
import { Star, ThumbsUp, ThumbsDown, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { CreditReportData, AIAnalysisResult } from '@/lib/ai/creditAnalyzer'
import { aiFeedbackIntegration } from '@/lib/ai/feedbackIntegration'

interface AIFeedbackCollectorProps {
  analysisResult: AIAnalysisResult
  sessionId: string
  onComplete?: () => void
}

export function AIFeedbackCollector({ 
  analysisResult, 
  sessionId,
  onComplete 
}: AIFeedbackCollectorProps) {
  const [overallRating, setOverallRating] = useState(0)
  const [accuracyRating, setAccuracyRating] = useState(0)
  const [speedRating, setSpeedRating] = useState(0)
  const [comments, setComments] = useState('')
  const [corrections, setCorrections] = useState<Partial<CreditReportData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'corrections'>('general')

  const handleOverallRating = (rating: number) => {
    setOverallRating(rating)
  }

  const handleAccuracyRating = (rating: number) => {
    setAccuracyRating(rating)
  }

  const handleSpeedRating = (rating: number) => {
    setSpeedRating(rating)
  }

  const handleCorrection = (field: string, value: any) => {
    setCorrections(prev => {
      const keys = field.split('.')
      const newCorrections = { ...prev }
      let current: any = newCorrections
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newCorrections
    })
  }

  const handleSubmit = async () => {
    if (overallRating === 0) {
      alert('Please provide an overall rating')
      return
    }

    setIsSubmitting(true)

    try {
      // Submit general feedback
      const response = await fetch('/api/feedback/pdf-processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processingId: sessionId,
          rating: overallRating,
          accuracyRating: accuracyRating || overallRating,
          speedRating: speedRating || overallRating,
          comments
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      // Submit corrections if any
      if (Object.keys(corrections).length > 0) {
        await aiFeedbackIntegration.collectExtractionFeedback(
          sessionId,
          analysisResult.extractedData,
          corrections
        )
      }

      setSubmitted(true)
      if (onComplete) {
        setTimeout(onComplete, 2000)
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold mb-2">Thank You!</h3>
        <p className="text-gray-600">
          Your feedback helps us improve our AI analysis accuracy.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4">Help Us Improve</h3>
      
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'general'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          General Feedback
        </button>
        <button
          onClick={() => setActiveTab('corrections')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'corrections'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Data Corrections
        </button>
      </div>

      {activeTab === 'general' ? (
        <div className="space-y-6">
          {/* Overall Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Experience
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleOverallRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= overallRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Accuracy Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Accuracy
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleAccuracyRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= accuracyRating
                        ? 'fill-blue-400 text-blue-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Speed Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Processing Speed
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleSpeedRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= speedRating
                        ? 'fill-green-400 text-green-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tell us what we can improve..."
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex gap-2 items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">
                  Help us improve accuracy
                </p>
                <p className="text-sm text-yellow-600 mt-1">
                  If you notice any incorrect data, please provide the correct information below.
                </p>
              </div>
            </div>
          </div>

          {/* Personal Info Corrections */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Personal Information</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Name (Current: {analysisResult.extractedData.personalInfo.name})
                </label>
                <input
                  type="text"
                  placeholder="Correct name if wrong"
                  onChange={(e) => handleCorrection('personalInfo.name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Address (Current: {analysisResult.extractedData.personalInfo.address})
                </label>
                <input
                  type="text"
                  placeholder="Correct address if wrong"
                  onChange={(e) => handleCorrection('personalInfo.address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Credit Score Corrections */}
          {analysisResult.extractedData.creditScores.experian && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Credit Scores</h4>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Experian Score (Current: {analysisResult.extractedData.creditScores.experian.score})
                </label>
                <input
                  type="number"
                  placeholder="Correct score if wrong"
                  onChange={(e) => handleCorrection('creditScores.experian.score', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Quick Feedback Buttons */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Quick Feedback</h4>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200">
                All data correct
              </button>
              <button className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm hover:bg-red-200">
                Missing accounts
              </button>
              <button className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm hover:bg-red-200">
                Wrong creditor names
              </button>
              <button className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm hover:bg-red-200">
                Incorrect balances
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || overallRating === 0}
          className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            isSubmitting || overallRating === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Feedback
            </>
          )}
        </button>
      </div>
    </div>
  )
}