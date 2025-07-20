'use client'

import React, { useState } from 'react'
import { NegativeItem, DisputeRecommendation } from '@/types/credit-ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  X, 
  Scale, 
  Target, 
  FileText, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Download
} from 'lucide-react'

interface DisputeStrategyModalProps {
  negativeItem: NegativeItem
  recommendation: DisputeRecommendation
  isOpen: boolean
  onClose: () => void
  onStartDispute: () => void
}

export function DisputeStrategyModal({ 
  negativeItem, 
  recommendation, 
  isOpen, 
  onClose, 
  onStartDispute 
}: DisputeStrategyModalProps) {
  const [activeTab, setActiveTab] = useState<'strategy' | 'legal' | 'timeline'>('strategy')

  if (!isOpen) return null

  const getSuccessColor = (probability: number): string => {
    if (probability >= 80) return 'text-green-600'
    if (probability >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Dispute Strategy
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {negativeItem.creditorName} • {negativeItem.type.replace('_', ' ')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`text-2xl font-bold ${getSuccessColor(recommendation.successProbability)}`}>
              {recommendation.successProbability}% Success Rate
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'strategy', label: 'Strategy', icon: Target },
              { id: 'legal', label: 'Legal Basis', icon: Scale },
              { id: 'timeline', label: 'Timeline', icon: Clock }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {activeTab === 'strategy' && (
            <div className="space-y-6">
              {/* Dispute Reason */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Dispute Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Primary Dispute Reason
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      {recommendation.disputeReason}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Expected Impact
                    </h4>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {recommendation.expectedImpact}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Success Probability Analysis
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Success Rate</span>
                        <span className={`font-bold ${getSuccessColor(recommendation.successProbability)}`}>
                          {recommendation.successProbability}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            recommendation.successProbability >= 80 ? 'bg-green-500' :
                            recommendation.successProbability >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${recommendation.successProbability}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Item Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Negative Item Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Creditor</label>
                      <p className="font-medium text-gray-900 dark:text-white">{negativeItem.creditorName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Amount</label>
                      <p className="font-medium text-gray-900 dark:text-white">${negativeItem.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Date</label>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(negativeItem.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                      <p className="font-medium text-gray-900 dark:text-white">{negativeItem.status}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'legal' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="w-5 h-5" />
                    Legal Foundation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Legal Basis
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {recommendation.legalBasis}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Letter Template
                    </h4>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          {recommendation.letterTemplate.replace('_', ' ').toUpperCase()} Template
                        </span>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Pre-written dispute letter based on your specific situation
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Dispute Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { step: 1, title: 'Submit Dispute', time: 'Day 1', status: 'pending' },
                      { step: 2, title: 'Bureau Investigation', time: '30 days', status: 'pending' },
                      { step: 3, title: 'Creditor Response', time: '30-45 days', status: 'pending' },
                      { step: 4, title: 'Final Decision', time: '45-60 days', status: 'pending' }
                    ].map((item) => (
                      <div key={item.step} className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium">
                          {item.step}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">{item.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.time}</p>
                        </div>
                        <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Estimated completion: 45-60 days
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onStartDispute} className="bg-blue-600 hover:bg-blue-700">
              <FileText className="w-4 h-4 mr-2" />
              Start Dispute Process
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}