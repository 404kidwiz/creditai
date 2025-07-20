'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { 
  FileText,
  BarChart,
  CreditCard,
  AlertTriangle,
  Search,
  Settings,
  Download,
  Eye,
  TrendingUp,
  Shield,
  Activity,
  Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { EnhancedAnalysisResult } from '@/types/credit-ui'
import { CreditScoreOverview } from '@/components/credit-data/CreditScoreOverview'
import { AccountsSection } from '@/components/credit-data/AccountsSection'
import { NegativeItemsCenter } from '@/components/credit-data/NegativeItemsCenter'
import { InquiriesSection } from '@/components/credit-data/InquiriesSection'
import { DataQualityIndicator } from '@/components/credit-data/DataQualityIndicator'

interface TabbedAnalysisViewProps {
  analysisResult: EnhancedAnalysisResult
  onDisputeStart: (items: string[]) => void
  onExport: (format: string) => void
}

type TabId = 'overview' | 'scores' | 'accounts' | 'negatives' | 'inquiries' | 'quality'

interface Tab {
  id: TabId
  label: string
  icon: any
  badge?: number
  color?: string
}

export function TabbedAnalysisView({ 
  analysisResult, 
  onDisputeStart,
  onExport 
}: TabbedAnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)

  const { extractedData, scoreAnalysis, recommendations, uiMetadata } = analysisResult

  // Calculate badges for tabs
  const negativeItemsCount = extractedData.negativeItems?.length || 0
  const accountsWithIssues = extractedData.accounts?.filter(a => 
    a.paymentHistory.some(p => p.status !== 'current')
  ).length || 0

  const tabs: Tab[] = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: BarChart,
      color: 'blue'
    },
    { 
      id: 'scores', 
      label: 'Credit Scores', 
      icon: TrendingUp,
      color: 'purple'
    },
    { 
      id: 'accounts', 
      label: 'Accounts', 
      icon: CreditCard,
      badge: accountsWithIssues > 0 ? accountsWithIssues : undefined,
      color: 'green'
    },
    { 
      id: 'negatives', 
      label: 'Negative Items', 
      icon: AlertTriangle,
      badge: negativeItemsCount > 0 ? negativeItemsCount : undefined,
      color: 'red'
    },
    { 
      id: 'inquiries', 
      label: 'Inquiries', 
      icon: Search,
      color: 'orange'
    },
    { 
      id: 'quality', 
      label: 'Data Quality', 
      icon: Shield,
      color: 'indigo'
    }
  ]

  const getTabColorClasses = (color: string) => {
    const colorMap = {
      blue: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
      purple: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
      green: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
      red: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
      orange: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
      indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800'
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.blue
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab analysisResult={analysisResult} onTabChange={setActiveTab} />
      
      case 'scores':
        return (
          <CreditScoreOverview
            scores={{
              experian: extractedData.creditScores.experian,
              equifax: extractedData.creditScores.equifax,
              transunion: extractedData.creditScores.transUnion
            }}
            analysis={scoreAnalysis}
            confidence={uiMetadata.confidence}
          />
        )
      
      case 'accounts':
        return (
          <AccountsSection
            accounts={extractedData.accounts || []}
            onAccountSelect={setSelectedAccount}
            selectedAccount={selectedAccount}
            viewMode="cards"
          />
        )
      
      case 'negatives':
        return (
          <NegativeItemsCenter
            negativeItems={extractedData.negativeItems || []}
            recommendations={recommendations}
            onDisputeStart={(itemId) => onDisputeStart([itemId])}
            onViewDetails={(itemId) => console.log('View details:', itemId)}
          />
        )
      
      case 'inquiries':
        return (
          <InquiriesSection
            inquiries={extractedData.inquiries || []}
            onInquirySelect={(id) => console.log('Selected inquiry:', id)}
          />
        )
      
      case 'quality':
        return (
          <DataQualityIndicator
            overallConfidence={uiMetadata.confidence}
            sectionConfidence={{
              personalInfo: uiMetadata.completeness.personalInfo,
              creditScores: uiMetadata.completeness.creditScores,
              accounts: uiMetadata.completeness.accounts,
              negativeItems: uiMetadata.completeness.negativeItems,
              inquiries: uiMetadata.completeness.inquiries
            }}
            processingMethod={uiMetadata.processingMethod}
            missingData={[]}
            onRequestManualReview={() => console.log('Request manual review')}
          />
        )
      
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Credit Report Analysis
            </h1>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => onExport('pdf')}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 py-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm
                    transition-all duration-200 whitespace-nowrap
                    ${isActive 
                      ? `${getTabColorClasses(tab.color || 'blue')} border`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`
                      ml-1 px-2 py-0.5 text-xs rounded-full font-semibold
                      ${isActive 
                        ? 'bg-white/20 text-current' 
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
                      }
                    `}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ 
  analysisResult, 
  onTabChange 
}: { 
  analysisResult: EnhancedAnalysisResult
  onTabChange: (tab: TabId) => void 
}) {
  const { extractedData, scoreAnalysis, recommendations, uiMetadata } = analysisResult

  const getAverageScore = () => {
    const scores = [
      extractedData.creditScores.experian?.score,
      extractedData.creditScores.equifax?.score,
      extractedData.creditScores.transUnion?.score
    ].filter(Boolean) as number[]
    
    return scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0
  }

  const avgScore = getAverageScore()

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Average Score"
          value={avgScore}
          subtitle="Across all bureaus"
          icon={TrendingUp}
          color="blue"
          onClick={() => onTabChange('scores')}
        />
        <MetricCard
          title="Total Accounts"
          value={extractedData.accounts?.length || 0}
          subtitle={`${extractedData.accounts?.filter(a => a.status === 'open').length || 0} open`}
          icon={CreditCard}
          color="green"
          onClick={() => onTabChange('accounts')}
        />
        <MetricCard
          title="Negative Items"
          value={extractedData.negativeItems?.length || 0}
          subtitle="Require attention"
          icon={AlertTriangle}
          color="red"
          onClick={() => onTabChange('negatives')}
        />
        <MetricCard
          title="Data Quality"
          value={`${Math.round(uiMetadata.confidence)}%`}
          subtitle={uiMetadata.processingMethod}
          icon={Shield}
          color="indigo"
          onClick={() => onTabChange('quality')}
        />
      </div>

      {/* Actionable Items */}
      {uiMetadata.actionableItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uiMetadata.actionableItems.slice(0, 5).map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => {
                    if (item.type === 'dispute') onTabChange('negatives')
                    else if (item.type === 'payment') onTabChange('accounts')
                  }}
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{item.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">
                      +{item.expectedImpact} points
                    </div>
                    <div className="text-xs text-gray-500">{item.timeToComplete}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Credit Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {extractedData.accounts
                ?.filter(a => a.creditLimit && a.creditLimit > 0)
                .slice(0, 3)
                .map(account => {
                  const utilization = (account.balance / (account.creditLimit || 1)) * 100
                  return (
                    <div key={account.id}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{account.creditorName}</span>
                        <span className="text-sm text-gray-600">{utilization.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            utilization > 30 ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score Factors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scoreAnalysis.keyFactors.slice(0, 4).map((factor, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">{factor}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color, 
  onClick 
}: {
  title: string
  value: string | number
  subtitle: string
  icon: any
  color: string
  onClick: () => void
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    indigo: 'from-indigo-500 to-indigo-600'
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} rounded-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <Eye className="w-4 h-4 text-gray-400" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  )
}