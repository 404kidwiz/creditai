'use client'

import React from 'react'
import { PaymentHistoryEntry } from '@/types/credit-ui'

interface PaymentHistoryChartProps {
  paymentHistory: PaymentHistoryEntry[]
  compact?: boolean
  showLegend?: boolean
}

export function PaymentHistoryChart({ 
  paymentHistory, 
  compact = false, 
  showLegend = true 
}: PaymentHistoryChartProps) {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'current':
        return '#10B981' // green-500
      case '30_days_late':
        return '#F59E0B' // amber-500
      case '60_days_late':
        return '#F97316' // orange-500
      case '90_days_late':
        return '#EF4444' // red-500
      case '120_days_late':
        return '#DC2626' // red-600
      case 'charge_off':
        return '#991B1B' // red-800
      case 'collection':
        return '#7C2D12' // red-900
      default:
        return '#6B7280' // gray-500
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'current':
        return 'Current'
      case '30_days_late':
        return '30 Days Late'
      case '60_days_late':
        return '60 Days Late'
      case '90_days_late':
        return '90 Days Late'
      case '120_days_late':
        return '120+ Days Late'
      case 'charge_off':
        return 'Charge Off'
      case 'collection':
        return 'Collection'
      default:
        return 'Unknown'
    }
  }

  // Sort payment history by month (most recent first)
  const sortedHistory = [...paymentHistory].sort((a, b) => 
    new Date(b.month).getTime() - new Date(a.month).getTime()
  ).slice(0, compact ? 12 : 24) // Show last 12 or 24 months

  if (sortedHistory.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">No payment history available</p>
      </div>
    )
  }

  // Calculate statistics
  const onTimePayments = sortedHistory.filter(p => p.status === 'current').length
  const latePayments = sortedHistory.filter(p => p.status !== 'current').length
  const onTimePercentage = (onTimePayments / sortedHistory.length) * 100

  return (
    <div className="space-y-3">
      {/* Chart */}
      <div className="space-y-2">
        {!compact && (
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Payment History ({sortedHistory.length} months)
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {onTimePercentage.toFixed(0)}% on time
            </div>
          </div>
        )}
        
        <div className="flex gap-1 overflow-x-auto">
          {sortedHistory.reverse().map((entry, index) => {
            const date = new Date(entry.month)
            const monthLabel = date.toLocaleDateString('en-US', { 
              month: 'short', 
              year: compact ? undefined : '2-digit' 
            })
            
            return (
              <div
                key={`${entry.month}-${index}`}
                className="group relative flex-shrink-0"
              >
                {/* Payment Status Bar */}
                <div
                  className={`w-${compact ? '3' : '6'} h-${compact ? '6' : '12'} rounded transition-all duration-200 hover:scale-110`}
                  style={{ backgroundColor: getStatusColor(entry.status) }}
                  title={`${monthLabel}: ${getStatusLabel(entry.status)}`}
                />
                
                {/* Month Label */}
                {!compact && (
                  <div className="text-xs text-gray-500 text-center mt-1 transform -rotate-45 origin-top-left">
                    {monthLabel}
                  </div>
                )}
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  <div>{monthLabel}</div>
                  <div>{getStatusLabel(entry.status)}</div>
                  {entry.amount && (
                    <div>${entry.amount.toLocaleString()}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Statistics */}
      {!compact && (
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-green-600">
              {onTimePayments}
            </div>
            <div className="text-xs text-gray-500">On Time</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600">
              {latePayments}
            </div>
            <div className="text-xs text-gray-500">Late</div>
          </div>
          <div>
            <div className={`text-lg font-bold ${
              onTimePercentage >= 95 ? 'text-green-600' :
              onTimePercentage >= 80 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {onTimePercentage.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">Success Rate</div>
          </div>
        </div>
      )}

      {/* Legend */}
      {showLegend && !compact && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-900 dark:text-white mb-2">
            Payment Status Legend
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {[
              { status: 'current', label: 'Current' },
              { status: '30_days_late', label: '30 Days Late' },
              { status: '60_days_late', label: '60 Days Late' },
              { status: '90_days_late', label: '90+ Days Late' }
            ].map(({ status, label }) => (
              <div key={status} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: getStatusColor(status) }}
                />
                <span className="text-gray-600 dark:text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}