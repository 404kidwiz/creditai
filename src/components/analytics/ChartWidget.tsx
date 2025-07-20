'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardWidget, VisualizationType } from '@/types/analytics';
import { businessIntelligenceEngine } from '@/lib/analytics/businessIntelligence';

interface ChartWidgetProps {
  widget: DashboardWidget;
  isEditable?: boolean;
  onUpdate?: (widgetId: string, updates: Partial<DashboardWidget>) => void;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }[];
}

export function ChartWidget({ widget, isEditable, onUpdate }: ChartWidgetProps) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadChartData();
  }, [widget.config]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await businessIntelligenceEngine.getWidgetData(widget);
      const processedData = processChartData(data.data);
      setChartData(processedData);
    } catch (err) {
      setError('Failed to load chart data');
      console.error('Error loading chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (rawData: any[]): ChartData => {
    if (!rawData || rawData.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Sort data by date if available
    const sortedData = rawData.sort((a, b) => {
      if (a.date && b.date) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (a.timestamp && b.timestamp) {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      return 0;
    });

    const labels = sortedData.map((item, index) => {
      if (item.date) {
        return new Date(item.date).toLocaleDateString();
      }
      if (item.timestamp) {
        return new Date(item.timestamp).toLocaleDateString();
      }
      return `Point ${index + 1}`;
    });

    const datasets: ChartData['datasets'] = [];
    const colors = [
      '#3B82F6', // blue
      '#EF4444', // red
      '#10B981', // green
      '#F59E0B', // yellow
      '#8B5CF6', // purple
      '#06B6D4', // cyan
    ];

    // Process different data sources
    if (widget.config.dataSource === 'business_metrics') {
      const metrics = widget.config.query.metrics || [];
      
      if (metrics.includes('activeUsers')) {
        datasets.push({
          label: 'Active Users',
          data: sortedData.map(item => item.active_users || 0),
          borderColor: colors[0],
          backgroundColor: widget.config.visualization === 'area_chart' ? `${colors[0]}20` : colors[0],
          fill: widget.config.visualization === 'area_chart'
        });
      }

      if (metrics.includes('newSignups')) {
        datasets.push({
          label: 'New Signups',
          data: sortedData.map(item => item.new_signups || 0),
          borderColor: colors[1],
          backgroundColor: widget.config.visualization === 'area_chart' ? `${colors[1]}20` : colors[1],
          fill: widget.config.visualization === 'area_chart'
        });
      }

      if (metrics.includes('revenue')) {
        datasets.push({
          label: 'Revenue',
          data: sortedData.map(item => item.revenue || 0),
          borderColor: colors[2],
          backgroundColor: widget.config.visualization === 'area_chart' ? `${colors[2]}20` : colors[2],
          fill: widget.config.visualization === 'area_chart'
        });
      }

      if (metrics.includes('conversionRate')) {
        datasets.push({
          label: 'Conversion Rate (%)',
          data: sortedData.map(item => (item.conversion_rate || 0) * 100),
          borderColor: colors[3],
          backgroundColor: widget.config.visualization === 'area_chart' ? `${colors[3]}20` : colors[3],
          fill: widget.config.visualization === 'area_chart'
        });
      }
    }

    return { labels, datasets };
  };

  useEffect(() => {
    if (chartData && canvasRef.current) {
      drawChart();
    }
  }, [chartData, widget.config.visualization]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !chartData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;

    if (chartData.labels.length === 0 || chartData.datasets.length === 0) {
      // Draw "No data" message
      ctx.fillStyle = '#6B7280';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Find data ranges
    const allValues = chartData.datasets.flatMap(dataset => dataset.data);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue || 1;

    // Draw grid lines
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;

    // Vertical grid lines
    for (let i = 0; i <= chartData.labels.length; i++) {
      const x = padding + (i * chartWidth) / chartData.labels.length;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i * chartHeight) / 5;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();

    // Draw datasets
    chartData.datasets.forEach((dataset, datasetIndex) => {
      ctx.strokeStyle = dataset.borderColor || '#3B82F6';
      ctx.fillStyle = dataset.backgroundColor || dataset.borderColor || '#3B82F6';
      ctx.lineWidth = 2;

      if (widget.config.visualization === 'line_chart' || widget.config.visualization === 'area_chart') {
        // Draw line/area chart
        ctx.beginPath();
        
        dataset.data.forEach((value, pointIndex) => {
          const x = padding + ((pointIndex + 0.5) * chartWidth) / chartData.labels.length;
          const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
          
          if (pointIndex === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });

        if (widget.config.visualization === 'area_chart' && dataset.fill) {
          // Complete the area
          const lastX = padding + ((dataset.data.length - 0.5) * chartWidth) / chartData.labels.length;
          ctx.lineTo(lastX, padding + chartHeight);
          ctx.lineTo(padding + (0.5 * chartWidth) / chartData.labels.length, padding + chartHeight);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.stroke();
        }

        // Draw points
        ctx.fillStyle = dataset.borderColor || '#3B82F6';
        dataset.data.forEach((value, pointIndex) => {
          const x = padding + ((pointIndex + 0.5) * chartWidth) / chartData.labels.length;
          const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
          
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
        });

      } else if (widget.config.visualization === 'bar_chart') {
        // Draw bar chart
        const barWidth = chartWidth / (chartData.labels.length * chartData.datasets.length + 1);
        
        dataset.data.forEach((value, pointIndex) => {
          const x = padding + (pointIndex * chartWidth) / chartData.labels.length + (datasetIndex * barWidth);
          const barHeight = ((value - minValue) / valueRange) * chartHeight;
          const y = padding + chartHeight - barHeight;
          
          ctx.fillStyle = dataset.backgroundColor || dataset.borderColor || '#3B82F6';
          ctx.fillRect(x, y, barWidth * 0.8, barHeight);
        });
      }
    });

    // Draw labels
    ctx.fillStyle = '#374151';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    // X-axis labels
    chartData.labels.forEach((label, index) => {
      const x = padding + ((index + 0.5) * chartWidth) / chartData.labels.length;
      const y = padding + chartHeight + 20;
      ctx.fillText(label, x, y);
    });

    // Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = minValue + (i * valueRange) / 5;
      const y = padding + chartHeight - (i * chartHeight) / 5;
      ctx.fillText(value.toFixed(0), padding - 10, y + 4);
    }

    // Draw legend
    if (widget.config.options?.showLegend && chartData.datasets.length > 1) {
      const legendY = 10;
      let legendX = padding;

      chartData.datasets.forEach((dataset, index) => {
        // Legend color box
        ctx.fillStyle = dataset.borderColor || '#3B82F6';
        ctx.fillRect(legendX, legendY, 12, 12);

        // Legend text
        ctx.fillStyle = '#374151';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(dataset.label, legendX + 16, legendY + 9);

        legendX += ctx.measureText(dataset.label).width + 40;
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
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

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={300}
          className="w-full h-48 border rounded"
          style={{ maxHeight: '300px' }}
        />
      </div>
    </div>
  );
}