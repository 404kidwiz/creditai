'use client';

import React, { useState, useEffect } from 'react';
import { businessIntelligenceEngine } from '@/lib/analytics/businessIntelligence';
import { AnalyticsDashboard as DashboardType, DashboardWidget, BusinessMetrics } from '@/types/analytics';
import { ChartWidget } from './ChartWidget';
import { MetricCard } from './MetricCard';
import { TableWidget } from './TableWidget';

interface AnalyticsDashboardProps {
  dashboardId?: string;
  userId: string;
  isEditable?: boolean;
}

export function AnalyticsDashboard({ dashboardId, userId, isEditable = false }: AnalyticsDashboardProps) {
  const [dashboard, setDashboard] = useState<DashboardType | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [dashboardId, userId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      let dashboardData: DashboardType | null = null;

      if (dashboardId) {
        dashboardData = await businessIntelligenceEngine.getDashboard(dashboardId);
      } else {
        // Load default dashboard for user
        const userDashboards = await businessIntelligenceEngine.getUserDashboards(userId);
        dashboardData = userDashboards.find(d => d.isDefault) || userDashboards[0] || null;
        
        if (!dashboardData) {
          dashboardData = await createDefaultDashboard();
        }
      }

      if (dashboardData) {
        setDashboard(dashboardData);
        setWidgets(dashboardData.widgets);
      }
    } catch (err) {
      setError('Failed to load dashboard');
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultDashboard = async (): Promise<DashboardType | null> => {
    const defaultWidgets: DashboardWidget[] = [
      {
        id: 'metrics-overview',
        type: 'metric_card',
        title: 'Key Metrics',
        config: {
          dataSource: 'business_metrics',
          query: { metrics: ['activeUsers', 'revenue', 'conversionRate'] },
          visualization: 'metric_card',
          options: {}
        },
        position: { x: 0, y: 0 },
        size: { width: 12, height: 2 }
      },
      {
        id: 'user-growth-chart',
        type: 'chart',
        title: 'User Growth',
        config: {
          dataSource: 'business_metrics',
          query: { metrics: ['activeUsers', 'newSignups'], dimensions: ['date'] },
          visualization: 'line_chart',
          options: { showLegend: true, showGrid: true }
        },
        position: { x: 0, y: 2 },
        size: { width: 6, height: 4 }
      },
      {
        id: 'revenue-chart',
        type: 'chart',
        title: 'Revenue Trend',
        config: {
          dataSource: 'business_metrics',
          query: { metrics: ['revenue'], dimensions: ['date'] },
          visualization: 'area_chart',
          options: { showLegend: false, showGrid: true }
        },
        position: { x: 6, y: 2 },
        size: { width: 6, height: 4 }
      },
      {
        id: 'user-behavior-table',
        type: 'table',
        title: 'Recent User Activity',
        config: {
          dataSource: 'user_behavior_events',
          query: { 
            metrics: ['*'], 
            orderBy: [{ field: 'timestamp', direction: 'desc' }],
            limit: 10
          },
          visualization: 'table',
          options: { pagination: true }
        },
        position: { x: 0, y: 6 },
        size: { width: 12, height: 4 }
      }
    ];

    const dashboardId = await businessIntelligenceEngine.createDashboard({
      name: 'Default Dashboard',
      description: 'Overview of key business metrics and user activity',
      userId,
      isDefault: true,
      widgets: defaultWidgets,
      layout: {
        columns: 12,
        rows: 10,
        responsive: true
      },
      refreshInterval: 5
    });

    if (dashboardId) {
      return await businessIntelligenceEngine.getDashboard(dashboardId);
    }

    return null;
  };

  const refreshDashboard = async () => {
    setRefreshing(true);
    try {
      // Force refresh by clearing cache and reloading
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  };

  const renderWidget = (widget: DashboardWidget) => {
    const commonProps = {
      key: widget.id,
      widget,
      isEditable,
      onUpdate: isEditable ? updateWidget : undefined
    };

    switch (widget.type) {
      case 'metric_card':
        return <MetricCard {...commonProps} />;
      case 'chart':
        return <ChartWidget {...commonProps} />;
      case 'table':
        return <TableWidget {...commonProps} />;
      default:
        return (
          <div className="p-4 border rounded-lg bg-gray-50">
            <p>Unsupported widget type: {widget.type}</p>
          </div>
        );
    }
  };

  const updateWidget = async (widgetId: string, updates: Partial<DashboardWidget>) => {
    if (!dashboard) return;

    const updatedWidgets = widgets.map(w => 
      w.id === widgetId ? { ...w, ...updates } : w
    );

    setWidgets(updatedWidgets);

    // Update dashboard in database
    await businessIntelligenceEngine.updateDashboard(dashboard.id, {
      widgets: updatedWidgets
    });
  };

  const addWidget = () => {
    if (!isEditable) return;

    const newWidget: DashboardWidget = {
      id: crypto.randomUUID(),
      type: 'metric_card',
      title: 'New Widget',
      config: {
        dataSource: 'business_metrics',
        query: { metrics: ['activeUsers'] },
        visualization: 'metric_card',
        options: {}
      },
      position: { x: 0, y: 0 },
      size: { width: 3, height: 2 }
    };

    setWidgets([...widgets, newWidget]);
  };

  const removeWidget = (widgetId: string) => {
    if (!isEditable) return;
    
    const updatedWidgets = widgets.filter(w => w.id !== widgetId);
    setWidgets(updatedWidgets);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50 border-red-200">
        <h3 className="text-red-800 font-medium">Error</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={loadDashboard}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <p>No dashboard found.</p>
        <button 
          onClick={loadDashboard}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="text-gray-600">{dashboard.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshDashboard}
            disabled={refreshing}
            className="flex items-center px-3 py-2 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <svg 
              className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          
          {isEditable && (
            <button
              onClick={addWidget}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Widget
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {widgets.map(renderWidget)}
      </div>

      {/* Auto-refresh indicator */}
      {dashboard.refreshInterval && (
        <div className="text-xs text-gray-500 text-center">
          Auto-refreshes every {dashboard.refreshInterval} minutes
        </div>
      )}
    </div>
  );
}