'use client'

import React from 'react'
import { CreditAccount } from '@/types/credit-ui'
import { Card, CardContent } from '@/components/ui/Card'
import { PaymentHistoryChart } from '../visualizations/PaymentHistoryChart'
import { ConfidenceIndicator } from '../utils/ConfidenceIndicator'
import { CreditCard, TrendingUp, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'

interface AccountCardProps {
  account: CreditAccount
  onClick: () => void
  isSelected?: boolean
}

export function AccountCard({ account, onClick, isSelected = false }: AccountCardProps) {
  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'credit_card':
        return <CreditCard className="w-5 h-5" />
      case 'auto_loan':
      case 'personal_loan':
      case 'student_loan':
        return <TrendingUp className="w-5 h-5" />
      case 'mortgage':
        return <TrendingUp className="w-5 h-5" />
      default:
        return <CreditCard className="w-5 h-5" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'closed':
        return <Clock className="w-4 h-4 text-gray-500" />
      case 'charged_off':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
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

  const getUtilizationColor = (utilization: number): string => {
    if (utilization > 90) return 'text-red-600'
    if (utilization > 30) return 'text-yellow-600'
    return 'text-green-600'
  }

  const utilization = calculateUtilization()
  const hasPaymentHistory = account.paymentHistory && account.paymentHistory.length > 0

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              {getAccountTypeIcon(account.accountType)}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {account.creditorName}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {account.accountNumber}
              </p>
            </div>
          </div>
          <ConfidenceIndicator confidence={account.confidence} size="sm" showLabel={false} />
        </div>

        {/* Account Type and Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
            {account.accountType.replace('_', ' ')}
          </span>
          <div className="flex items-center gap-2">
            {getStatusIcon(account.status)}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(account.status)}`}>
              {account.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Balance and Credit Limit */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Balance</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              ${account.balance.toLocaleString()}
            </span>
          </div>
          
          {account.creditLimit && account.creditLimit > 0 && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Credit Limit</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  ${account.creditLimit.toLocaleString()}
                </span>
              </div>
              
              {/* Utilization Bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Utilization</span>
                  <span className={`text-xs font-medium ${getUtilizationColor(utilization)}`}>
                    {utilization.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      utilization > 90 ? 'bg-red-500' :
                      utilization > 30 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Payment History Sparkline */}
        {hasPaymentHistory && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Payment History (12 months)</span>
              <span className="text-xs text-gray-500">
                {account.paymentHistory.filter(p => p.status === 'current').length}/
                {account.paymentHistory.length} on time
              </span>
            </div>
            <PaymentHistoryChart 
              paymentHistory={account.paymentHistory}
              compact={true}
            />
          </div>
        )}

        {/* Account Dates */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>Opened: {new Date(account.openDate).toLocaleDateString()}</span>
          <span>Updated: {new Date(account.lastReported).toLocaleDateString()}</span>
        </div>

        {/* Warning for Problem Accounts */}
        {['charged_off', 'collection'].includes(account.status) && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-xs text-red-700 dark:text-red-300">
                This account may be negatively impacting your credit score
              </span>
            </div>
          </div>
        )}

        {/* Bureaus */}
        {account.bureaus && account.bureaus.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Reported by:</span>
            <div className="flex gap-1">
              {account.bureaus.map((bureau) => (
                <span
                  key={bureau}
                  className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded capitalize"
                >
                  {bureau}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}