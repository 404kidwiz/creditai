'use client'

import React, { useState, useEffect } from 'react'
import { CreditAccount } from '@/types/credit-ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { PaymentHistoryChart } from '../visualizations/PaymentHistoryChart'
import { ConfidenceIndicator } from '../utils/ConfidenceIndicator'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Building,
  Hash,
  Percent,
  FileText,
  Download,
  Share2,
  Flag,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Shield,
  Activity
} from 'lucide-react'

interface EnhancedAccountDetailsModalProps {
  account: CreditAccount
  isOpen: boolean
  onClose: () => void
  onDispute?: () => void
  onExport?: () => void
}

type TabId = 'overview' | 'history' | 'details' | 'actions'

export function EnhancedAccountDetailsModal({ 
  account, 
  isOpen, 
  onClose,
  onDispute,
  onExport
}: EnhancedAccountDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [showPaymentDetails, setShowPaymentDetails] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview')
      setShowPaymentDetails(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const getAccountTypeIcon = (type: string) => {
    const icons = {
      credit_card: CreditCard,
      auto_loan: TrendingUp,
      personal_loan: TrendingUp,
      student_loan: TrendingUp,
      mortgage: Building,
      other: FileText
    }
    const Icon = icons[type as keyof typeof icons] || CreditCard
    return <Icon className="w-5 h-5" />
  }

  const getStatusDetails = (status: string) => {
    const statusMap = {
      open: { 
        icon: CheckCircle, 
        color: 'text-green-500', 
        bgColor: 'bg-green-100 dark:bg-green-900/20',
        label: 'Open'
      },
      closed: { 
        icon: Clock, 
        color: 'text-gray-500', 
        bgColor: 'bg-gray-100 dark:bg-gray-700',
        label: 'Closed'
      },
      charged_off: { 
        icon: XCircle, 
        color: 'text-red-500', 
        bgColor: 'bg-red-100 dark:bg-red-900/20',
        label: 'Charged Off'
      },
      paid: { 
        icon: CheckCircle, 
        color: 'text-blue-500', 
        bgColor: 'bg-blue-100 dark:bg-blue-900/20',
        label: 'Paid'
      }
    }
    return statusMap[status as keyof typeof statusMap] || statusMap.open
  }

  const calculateUtilization = (): number => {
    if (!account.creditLimit || account.creditLimit === 0) return 0
    return (account.balance / account.creditLimit) * 100
  }

  const getPaymentScore = () => {
    const total = account.paymentHistory.length
    const onTime = account.paymentHistory.filter(p => p.status === 'current').length
    return total > 0 ? Math.round((onTime / total) * 100) : 0
  }

  const utilization = calculateUtilization()
  const paymentScore = getPaymentScore()
  const statusDetails = getStatusDetails(account.status)

  const tabs = [
    { id: 'overview' as TabId, label: 'Overview', icon: Activity },
    { id: 'history' as TabId, label: 'Payment History', icon: Calendar },
    { id: 'details' as TabId, label: 'Details', icon: FileText },
    { id: 'actions' as TabId, label: 'Actions', icon: Sparkles }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-10 sm:top-20 
                     w-auto sm:max-w-4xl max-h-[85vh] bg-white dark:bg-gray-900 rounded-xl 
                     shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <motion.div 
                    className="p-3 bg-white/20 rounded-lg backdrop-blur-sm"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {getAccountTypeIcon(account.accountType)}
                  </motion.div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">
                      {account.creditorName}
                    </h2>
                    <p className="text-white/80 text-sm sm:text-base">
                      {account.accountNumber}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-xs text-white/70">Status</p>
                  <p className="font-semibold capitalize">{account.status.replace('_', ' ')}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-xs text-white/70">Balance</p>
                  <p className="font-semibold">${account.balance.toLocaleString()}</p>
                </div>
                {account.creditLimit && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <p className="text-xs text-white/70">Utilization</p>
                    <p className="font-semibold">{utilization.toFixed(1)}%</p>
                  </div>
                )}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-xs text-white/70">Payment Score</p>
                  <p className="font-semibold">{paymentScore}%</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center gap-2 px-4 sm:px-6 py-4 text-sm font-medium
                        border-b-2 transition-colors whitespace-nowrap
                        ${activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 280px)' }}>
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-6 space-y-6"
                  >
                    {/* Account Health Score */}
                    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-0">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                              Account Health Score
                            </h3>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold text-blue-600">
                                {Math.round((paymentScore + (100 - utilization)) / 2)}%
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {paymentScore >= 90 && utilization <= 30 ? 'Excellent' : 
                                 paymentScore >= 70 && utilization <= 50 ? 'Good' : 'Needs Attention'}
                              </span>
                            </div>
                          </div>
                          <Shield className="w-12 h-12 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Utilization Card */}
                      {account.creditLimit && (
                        <Card>
                          <CardContent className="p-4">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                              Credit Utilization
                            </h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  ${account.balance.toLocaleString()} of ${account.creditLimit.toLocaleString()}
                                </span>
                                <span className={`font-semibold ${
                                  utilization > 30 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {utilization.toFixed(1)}%
                                </span>
                              </div>
                              <div className="relative">
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(utilization, 100)}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`h-3 rounded-full ${
                                      utilization > 30 ? 'bg-red-500' :
                                      utilization > 10 ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}
                                  />
                                </div>
                                {/* Markers */}
                                <div className="absolute top-0 left-[30%] w-0.5 h-3 bg-gray-400" />
                                <div className="absolute -bottom-5 left-[30%] -translate-x-1/2 text-xs text-gray-500">
                                  30%
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Payment Performance */}
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                            Payment Performance
                          </h4>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="text-2xl font-bold text-green-600">{paymentScore}%</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">On-time payments</p>
                            </div>
                            <div className="text-right text-sm">
                              <p className="text-gray-600 dark:text-gray-400">
                                {account.paymentHistory.filter(p => p.status === 'current').length} of {account.paymentHistory.length}
                              </p>
                              <p className="text-xs text-gray-500">payments on time</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Alerts */}
                    {['charged_off', 'collection'].includes(account.status) && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Account Requires Immediate Attention</strong>
                          <p className="mt-1">
                            This account is negatively impacting your credit score. Consider disputing if the information is inaccurate.
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}

                    {utilization > 30 && account.status === 'open' && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>High Credit Utilization</strong>
                          <p className="mt-1">
                            Your utilization is above 30%. Consider paying down the balance to improve your credit score.
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}
                  </motion.div>
                )}

                {activeTab === 'history' && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-6"
                  >
                    <PaymentHistoryChart 
                      paymentHistory={account.paymentHistory}
                      compact={false}
                      showLegend={true}
                    />
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                      className="mt-4"
                    >
                      {showPaymentDetails ? 'Hide' : 'Show'} Payment Details
                    </Button>

                    {showPaymentDetails && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 space-y-2"
                      >
                        {account.paymentHistory.map((payment, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {payment.status === 'current' ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                              <div>
                                <p className="font-medium">{payment.month}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {payment.status.replace('_', ' ')}
                                </p>
                              </div>
                            </div>
                            {payment.amount && (
                              <span className="font-medium">${payment.amount}</span>
                            )}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'details' && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-6 space-y-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Account Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Account Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <DetailRow label="Account Number" value={account.accountNumber} />
                          <DetailRow label="Account Type" value={account.accountType.replace('_', ' ')} capitalize />
                          <DetailRow 
                            label="Status" 
                            value={
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${statusDetails.bgColor} ${statusDetails.color}`}>
                                <statusDetails.icon className="w-3 h-3" />
                                {statusDetails.label}
                              </span>
                            } 
                          />
                          <DetailRow label="Balance" value={`$${account.balance.toLocaleString()}`} />
                          {account.creditLimit && (
                            <DetailRow label="Credit Limit" value={`$${account.creditLimit.toLocaleString()}`} />
                          )}
                        </CardContent>
                      </Card>

                      {/* Important Dates */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Important Dates</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <DetailRow label="Date Opened" value={new Date(account.openDate).toLocaleDateString()} />
                          <DetailRow label="Last Reported" value={new Date(account.lastReported).toLocaleDateString()} />
                          <DetailRow label="Account Age" value={`${Math.floor((Date.now() - new Date(account.openDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} years`} />
                        </CardContent>
                      </Card>
                    </div>

                    {/* Reporting Bureaus */}
                    {account.bureaus && account.bureaus.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Reporting Bureaus</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {account.bureaus.map((bureau) => (
                              <span
                                key={bureau}
                                className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium capitalize"
                              >
                                {bureau}
                              </span>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Data Quality */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Data Extraction Confidence
                          </span>
                          <ConfidenceIndicator confidence={account.confidence} />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {activeTab === 'actions' && (
                  <motion.div
                    key="actions"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-6 space-y-4"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Available Actions
                    </h3>

                    {['charged_off', 'collection'].includes(account.status) && (
                      <ActionCard
                        icon={Flag}
                        title="Dispute This Account"
                        description="Challenge inaccurate information with credit bureaus"
                        buttonText="Start Dispute"
                        onClick={onDispute}
                        variant="primary"
                      />
                    )}

                    <ActionCard
                      icon={Download}
                      title="Export Account Details"
                      description="Download a detailed report of this account"
                      buttonText="Export PDF"
                      onClick={onExport}
                    />

                    <ActionCard
                      icon={Share2}
                      title="Share with Financial Advisor"
                      description="Send account details to your advisor securely"
                      buttonText="Share"
                      onClick={() => console.log('Share')}
                    />

                    {account.status === 'open' && utilization > 30 && (
                      <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                                Recommended: Pay Down Balance
                              </h4>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                Reducing your balance to 30% of your credit limit could improve your score by 10-30 points.
                              </p>
                              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mt-2">
                                Target balance: ${(account.creditLimit! * 0.3).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentIndex = tabs.findIndex(t => t.id === activeTab)
                      if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1].id)
                    }}
                    disabled={activeTab === tabs[0].id}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentIndex = tabs.findIndex(t => t.id === activeTab)
                      if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1].id)
                    }}
                    disabled={activeTab === tabs[tabs.length - 1].id}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <Button onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Helper Components
function DetailRow({ label, value, capitalize = false }: { 
  label: string
  value: React.ReactNode
  capitalize?: boolean 
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className={`font-medium text-gray-900 dark:text-white ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function ActionCard({ 
  icon: Icon, 
  title, 
  description, 
  buttonText, 
  onClick,
  variant = 'outline'
}: {
  icon: any
  title: string
  description: string
  buttonText: string
  onClick?: () => void
  variant?: 'primary' | 'outline'
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          </div>
          <Button
            size="sm"
            variant={variant === 'primary' ? 'default' : 'outline'}
            onClick={onClick}
          >
            {buttonText}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}