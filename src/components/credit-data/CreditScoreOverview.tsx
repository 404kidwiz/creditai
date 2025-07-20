'use client'

import React, { useState, useMemo } from 'react'
import { CreditScoreOverviewProps, BureauScore } from '@/types/credit-ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ScoreVisualization } from './visualizations/ScoreVisualization'
import { BureauComparison } from './visualizations/BureauComparison'
import { ConfidenceIndicator } from './utils/ConfidenceIndicator'
import { ResponsiveGrid, ResponsiveStack } from '@/components/ui/ResponsiveSection'
import { useResponsive } from '@/hooks/useResponsive'

export function CreditScoreOverview({ 
  scores, 
  analysis, 
  confidence, 
  onScoreClick 
}: CreditScoreOverviewProps) {
  const [selectedBureau, setSelectedBureau] = useState<string | null>(null)
  const { isMobile } = useResponsive()

  const bureauScores = useMemo(() => {
    return Object.entries(scores).map(([bureau, score]) => ({
      bureau,
      ...score
    }))
  }, [scores])

  const averageScore = useMemo(() => {
    const validScores = bureauScores.filter(s => s.score > 0)
    if (validScores.length === 0) return 0
    return Math.round(validScores.reduce((sum, s) => sum + s.score, 0) / validScores.length)
  }, [bureauScores])

  const getScoreRange = (score: number): string => {
    if (score >= 800) return 'Excellent'
    if (score >= 740) return 'Very Good'
    if (score >= 670) return 'Good'
    if (score >= 580) return 'Fair'
    return 'Poor'
  }

  const getScoreColor = (score: number): string => {
    if (score >= 800) return 'text-green-600'
    if (score >= 740) return 'text-green-500'
    if (score >= 670) return 'text-yellow-500'
    if (score >= 580) return 'text-orange-500'
    return 'text-red-500'
  }

  const handleBureauClick = (bureau: string) => {
    setSelectedBureau(bureau === selectedBureau ? null : bureau)
    onScoreClick?.(bureau)
  }

  return (
    <div className="mobile-card">
      <div className="mobile-card-header">
        <ResponsiveStack
          direction={{ mobile: 'column', tablet: 'row', desktop: 'row' }}
          justify="between"
          align={isMobile ? 'start' : 'center'}
          spacing="gap-3"
        >
          <h3 className="mobile-subtitle">Credit Score Overview</h3>
          <ConfidenceIndicator confidence={confidence} />
        </ResponsiveStack>
      </div>
      <div className="mobile-card-content mobile-spacing-md">
        {/* Average Score Display */}
        {averageScore > 0 && (
          <div className="text-center py-4 sm:py-6">
            <div className={`text-3xl sm:text-4xl lg:text-5xl font-bold ${getScoreColor(averageScore)}`}>
              {averageScore}
            </div>
            <div className="mobile-subtitle text-gray-600 dark:text-gray-400 mt-2">
              {getScoreRange(averageScore)} Credit
            </div>
            <div className="mobile-caption text-gray-500 mt-1">
              Average across {bureauScores.filter(s => s.score > 0).length} bureau(s)
            </div>
          </div>
        )}

        {/* Score Visualization */}
        <ScoreVisualization 
          scores={bureauScores}
          selectedBureau={selectedBureau}
          onBureauSelect={handleBureauClick}
        />

        {/* Bureau Comparison */}
        {bureauScores.length > 1 && (
          <BureauComparison 
            scores={bureauScores}
            onBureauClick={handleBureauClick}
          />
        )}

        {/* Score Factors */}
        {analysis.factors && analysis.factors.length > 0 && (
          <div className="mobile-spacing-sm">
            <h4 className="mobile-subtitle text-gray-900 dark:text-white mb-3">
              Score Factors
            </h4>
            <div className="mobile-spacing-xs">
              {analysis.factors.map((factor, index) => (
                <div key={index} className="mobile-card-compact bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <ResponsiveStack
                    direction={{ mobile: 'column', tablet: 'row', desktop: 'row' }}
                    justify="between"
                    align="start"
                    spacing="gap-2 sm:gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <ResponsiveStack
                        direction={{ mobile: 'column', tablet: 'row', desktop: 'row' }}
                        justify="between"
                        align={isMobile ? 'start' : 'center'}
                        spacing="gap-1 sm:gap-2"
                      >
                        <span className="mobile-body font-medium text-gray-900 dark:text-white">
                          {factor.factor}
                        </span>
                        <span className="mobile-caption text-gray-500">
                          {factor.weight}%
                        </span>
                      </ResponsiveStack>
                      <div className="mobile-caption text-gray-600 dark:text-gray-400 mt-1">
                        {factor.description}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                      factor.impact === 'positive' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                      factor.impact === 'negative' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {factor.impact}
                    </div>
                  </ResponsiveStack>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvement Potential */}
        {analysis.improvementPotential && analysis.improvementPotential > 0 && (
          <div className="mobile-alert mobile-alert-info rounded-lg p-4">
            <ResponsiveStack
              direction={{ mobile: 'column', tablet: 'row', desktop: 'row' }}
              justify="between"
              align={isMobile ? 'start' : 'center'}
              spacing="gap-3"
            >
              <div className="flex-1">
                <h4 className="mobile-body font-semibold text-blue-900 dark:text-blue-100">
                  Improvement Potential
                </h4>
                <p className="mobile-caption text-blue-700 dark:text-blue-300 mt-1">
                  Estimated timeline: {analysis.timelineEstimate}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">
                +{analysis.improvementPotential}
              </div>
            </ResponsiveStack>
          </div>
        )}

        {/* No Data State */}
        {bureauScores.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="mobile-subtitle text-gray-900 dark:text-white mb-2">
              No Credit Scores Available
            </h4>
            <p className="mobile-body text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
              Credit score information could not be extracted from this document.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}