'use client'

import React, { useState } from 'react'
import { testGeminiIntegration } from '@/lib/ai/geminiTest'

export default function TestGeminiPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTest = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const analysis = await testGeminiIntegration()
      setResult(analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🧠 Gemini AI Integration Test
          </h1>

          <div className="mb-8">
            <button
              onClick={handleTest}
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Testing Gemini AI...' : 'Test Gemini Integration'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-red-800 font-medium mb-2">❌ Error:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-green-800 font-medium mb-2">✅ Success!</h3>
                <p className="text-green-700">Gemini AI integration is working properly.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">📊 Credit Score Analysis</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Score:</span> {result.extractedData?.creditScore?.score}</p>
                    <p><span className="font-medium">Bureau:</span> {result.extractedData?.creditScore?.bureau}</p>
                    <p><span className="font-medium">Date:</span> {result.extractedData?.creditScore?.date}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">⚠️ Issues Found</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Negative Items:</span> {result.extractedData?.negativeItems?.length || 0}</p>
                    <p><span className="font-medium">Accounts:</span> {result.extractedData?.accounts?.length || 0}</p>
                    <p><span className="font-medium">Inquiries:</span> {result.extractedData?.inquiries?.length || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-3">🎯 AI Recommendations</h3>
                <p className="text-sm text-blue-800 mb-2">
                  <span className="font-medium">Total Recommendations:</span> {result.recommendations?.length || 0}
                </p>
                {result.recommendations?.slice(0, 2).map((rec: any, index: number) => (
                  <div key={index} className="bg-white rounded p-3 mb-2">
                    <p className="font-medium text-sm">{rec.disputeReason}</p>
                    <p className="text-xs text-gray-600">{rec.legalBasis}</p>
                  </div>
                ))}
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 mb-3">📈 Score Analysis</h3>
                <div className="text-sm text-purple-800">
                  <p><span className="font-medium">Current Score:</span> {result.scoreAnalysis?.currentScore}</p>
                  <p><span className="font-medium">Improvement Potential:</span> +{result.scoreAnalysis?.improvementPotential} points</p>
                  <p><span className="font-medium">Timeline:</span> {result.scoreAnalysis?.timelineEstimate}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">📝 AI Summary</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
              </div>

              <details className="mt-6">
                <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
                  🔍 View Raw Analysis Data
                </summary>
                <pre className="mt-3 bg-gray-100 rounded p-4 text-xs overflow-auto max-h-96">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}