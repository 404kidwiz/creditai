'use client';

import React, { useState, useEffect } from 'react';
import { DashboardWidget } from '@/types/analytics';
import { businessIntelligenceEngine } from '@/lib/analytics/businessIntelligence';

interface MetricCardProps {
  widget: DashboardWidget;
  isEditable?: boolean;
  onUpdate?: (widgetId: string, updates: Partial<DashboardWidget>) => void;
}

interface MetricData {
  label: string;
  value: number;
  change?: number;
  format: 'number' | 'currency' | 'percentage';
}

export function MetricCard({ widget, isEditable, onUpdate }: MetricCardProps) {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [widget.config]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await businessIntelligenceEngine.getWidgetData(widget);
      const processedMetrics = processMetricData(data.data);
      setMetrics(processedMetrics);
    } catch (err) {
      setError('Failed to load metrics');
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const processMetricData = (rawData: any[]): MetricData[] => {
    if (!rawData || rawData.length === 0) {
      return [];
    }

    // Process business metrics data
    if (widget.config.dataSource === 'business_metrics') {
      const latest = rawData[rawData.length - 1];
      const previous = rawData.length > 1 ? rawData[rawData.length - 2] : null;

      const metrics: MetricData[] = [];

      if (widget.config.query.metrics.includes('activeUsers')) {
        metrics.push({
          label: 'Active Users',
          value: latest.active_users || 0,
          change: previous ? ((latest.active_users - previous.active_users) / previous.active_users) * 100 : undefined,
          format: 'number'
        });
      }

      if (widget.config.query.metrics.includes('revenue')) {
        metrics.push({
          label: 'Revenue',
          value: latest.revenue || 0,
          change: previous ? ((latest.revenue - previous.revenue) / previous.revenue) * 100 : undefined,
          format: 'currency'
        });
      }

      if (widget.config.query.metrics.includes('conversionRate')) {
        metrics.push({
          label: 'Conversion Rate',
          value: (latest.conversion_rate || 0) * 100,
          change: previous ? (latest.conversion_rate - previous.conversion_rate) * 100 : undefined,
          format: 'percentage'
        });
      }

      if (widget.config.query.metrics.includes('newSignups')) {
        metrics.push({
          label: 'New Signups',
          value: latest.new_signups || 0,
          change: previous ? ((latest.new_signups - previous.new_signups) / previous.new_signups) * 100 : undefined,
          format: 'number'
        });
      }

      return metrics;
    }

    return [];
  };

  const formatValue = (value: number, format: string): string => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(value);
    }
  };

  const formatChange = (change: number): { text: string; color: string } => {
    const absChange = Math.abs(change);
    const sign = change >= 0 ? '+' : '-';
    const color = change >= 0 ? 'text-green-600' : 'text-red-600';
    
    return {
      text: `${sign}${absChange.toFixed(1)}%`,
      color
    };
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="text-red-600">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  if (metrics.length === 1) {
    const metric = metrics[0];
    const change = metric.change ? formatChange(metric.change) : null;

    return (
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">{widget.title}</h3>
          {isEditable && (
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="mt-2">
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">
              {formatValue(metric.value, metric.format)}
            </p>
            {change && (
              <p className={`ml-2 flex items-baseline text-sm font-medium ${change.color}`}>
                <svg
                  className={`self-center flex-shrink-0 h-4 w-4 ${
                    metric.change && metric.change >= 0 ? 'transform rotate-180' : ''
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="sr-only">
                  {metric.change && metric.change >= 0 ? 'Increased' : 'Decreased'} by
                </span>
                {change.text}
              </p>
            )}
          </div>
          <p className="text-sm text-gray-500">{metric.label}</p>
        </div>
      </div>
    );
  }

  // Multiple metrics in a grid
  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">{widget.title}</h3>
        {isEditable && (
          <button className="text-gray-400 hover:text-gray-600">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, index) => {
          const change = metric.change ? formatChange(metric.change) : null;
          
          return (
            <div key={index} className="text-center">
              <div className="flex items-baseline justify-center">
                <p className="text-lg font-semibold text-gray-900">
                  {formatValue(metric.value, metric.format)}
                </p>
                {change && (
                  <span className={`ml-1 text-xs ${change.color}`}>
                    {change.text}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{metric.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}