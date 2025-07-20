/**
 * PDF Processing Monitor Dashboard
 * Displays comprehensive monitoring metrics and alerts for PDF processing system
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'

interface MonitoringData {
  success: {
    totalProcessed: number
    successful: number
    failed: number
    successRate: number
    methodBreakdown: Record<string, {
      total: number
      successful: number
      successRate: number
    }>
  }
  confidence: {
    averageConfidence: number
    confidenceDistribution: {
      high: number
      medium: number
      low: number
    }
    methodConfidence: Record<string, number>
  }
  performance: {
    averageProcessingTime: number
    medianProcessingTime: number
    p95ProcessingTime: number
    slowestProcessingTime: number
    fastestProcessingTime: number
    methodPerformance: Record<string, {
      average: number
      median: number
      p95: number
    }>
  }
  errors: {
    totalErrors: number
    errorRate: number
    errorTypes: Record<string, number>
    criticalErrors: number
    serviceFailures: Record<string, number>
  }
  recentActivity?: any[]
  audit?: {
    totalEvents: number
    riskDistribution: Record<string, number>
    topEventTypes: Record<string, number>
    failureRate: number
    highRiskEvents: number
  }
}

interface PDFProcessingMonitorDashboardProps {
  isAdmin?: boolean
}

export function PDFProcessingMonitorDashboard({ isAdmin = false }: PDFProcessingMonitorDashboardProps) {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState('24h')
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  // Fetch monitoring data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/monitoring/pdf-processing?timeframe=${timeframe}&metric=all`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        throw new Error(result.error || 'Failed to fetch monitoring data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Failed to fetch monitoring data:', err)
    } finally {
      setLoading(false)
    }
  }, [timeframe])

  // Set up auto-refresh
  useEffect(() => {
    fetchData()
    
    // Set up refresh interval (every 30 seconds)
    const interval = setInterval(fetchData, 30000)
    setRefreshInterval(interval)
    
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [timeframe, fetchData])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [refreshInterval])

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe)
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getStatusColor = (value: number, thresholds: { good: number, warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600'
    if (value >= thresholds.warning) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading monitoring data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <div className="flex items-center justify-between">
          <span>Failed to load monitoring data: {error}</span>
          <Button onClick={fetchData} size="sm">
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  if (!data) {
    return (
      <Alert variant="default">
        No monitoring data available
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">PDF Processing Monitor</h2>
        <div className="flex items-center space-x-4">
          {/* Timeframe selector */}
          <select
            value={timeframe}
            onChange={(e) => handleTimeframeChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <Button onClick={fetchData} size="sm" disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Success Rate */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className={`text-2xl font-bold ${getStatusColor(data.success.successRate, { good: 95, warning: 85 })}`}>
                {formatPercentage(data.success.successRate)}
              </p>
              <p className="text-xs text-gray-500">
                {data.success.successful}/{data.success.totalProcessed} processed
              </p>
            </div>
            <div className="text-green-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Average Confidence */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
              <p className={`text-2xl font-bold ${getConfidenceColor(data.confidence.averageConfidence)}`}>
                {formatPercentage(data.confidence.averageConfidence)}
              </p>
              <p className="text-xs text-gray-500">
                High: {data.confidence.confidenceDistribution.high} | 
                Med: {data.confidence.confidenceDistribution.medium} | 
                Low: {data.confidence.confidenceDistribution.low}
              </p>
            </div>
            <div className="text-blue-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Average Processing Time */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Processing Time</p>
              <p className={`text-2xl font-bold ${getStatusColor(10000 - data.performance.averageProcessingTime, { good: 5000, warning: 2000 })}`}>
                {formatTime(data.performance.averageProcessingTime)}
              </p>
              <p className="text-xs text-gray-500">
                P95: {formatTime(data.performance.p95ProcessingTime)}
              </p>
            </div>
            <div className="text-purple-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Error Rate */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className={`text-2xl font-bold ${getStatusColor(100 - data.errors.errorRate, { good: 95, warning: 85 })}`}>
                {formatPercentage(data.errors.errorRate)}
              </p>
              <p className="text-xs text-gray-500">
                {data.errors.totalErrors} errors | {data.errors.criticalErrors} critical
              </p>
            </div>
            <div className="text-red-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Processing Method Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Methods</h3>
          <div className="space-y-4">
            {Object.entries(data.success.methodBreakdown).map(([method, stats]) => (
              <div key={method} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {method.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="text-sm text-gray-500">
                      {stats.successful}/{stats.total} ({formatPercentage(stats.successRate)})
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        stats.successRate >= 95 ? 'bg-green-500' :
                        stats.successRate >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${stats.successRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Method</h3>
          <div className="space-y-4">
            {Object.entries(data.performance.methodPerformance).map(([method, perf]) => (
              <div key={method} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {method.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatTime(perf.average)}
                  </div>
                  <div className="text-xs text-gray-500">
                    P95: {formatTime(perf.p95)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Error Analysis */}
      {data.errors.totalErrors > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-2">Error Types</h4>
              <div className="space-y-2">
                {Object.entries(data.errors.errorTypes).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {Object.keys(data.errors.serviceFailures).length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-2">Service Failures</h4>
                <div className="space-y-2">
                  {Object.entries(data.errors.serviceFailures).map(([service, count]) => (
                    <div key={service} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {service.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="text-sm font-medium text-red-600">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Audit Summary (Admin only) */}
      {isAdmin && data.audit && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Audit Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-2">Risk Distribution</h4>
              <div className="space-y-2">
                {Object.entries(data.audit.riskDistribution).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between">
                    <span className={`text-sm capitalize ${
                      level === 'critical' ? 'text-red-600' :
                      level === 'high' ? 'text-orange-600' :
                      level === 'medium' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {level}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-2">Top Event Types</h4>
              <div className="space-y-2">
                {Object.entries(data.audit.topEventTypes)
                  .sort(([,a], [,b]) => (b as number) - (a as number))
                  .slice(0, 5)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-2">Summary Stats</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Events</span>
                  <span className="text-sm font-medium text-gray-900">{data.audit.totalEvents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Failure Rate</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatPercentage(data.audit.failureRate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">High Risk Events</span>
                  <span className="text-sm font-medium text-red-600">{data.audit.highRiskEvents}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      {data.recentActivity && data.recentActivity.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.recentActivity.slice(0, 10).map((activity, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {activity.fileName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {activity.processingMethod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        activity.success 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {activity.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {activity.success ? `${activity.confidence}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(activity.processingTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}