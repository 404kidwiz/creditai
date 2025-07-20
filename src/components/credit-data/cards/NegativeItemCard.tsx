'use client'

import React from 'react'
import { NegativeItem, DisputeRecommendation } from '@/types/credit-ui'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfidenceIndicator } from '../utils/ConfidenceIndicator'
import { 
  AlertTriangle, 
  Clock, 
  TrendingDown, 
  DollarSign,
  Calendar,
  Building,
  Zap,
  Target,
  Scale
} from 'lucide-react'

interface NegativeItemCardProps {
  item: NegativeItem
  recommendation?: DisputeRecommendation
  onClick: () => void
  onDisputeClick: () => void
  isSelected?: boolean
}

export function NegativeItemCard({ 
  item, 
  recommendation, 
  onClick, 
  onDisputeClick, 
  isSelected = false 
}: NegativeItemCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'late_payment':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'collection':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      case 'charge_off':
        return <TrendingDown className="w-5 h-5 text-red-600" />
      case 'bankruptcy':
        return <AlertTriangle className="w-5 h-5 text-red-700" />
      case 'tax_lien':
        return <Building className="w-5 h-5 text-red-600" />
      case 'judgment':
        return <Scale className="w-5 h-5 text-red-600" />
      case 'foreclosure':
        return <Building className="w-5 h-5 text-red-700" />
      default:
        return <AlertTriangle className="w-5 h-5 text-red-500" />
    }
  }

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'late_payment':
        return 'Late Payment'
      case 'collection':
        return 'Collection Account'
      case 'charge_off':
        return 'Charge Off'
      case 'bankruptcy':
        return 'Bankruptcy'
      case 'tax_lien':
        return 'Tax Lien'
      case 'judgment':
        return 'Judgment'
      case 'foreclosure':
        return 'Foreclosure'
      default:
        return type.replace('_', ' ')
    }
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
    }
  }

  const getImpactColor = (impact: number): string => {
    if (impact >= 80) return 'text-red-600'
    if (impact >= 50) return 'text-yellow-600'
    return 'text-green-600'
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString()
  }

  const calculateAge = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 30) return `${diffDays} days ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      } ${item.priority === 'high' ? 'border-red-200 dark:border-red-800' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              {getTypeIcon(item.type)}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {item.creditorName}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getTypeLabel(item.type)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
              {item.priority} priority
            </span>
            <ConfidenceIndicator confidence={item.confidence} size="sm" showLabel={false} />
          </div>
        </div>

        {/* Key Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Amount</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                ${item.amount.toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Impact Score</p>
              <p className={`font-semibold ${getImpactColor(item.impactScore)}`}>
                {item.impactScore}/100
              </p>
            </div>
          </div>
        </div>

        {/* Date Information */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(item.date)}</span>
          </div>
          <span className="text-gray-500">
            {calculateAge(item.date)}
          </span>
        </div>

        {/* Description */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {item.description}
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Current Status</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {item.status}
            </p>
          </div>
          {item.accountNumber && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Account</p>
              <p className="text-sm font-mono text-gray-900 dark:text-white">
                {item.accountNumber}
              </p>
            </div>
          )}
        </div>

        {/* Dispute Recommendation */}
        {recommendation && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Dispute Opportunity
                </span>
              </div>
              <span className="text-sm font-bold text-blue-600">
                {recommendation.successProbability}% success rate
              </span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              {recommendation.disputeReason}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-600 dark:text-blue-400">
                Expected Impact: {recommendation.expectedImpact}
              </span>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDisputeClick()
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Start Dispute
              </Button>
            </div>
          </div>
        )}

        {/* Dispute Reasons */}
        {item.disputeReasons && item.disputeReasons.length > 0 && !recommendation && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Potential Dispute Reasons:
            </p>
            <div className="flex flex-wrap gap-1">
              {item.disputeReasons.slice(0, 3).map((reason, index) => (
                <span
                  key={index}
                  className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                >
                  {reason}
                </span>
              ))}
              {item.disputeReasons.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{item.disputeReasons.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            className="flex-1"
          >
            View Details
          </Button>
          {recommendation && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onDisputeClick()
              }}
              className="flex-1"
            >
              Dispute Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}