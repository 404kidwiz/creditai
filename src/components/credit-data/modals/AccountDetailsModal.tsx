'use client'

import React, { useState } from 'react'
import { CreditAccount } from '@/types/credit-ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PaymentHistoryChart } from '../visualizations/PaymentHistoryChart'
import { ConfidenceIndicator } from '../utils/ConfidenceIndicator'
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
  Percent
} from 'lucide-react'

interface AccountDetailsModalProps {
  account: CreditAccount
  isOpen: boolean
  onClose: () => void
}

export function AccountDetailsModal({ account, isOpen, onClose }: AccountDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'details'>('overview')

  if (!isOpen) return null

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'credit_card':
        return <CreditCard className="w-5 h-5" />
      case 'auto_loan':
      case 'personal_loan':
      case 'student_loan':
        return <TrendingUp className="w-5 h-5" />
      case 'mortgage':
        return <Building className="w-5 h-5" />
      default:
        return <CreditCard className="w-5 h-5" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'closed':
        return <Clock className="w-5 h-5 text-gray-500" />
      case 'charged_off':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'charged_off':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
    }
  }

  const calculateUtilization = (): number => {
    if (!account.creditLimit || account.creditLimit === 0) return 0
    return (account.balance / account.creditLimit) * 100
  }

  const utilization = calculateUtilization()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              {getAccountTypeIcon(account.accountType)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {account.creditorName}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {account.accountNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConfidenceIndicator confidence={account.confidence} />
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'history', label: 'Payment History' },
              { id: 'details', label: 'Account Details' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Status and Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Account Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(account.status)}
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(account.status)}`}>
                            {account.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Account Type</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize mt-1">
                          {account.accountType.replace('_', ' ')}
                        </p>
                      </div>
                      {getAccountTypeIcon(account.accountType)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-8 h-8 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Current Balance</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          ${account.balance.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {account.creditLimit && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-green-500" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Credit Limit</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">
                            ${account.creditLimit.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {account.creditLimit && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Percent className={`w-8 h-8 ${
                          utilization > 30 ? 'text-red-500' : 
                          utilization > 10 ? 'text-yellow-500' : 'text-green-500'
                        }`} />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Utilization</p>
                          <p className={`text-xl font-bold ${
                            utilization > 30 ? 'text-red-600' : 
                            utilization > 10 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {utilization.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Utilization Progress Bar */}
              {account.creditLimit && (
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-gray-900 dark:text-white">Credit Utilization</h4>
                        <span className={`text-sm font-medium ${
                          utilization > 30 ? 'text-red-600' : 
                          utilization > 10 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {utilization.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            utilization > 30 ? 'bg-red-500' :
                            utilization > 10 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        ${account.balance.toLocaleString()} of ${account.creditLimit.toLocaleString()} used
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Warning for Problem Accounts */}
              {['charged_off', 'collection'].includes(account.status) && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-800 dark:text-red-200">
                          Account Requires Attention
                        </h4>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          This account is in {account.status.replace('_', ' ')} status and may be significantly 
                          impacting your credit score. Consider disputing if the information is inaccurate.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <PaymentHistoryChart 
                paymentHistory={account.paymentHistory}
                compact={false}
                showLegend={true}
              />
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Account Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Hash className="w-5 h-5" />
                      Account Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Account Number</label>
                      <p className="font-mono text-gray-900 dark:text-white">{account.accountNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Account Type</label>
                      <p className="text-gray-900 dark:text-white capitalize">{account.accountType.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                      <p className="text-gray-900 dark:text-white capitalize">{account.status.replace('_', ' ')}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Dates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Important Dates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Date Opened</label>
                      <p className="text-gray-900 dark:text-white">
                        {new Date(account.openDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Reported</label>
                      <p className="text-gray-900 dark:text-white">
                        {new Date(account.lastReported).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Reporting Bureaus */}
              {account.bureaus && account.bureaus.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Reporting Bureaus</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
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
                <CardHeader>
                  <CardTitle>Data Quality</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Extraction Confidence</span>
                    <ConfidenceIndicator confidence={account.confidence} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {['charged_off', 'collection'].includes(account.status) && (
            <Button>
              Start Dispute Process
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}