import { supabase } from '@/lib/supabase/client';
import {
  BusinessMetrics,
  AnalyticsDashboard,
  DashboardWidget,
  WidgetType,
  VisualizationType,
  AnalyticsQuery,
  AnalyticsResponse,
  DateRange,
  AnalyticsInsight,
  InsightType
} from '@/types/analytics';

export class BusinessIntelligenceEngine {
  private static instance: BusinessIntelligenceEngine;
  private dashboards: Map<string, AnalyticsDashboard> = new Map();
  private metricsCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): BusinessIntelligenceEngine {
    if (!BusinessIntelligenceEngine.instance) {
      BusinessIntelligenceEngine.instance = new BusinessIntelligenceEngine();
    }
    return BusinessIntelligenceEngine.instance;
  }

  async getBusinessMetrics(dateRange: DateRange): Promise<BusinessMetrics[]> {
    const cacheKey = `metrics_${dateRange.start.toISOString()}_${dateRange.end.toISOString()}`;
    const cached = this.metricsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase
        .from('business_metrics')
        .select('*')
        .gte('date', dateRange.start.toISOString().split('T')[0])
        .lte('date', dateRange.end.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      const metrics = data?.map(item => ({
        date: new Date(item.date),
        activeUsers: item.active_users,
        newSignups: item.new_signups,
        revenue: item.revenue,
        conversionRate: item.conversion_rate,
        churnRate: item.churn_rate,
        averageSessionDuration: item.average_session_duration,
        pageViews: item.page_views,
        uploadCount: item.upload_count,
        analysisCount: item.analysis_count
      })) || [];

      this.metricsCache.set(cacheKey, { data: metrics, timestamp: Date.now() });
      return metrics;
    } catch (error) {
      console.error('Error fetching business metrics:', error);
      return [];
    }
  }

  async calculateKPIs(dateRange: DateRange): Promise<Record<string, any>> {
    const metrics = await this.getBusinessMetrics(dateRange);
    
    if (metrics.length === 0) {
      return {};
    }

    const totalUsers = metrics.reduce((sum, m) => sum + m.activeUsers, 0);
    const totalSignups = metrics.reduce((sum, m) => sum + m.newSignups, 0);
    const totalRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0);
    const totalUploads = metrics.reduce((sum, m) => sum + m.uploadCount, 0);
    const totalAnalyses = metrics.reduce((sum, m) => sum + m.analysisCount, 0);

    const avgConversionRate = metrics.reduce((sum, m) => sum + m.conversionRate, 0) / metrics.length;
    const avgChurnRate = metrics.reduce((sum, m) => sum + m.churnRate, 0) / metrics.length;
    const avgSessionDuration = metrics.reduce((sum, m) => sum + m.averageSessionDuration, 0) / metrics.length;

    // Calculate growth rates
    const firstMetric = metrics[0];
    const lastMetric = metrics[metrics.length - 1];
    
    const userGrowthRate = firstMetric.activeUsers > 0 
      ? ((lastMetric.activeUsers - firstMetric.activeUsers) / firstMetric.activeUsers) * 100 
      : 0;

    const revenueGrowthRate = firstMetric.revenue > 0 
      ? ((lastMetric.revenue - firstMetric.revenue) / firstMetric.revenue) * 100 
      : 0;

    return {
      totalUsers,
      totalSignups,
      totalRevenue,
      totalUploads,
      totalAnalyses,
      avgConversionRate,
      avgChurnRate,
      avgSessionDuration,
      userGrowthRate,
      revenueGrowthRate,
      dailyActiveUsers: totalUsers / metrics.length,
      uploadsPerUser: totalUsers > 0 ? totalUploads / totalUsers : 0,
      analysesPerUser: totalUsers > 0 ? totalAnalyses / totalUsers : 0,
      revenuePerUser: totalUsers > 0 ? totalRevenue / totalUsers : 0
    };
  }

  async createDashboard(dashboard: Omit<AnalyticsDashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    try {
      const dashboardId = crypto.randomUUID();
      const now = new Date();

      const newDashboard: AnalyticsDashboard = {
        id: dashboardId,
        ...dashboard,
        createdAt: now,
        updatedAt: now
      };

      const { error } = await supabase
        .from('analytics_dashboards')
        .insert({
          id: dashboardId,
          name: dashboard.name,
          description: dashboard.description,
          user_id: dashboard.userId,
          is_default: dashboard.isDefault,
          widgets: dashboard.widgets,
          layout: dashboard.layout,
          refresh_interval: dashboard.refreshInterval
        });

      if (error) throw error;

      this.dashboards.set(dashboardId, newDashboard);
      return dashboardId;
    } catch (error) {
      console.error('Error creating dashboard:', error);
      return null;
    }
  }

  async getDashboard(dashboardId: string): Promise<AnalyticsDashboard | null> {
    try {
      const cached = this.dashboards.get(dashboardId);
      if (cached) return cached;

      const { data, error } = await supabase
        .from('analytics_dashboards')
        .select('*')
        .eq('id', dashboardId)
        .single();

      if (error) throw error;

      const dashboard: AnalyticsDashboard = {
        id: data.id,
        name: data.name,
        description: data.description,
        userId: data.user_id,
        isDefault: data.is_default,
        widgets: data.widgets,
        layout: data.layout,
        refreshInterval: data.refresh_interval,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      this.dashboards.set(dashboardId, dashboard);
      return dashboard;
    } catch (error) {
      console.error('Error getting dashboard:', error);
      return null;
    }
  }

  async getUserDashboards(userId: string): Promise<AnalyticsDashboard[]> {
    try {
      const { data, error } = await supabase
        .from('analytics_dashboards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        userId: item.user_id,
        isDefault: item.is_default,
        widgets: item.widgets,
        layout: item.layout,
        refreshInterval: item.refresh_interval,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      })) || [];
    } catch (error) {
      console.error('Error getting user dashboards:', error);
      return [];
    }
  }

  async updateDashboard(dashboardId: string, updates: Partial<AnalyticsDashboard>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('analytics_dashboards')
        .update({
          name: updates.name,
          description: updates.description,
          widgets: updates.widgets,
          layout: updates.layout,
          refresh_interval: updates.refreshInterval,
          updated_at: new Date().toISOString()
        })
        .eq('id', dashboardId);

      if (error) throw error;

      // Update cache
      const existing = this.dashboards.get(dashboardId);
      if (existing) {
        this.dashboards.set(dashboardId, { ...existing, ...updates, updatedAt: new Date() });
      }

      return true;
    } catch (error) {
      console.error('Error updating dashboard:', error);
      return false;
    }
  }

  async executeQuery(query: AnalyticsQuery): Promise<AnalyticsResponse> {
    const startTime = Date.now();
    
    try {
      let supabaseQuery = supabase.from('user_behavior_events').select('*');

      // Apply filters
      if (query.filters) {
        query.filters.forEach(filter => {
          switch (filter.operator) {
            case 'equals':
              supabaseQuery = supabaseQuery.eq(filter.field, filter.value);
              break;
            case 'not_equals':
              supabaseQuery = supabaseQuery.neq(filter.field, filter.value);
              break;
            case 'greater_than':
              supabaseQuery = supabaseQuery.gt(filter.field, filter.value);
              break;
            case 'less_than':
              supabaseQuery = supabaseQuery.lt(filter.field, filter.value);
              break;
            case 'in':
              supabaseQuery = supabaseQuery.in(filter.field, filter.value);
              break;
          }
        });
      }

      // Apply date range
      supabaseQuery = supabaseQuery
        .gte('timestamp', query.dateRange.start.toISOString())
        .lte('timestamp', query.dateRange.end.toISOString());

      // Apply ordering
      if (query.orderBy) {
        query.orderBy.forEach(order => {
          supabaseQuery = supabaseQuery.order(order.field, { ascending: order.direction === 'asc' });
        });
      }

      // Apply limit and offset
      if (query.limit) {
        supabaseQuery = supabaseQuery.limit(query.limit);
      }
      if (query.offset) {
        supabaseQuery = supabaseQuery.range(query.offset, (query.offset + (query.limit || 100)) - 1);
      }

      const { data, error, count } = await supabaseQuery;

      if (error) throw error;

      const executionTime = Date.now() - startTime;

      return {
        data: data || [],
        total: count || data?.length || 0,
        metadata: {
          executionTime,
          cacheHit: false,
          generatedAt: new Date(),
          query
        }
      };
    } catch (error) {
      console.error('Error executing query:', error);
      return {
        data: [],
        total: 0,
        metadata: {
          executionTime: Date.now() - startTime,
          cacheHit: false,
          generatedAt: new Date(),
          query
        }
      };
    }
  }

  async generateInsights(dateRange: DateRange): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];
    
    try {
      const metrics = await this.getBusinessMetrics(dateRange);
      const kpis = await this.calculateKPIs(dateRange);

      // Trend analysis
      if (metrics.length >= 7) {
        const recentTrend = this.calculateTrend(metrics.slice(-7).map(m => m.activeUsers));
        if (Math.abs(recentTrend) > 0.1) {
          insights.push({
            id: crypto.randomUUID(),
            type: InsightType.TREND,
            title: `User Activity ${recentTrend > 0 ? 'Increasing' : 'Decreasing'}`,
            description: `Active users have ${recentTrend > 0 ? 'increased' : 'decreased'} by ${Math.abs(recentTrend * 100).toFixed(1)}% over the last week`,
            severity: Math.abs(recentTrend) > 0.2 ? 'high' : 'medium',
            confidence: 0.85,
            data: { trend: recentTrend, metrics: metrics.slice(-7) },
            recommendations: [
              recentTrend > 0 
                ? 'Capitalize on this growth by expanding marketing efforts'
                : 'Investigate causes of decline and implement retention strategies'
            ],
            createdAt: new Date()
          });
        }
      }

      // Anomaly detection
      const avgRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0) / metrics.length;
      const revenueStdDev = Math.sqrt(
        metrics.reduce((sum, m) => sum + Math.pow(m.revenue - avgRevenue, 2), 0) / metrics.length
      );

      const recentRevenue = metrics.slice(-3);
      recentRevenue.forEach(metric => {
        const zScore = Math.abs(metric.revenue - avgRevenue) / revenueStdDev;
        if (zScore > 2) {
          insights.push({
            id: crypto.randomUUID(),
            type: InsightType.ANOMALY,
            title: 'Revenue Anomaly Detected',
            description: `Revenue on ${metric.date.toDateString()} (${metric.revenue.toFixed(2)}) is significantly different from the average`,
            severity: zScore > 3 ? 'critical' : 'high',
            confidence: Math.min(0.95, zScore / 3),
            data: { date: metric.date, revenue: metric.revenue, zScore },
            recommendations: [
              'Investigate the cause of this revenue anomaly',
              'Check for data quality issues or external factors'
            ],
            createdAt: new Date()
          });
        }
      });

      // Performance insights
      if (kpis.avgConversionRate < 0.02) {
        insights.push({
          id: crypto.randomUUID(),
          type: InsightType.PERFORMANCE,
          title: 'Low Conversion Rate',
          description: `Current conversion rate (${(kpis.avgConversionRate * 100).toFixed(2)}%) is below industry standards`,
          severity: 'high',
          confidence: 0.9,
          data: { conversionRate: kpis.avgConversionRate },
          recommendations: [
            'Optimize signup flow to reduce friction',
            'Implement A/B tests for key conversion points',
            'Review pricing strategy and value proposition'
          ],
          createdAt: new Date()
        });
      }

      // Correlation insights
      const userRevenueCorrelation = this.calculateCorrelation(
        metrics.map(m => m.activeUsers),
        metrics.map(m => m.revenue)
      );

      if (Math.abs(userRevenueCorrelation) > 0.7) {
        insights.push({
          id: crypto.randomUUID(),
          type: InsightType.CORRELATION,
          title: 'Strong User-Revenue Correlation',
          description: `There's a ${userRevenueCorrelation > 0 ? 'positive' : 'negative'} correlation (${userRevenueCorrelation.toFixed(2)}) between active users and revenue`,
          severity: 'medium',
          confidence: Math.abs(userRevenueCorrelation),
          data: { correlation: userRevenueCorrelation },
          recommendations: [
            userRevenueCorrelation > 0 
              ? 'Focus on user acquisition to drive revenue growth'
              : 'Investigate why user growth isn\'t translating to revenue'
          ],
          createdAt: new Date()
        });
      }

      return insights;
    } catch (error) {
      console.error('Error generating insights:', error);
      return [];
    }
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, i) => sum + (i + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;
    
    return slope / avgY; // Normalize by average to get percentage change
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  async getWidgetData(widget: DashboardWidget): Promise<any> {
    try {
      const query: AnalyticsQuery = {
        metrics: ['*'],
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: new Date()
        },
        ...widget.config.query
      };

      return await this.executeQuery(query);
    } catch (error) {
      console.error('Error getting widget data:', error);
      return { data: [], total: 0 };
    }
  }

  async exportDashboardData(dashboardId: string, format: 'csv' | 'json' | 'pdf'): Promise<string | null> {
    try {
      const dashboard = await this.getDashboard(dashboardId);
      if (!dashboard) return null;

      const dashboardData: any = {
        dashboard: {
          id: dashboard.id,
          name: dashboard.name,
          description: dashboard.description,
          generatedAt: new Date().toISOString()
        },
        widgets: []
      };

      // Collect data for all widgets
      for (const widget of dashboard.widgets) {
        const widgetData = await this.getWidgetData(widget);
        dashboardData.widgets.push({
          id: widget.id,
          title: widget.title,
          type: widget.type,
          data: widgetData
        });
      }

      switch (format) {
        case 'json':
          return JSON.stringify(dashboardData, null, 2);
        case 'csv':
          return this.convertToCSV(dashboardData);
        case 'pdf':
          // In a real implementation, you'd use a PDF library
          return `PDF export not implemented yet. Data: ${JSON.stringify(dashboardData)}`;
        default:
          return null;
      }
    } catch (error) {
      console.error('Error exporting dashboard data:', error);
      return null;
    }
  }

  private convertToCSV(data: any): string {
    const rows: string[] = [];
    rows.push('Widget,Title,Type,Data');
    
    data.widgets.forEach((widget: any) => {
      const csvData = Array.isArray(widget.data.data) 
        ? JSON.stringify(widget.data.data).replace(/"/g, '""')
        : '[]';
      
      rows.push(`"${widget.id}","${widget.title}","${widget.type}","${csvData}"`);
    });
    
    return rows.join('\n');
  }

  // Real-time data streaming (placeholder for WebSocket implementation)
  async subscribeToRealtimeData(callback: (data: any) => void): Promise<() => void> {
    // In a real implementation, this would set up WebSocket connections
    const interval = setInterval(async () => {
      const realtimeData = await this.getBusinessMetrics({
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      });
      callback(realtimeData);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }
}

export const businessIntelligenceEngine = BusinessIntelligenceEngine.getInstance();