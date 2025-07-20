'use client'

import React from 'react'
import { DisputeRecommendation, NegativeItem } from '@/types/credit-ui'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Zap, Target, Scale, TrendingUp, Clock } from 'lucide-react'

interface DisputeRecommendationCardProps {
  recommendation: DisputeRecommendation
  negativeItem?: NegativeItem
  onClick: () => void
}

export function DisputeRecommendationCard({ 
  recommendation, 
  negativeItem, 
  onClick 
}: DisputeRecommendationCardProps) {
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getSuccessColor = (probability: number): string => {
    if (probability >= 80) return 'text-green-600'
    if (probability >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(recommendation.priority)}`}>
              {recommendation.priority} priority
            </span>
          </div>
          <div className={`text-lg font-bold ${getSuccessColor(recommendation.successProbability)}`}>
            {recommendation.successProbability}%
          </div>
        </div>

        {/* Dispute Reason */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
            {recommendation.disputeReason}
          </h4>
          {negativeItem && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {negativeItem.creditorName} • ${negativeItem.amount.toLocaleString()}
            </p>
          )}
        </div>

        {/* Expected Impact */}
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {recommendation.expectedImpact}
          </span>
        </div>

        {/* Legal Basis Preview */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Legal Basis</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
            {recommendation.legalBasis}
          </p>
        </div>

        {/* Action Button */}
        <Button
          onClick={onClick}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          <Target className="w-4 h-4 mr-2" />
          Start Dispute
        </Button>
      </CardContent>
    </Card>
  )
}