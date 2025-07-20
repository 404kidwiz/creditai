'use client'

import React, { useState, useMemo } from 'react'
import { NegativeItemsCenterProps, NegativeItem } from '@/types/credit-ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { NegativeItemCard } from './cards/NegativeItemCard'
import { DisputeRecommendationCard } from './cards/DisputeRecommendationCard'
import { DisputeStrategyModal } from './modals/DisputeStrategyModal'
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  TrendingDown, 
  Clock, 
  DollarSign,
  Target,
  Zap,
  CheckCircle
} from 'lucide-react'

export function NegativeItemsCenter({
  negativeItems,
  recommendations,
  onDisputeStart,
  onViewDetails
}: NegativeItemsCenterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'priority' | 'impact' | 'date' | 'amount'>('priority')
  const [filterType, setFilterType] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [showDisputeModal, setShowDisputeModal] = useState(false)

  // Filter and sort negative items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = negativeItems.filter(item => {
      const matchesSearch = item.creditorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.type.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesFilter = filterType === 'all' || item.priority === filterType
      
      return matchesSearch && matchesFilter
    })

    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case 'impact':
          return b.impactScore - a.impactScore
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case 'amount':
          return b.amount - a.amount
        default:
          return 0
      }
    })

    return filtered
  }, [negativeItems, searchTerm, sortBy, filterType])

  // Calculate summary statistics
  const itemStats = useMemo(() => {
    const highPriority = negativeItems.filter(item => item.priority === 'high').length
    const totalImpact = negativeItems.reduce((sum, item) => sum + item.impactScore, 0)
    const totalAmount = negativeItems.reduce((sum, item) => sum + item.amount, 0)
    const disputeableItems = recommendations.length
    const avgSuccessRate = recommendations.length > 0 
      ? recommendations.reduce((sum, rec) => sum + rec.successProbability, 0) / recommendations.length
      : 0

    return {
      totalItems: negativeItems.length,
      highPriority,
      totalImpact,
      totalAmount,
      disputeableItems,
      avgSuccessRate
    }
  }, [negativeItems, recommendations])

  const handleItemClick = (itemId: string) => {
    setSelectedItem(itemId)
    onViewDetails(itemId)
  }

  const handleDisputeClick = (itemId: string) => {
    setSelectedItem(itemId)
    setShowDisputeModal(true)
    onDisputeStart(itemId)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'late_payment':
        return <Clock className="w-4 h-4" />
      case 'collection':
        return <AlertTriangle className="w-4 h-4" />
      case 'charge_off':
        return <TrendingDown className="w-4 h-4" />
      case 'bankruptcy':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <AlertTriangle className="w-4 h-4" />
    }
  }

  const selectedItemData = selectedItem ? negativeItems.find(item => item.id === selectedItem) : null
  const selectedRecommendation = selectedItem ? recommendations.find(rec => rec.negativeItemId === selectedItem) : null

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
                <p className="text-2xl font-bold text-red-600">
                  {itemStats.totalItems}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">High Priority</p>
                <p className="text-2xl font-bold text-red-600">
                  {itemStats.highPriority}
                </p>
              </div>
              <Target className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Disputeable</p>
                <p className="text-2xl font-bold text-blue-600">
                  {itemStats.disputeableItems}
                </p>
              </div>
              <Zap className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {itemStats.avgSuccessRate.toFixed(0)}%
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Negative Items Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Negative Items ({filteredAndSortedItems.length})
            </CardTitle>
            
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-48"
                />
              </div>

              {/* Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
              >
                <option value="priority">Sort by Priority</option>
                <option value="impact">Sort by Impact</option>
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedItems.length === 0 ? (
            <div className="text-center py-12">
              {negativeItems.length === 0 ? (
                <>
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Negative Items Found
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Great news! No negative items were found on your credit report.
                  </p>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Matching Items
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting your search or filter criteria.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedItems.map((item) => (
                <NegativeItemCard
                  key={item.id}
                  item={item}
                  recommendation={recommendations.find(rec => rec.negativeItemId === item.id)}
                  onClick={() => handleItemClick(item.id)}
                  onDisputeClick={() => handleDisputeClick(item.id)}
                  isSelected={selectedItem === item.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispute Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Dispute Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations
                .sort((a, b) => b.successProbability - a.successProbability)
                .slice(0, 6) // Show top 6 recommendations
                .map((recommendation) => (
                  <DisputeRecommendationCard
                    key={recommendation.negativeItemId}
                    recommendation={recommendation}
                    negativeItem={negativeItems.find(item => item.id === recommendation.negativeItemId)}
                    onClick={() => handleDisputeClick(recommendation.negativeItemId)}
                  />
                ))}
            </div>
            {recommendations.length > 6 && (
              <div className="text-center mt-4">
                <Button variant="outline">
                  View All {recommendations.length} Recommendations
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dispute Strategy Modal */}
      {showDisputeModal && selectedItemData && selectedRecommendation && (
        <DisputeStrategyModal
          negativeItem={selectedItemData}
          recommendation={selectedRecommendation}
          isOpen={showDisputeModal}
          onClose={() => setShowDisputeModal(false)}
          onStartDispute={() => {
            setShowDisputeModal(false)
            onDisputeStart(selectedItemData.id)
          }}
        />
      )}
    </div>
  )
}