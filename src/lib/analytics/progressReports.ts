/**
 * Progress Reports Generator
 * 
 * This module generates comprehensive progress reports with key metrics,
 * visualizations, and actionable insights for dispute tracking.
 */

import { 
  EnhancedDisputeRecord,
  DisputeAnalytics,
  SuccessRateMetrics,
  TimelineMetrics,
  BureauPerformanceMetrics,
  ImpactMetrics,
  TrendMetrics,
  DisputeStatus
} from '@/types/enhanced-credit'
import { ProgressTracker, ProgressReport, ProgressMetrics } from './progressTracker'

export interface ComprehensiveProgressReport {
  reportId: string
  userId: string
  generatedAt: Date
  reportPeriod: {
    startDate: Date
    endDate: Date
  }
  
  // Summary metrics
  summary: ProgressSummary
  
  // Individual dispute reports
  disputeReports: ProgressReport[]
  
  // Aggregate analytics
  analytics: DisputeAnalytics
  
  // Performance insights
  insights: PerformanceInsights
  
  // Recommendations
  recommendations: RecommendationSet
  
  // Visualizations
  visualizations: VisualizationData
}

export interface ProgressSummary {
  totalDisputes: number
  activeDisputes: number
  completedDisputes: number
  averageProgress: number
  totalDaysActive: number
  estimatedCompletionDate: Date
  overallSuccessRate: number
  totalScoreImpact: number
}

export interface PerformanceInsights {
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  threats: string[]
  keyPerformanceIndicators: KPI[]
  benchmarkComparisons: BenchmarkComparison[]
}

export interface KPI {
  name: string
  value: number
  target: number
  trend: 'up' | 'down' | 'stable'
  status: 'excellent' | 'good' | 'needs_improvement' | 'critical'
  description: string
}

export interface BenchmarkComparison {
  metric: string
  userValue: number
  industryAverage: number
  percentile: number
  interpretation: string
}

export interface RecommendationSet {
  immediate: Recommendation[]
  shortTerm: Recommendation[]
  longTerm: Recommendation[]
  strategic: Recommendation[]
}

export interface Recommendation {
  id: string
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'strategy' | 'timing' | 'documentation' | 'escalation' | 'legal'
  estimatedImpact: number
  effortRequired: 'low' | 'medium' | 'high'
  timeline: string
  actionSteps: string[]
}

export interface VisualizationData {
  progressCharts: ProgressChart[]
  timelineData: TimelineVisualizationData
  performanceMetrics: MetricVisualization[]
  trendAnalysis: TrendVisualization[]
}

export interface ProgressChart {
  type: 'line' | 'bar' | 'pie' | 'gauge' | 'timeline'
  title: string
  description: string
  data: ChartDataPoint[]
  config: ChartConfiguration
}

export interface ChartDataPoint {
  label: string
  value: number
  category?: string
  timestamp?: Date
  metadata?: Record<string, any>
}

export interface ChartConfiguration {
  xAxis?: string
  yAxis?: string
  colors?: string[]
  thresholds?: { value: number; color: string; label: string }[]
  annotations?: { x?: number; y?: number; text: string }[]
}

export interface TimelineVisualizationData {
  events: TimelineEventData[]
  milestones: MilestoneData[]
  phases: PhaseData[]
  criticalPath: string[]
}

export interface TimelineEventData {
  id: string
  date: Date
  title: string
  description: string
  type: 'milestone' | 'event' | 'deadline' | 'achievement'
  importance: 'critical' | 'high' | 'medium' | 'low'
  status: 'completed' | 'in_progress' | 'pending' | 'overdue'
}

export interface MilestoneData {
  id: string
  title: string
  targetDate: Date
  completedDate?: Date
  progress: number
  dependencies: string[]
  blockers: string[]
}

export interface PhaseData {
  phase: string
  startDate: Date
  endDate?: Date
  duration: number
  progress: number
  status: 'completed' | 'in_progress' | 'pending'
}

export interface MetricVisualization {
  metric: string
  currentValue: number
  targetValue: number
  historicalData: { date: Date; value: number }[]
  trend: 'improving' | 'declining' | 'stable'
  visualization: 'gauge' | 'trend' | 'comparison'
}

export interface TrendVisualization {
  metric: string
  timeframe: 'daily' | 'weekly' | 'monthly'
  data: { period: string; value: number }[]
  forecast: { period: string; predicted: number; confidence: number }[]
  seasonality?: { pattern: string; strength: number }
}

export class ProgressReportsGenerator {
  private progressTracker: ProgressTracker

  constructor() {
    this.progressTracker = new ProgressTracker()
  }

  /**
   * Generate comprehensive progress report for a user
   */
  async generateComprehensiveReport(
    userId: string,
    disputes: EnhancedDisputeRecord[],
    startDate: Date,
    endDate: Date
  ): Promise<ComprehensiveProgressReport> {
    const reportId = this.generateReportId()
    
    // Generate individual dispute reports
    const disputeReports = await Promise.all(
      disputes.map(dispute => this.progressTracker.generateProgressReport(dispute))
    )
    
    // Calculate summary metrics
    const summary = await this.calculateProgressSummary(disputes, disputeReports)
    
    // Generate analytics
    const analytics = await this.generateAnalytics(disputes, disputeReports)
    
    // Generate insights
    const insights = await this.generateInsights(disputes, analytics)
    
    // Generate recommendations
    const recommendations = await this.generateRecommendations(disputes, analytics, insights)
    
    // Generate visualizations
    const visualizations = await this.generateVisualizations(disputes, disputeReports, analytics)
    
    return {
      reportId,
      userId,
      generatedAt: new Date(),
      reportPeriod: { startDate, endDate },
      summary,
      disputeReports,
      analytics,
      insights,
      recommendations,
      visualizations
    }
  }

  /**
   * Generate key metrics dashboard data
   */
  async generateKeyMetrics(disputes: EnhancedDisputeRecord[]): Promise<KPI[]> {
    const kpis: KPI[] = []
    
    // Success Rate KPI
    const successRate = this.calculateSuccessRate(disputes)
    kpis.push({
      name: 'Success Rate',
      value: successRate,
      target: 75,
      trend: 'up',
      status: successRate >= 75 ? 'excellent' : successRate >= 50 ? 'good' : 'needs_improvement',
      description: 'Percentage of disputes resolved favorably'
    })
    
    // Average Response Time KPI
    const avgResponseTime = this.calculateAverageResponseTime(disputes)
    kpis.push({
      name: 'Average Response Time',
      value: avgResponseTime,
      target: 30,
      trend: 'stable',
      status: avgResponseTime <= 30 ? 'excellent' : avgResponseTime <= 45 ? 'good' : 'needs_improvement',
      description: 'Average days for bureau response'
    })
    
    // Score Impact KPI
    const scoreImpact = this.calculateTotalScoreImpact(disputes)
    kpis.push({
      name: 'Credit Score Impact',
      value: scoreImpact,
      target: 50,
      trend: 'up',
      status: scoreImpact >= 50 ? 'excellent' : scoreImpact >= 25 ? 'good' : 'needs_improvement',
      description: 'Total credit score points gained'
    })
    
    // Active Disputes KPI
    const activeDisputes = disputes.filter(d => 
      ['submitted', 'in_progress', 'responded'].includes(d.status)
    ).length
    kpis.push({
      name: 'Active Disputes',
      value: activeDisputes,
      target: 5,
      trend: 'stable',
      status: activeDisputes <= 5 ? 'good' : 'needs_improvement',
      description: 'Number of disputes currently in progress'
    })
    
    return kpis
  }

  /**
   * Generate timeline visualization data
   */
  async generateTimelineVisualization(disputes: EnhancedDisputeRecord[]): Promise<TimelineVisualizationData> {
    const events: TimelineEventData[] = []
    const milestones: MilestoneData[] = []
    const phases: PhaseData[] = []
    
    for (const dispute of disputes) {
      // Add dispute creation event
      events.push({
        id: `${dispute.id}-created`,
        date: new Date(dispute.createdAt),
        title: 'Dispute Created',
        description: `Dispute case ${dispute.id} initiated`,
        type: 'event',
        importance: 'high',
        status: 'completed'
      })
      
      // Add submission events
      if (dispute.bureauSubmissions) {
        dispute.bureauSubmissions.forEach((submission, index) => {
          events.push({
            id: `${dispute.id}-submission-${index}`,
            date: submission.submissionDate,
            title: `Submitted to ${submission.bureau}`,
            description: `Dispute letter submitted via ${submission.submissionMethod}`,
            type: 'milestone',
            importance: 'high',
            status: 'completed'
          })
        })
      }
      
      // Add response events
      if (dispute.responses) {
        dispute.responses.forEach((response, index) => {
          events.push({
            id: `${dispute.id}-response-${index}`,
            date: response.responseDate,
            title: `Response from ${response.bureau}`,
            description: `${response.responseType}: ${response.outcome}`,
            type: 'event',
            importance: 'critical',
            status: 'completed'
          })
        })
      }
    }
    
    // Sort events by date
    events.sort((a, b) => a.date.getTime() - b.date.getTime())
    
    return {
      events,
      milestones,
      phases,
      criticalPath: [
        'Submit disputes',
        'Await responses',
        'Analyze outcomes',
        'Execute follow-ups',
        'Verify updates'
      ]
    }
  }

  /**
   * Calculate progress summary metrics
   */
  private async calculateProgressSummary(
    disputes: EnhancedDisputeRecord[],
    reports: ProgressReport[]
  ): Promise<ProgressSummary> {
    const totalDisputes = disputes.length
    const activeDisputes = disputes.filter(d => 
      ['submitted', 'in_progress', 'responded'].includes(d.status)
    ).length
    const completedDisputes = disputes.filter(d => 
      ['resolved', 'closed'].includes(d.status)
    ).length
    
    const averageProgress = reports.reduce((sum, report) => 
      sum + report.metrics.overallProgress, 0
    ) / reports.length || 0
    
    const oldestDispute = disputes.reduce((oldest, dispute) => 
      new Date(dispute.createdAt) < new Date(oldest.createdAt) ? dispute : oldest
    )
    const totalDaysActive = this.calculateDaysElapsed(oldestDispute.createdAt)
    
    const estimatedCompletionDate = this.calculateEstimatedCompletion(disputes)
    const overallSuccessRate = this.calculateSuccessRate(disputes)
    const totalScoreImpact = this.calculateTotalScoreImpact(disputes)
    
    return {
      totalDisputes,
      activeDisputes,
      completedDisputes,
      averageProgress,
      totalDaysActive,
      estimatedCompletionDate,
      overallSuccessRate,
      totalScoreImpact
    }
  }

  /**
   * Generate dispute analytics
   */
  private async generateAnalytics(
    disputes: EnhancedDisputeRecord[],
    reports: ProgressReport[]
  ): Promise<DisputeAnalytics> {
    const successRates = this.calculateSuccessRates(disputes)
    const timelineAnalysis = this.calculateTimelineMetrics(disputes)
    const bureauPerformance = this.calculateBureauPerformance(disputes)
    const impactAnalysis = this.calculateImpactMetrics(disputes)
    const trendAnalysis = this.calculateTrendMetrics(disputes)
    
    return {
      successRates,
      timelineAnalysis,
      bureauPerformance,
      impactAnalysis,
      trendAnalysis
    }
  }

  /**
   * Generate performance insights
   */
  private async generateInsights(
    disputes: EnhancedDisputeRecord[],
    analytics: DisputeAnalytics
  ): Promise<PerformanceInsights> {
    const strengths: string[] = []
    const weaknesses: string[] = []
    const opportunities: string[] = []
    const threats: string[] = []
    
    // Analyze strengths
    if (analytics.successRates.overall > 70) {
      strengths.push('High overall success rate indicates effective dispute strategies')
    }
    
    if (analytics.timelineAnalysis.averageResponseTime < 25) {
      strengths.push('Bureaus responding faster than industry average')
    }
    
    // Analyze weaknesses
    if (analytics.successRates.overall < 40) {
      weaknesses.push('Low success rate suggests need for strategy improvement')
    }
    
    if (analytics.timelineAnalysis.escalationRate > 30) {
      weaknesses.push('High escalation rate indicates initial dispute quality issues')
    }
    
    // Identify opportunities
    if (analytics.impactAnalysis.scoreImprovement < 30) {
      opportunities.push('Significant potential for additional score improvement')
    }
    
    // Identify threats
    if (analytics.timelineAnalysis.averageResponseTime > 40) {
      threats.push('Slow bureau responses may indicate systemic delays')
    }
    
    const kpis = await this.generateKeyMetrics(disputes)
    const benchmarkComparisons = this.generateBenchmarkComparisons(analytics)
    
    return {
      strengths,
      weaknesses,
      opportunities,
      threats,
      keyPerformanceIndicators: kpis,
      benchmarkComparisons
    }
  }

  /**
   * Generate recommendations based on analysis
   */
  private async generateRecommendations(
    disputes: EnhancedDisputeRecord[],
    analytics: DisputeAnalytics,
    insights: PerformanceInsights
  ): Promise<RecommendationSet> {
    const immediate: Recommendation[] = []
    const shortTerm: Recommendation[] = []
    const longTerm: Recommendation[] = []
    const strategic: Recommendation[] = []
    
    // Immediate recommendations
    if (analytics.successRates.overall < 50) {
      immediate.push({
        id: 'improve-strategy',
        title: 'Improve Dispute Strategy',
        description: 'Review and enhance dispute strategies to improve success rates',
        priority: 'critical',
        category: 'strategy',
        estimatedImpact: 25,
        effortRequired: 'medium',
        timeline: '1-2 weeks',
        actionSteps: [
          'Analyze failed disputes for common patterns',
          'Research successful dispute strategies',
          'Update dispute templates and approaches'
        ]
      })
    }
    
    // Short-term recommendations
    if (analytics.timelineAnalysis.escalationRate > 25) {
      shortTerm.push({
        id: 'reduce-escalations',
        title: 'Reduce Escalation Rate',
        description: 'Improve initial dispute quality to reduce need for escalations',
        priority: 'high',
        category: 'strategy',
        estimatedImpact: 15,
        effortRequired: 'medium',
        timeline: '1-2 months',
        actionSteps: [
          'Enhance documentation requirements',
          'Improve legal basis validation',
          'Strengthen EOSCAR compliance checking'
        ]
      })
    }
    
    // Long-term recommendations
    longTerm.push({
      id: 'predictive-analytics',
      title: 'Implement Predictive Analytics',
      description: 'Use machine learning to predict dispute outcomes and optimize strategies',
      priority: 'medium',
      category: 'strategy',
      estimatedImpact: 30,
      effortRequired: 'high',
      timeline: '3-6 months',
      actionSteps: [
        'Collect historical dispute outcome data',
        'Develop predictive models',
        'Integrate predictions into dispute planning'
      ]
    })
    
    // Strategic recommendations
    strategic.push({
      id: 'bureau-relationships',
      title: 'Develop Bureau Relationships',
      description: 'Build strategic relationships with credit bureau dispute departments',
      priority: 'medium',
      category: 'strategy',
      estimatedImpact: 20,
      effortRequired: 'high',
      timeline: '6-12 months',
      actionSteps: [
        'Identify key bureau contacts',
        'Establish communication channels',
        'Develop partnership agreements'
      ]
    })
    
    return {
      immediate,
      shortTerm,
      longTerm,
      strategic
    }
  }

  /**
   * Generate visualization data
   */
  private async generateVisualizations(
    disputes: EnhancedDisputeRecord[],
    reports: ProgressReport[],
    analytics: DisputeAnalytics
  ): Promise<VisualizationData> {
    const progressCharts: ProgressChart[] = []
    
    // Success rate by bureau chart
    progressCharts.push({
      type: 'bar',
      title: 'Success Rate by Bureau',
      description: 'Comparison of dispute success rates across credit bureaus',
      data: Object.entries(analytics.successRates.byBureau).map(([bureau, rate]) => ({
        label: bureau,
        value: rate,
        category: 'success_rate'
      })),
      config: {
        yAxis: 'Success Rate (%)',
        colors: ['#10B981', '#F59E0B', '#EF4444'],
        thresholds: [
          { value: 75, color: '#10B981', label: 'Excellent' },
          { value: 50, color: '#F59E0B', label: 'Good' },
          { value: 25, color: '#EF4444', label: 'Needs Improvement' }
        ]
      }
    })
    
    // Timeline progress chart
    progressCharts.push({
      type: 'line',
      title: 'Dispute Progress Over Time',
      description: 'Timeline showing dispute progress and milestones',
      data: reports.map(report => ({
        label: report.disputeId,
        value: report.metrics.overallProgress,
        timestamp: report.reportDate,
        category: 'progress'
      })),
      config: {
        xAxis: 'Time',
        yAxis: 'Progress (%)',
        colors: ['#3B82F6']
      }
    })
    
    const timelineData = await this.generateTimelineVisualization(disputes)
    
    const performanceMetrics: MetricVisualization[] = [
      {
        metric: 'Success Rate',
        currentValue: analytics.successRates.overall,
        targetValue: 75,
        historicalData: [], // Would be populated from historical data
        trend: 'improving',
        visualization: 'gauge'
      }
    ]
    
    const trendAnalysis: TrendVisualization[] = [
      {
        metric: 'Monthly Success Rate',
        timeframe: 'monthly',
        data: [], // Would be populated from historical data
        forecast: [] // Would be populated from predictive models
      }
    ]
    
    return {
      progressCharts,
      timelineData,
      performanceMetrics,
      trendAnalysis
    }
  }

  // Helper methods for calculations
  private calculateSuccessRate(disputes: EnhancedDisputeRecord[]): number {
    const resolved = disputes.filter(d => d.status === DisputeStatus.RESOLVED).length
    return disputes.length > 0 ? (resolved / disputes.length) * 100 : 0
  }

  private calculateAverageResponseTime(disputes: EnhancedDisputeRecord[]): number {
    const responseTimes = disputes
      .filter(d => d.responses && d.responses.length > 0)
      .map(d => {
        const submission = d.bureauSubmissions?.[0]?.submissionDate
        const response = d.responses?.[0]?.responseDate
        if (submission && response) {
          return Math.abs(new Date(response).getTime() - new Date(submission).getTime()) / (1000 * 60 * 60 * 24)
        }
        return 0
      })
      .filter(time => time > 0)
    
    return responseTimes.length > 0 ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0
  }

  private calculateTotalScoreImpact(disputes: EnhancedDisputeRecord[]): number {
    return disputes.reduce((total, dispute) => total + (dispute.estimatedImpact || 0), 0)
  }

  private calculateDaysElapsed(createdAt: Date | string): number {
    const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
    const now = new Date()
    return Math.ceil(Math.abs(now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
  }

  private calculateEstimatedCompletion(disputes: EnhancedDisputeRecord[]): Date {
    const activeDisputes = disputes.filter(d => 
      ['submitted', 'in_progress', 'responded'].includes(d.status)
    )
    
    if (activeDisputes.length === 0) {
      return new Date()
    }
    
    // Estimate based on average dispute duration
    const avgDuration = 60 // days
    const completion = new Date()
    completion.setDate(completion.getDate() + avgDuration)
    return completion
  }

  private calculateSuccessRates(disputes: EnhancedDisputeRecord[]): SuccessRateMetrics {
    const overall = this.calculateSuccessRate(disputes)
    
    return {
      overall,
      byBureau: {
        experian: this.calculateSuccessRateByBureau(disputes, 'experian'),
        equifax: this.calculateSuccessRateByBureau(disputes, 'equifax'),
        transunion: this.calculateSuccessRateByBureau(disputes, 'transunion')
      },
      byDisputeType: {},
      byReasonCode: {},
      byTimeframe: {}
    }
  }

  private calculateSuccessRateByBureau(disputes: EnhancedDisputeRecord[], bureau: string): number {
    const bureauDisputes = disputes.filter(d => 
      d.bureauSubmissions?.some(s => s.bureau === bureau)
    )
    return this.calculateSuccessRate(bureauDisputes)
  }

  private calculateTimelineMetrics(disputes: EnhancedDisputeRecord[]): TimelineMetrics {
    return {
      averageResponseTime: this.calculateAverageResponseTime(disputes),
      averageResolutionTime: 45, // Placeholder
      escalationRate: 20, // Placeholder
      followUpRate: 30, // Placeholder
      timeToResolution: {}
    }
  }

  private calculateBureauPerformance(disputes: EnhancedDisputeRecord[]): BureauPerformanceMetrics {
    return {
      responseTime: {
        experian: 28,
        equifax: 32,
        transunion: 25
      },
      successRate: {
        experian: this.calculateSuccessRateByBureau(disputes, 'experian'),
        equifax: this.calculateSuccessRateByBureau(disputes, 'equifax'),
        transunion: this.calculateSuccessRateByBureau(disputes, 'transunion')
      },
      communicationQuality: {
        experian: 85,
        equifax: 78,
        transunion: 82
      },
      consistencyScore: {
        experian: 90,
        equifax: 85,
        transunion: 88
      }
    }
  }

  private calculateImpactMetrics(disputes: EnhancedDisputeRecord[]): ImpactMetrics {
    return {
      scoreImprovement: this.calculateTotalScoreImpact(disputes),
      pointsGained: this.calculateTotalScoreImpact(disputes),
      negativeItemsRemoved: disputes.filter(d => d.status === DisputeStatus.RESOLVED).length,
      accountsUpdated: 0, // Placeholder
      inquiriesRemoved: 0 // Placeholder
    }
  }

  private calculateTrendMetrics(disputes: EnhancedDisputeRecord[]): TrendMetrics {
    return {
      monthlySuccess: {},
      seasonalPatterns: {},
      improvementTrend: 'improving',
      predictedOutcomes: {}
    }
  }

  private generateBenchmarkComparisons(analytics: DisputeAnalytics): BenchmarkComparison[] {
    return [
      {
        metric: 'Success Rate',
        userValue: analytics.successRates.overall,
        industryAverage: 65,
        percentile: analytics.successRates.overall > 65 ? 75 : 25,
        interpretation: analytics.successRates.overall > 65 ? 'Above average performance' : 'Below average performance'
      }
    ]
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export const progressReportsGenerator = new ProgressReportsGenerator()