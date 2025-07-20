'use client'

import React from 'react'
import { BureauScore } from '@/types/credit-ui'

interface BureauComparisonProps {
  scores: BureauScore[]
  onBureauClick?: (bureau: string) => void
}

export function BureauComparison({ scores, onBureauClick }: BureauComparisonProps) {
  const validScores = scores.filter(s => s.score > 0)
  
  if (validScores.length < 2) {
    return null
  }

  const sortedScores = [...validScores].sort((a, b) => b.score - a.score)
  const highest = sortedScores[0]
  const lowest = sortedScores[sortedScores.length - 1]
  const variance = highest.score - lowest.score

  const getVarianceColor = (variance: number): string => {
    if (variance <= 10) return 'text-green-600'
    if (variance <= 30) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getVarianceLabel = (variance: number): string => {
    if (variance <= 10) return 'Very Consistent'
    if (variance <= 30) return 'Moderately Consistent'
    return 'Inconsistent'
  }

  const getBureauIcon = (bureau: string) => {
    const iconClass = "w-6 h-6"
    
    switch (bureau.toLowerCase()) {
      case 'experian':
        return (
          <div className={`${iconClass} bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold`}>
            E
          </div>
        )
      case 'equifax':
        return (
          <div className={`${iconClass} bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold`}>
            Q
          </div>
        )
      case 'transunion':
        return (
          <div className={`${iconClass} bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold`}>
            T
          </div>
        )
      default:
        return (
          <div className={`${iconClass} bg-gray-500 rounded-full flex items-center justify-center text-white text-xs font-bold`}>
            {bureau.charAt(0).toUpperCase()}
          </div>
        )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 dark:text-white">
          Bureau Comparison
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Variance:
          </span>
          <span className={`text-sm font-medium ${getVarianceColor(variance)}`}>
            {variance} points ({getVarianceLabel(variance)})
          </span>
        </div>
      </div>

      {/* Score Comparison Bars */}
      <div className="space-y-3">
        {sortedScores.map((scoreData, index) => {
          const percentage = (scoreData.score / 850) * 100
          const isHighest = scoreData.bureau === highest.bureau
          const isLowest = scoreData.bureau === lowest.bureau
          
          return (
            <div
              key={scoreData.bureau}
              className="cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-3"
              onClick={() => onBureauClick?.(scoreData.bureau)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {getBureauIcon(scoreData.bureau)}
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white capitalize">
                      {scoreData.bureau}
                    </div>
                    <div className="text-xs text-gray-500">
                      {scoreData.date}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {scoreData.score}
                  </span>
                  {isHighest && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Highest
                    </span>
                  )}
                  {isLowest && sortedScores.length > 2 && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      Lowest
                    </span>
                  )}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                    isHighest ? 'bg-green-500' : 
                    isLowest ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              
              {/* Confidence Indicator */}
              <div className="flex justify-end mt-1">
                <span className={`text-xs px-2 py-1 rounded ${
                  scoreData.confidence >= 85 ? 'bg-green-100 text-green-800' :
                  scoreData.confidence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {scoreData.confidence.toFixed(0)}% confidence
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Statistics */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {highest.score}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Highest
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {Math.round(validScores.reduce((sum, s) => sum + s.score, 0) / validScores.length)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Average
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {lowest.score}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Lowest
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}