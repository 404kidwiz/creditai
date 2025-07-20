/**
 * Production Monitoring Dashboard
 * Comprehensive monitoring for production PDF processing system
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'

interface ProductionMetrics {
  systemHealth: {
    apiHealth: boolean
    databaseConnection: boolean
    googleCloudServices: boolean
    monitoringSystem: boolean
  }
  processing: {
    totalProcessed: number
    successRate: number
    averageProcessingTime: number
    averageConfidence: number
    averageAccuracy: number
  }
  userFeedback: {
    totalFeedback: number
    averageRating: number
    averageAccuracyRating: number
    averageSpeedRating: number
    ratingDistribution: Record<string, number>
  }
  errors: string[]
  lastUpdated: string
}

export function ProductionMonitoringDashboard() {
  const [metrics, setMetrics] = useState<ProductionMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState('24h')

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch system health
      const healthResponse = await fetch('/api/test/google-cloud')
      const healthData = await healthResponse.json()

      // Fetch processing metrics
      const processingResponse = await fetch(`/api/monitoring/pdf-processing?timeframe=${timeframe}&metric=all`)
      const processingData = await processingResponse.json()

      // Fetch user feedback
      const feedbackResponse = await fetch(`/api/feedback/pdf-processing?timeframe=${timeframe}`)
      const feedbackData = await feedbackResponse.json()

      // Combine metrics
      const combinedMetrics: ProductionMetrics = {
        systemHealth: {
          apiHealth: healthData.success,
          databaseConnection: processingData.success,
          googleCloudServices: healthData.details?.services?.documentAI || false,
          monitoringSystem: processingResponse.ok
        },
        processing: {
          totalProcessed: processingData.data?.success?.totalProcessed || 0,
          successRate: processingData.data?.success?.successRate || 0,
          averageProcessingTime: processingData.data?.performance?.averageProcessingTime || 0,
          averageConfidence: processingData.data?.confidence?.averageConfidence || 0,
          averageAccuracy: 0 // Would need to be calculated from validation data
        },
        userFeedback: {
          totalFeedback: feedbackData.data?.summary?.totalFeedback || 0,
          averageRating: feedbackData.data?.summary?.averageRating || 0,
          averageAccuracyRating: feedbackData.data?.summary?.averageAccuracyRating || 0,
          averageSpeedRating: feedbackData.data?.summary?.averageSpeedRating || 0,
          ratingDistribution: feedbackData.data?.summary?.ratingDistribution || {}
        },
        errors: [
          ...(healthData.details?.errors || []),
          ...(processingData.data?.errors?.errorTypes ? Object.keys(processingData.data.errors.errorTypes) : [])
        ],
        lastUpdated: new Date().toISOString()
      }

      setMetrics(combinedMetrics)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
    } finally {
      setLoading(false)
    }
  }, [timeframe])

  useEffect(() => {
    fetchMetrics()
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    
    return () => clearInterval(interval)
  }, [timeframe, fetchMetrics])

  const getHealthStatus = (isHealthy: boolean) => {
    return isHealthy ? 'text-green-600' : 'text-red-600'
  }

  const getHealthIcon = (isHealthy: boolean) => {
    return isHealthy ? '✅' : '❌'
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading production metrics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <div className="flex items-center justify-between">
          <span>Failed to load production metrics: {error}</span>
          <Button onClick={fetchMetrics} size="sm">
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  if (!metrics) {
    return (
      <Alert variant="default">
        No production metrics available
      </Alert>
    )
  }

  const overallHealth = Object.values(metrics.systemHealth).every(Boolean)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Production Monitoring</h2>
        <div className="flex items-center space-x-4">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <Button onClick={fetchMetrics} size="sm" disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Overall Health Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
            <p className={`text-2xl font-bold ${overallHealth ? 'text-green-600' : 'text-red-600'}`}>
              {overallHealth ? 'Healthy' : 'Issues Detected'}
            </p>
          </div>
          <div className="text-4xl">
            {overallHealth ? '🟢' : '🔴'}
          </div>
        </div>
      </Card>

      {/* System Health Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">API Health</p>
              <p className={`text-lg font-bold ${getHealthStatus(metrics.systemHealth.apiHealth)}`}>
                {metrics.systemHealth.apiHealth ? 'Online' : 'Offline'}
              </p>
            </div>
            <div className="text-2xl">
              {getHealthIcon(metrics.systemHealth.apiHealth)}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Database</p>
              <p className={`text-lg font-bold ${getHealthStatus(metrics.systemHealth.databaseConnection)}`}>
                {metrics.systemHealth.databaseConnection ? 'Connected' : 'Disconnected'}
              </p>
            </div>
            <div className="text-2xl">
              {getHealthIcon(metrics.systemHealth.databaseConnection)}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Google Cloud</p>
              <p className={`text-lg font-bold ${getHealthStatus(metrics.systemHealth.googleCloudServices)}`}>
                {metrics.systemHealth.googleCloudServices ? 'Active' : 'Issues'}
              </p>
            </div>
            <div className="text-2xl">
              {getHealthIcon(metrics.systemHealth.googleCloudServices)}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monitoring</p>
              <p className={`text-lg font-bold ${getHealthStatus(metrics.systemHealth.monitoringSystem)}`}>
                {metrics.systemHealth.monitoringSystem ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div className="text-2xl">
              {getHealthIcon(metrics.systemHealth.monitoringSystem)}
            </div>
          </div>
        </Card>
      </div>

      {/* Processing Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Processed</p>
            <p className="text-2xl font-bold text-gray-900">
              {metrics.processing.totalProcessed.toLocaleString()}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div>
            <p className="text-sm font-medium text-gray-600">Success Rate</p>
            <p className={`text-2xl font-bold ${
              metrics.processing.successRate >= 95 ? 'text-green-600' :
              metrics.processing.successRate >= 85 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {formatPercentage(metrics.processing.successRate)}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div>
            <p className="text-sm font-medium text-gray-600">Avg Processing Time</p>
            <p className={`text-2xl font-bold ${
              metrics.processing.averageProcessingTime <= 5000 ? 'text-green-600' :
              metrics.processing.averageProcessingTime <= 10000 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {formatTime(metrics.processing.averageProcessingTime)}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div>
            <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
            <p className={`text-2xl font-bold ${
              metrics.processing.averageConfidence >= 80 ? 'text-green-600' :
              metrics.processing.averageConfidence >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {formatPercentage(metrics.processing.averageConfidence)}
            </p>
          </div>
        </Card>
      </div>

      {/* User Feedback */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Feedback</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Feedback</p>
            <p className="text-2xl font-bold text-gray-900">
              {metrics.userFeedback.totalFeedback}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-600">Overall Rating</p>
            <p className={`text-2xl font-bold ${
              metrics.userFeedback.averageRating >= 4 ? 'text-green-600' :
              metrics.userFeedback.averageRating >= 3 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {metrics.userFeedback.averageRating.toFixed(1)}/5
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-600">Accuracy Rating</p>
            <p className={`text-2xl font-bold ${
              metrics.userFeedback.averageAccuracyRating >= 4 ? 'text-green-600' :
              metrics.userFeedback.averageAccuracyRating >= 3 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {metrics.userFeedback.averageAccuracyRating.toFixed(1)}/5
            </p>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Rating Distribution</p>
          <div className="flex items-center space-x-4">
            {[5, 4, 3, 2, 1].map(rating => (
              <div key={rating} className="flex items-center">
                <span className="text-sm text-gray-600 mr-1">{rating}★</span>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${metrics.userFeedback.totalFeedback > 0 
                        ? (metrics.userFeedback.ratingDistribution[rating] / metrics.userFeedback.totalFeedback) * 100 
                        : 0}%`
                    }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 ml-1">
                  {metrics.userFeedback.ratingDistribution[rating] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Errors and Issues */}
      {metrics.errors.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Issues</h3>
          <div className="space-y-2">
            {metrics.errors.slice(0, 5).map((error, index) => (
              <Alert key={index} variant="warning">
                {error}
              </Alert>
            ))}
          </div>
        </Card>
      )}

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
      </div>
    </div>
  )
}