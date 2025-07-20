import { supabase } from '@/lib/supabase/client';
import {
  CustomReport,
  ReportConfig,
  ReportSchedule,
  AnalyticsInsight,
  InsightType,
  DateRange,
  VisualizationType,
  AggregationType,
  AnalyticsQuery
} from '@/types/analytics';
import { businessIntelligenceEngine } from './businessIntelligence';

export class CustomReportingEngine {
  private static instance: CustomReportingEngine;
  private reports: Map<string, CustomReport> = new Map();
  private insightGenerators: Map<InsightType, (data: any[]) => AnalyticsInsight[]> = new Map();

  static getInstance(): CustomReportingEngine {
    if (!CustomReportingEngine.instance) {
      CustomReportingEngine.instance = new CustomReportingEngine();
    }
    return CustomReportingEngine.instance;
  }

  constructor() {
    this.initializeInsightGenerators();
  }

  private initializeInsightGenerators(): void {
    this.insightGenerators.set(InsightType.ANOMALY, this.generateAnomalyInsights.bind(this));
    this.insightGenerators.set(InsightType.TREND, this.generateTrendInsights.bind(this));
    this.insightGenerators.set(InsightType.CORRELATION, this.generateCorrelationInsights.bind(this));
    this.insightGenerators.set(InsightType.PREDICTION, this.generatePredictionInsights.bind(this));
    this.insightGenerators.set(InsightType.SEGMENT, this.generateSegmentInsights.bind(this));
    this.insightGenerators.set(InsightType.PERFORMANCE, this.generatePerformanceInsights.bind(this));
  }

  async createReport(report: Omit<CustomReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    try {
      const reportId = crypto.randomUUID();
      const now = new Date();

      const newReport: CustomReport = {
        id: reportId,
        ...report,
        createdAt: now,
        updatedAt: now
      };

      const { error } = await supabase
        .from('custom_reports')
        .insert({
          id: reportId,
          name: report.name,
          description: report.description,
          user_id: report.userId,
          is_public: report.isPublic,
          config: report.config,
          schedule: report.schedule || {}
        });

      if (error) throw error;

      this.reports.set(reportId, newReport);

      // Schedule report if needed
      if (report.schedule) {
        await this.scheduleReport(reportId, report.schedule);
      }

      return reportId;
    } catch (error) {
      console.error('Error creating report:', error);
      return null;
    }
  }

  async generateReport(reportId: string): Promise<{
    data: any[];
    insights: AnalyticsInsight[];
    metadata: any;
  } | null> {
    try {
      const report = await this.getReport(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      const startTime = Date.now();

      // Execute report query
      const query = this.buildAnalyticsQuery(report.config);
      const response = await businessIntelligenceEngine.executeQuery(query);

      // Process and aggregate data
      const processedData = this.processReportData(response.data, report.config);

      // Generate automated insights
      const insights = await this.generateAutomatedInsights(processedData, report.config);

      const executionTime = Date.now() - startTime;

      // Save execution record
      await this.saveReportExecution(reportId, {
        execution_time: executionTime,
        status: 'completed',
        result_data: {
          data: processedData,
          insights: insights,
          recordCount: processedData.length
        }
      });

      // Update last generated timestamp
      await this.updateReport(reportId, { lastGenerated: new Date() });

      return {
        data: processedData,
        insights,
        metadata: {
          executionTime,
          recordCount: processedData.length,
          generatedAt: new Date(),
          reportConfig: report.config
        }
      };
    } catch (error) {
      console.error('Error generating report:', error);
      
      // Save error execution record
      await this.saveReportExecution(reportId, {
        execution_time: Date.now(),
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });

      return null;
    }
  }

  private buildAnalyticsQuery(config: ReportConfig): AnalyticsQuery {
    return {
      metrics: config.metrics,
      dimensions: config.dimensions,
      filters: config.filters?.map(filter => ({
        field: filter.field,
        operator: filter.operator,
        value: filter.value
      })),
      dateRange: config.dateRange,
      orderBy: [{
        field: config.dimensions?.[0] || config.metrics[0],
        direction: 'desc'
      }]
    };
  }

  private processReportData(rawData: any[], config: ReportConfig): any[] {
    if (!rawData || rawData.length === 0) {
      return [];
    }

    // Group by dimensions if specified
    if (config.dimensions && config.dimensions.length > 0) {
      return this.groupAndAggregateData(rawData, config);
    }

    // Apply aggregation to metrics
    if (config.aggregation !== AggregationType.COUNT) {
      return this.aggregateMetrics(rawData, config);
    }

    return rawData;
  }

  private groupAndAggregateData(data: any[], config: ReportConfig): any[] {
    const groups = new Map<string, any[]>();

    // Group data by dimensions
    data.forEach(item => {
      const groupKey = config.dimensions!.map(dim => item[dim] || 'unknown').join('|');
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    });

    // Aggregate each group
    const result: any[] = [];
    groups.forEach((groupData, groupKey) => {
      const dimensionValues = groupKey.split('|');
      const aggregated: any = {};

      // Set dimension values
      config.dimensions!.forEach((dim, index) => {
        aggregated[dim] = dimensionValues[index];
      });

      // Aggregate metrics
      config.metrics.forEach(metric => {
        const values = groupData.map(item => Number(item[metric]) || 0);
        aggregated[metric] = this.applyAggregation(values, config.aggregation);
      });

      result.push(aggregated);
    });

    return result;
  }

  private aggregateMetrics(data: any[], config: ReportConfig): any[] {
    const result: any = {};

    config.metrics.forEach(metric => {
      const values = data.map(item => Number(item[metric]) || 0);
      result[metric] = this.applyAggregation(values, config.aggregation);
    });

    return [result];
  }

  private applyAggregation(values: number[], aggregation: AggregationType): number {
    switch (aggregation) {
      case AggregationType.SUM:
        return values.reduce((sum, val) => sum + val, 0);
      case AggregationType.AVERAGE:
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      case AggregationType.COUNT:
        return values.length;
      case AggregationType.MIN:
        return values.length > 0 ? Math.min(...values) : 0;
      case AggregationType.MAX:
        return values.length > 0 ? Math.max(...values) : 0;
      case AggregationType.MEDIAN:
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      default:
        return values.reduce((sum, val) => sum + val, 0);
    }
  }

  private async generateAutomatedInsights(data: any[], config: ReportConfig): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];

    // Generate insights for each type
    for (const [type, generator] of this.insightGenerators) {
      try {
        const typeInsights = generator(data);
        insights.push(...typeInsights);
      } catch (error) {
        console.error(`Error generating ${type} insights:`, error);
      }
    }

    // Sort by confidence and return top insights
    return insights
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10); // Limit to top 10 insights
  }

  private generateAnomalyInsights(data: any[]): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    if (data.length < 5) return insights;

    // Find anomalies in numeric fields
    const numericFields = this.getNumericFields(data);
    
    numericFields.forEach(field => {
      const values = data.map(item => Number(item[field]) || 0);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
      );

      // Find outliers (values more than 2 standard deviations from mean)
      const outliers = data.filter((item, index) => {
        const value = Number(item[field]) || 0;
        return Math.abs(value - mean) > 2 * stdDev;
      });

      if (outliers.length > 0) {
        insights.push({
          id: crypto.randomUUID(),
          type: InsightType.ANOMALY,
          title: `Anomalies Detected in ${field}`,
          description: `Found ${outliers.length} outlier(s) in ${field} that deviate significantly from the mean`,
          severity: outliers.length > data.length * 0.1 ? 'high' : 'medium',
          confidence: Math.min(0.9, outliers.length / data.length * 5),
          data: { field, outliers, mean, stdDev },
          recommendations: [
            `Investigate the ${outliers.length} anomalous values in ${field}`,
            'Check for data quality issues or external factors',
            'Consider excluding outliers from trend analysis'
          ],
          createdAt: new Date()
        });
      }
    });

    return insights;
  }

  private generateTrendInsights(data: any[]): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    if (data.length < 7) return insights;

    const numericFields = this.getNumericFields(data);
    const timeField = this.getTimeField(data);

    if (!timeField) return insights;

    // Sort data by time
    const sortedData = [...data].sort((a, b) => 
      new Date(a[timeField]).getTime() - new Date(b[timeField]).getTime()
    );

    numericFields.forEach(field => {
      const values = sortedData.map(item => Number(item[field]) || 0);
      const trend = this.calculateTrend(values);

      if (Math.abs(trend) > 0.1) { // Significant trend (>10% change)
        const direction = trend > 0 ? 'increasing' : 'decreasing';
        const magnitude = Math.abs(trend * 100);

        insights.push({
          id: crypto.randomUUID(),
          type: InsightType.TREND,
          title: `${field} is ${direction}`,
          description: `${field} has ${direction} by ${magnitude.toFixed(1)}% over the period`,
          severity: magnitude > 20 ? 'high' : magnitude > 10 ? 'medium' : 'low',
          confidence: Math.min(0.95, Math.abs(trend) * 2),
          data: { field, trend, direction, magnitude },
          recommendations: [
            trend > 0 
              ? `Monitor and capitalize on the positive trend in ${field}`
              : `Investigate the declining trend in ${field} and implement corrective measures`,
            'Analyze contributing factors to this trend',
            'Forecast future values based on current trend'
          ],
          createdAt: new Date()
        });
      }
    });

    return insights;
  }

  private generateCorrelationInsights(data: any[]): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    if (data.length < 10) return insights;

    const numericFields = this.getNumericFields(data);
    
    // Calculate correlations between all numeric field pairs
    for (let i = 0; i < numericFields.length; i++) {
      for (let j = i + 1; j < numericFields.length; j++) {
        const field1 = numericFields[i];
        const field2 = numericFields[j];
        
        const values1 = data.map(item => Number(item[field1]) || 0);
        const values2 = data.map(item => Number(item[field2]) || 0);
        
        const correlation = this.calculateCorrelation(values1, values2);
        
        if (Math.abs(correlation) > 0.7) { // Strong correlation
          const direction = correlation > 0 ? 'positive' : 'negative';
          const strength = Math.abs(correlation) > 0.9 ? 'very strong' : 'strong';

          insights.push({
            id: crypto.randomUUID(),
            type: InsightType.CORRELATION,
            title: `${strength} ${direction} correlation between ${field1} and ${field2}`,
            description: `${field1} and ${field2} show a ${strength} ${direction} correlation (r=${correlation.toFixed(3)})`,
            severity: 'medium',
            confidence: Math.abs(correlation),
            data: { field1, field2, correlation, direction, strength },
            recommendations: [
              correlation > 0 
                ? `Improving ${field1} may also improve ${field2}`
                : `Monitor both ${field1} and ${field2} as they move in opposite directions`,
              'Use this relationship for predictive modeling',
              'Investigate the causal relationship between these variables'
            ],
            createdAt: new Date()
          });
        }
      }
    }

    return insights;
  }

  private generatePredictionInsights(data: any[]): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    if (data.length < 14) return insights;

    const numericFields = this.getNumericFields(data);
    const timeField = this.getTimeField(data);

    if (!timeField) return insights;

    // Sort data by time
    const sortedData = [...data].sort((a, b) => 
      new Date(a[timeField]).getTime() - new Date(b[timeField]).getTime()
    );

    numericFields.forEach(field => {
      const values = sortedData.map(item => Number(item[field]) || 0);
      const recentValues = values.slice(-7); // Last 7 data points
      const trend = this.calculateTrend(recentValues);
      
      if (Math.abs(trend) > 0.05) {
        const currentValue = values[values.length - 1];
        const predictedValue = currentValue * (1 + trend);
        const changePercent = Math.abs(trend * 100);

        insights.push({
          id: crypto.randomUUID(),
          type: InsightType.PREDICTION,
          title: `${field} forecast`,
          description: `Based on recent trends, ${field} is predicted to ${trend > 0 ? 'increase' : 'decrease'} by ${changePercent.toFixed(1)}%`,
          severity: changePercent > 15 ? 'high' : 'medium',
          confidence: Math.min(0.8, Math.abs(trend) * 3),
          data: { field, currentValue, predictedValue, trend, changePercent },
          recommendations: [
            trend > 0 
              ? `Prepare for continued growth in ${field}`
              : `Plan mitigation strategies for declining ${field}`,
            'Monitor actual vs predicted values',
            'Adjust business strategies based on forecast'
          ],
          createdAt: new Date()
        });
      }
    });

    return insights;
  }

  private generateSegmentInsights(data: any[]): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    if (data.length < 20) return insights;

    const categoricalFields = this.getCategoricalFields(data);
    const numericFields = this.getNumericFields(data);

    categoricalFields.forEach(catField => {
      numericFields.forEach(numField => {
        const segments = this.groupBy(data, catField);
        const segmentStats = new Map<string, { mean: number; count: number }>();

        segments.forEach((items, category) => {
          const values = items.map(item => Number(item[numField]) || 0);
          const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
          segmentStats.set(category, { mean, count: values.length });
        });

        // Find segments with significant differences
        const stats = Array.from(segmentStats.entries());
        const overallMean = data.reduce((sum, item) => sum + (Number(item[numField]) || 0), 0) / data.length;
        
        const significantSegments = stats.filter(([_, stat]) => 
          Math.abs(stat.mean - overallMean) > overallMean * 0.2 // 20% difference
        );

        if (significantSegments.length > 0) {
          const bestSegment = significantSegments.reduce((best, current) => 
            current[1].mean > best[1].mean ? current : best
          );

          insights.push({
            id: crypto.randomUUID(),
            type: InsightType.SEGMENT,
            title: `${bestSegment[0]} segment outperforms in ${numField}`,
            description: `The ${bestSegment[0]} segment has ${((bestSegment[1].mean / overallMean - 1) * 100).toFixed(1)}% higher ${numField} than average`,
            severity: 'medium',
            confidence: 0.7,
            data: { catField, numField, segments: Object.fromEntries(segmentStats), bestSegment: bestSegment[0] },
            recommendations: [
              `Focus marketing efforts on the ${bestSegment[0]} segment`,
              `Analyze what makes the ${bestSegment[0]} segment perform better`,
              'Consider tailoring products/services for high-performing segments'
            ],
            createdAt: new Date()
          });
        }
      });
    });

    return insights;
  }

  private generatePerformanceInsights(data: any[]): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    if (data.length === 0) return insights;

    const numericFields = this.getNumericFields(data);
    
    numericFields.forEach(field => {
      const values = data.map(item => Number(item[field]) || 0);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      // Check for performance issues (high variance or low values)
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 0;

      if (coefficientOfVariation > 0.5) { // High variability
        insights.push({
          id: crypto.randomUUID(),
          type: InsightType.PERFORMANCE,
          title: `High variability in ${field}`,
          description: `${field} shows high variability (CV=${(coefficientOfVariation * 100).toFixed(1)}%), indicating inconsistent performance`,
          severity: coefficientOfVariation > 1 ? 'high' : 'medium',
          confidence: 0.8,
          data: { field, mean, variance, coefficientOfVariation, min, max },
          recommendations: [
            `Investigate causes of variability in ${field}`,
            'Implement quality control measures to reduce variance',
            'Monitor performance more closely to identify patterns'
          ],
          createdAt: new Date()
        });
      }
    });

    return insights;
  }

  // Helper methods
  private getNumericFields(data: any[]): string[] {
    if (data.length === 0) return [];
    
    const sample = data[0];
    return Object.keys(sample).filter(key => 
      typeof sample[key] === 'number' || 
      (!isNaN(Number(sample[key])) && sample[key] !== '')
    );
  }

  private getCategoricalFields(data: any[]): string[] {
    if (data.length === 0) return [];
    
    const sample = data[0];
    return Object.keys(sample).filter(key => 
      typeof sample[key] === 'string' && 
      isNaN(Number(sample[key]))
    );
  }

  private getTimeField(data: any[]): string | null {
    if (data.length === 0) return null;
    
    const sample = data[0];
    const timeFields = Object.keys(sample).filter(key => 
      key.toLowerCase().includes('time') || 
      key.toLowerCase().includes('date') ||
      key === 'timestamp' ||
      key === 'created_at'
    );
    
    return timeFields[0] || null;
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
    
    return avgY > 0 ? slope / avgY : 0;
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

  private groupBy(data: any[], field: string): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    data.forEach(item => {
      const key = String(item[field] || 'unknown');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });
    
    return groups;
  }

  async getReport(reportId: string): Promise<CustomReport | null> {
    try {
      const cached = this.reports.get(reportId);
      if (cached) return cached;

      const { data, error } = await supabase
        .from('custom_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) throw error;

      const report: CustomReport = {
        id: data.id,
        name: data.name,
        description: data.description,
        userId: data.user_id,
        isPublic: data.is_public,
        config: data.config,
        schedule: data.schedule,
        lastGenerated: data.last_generated ? new Date(data.last_generated) : undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      this.reports.set(reportId, report);
      return report;
    } catch (error) {
      console.error('Error getting report:', error);
      return null;
    }
  }

  async updateReport(reportId: string, updates: Partial<CustomReport>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('custom_reports')
        .update({
          name: updates.name,
          description: updates.description,
          config: updates.config,
          schedule: updates.schedule,
          last_generated: updates.lastGenerated?.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      // Update cache
      const existing = this.reports.get(reportId);
      if (existing) {
        this.reports.set(reportId, { ...existing, ...updates, updatedAt: new Date() });
      }

      return true;
    } catch (error) {
      console.error('Error updating report:', error);
      return false;
    }
  }

  async getUserReports(userId: string): Promise<CustomReport[]> {
    try {
      const { data, error } = await supabase
        .from('custom_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        userId: item.user_id,
        isPublic: item.is_public,
        config: item.config,
        schedule: item.schedule,
        lastGenerated: item.last_generated ? new Date(item.last_generated) : undefined,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      })) || [];
    } catch (error) {
      console.error('Error getting user reports:', error);
      return [];
    }
  }

  private async saveReportExecution(reportId: string, execution: any): Promise<void> {
    try {
      await supabase
        .from('report_executions')
        .insert({
          report_id: reportId,
          execution_time: execution.execution_time,
          status: execution.status,
          result_data: execution.result_data || {},
          error_message: execution.error_message
        });
    } catch (error) {
      console.error('Error saving report execution:', error);
    }
  }

  private async scheduleReport(reportId: string, schedule: ReportSchedule): Promise<void> {
    // In a real implementation, this would integrate with a job scheduler
    // For now, we'll just log the scheduling
    console.log(`Report ${reportId} scheduled with frequency ${schedule.frequency}`);
  }

  async exportReport(reportId: string, format: 'csv' | 'json' | 'pdf'): Promise<string | null> {
    try {
      const result = await this.generateReport(reportId);
      if (!result) return null;

      switch (format) {
        case 'json':
          return JSON.stringify(result, null, 2);
        case 'csv':
          return this.convertToCSV(result.data);
        case 'pdf':
          // In a real implementation, you'd use a PDF library
          return `PDF export not implemented yet. Data: ${JSON.stringify(result)}`;
        default:
          return null;
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      return null;
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = [headers.join(',')];

    data.forEach(item => {
      const values = headers.map(header => {
        const value = item[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      rows.push(values.join(','));
    });

    return rows.join('\n');
  }
}

export const customReportingEngine = CustomReportingEngine.getInstance();