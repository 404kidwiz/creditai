'use client'

import React from 'react'
import { BureauScore } from '@/types/credit-ui'

interface ScoreVisualizationProps {
  scores: BureauScore[]
  selectedBureau?: string | null
  onBureauSelect?: (bureau: string) => void
}

export function ScoreVisualization({ 
  scores, 
  selectedBureau, 
  onBureauSelect 
}: ScoreVisualizationProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 800) return '#10B981' // green-500
    if (score >= 740) return '#84CC16' // lime-500
    if (score >= 670) return '#EAB308' // yellow-500
    if (score >= 580) return '#F97316' // orange-500
    return '#EF4444' // red-500
  }

  const getScorePercentage = (score: number): number => {
    return Math.min((score / 850) * 100, 100)
  }

  const CircularProgress = ({ score, bureau, isSelected }: { score: number; bureau: string; isSelected: boolean }) => {
    const percentage = getScorePercentage(score)
    const circumference = 2 * Math.PI * 45
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (percentage / 100) * circumference
    const color = getScoreColor(score)

    return (
      <div 
        className={`relative cursor-pointer transition-all duration-300 ${
          isSelected ? 'scale-110' : 'hover:scale-105'
        }`}
        onClick={() => onBureauSelect?.(bureau)}
      >
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={color}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: isSelected ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' : 'none'
            }}
          />
        </svg>
        
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {score}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
            {bureau}
          </div>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    )
  }

  const validScores = scores.filter(s => s.score > 0)

  if (validScores.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          No valid credit scores to display
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Circular Progress Indicators */}
      <div className="flex justify-center items-center gap-8 flex-wrap">
        {validScores.map((scoreData) => (
          <CircularProgress
            key={scoreData.bureau}
            score={scoreData.score}
            bureau={scoreData.bureau}
            isSelected={selectedBureau === scoreData.bureau}
          />
        ))}
      </div>

      {/* Score Range Legend */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Credit Score Ranges
        </h5>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600 dark:text-gray-400">300-579 Poor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-gray-600 dark:text-gray-400">580-669 Fair</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-600 dark:text-gray-400">670-739 Good</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-lime-500"></div>
            <span className="text-gray-600 dark:text-gray-400">740-799 Very Good</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600 dark:text-gray-400">800-850 Excellent</span>
          </div>
        </div>
      </div>
    </div>
  )
}