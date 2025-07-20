'use client'

import React, { useState } from 'react'
import { CreditInquiry } from '@/types/credit-ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfidenceIndicator } from '../utils/ConfidenceIndicator'
import { 
  X, 
  Search, 
  Calendar, 
  Building, 
  AlertTriangle,
  Info,
  Eye,
  TrendingDown,
  Clock,
  FileText,
  Shield,
  HelpCircle
} from 'lucide-react'

interface InquiryDetailsModalProps {
  inquiry: CreditInquiry
  isOpen: boolean
  onClose: () => void
}

export function InquiryDetailsModal({ inquiry, isOpen, onClose }: InquiryDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'impact' | 'dispute'>('details')

  if (!isOpen) return null

  const getInquiryTypeIcon = (type: 'hard' | 'soft') => {
    return type === 'hard' ? 
      <TrendingDown className="w-5 h-5 text-red-500" /> : 
      <Eye className="w-5 h-5 text-blue-500" />
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

  const getInquiryAge = (date: string): { age: string; isRecent: boolean; willExpire: string } => {
    const inquiryDate = new Date(date)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - inquiryDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // Calculate expiration date (2 years from inquiry date)
    const expirationDate = new Date(inquiryDate)
    expirationDate.setFullYear(expirationDate.getFullYear() + 2)
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    let age: string
    if (diffDays < 30) {
      age = `${diffDays} days ago`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      age = `${months} month${months > 1 ? 's' : ''} ago`
    } else {
      const years = Math.floor(diffDays / 365)
      age = `${years} year${years > 1 ? 's' : ''} ago`
    }

    let willExpire: string
    if (daysUntilExpiration <= 0) {
      willExpire = 'Expired'
    } else if (daysUntilExpiration < 30) {
      willExpire = `Expires in ${daysUntilExpiration} days`
    } else if (daysUntilExpiration < 365) {
      const months = Math.floor(daysUntilExpiration / 30)
      willExpire = `Expires in ${months} month${months > 1 ? 's' : ''}`
    } else {
      const years = Math.floor(daysUntilExpiration / 365)
      willExpire = `Expires in ${years} year${years > 1 ? 's' : ''}`
    }

    return {
      age,
      isRecent: diffDays <= 365, // Recent if within last year
      willExpire
    }
  }

  const ageInfo = getInquiryAge(inquiry.date)

  const getScoreImpactEstimate = (): { points: string; duration: string; explanation: string } => {
    if (inquiry.type === 'soft') {
      return {
        points: '0 points',
        duration: 'No impact',
        explanation: 'Soft inquiries do not affect your credit score.'
      }
    }

    // Hard inquiry impact estimation
    const impact = inquiry.impact || 'medium'
    switch (impact) {
      case 'high':
        return {
          points: '5-10 points',
          duration: '12 months',
          explanation: 'High-impact inquiries typically occur when you have few existing accounts or recent credit activity.'
        }
      case 'medium':
        return {
          points: '2-5 points',
          duration: '6-12 months',
          explanation: 'Most hard inquiries have a moderate impact on your credit score.'
        }
      case 'low':
        return {
          points: '1-2 points',
          duration: '3-6 months',
          explanation: 'Low-impact inquiries occur when you have an established credit history with recent activity.'
        }
      default:
        return {
          points: '2-5 points',
          duration: '6-12 months',
          explanation: 'Typical impact for most hard credit inquiries.'
        }
    }
  }

  const scoreImpact = getScoreImpactEstimate()

  const getDisputeReasons = (): string[] => {
    const reasons = []
    
    if (!ageInfo.isRecent && inquiry.type === 'hard') {
      reasons.push('Inquiry is older than expected impact period')
    }
    
    // Common dispute reasons
    reasons.push(
      'I did not authorize this inquiry',
      'This inquiry was made without my permission',
      'I was not applying for credit with this company',
      'This appears to be a duplicate inquiry',
      'The inquiry date is incorrect',
      'I was only shopping for rates, not applying for credit'
    )
    
    return reasons
  }

  const disputeReasons = getDisputeReasons()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Building className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {inquiry.creditorName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getInquiryTypeColor(inquiry.type)}`}>
                  {inquiry.type.toUpperCase()} INQUIRY
                </span>
                {inquiry.impact && (
                  <span className={`text-sm font-medium ${getImpactColor(inquiry.impact)}`}>
                    {inquiry.impact.toUpperCase()} IMPACT
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConfidenceIndicator confidence={inquiry.confidence} />
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'details', label: 'Inquiry Details', icon: FileText },
              { id: 'impact', label: 'Score Impact', icon: TrendingDown },
              { id: 'dispute', label: 'Dispute Options', icon: Shield }
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
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      Creditor Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Company Name</label>
                      <p className="font-medium text-gray-900 dark:text-white">{inquiry.creditorName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Inquiry Purpose</label>
                      <p className="text-gray-900 dark:text-white">{inquiry.purpose}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Reporting Bureau</label>
                      <p className="text-gray-900 dark:text-white capitalize">{inquiry.bureau}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Timing Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Inquiry Date</label>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(inquiry.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">{ageInfo.age}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Report Expiration</label>
                      <p className="text-gray-900 dark:text-white">{ageInfo.willExpire}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Inquiry Type</label>
                      <div className="flex items-center gap-2">
                        {getInquiryTypeIcon(inquiry.type)}
                        <span className="text-gray-900 dark:text-white capitalize">{inquiry.type} Inquiry</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Data Quality */}
              <Card>
                <CardHeader>
                  <CardTitle>Data Quality</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Extraction Confidence</span>
                    <ConfidenceIndicator confidence={inquiry.confidence} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'impact' && (
            <div className="space-y-6">
              {/* Score Impact Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" />
                    Credit Score Impact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Impact</p>
                      <p className={`text-2xl font-bold ${getImpactColor(inquiry.impact)}`}>
                        {scoreImpact.points}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Impact Duration</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {scoreImpact.duration}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Time on Report</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        2 years
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {scoreImpact.explanation}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Impact Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Impact Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Immediate Impact (0-30 days)</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Score may decrease by {scoreImpact.points} immediately after the inquiry
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Ongoing Impact (1-12 months)</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {inquiry.type === 'hard' ? 'Inquiry continues to affect score calculations' : 'No ongoing impact on score'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Recovery Period (12-24 months)</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {inquiry.type === 'hard' ? 'Impact diminishes but inquiry remains visible on report' : 'No impact throughout this period'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Expiration (24 months)</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Inquiry is automatically removed from your credit report
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Educational Information */}
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-6 h-6 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                        Understanding Inquiry Impact
                      </h4>
                      <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                        <p>
                          The actual impact on your score depends on your overall credit profile. 
                          People with longer credit histories and more accounts typically see smaller impacts.
                        </p>
                        <p>
                          Multiple inquiries for the same type of loan (auto, mortgage, student) within 
                          14-45 days are typically counted as a single inquiry for scoring purposes.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'dispute' && (
            <div className="space-y-6">
              {/* Dispute Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Dispute This Inquiry
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You can dispute this inquiry if you believe it was made without your authorization 
                    or contains inaccurate information. Select the reason that best describes your situation:
                  </p>
                  
                  <div className="space-y-3">
                    {disputeReasons.map((reason, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <input
                          type="radio"
                          name="dispute-reason"
                          id={`reason-${index}`}
                          className="mt-1"
                        />
                        <label htmlFor={`reason-${index}`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                          {reason}
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Dispute Process */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Dispute Process
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                        1
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Submit Dispute</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          File a dispute with {inquiry.bureau} credit bureau online, by phone, or by mail
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                        2
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Investigation</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          The bureau will investigate your dispute within 30 days
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                        3
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Resolution</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          You'll receive results and an updated credit report if changes are made
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Success Probability */}
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-6 h-6 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                        Dispute Success Factors
                      </h4>
                      <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
                        <p>
                          <strong>Higher Success Rate:</strong> Inquiries you didn't authorize, duplicate inquiries, 
                          or inquiries with incorrect information.
                        </p>
                        <p>
                          <strong>Lower Success Rate:</strong> Inquiries from legitimate credit applications you made, 
                          even if you didn't complete the application process.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-3">
            {activeTab === 'dispute' && (
              <Button>
                Start Dispute Process
              </Button>
            )}
            {inquiry.type === 'hard' && (
              <Button variant="outline">
                Get Dispute Letter Template
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}