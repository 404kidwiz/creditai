'use client'

import React, { useState, useMemo } from 'react'
import { InquiriesSectionProps, CreditInquiry } from '@/types/credit-ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InquiryDetailsModal } from './modals/InquiryDetailsModal'
import { ConfidenceIndicator } from './utils/ConfidenceIndicator'
import { 
  Search, 
  Filter, 
  Calendar, 
  Building, 
  AlertTriangle, 
  Info, 
  Eye,
  TrendingDown,
  Clock,
  CheckCircle
} from 'lucide-react'

export function InquiriesSection({
  inquiries,
  onInquirySelect
}: InquiriesSectionProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'hard' | 'soft'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'creditor' | 'type'>('date')
  const [selectedInquiry, setSelectedInquiry] = useState<string | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // Filter and sort inquiries
  const filteredAndSortedInquiries = useMemo(() => {
    let filtered = inquiries.filter(inquiry => {
      const matchesSearch = inquiry.creditorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           inquiry.purpose.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesFilter = filterType === 'all' || inquiry.type === filterType
      
      return matchesSearch && matchesFilter
    })

    // Sort inquiries
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case 'creditor':
          return a.creditorName.localeCompare(b.creditorName)
        case 'type':
          return a.type.localeCompare(b.type)
        default:
          return 0
      }
    })

    return filtered
  }, [inquiries, searchTerm, filterType, sortBy])

  // Calculate inquiry statistics
  const inquiryStats = useMemo(() => {
    const hardInquiries = inquiries.filter(inq => inq.type === 'hard')
    const softInquiries = inquiries.filter(inq => inq.type === 'soft')
    
    // Recent hard inquiries (last 24 months)
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    const recentHardInquiries = hardInquiries.filter(inq => new Date(inq.date) >= twoYearsAgo)
    
    // High impact inquiries (last 12 months)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const highImpactInquiries = hardInquiries.filter(inq => 
      new Date(inq.date) >= oneYearAgo && inq.impact === 'high'
    )

    return {
      total: inquiries.length,
      hard: hardInquiries.length,
      soft: softInquiries.length,
      recentHard: recentHardInquiries.length,
      highImpact: highImpactInquiries.length
    }
  }, [inquiries])

  const handleInquiryClick = (inquiryId: string) => {
    setSelectedInquiry(inquiryId)
    setShowDetailsModal(true)
    onInquirySelect?.(inquiryId)
  }

  const getInquiryTypeIcon = (type: 'hard' | 'soft') => {
    return type === 'hard' ? 
      <TrendingDown className="w-4 h-4 text-red-500" /> : 
      <Eye className="w-4 h-4 text-blue-500" />
  }

  const getInquiryTypeColor = (type: 'hard' | 'soft'): string => {
    return type === 'hard' ? 
      'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
      'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
  }

  const getImpactColor = (impact?: 'high' | 'medium' | 'low'): string => {
    switch (impact) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const getInquiryAge = (date: string): string => {
    const inquiryDate = new Date(date)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - inquiryDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 30) {
      return `${diffDays} days ago`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} month${months > 1 ? 's' : ''} ago`
    } else {
      const years = Math.floor(diffDays / 365)
      return `${years} year${years > 1 ? 's' : ''} ago`
    }
  }

  const selectedInquiryData = selectedInquiry ? 
    inquiries.find(inq => inq.id === selectedInquiry) : null

  return (
    <div className="space-y-6">
      {/* Inquiry Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Inquiries</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {inquiryStats.total}
                </p>
              </div>
              <Search className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Hard Inquiries</p>
                <p className="text-2xl font-bold text-red-600">
                  {inquiryStats.hard}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Soft Inquiries</p>
                <p className="text-2xl font-bold text-blue-600">
                  {inquiryStats.soft}
                </p>
              </div>
              <Eye className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Recent Hard</p>
                <p className={`text-2xl font-bold ${
                  inquiryStats.recentHard > 5 ? 'text-red-600' : 
                  inquiryStats.recentHard > 2 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {inquiryStats.recentHard}
                </p>
              </div>
              <Clock className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">High Impact</p>
                <p className={`text-2xl font-bold ${
                  inquiryStats.highImpact > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {inquiryStats.highImpact}
                </p>
              </div>
              <AlertTriangle className={`w-8 h-8 ${
                inquiryStats.highImpact > 0 ? 'text-red-500' : 'text-green-500'
              }`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Impact Warning */}
      {inquiryStats.recentHard > 5 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                  High Number of Recent Hard Inquiries
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  You have {inquiryStats.recentHard} hard inquiries in the last 24 months. 
                  Multiple hard inquiries in a short period can negatively impact your credit score.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Inquiries Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Credit Inquiries ({filteredAndSortedInquiries.length})
            </CardTitle>
            
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search inquiries..."
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
                <option value="all">All Types</option>
                <option value="hard">Hard Inquiries</option>
                <option value="soft">Soft Inquiries</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
              >
                <option value="date">Sort by Date</option>
                <option value="creditor">Sort by Creditor</option>
                <option value="type">Sort by Type</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedInquiries.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {inquiries.length === 0 ? 'No Inquiries Found' : 'No Matching Inquiries'}
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                {inquiries.length === 0 
                  ? 'No credit inquiries were found in this report.'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedInquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  onClick={() => handleInquiryClick(inquiry.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <Building className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {inquiry.creditorName}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getInquiryTypeColor(inquiry.type)}`}>
                            {inquiry.type.toUpperCase()}
                          </span>
                          {inquiry.impact && (
                            <span className={`text-xs font-medium ${getImpactColor(inquiry.impact)}`}>
                              {inquiry.impact.toUpperCase()} IMPACT
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {inquiry.purpose}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(inquiry.date).toLocaleDateString()}</span>
                            <span className="text-xs">({getInquiryAge(inquiry.date)})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="capitalize">{inquiry.bureau}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 ml-4">
                      <ConfidenceIndicator confidence={inquiry.confidence} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleInquiryClick(inquiry.id)
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Educational Information */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                Understanding Credit Inquiries
              </h4>
              <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  <strong>Hard Inquiries:</strong> Occur when you apply for credit and can temporarily lower your credit score by a few points. They remain on your report for 2 years but typically only affect your score for the first 12 months.
                </p>
                <p>
                  <strong>Soft Inquiries:</strong> Occur when you check your own credit or when companies check your credit for pre-approved offers. These do not affect your credit score.
                </p>
                <p>
                  <strong>Rate Shopping:</strong> Multiple inquiries for the same type of loan (auto, mortgage, student) within a 14-45 day window are typically counted as a single inquiry.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inquiry Details Modal */}
      {showDetailsModal && selectedInquiryData && (
        <InquiryDetailsModal
          inquiry={selectedInquiryData}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </div>
  )
}