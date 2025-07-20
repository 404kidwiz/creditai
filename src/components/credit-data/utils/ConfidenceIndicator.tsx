'use client'

import React from 'react'

interface ConfidenceIndicatorProps {
  confidence: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function ConfidenceIndicator({ 
  confidence, 
  size = 'md', 
  showLabel = true,
  className = '' 
}: ConfidenceIndicatorProps) {
  const getConfidenceColor = (conf: number): string => {
    if (conf >= 85) return 'text-green-600 bg-green-100 border-green-200 dark:bg-green-900/20 dark:border-green-800'
    if (conf >= 70) return 'text-yellow-600 bg-yellow-100 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
    return 'text-red-600 bg-red-100 border-red-200 dark:bg-red-900/20 dark:border-red-800'
  }

  const getConfidenceLabel = (conf: number): string => {
    if (conf >= 85) return 'High'
    if (conf >= 70) return 'Medium'
    return 'Low'
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  }

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border font-medium ${getConfidenceColor(confidence)} ${sizeClasses[size]} ${className}`}>
      {/* Confidence Icon */}
      <svg className={iconSize[size]} fill="currentColor" viewBox="0 0 20 20">
        {confidence >= 85 ? (
          // High confidence - checkmark
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        ) : confidence >= 70 ? (
          // Medium confidence - warning
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        ) : (
          // Low confidence - X
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        )}
      </svg>

      {/* Confidence Text */}
      <span>
        {showLabel ? `${getConfidenceLabel(confidence)} (${confidence.toFixed(1)}%)` : `${confidence.toFixed(1)}%`}
      </span>
    </div>
  )
}