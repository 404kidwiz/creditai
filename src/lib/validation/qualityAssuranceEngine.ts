/**
 * Quality Assurance Engine
 * 
 * Comprehensive quality assurance system that provides overall quality scoring,
 * automated quality alerts, and quality improvement recommendations.
 */

import { 
  EnhancedCreditReportData,
  EOSCARLetter,
  ValidationIssue,
  QualityMetrics
} from '@/types/enhanced-credit'

import { enhancedValidationSystem, EnhancedValidationResult } from './enhancedValidationSystem'
import { eoscarComplianceValidator, EOSCARComplianceResult } from './eoscarComplianceValidator'

export interface QualityAssuranceResult {
  overallQualityScore: number
  qualityGrade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F'
  qualityMetrics: QualityMetrics
  qualityDimensions: {
    accuracy: number
    completeness: number
    consistency: number
    compliance: number
    reliability: number
    usability: number
  }
  criticalIssues: ValidationIssue[]
  qualityAlerts: QualityAlert[]
  improvementRecommendations: QualityImprovement[]
  benchmarkComparison: BenchmarkComparison
  qualityTrends: QualityTrend[]
  actionItems: ActionItem[]
  qualityReport: QualityReport
  assessedAt: Date
  nextAssessmentDue: Date
}

export interface QualityAlert {
  id: string
  type: 'critical' | 'warning' | 'info'
  category: 'data_quality' | 'compliance' | 'performance' | 'security'
  title: string
  message: string
  severity: 'high' | 'medium' | 'low'
  affectedComponents: string[]
  recommendedActions: string[]
  alertedAt: Date
  acknowledged: boolean
  resolvedAt?: Date
}

export interface QualityImprovement {
  id: string
  category: 'extraction' | 'validation' | 'compliance' | 'process'
  title: string
  description: string
  currentScore: number
  targetScore: number
  potentialImpact: 'high' | 'medium' | 'low'
  implementationEffort: 'low' | 'medium' | 'high'
  priority: number
  steps: string[]
  estimatedTimeframe: string
  dependencies: string[]
  successMetrics: string[]
}

export interface BenchmarkComparison {
  industryAverage: number
  topPerformers: number
  yourScore: number
  percentile: number
  ranking: 'excellent' | 'above_average' | 'average' | 'below_average' | 'poor'
  gapAnalysis: {
    accuracyGap: number
    completenessGap: number
    consistencyGap: number
    complianceGap: number
  }
}

export interface QualityTrend {
  metric: string
  timeframe: 'daily' | 'weekly' | 'monthly'
  currentValue: number
  previousValue: number
  change: number
  changePercentage: number
  trend: 'improving' | 'declining' | 'stable'
  significance: 'significant' | 'moderate' | 'minimal'
}

export interface ActionItem {
  id: string
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  assignedTo?: string
  dueDate: Date
  estimatedEffort: string
  dependencies: string[]
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  createdAt: Date
}

export interface QualityReport {
  executiveSummary: string
  keyFindings: string[]
  strengthAreas: string[]
  improvementAreas: string[]
  riskAssessment: RiskAssessment
  recommendations: string[]
  nextSteps: string[]
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical'
  riskFactors: RiskFactor[]
  mitigationStrategies: string[]
}

export interface RiskFactor {
  factor: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  impact: string
  likelihood: 'low' | 'medium' | 'high'
  mitigation: string
}

export interface QualityConfig {
  enableContinuousMonitoring: boolean
  alertThresholds: {
    critical: number
    warning: number
    info: number
  }
  benchmarkEnabled: boolean
  trendAnalysisEnabled: boolean
  autoGenerateReports: boolean
  qualityStandards: {
    minimumAccuracy: number
    minimumCompleteness: number
    minimumConsistency: number
    minimumCompliance: number
  }
}

export class QualityAssuranceEngine {
  private readonly DEFAULT_CONFIG: QualityConfig = {
    enableContinuousMonitoring: true,
    alertThresholds: {
      critical: 60,
      warning: 75,
      info: 85
    },
    benchmarkEnabled: true,
    trendAnalysisEnabled: true,
    autoGenerateReports: true,
    qualityStandards: {
      minimumAccuracy: 85,
      minimumCompleteness: 90,
      minimumConsistency: 80,
      minimumCompliance: 95
    }
  }

  private readonly QUALITY_WEIGHTS = {
    accuracy: 0.25,
    completeness: 0.20,
    consistency: 0.20,
    compliance: 0.15,
    reliability: 0.10,
    usability: 0.10
  }

  private readonly INDUSTRY_BENCHMARKS = {
    accuracy: 87,
    completeness: 92,
    consistency: 84,
    compliance: 96,
    overall: 89
  }

  /**
   * Perform comprehensive quality assurance assessment
   */
  async assessQuality(
    data: EnhancedCreditReportData,
    eoscarLetter?: EOSCARLetter,
    originalText?: string,
    config: Partial<QualityConfig> = {}
  ): Promise<QualityAssuranceResult> {
    const qualityConfig = { ...this.DEFAULT_CONFIG, ...config }
    
    // Perform enhanced validation
    const validationResult = await enhancedValidationSystem.validateEnhancedCreditReport(
      data, 
      originalText
    )

    // Perform EOSCAR compliance validation if letter provided
    let complianceResult: EOSCARComplianceResult | null = null
    if (eoscarLetter) {
      complianceResult = await eoscarComplianceValidator.validateEOSCARCompliance(eoscarLetter)
    }

    // Calculate quality dimensions
    const qualityDimensions = this.calculateQualityDimensions(validationResult, complianceResult)

    // Calculate overall quality score
    const overallQualityScore = this.calculateOverallQualityScore(qualityDimensions)

    // Determine quality grade
    const qualityGrade = this.determineQualityGrade(overallQualityScore)

    // Generate quality metrics
    const qualityMetrics = this.generateQualityMetrics(validationResult, complianceResult, qualityDimensions)

    // Identify critical issues
    const criticalIssues = this.identifyCriticalIssues(validationResult, complianceResult)

    // Generate quality alerts
    const qualityAlerts = await this.generateQualityAlerts(
      qualityDimensions, 
      criticalIssues, 
      qualityConfig
    )

    // Generate improvement recommendations
    const improvementRecommendations = await this.generateImprovementRecommendations(
      qualityDimensions,
      validationResult,
      complianceResult
    )

    // Perform benchmark comparison
    const benchmarkComparison = this.performBenchmarkComparison(qualityDimensions)

    // Analyze quality trends (mock data for now - would use historical data in production)
    const qualityTrends = this.analyzeQualityTrends(qualityDimensions)

    // Generate action items
    const actionItems = await this.generateActionItems(
      criticalIssues,
      improvementRecommendations,
      qualityAlerts
    )

    // Generate quality report
    const qualityReport = this.generateQualityReport(
      overallQualityScore,
      qualityDimensions,
      criticalIssues,
      improvementRecommendations,
      benchmarkComparison
    )

    return {
      overallQualityScore,
      qualityGrade,
      qualityMetrics,
      qualityDimensions,
      criticalIssues,
      qualityAlerts,
      improvementRecommendations,
      benchmarkComparison,
      qualityTrends,
      actionItems,
      qualityReport,
      assessedAt: new Date(),
      nextAssessmentDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    }
  }

  /**
   * Perform quick quality check for real-time feedback
   */
  async quickQualityCheck(
    data: EnhancedCreditReportData,
    focusAreas: string[] = []
  ): Promise<{
    qualityScore: number
    qualityGrade: string
    criticalAlerts: QualityAlert[]
    quickRecommendations: string[]
  }> {
    const quickValidation = await enhancedValidationSystem.quickValidate(data, focusAreas)
    
    const qualityScore = quickValidation.score
    const qualityGrade = this.determineQualityGrade(qualityScore)
    
    const criticalAlerts: QualityAlert[] = quickValidation.criticalIssues.map((issue, index) => ({
      id: `quick-alert-${index}`,
      type: 'critical',
      category: 'data_quality',
      title: 'Critical Quality Issue',
      message: issue.message,
      severity: issue.severity,
      affectedComponents: [issue.field || 'unknown'],
      recommendedActions: [issue.suggestion || 'Review and fix issue'],
      alertedAt: new Date(),
      acknowledged: false
    }))

    return {
      qualityScore,
      qualityGrade,
      criticalAlerts,
      quickRecommendations: quickValidation.quickRecommendations
    }
  }

  /**
   * Generate quality dashboard metrics
   */
  async generateQualityDashboard(
    assessmentResults: QualityAssuranceResult[]
  ): Promise<{
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor'
    keyMetrics: { [key: string]: number }
    trendIndicators: { [key: string]: 'up' | 'down' | 'stable' }
    alertSummary: { critical: number; warning: number; info: number }
    topIssues: string[]
    improvementOpportunities: string[]
  }> {
    if (assessmentResults.length === 0) {
      return {
        overallHealth: 'poor',
        keyMetrics: {},
        trendIndicators: {},
        alertSummary: { critical: 0, warning: 0, info: 0 },
        topIssues: [],
        improvementOpportunities: []
      }
    }

    const latest = assessmentResults[assessmentResults.length - 1]
    
    // Calculate overall health
    const overallHealth = this.determineOverallHealth(latest.overallQualityScore)
    
    // Extract key metrics
    const keyMetrics = {
      overallQuality: latest.overallQualityScore,
      accuracy: latest.qualityDimensions.accuracy,
      completeness: latest.qualityDimensions.completeness,
      consistency: latest.qualityDimensions.consistency,
      compliance: latest.qualityDimensions.compliance
    }

    // Calculate trend indicators
    const trendIndicators: { [key: string]: 'up' | 'down' | 'stable' } = {}
    if (assessmentResults.length > 1) {
      const previous = assessmentResults[assessmentResults.length - 2]
      
      Object.keys(keyMetrics).forEach(metric => {
        const current = (keyMetrics as any)[metric]
        const prev = metric === 'overallQuality' 
          ? previous.overallQualityScore 
          : (previous.qualityDimensions as any)[metric]
        
        if (current > prev + 2) trendIndicators[metric] = 'up'
        else if (current < prev - 2) trendIndicators[metric] = 'down'
        else trendIndicators[metric] = 'stable'
      })
    }

    // Summarize alerts
    const alertSummary = {
      critical: latest.qualityAlerts.filter(a => a.type === 'critical').length,
      warning: latest.qualityAlerts.filter(a => a.type === 'warning').length,
      info: latest.qualityAlerts.filter(a => a.type === 'info').length
    }

    // Extract top issues
    const topIssues = latest.criticalIssues
      .slice(0, 5)
      .map(issue => issue.message)

    // Extract improvement opportunities
    const improvementOpportunities = latest.improvementRecommendations
      .filter(rec => rec.potentialImpact === 'high')
      .slice(0, 3)
      .map(rec => rec.title)

    return {
      overallHealth,
      keyMetrics,
      trendIndicators,
      alertSummary,
      topIssues,
      improvementOpportunities
    }
  }

  /**
   * Calculate quality dimensions from validation results
   */
  private calculateQualityDimensions(
    validationResult: EnhancedValidationResult,
    complianceResult: EOSCARComplianceResult | null
  ): any {
    return {
      accuracy: validationResult.dataQuality?.overallScore || 0,
      completeness: validationResult.completeness?.overallCompleteness || 0,
      consistency: validationResult.consistency?.overallConsistency || 0,
      compliance: complianceResult?.complianceScore || 100,
      reliability: this.calculateReliabilityScore(validationResult),
      usability: this.calculateUsabilityScore(validationResult, complianceResult)
    }
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallQualityScore(qualityDimensions: any): number {
    return Math.round(
      (qualityDimensions.accuracy * this.QUALITY_WEIGHTS.accuracy) +
      (qualityDimensions.completeness * this.QUALITY_WEIGHTS.completeness) +
      (qualityDimensions.consistency * this.QUALITY_WEIGHTS.consistency) +
      (qualityDimensions.compliance * this.QUALITY_WEIGHTS.compliance) +
      (qualityDimensions.reliability * this.QUALITY_WEIGHTS.reliability) +
      (qualityDimensions.usability * this.QUALITY_WEIGHTS.usability)
    )
  }

  /**
   * Determine quality grade
   */
  private determineQualityGrade(score: number): 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F' {
    if (score >= 97) return 'A+'
    if (score >= 93) return 'A'
    if (score >= 90) return 'B+'
    if (score >= 87) return 'B'
    if (score >= 83) return 'C+'
    if (score >= 80) return 'C'
    if (score >= 70) return 'D'
    return 'F'
  }

  /**
   * Calculate reliability score
   */
  private calculateReliabilityScore(validationResult: EnhancedValidationResult): number {
    let reliabilityScore = 100

    // Penalize for processing errors
    if (validationResult.processingTime > 30000) { // 30 seconds
      reliabilityScore -= 10
    }

    // Penalize for low confidence scores
    const avgConfidence = validationResult.qualityMetrics.extractionQuality
    if (avgConfidence < 70) {
      reliabilityScore -= 20
    } else if (avgConfidence < 85) {
      reliabilityScore -= 10
    }

    // Penalize for high number of issues
    const highPriorityIssues = validationResult.issues.filter(issue => issue.severity === 'high').length
    reliabilityScore -= highPriorityIssues * 5

    return Math.max(0, reliabilityScore)
  }

  /**
   * Calculate usability score
   */
  private calculateUsabilityScore(
    validationResult: EnhancedValidationResult,
    complianceResult: EOSCARComplianceResult | null
  ): number {
    let usabilityScore = 100

    // Factor in recommendation quality
    if (validationResult.recommendations.length === 0) {
      usabilityScore -= 20
    } else if (validationResult.recommendations.length < 3) {
      usabilityScore -= 10
    }

    // Factor in EOSCAR compliance if available
    if (complianceResult) {
      if (complianceResult.overallGrade === 'F') {
        usabilityScore -= 30
      } else if (complianceResult.overallGrade === 'D') {
        usabilityScore -= 20
      } else if (complianceResult.overallGrade === 'C') {
        usabilityScore -= 10
      }
    }

    // Factor in issue clarity
    const unclearIssues = validationResult.issues.filter(issue => 
      !issue.suggestion || issue.suggestion.length < 10
    ).length
    usabilityScore -= unclearIssues * 2

    return Math.max(0, usabilityScore)
  }

  /**
   * Generate quality metrics
   */
  private generateQualityMetrics(
    validationResult: EnhancedValidationResult,
    complianceResult: EOSCARComplianceResult | null,
    qualityDimensions: any
  ): QualityMetrics {
    return {
      dataCompleteness: qualityDimensions.completeness,
      dataAccuracy: qualityDimensions.accuracy,
      consistencyScore: qualityDimensions.consistency,
      validationScore: validationResult.overallScore,
      overallQuality: this.calculateOverallQualityScore(qualityDimensions),
      extractionQuality: validationResult.qualityMetrics.extractionQuality,
      crossValidationScore: validationResult.qualityMetrics.crossValidationScore,
      bureauConsistency: validationResult.qualityMetrics.bureauConsistency,
      temporalConsistency: validationResult.qualityMetrics.temporalConsistency
    }
  }

  /**
   * Identify critical issues
   */
  private identifyCriticalIssues(
    validationResult: EnhancedValidationResult,
    complianceResult: EOSCARComplianceResult | null
  ): ValidationIssue[] {
    const criticalIssues: ValidationIssue[] = []

    // Add high-severity validation issues
    criticalIssues.push(...validationResult.issues.filter(issue => issue.severity === 'high'))

    // Add compliance issues if available
    if (complianceResult) {
      criticalIssues.push(...complianceResult.issues.filter(issue => issue.severity === 'high'))
    }

    // Add system-level critical issues
    if (validationResult.overallScore < 50) {
      criticalIssues.push({
        type: 'error',
        category: 'accuracy',
        message: 'Overall validation score is critically low',
        severity: 'high',
        suggestion: 'Review and improve data extraction and validation processes'
      })
    }

    return criticalIssues
  }

  /**
   * Generate quality alerts
   */
  private async generateQualityAlerts(
    qualityDimensions: any,
    criticalIssues: ValidationIssue[],
    config: QualityConfig
  ): Promise<QualityAlert[]> {
    const alerts: QualityAlert[] = []

    // Generate alerts based on quality dimensions
    Object.entries(qualityDimensions).forEach(([dimension, score]) => {
      const numScore = score as number
      
      if (numScore < config.alertThresholds.critical) {
        alerts.push({
          id: `alert-${dimension}-critical`,
          type: 'critical',
          category: 'data_quality',
          title: `Critical ${dimension} Issue`,
          message: `${dimension} score (${numScore}) is below critical threshold (${config.alertThresholds.critical})`,
          severity: 'high',
          affectedComponents: [dimension],
          recommendedActions: [`Immediately address ${dimension} issues`],
          alertedAt: new Date(),
          acknowledged: false
        })
      } else if (numScore < config.alertThresholds.warning) {
        alerts.push({
          id: `alert-${dimension}-warning`,
          type: 'warning',
          category: 'data_quality',
          title: `${dimension} Warning`,
          message: `${dimension} score (${numScore}) is below warning threshold (${config.alertThresholds.warning})`,
          severity: 'medium',
          affectedComponents: [dimension],
          recommendedActions: [`Review and improve ${dimension}`],
          alertedAt: new Date(),
          acknowledged: false
        })
      }
    })

    // Generate alerts for critical issues
    criticalIssues.forEach((issue, index) => {
      alerts.push({
        id: `critical-issue-${index}`,
        type: 'critical',
        category: 'data_quality',
        title: 'Critical Validation Issue',
        message: issue.message,
        severity: issue.severity,
        affectedComponents: [issue.field || 'unknown'],
        recommendedActions: [issue.suggestion || 'Address this issue'],
        alertedAt: new Date(),
        acknowledged: false
      })
    })

    return alerts
  }

  /**
   * Generate improvement recommendations
   */
  private async generateImprovementRecommendations(
    qualityDimensions: any,
    validationResult: EnhancedValidationResult,
    complianceResult: EOSCARComplianceResult | null
  ): Promise<QualityImprovement[]> {
    const improvements: QualityImprovement[] = []

    // Generate improvements based on quality dimensions
    Object.entries(qualityDimensions).forEach(([dimension, score], index) => {
      const numScore = score as number
      
      if (numScore < 85) {
        const targetScore = Math.min(95, numScore + 15)
        const impact = numScore < 60 ? 'high' : numScore < 75 ? 'medium' : 'low'
        const effort = dimension === 'compliance' ? 'low' : 'medium'

        improvements.push({
          id: `improvement-${dimension}`,
          category: this.getDimensionCategory(dimension),
          title: `Improve ${dimension}`,
          description: `Enhance ${dimension} from ${numScore}% to ${targetScore}%`,
          currentScore: numScore,
          targetScore: targetScore,
          potentialImpact: impact,
          implementationEffort: effort,
          priority: this.calculateImprovementPriority(numScore, impact, effort),
          steps: this.getImprovementSteps(dimension),
          estimatedTimeframe: this.getEstimatedTimeframe(effort),
          dependencies: this.getImprovementDependencies(dimension),
          successMetrics: this.getSuccessMetrics(dimension)
        })
      }
    })

    // Add specific improvements based on validation results
    if (validationResult.issues.length > 10) {
      improvements.push({
        id: 'reduce-validation-issues',
        category: 'validation',
        title: 'Reduce Validation Issues',
        description: 'Systematically address and reduce the number of validation issues',
        currentScore: Math.max(0, 100 - validationResult.issues.length * 2),
        targetScore: 90,
        potentialImpact: 'high',
        implementationEffort: 'medium',
        priority: 8,
        steps: [
          'Categorize all validation issues',
          'Prioritize by severity and impact',
          'Create action plan for each category',
          'Implement fixes systematically',
          'Monitor progress and adjust'
        ],
        estimatedTimeframe: '2-4 weeks',
        dependencies: ['validation system updates'],
        successMetrics: ['Reduce issues by 50%', 'Increase overall score by 10 points']
      })
    }

    return improvements.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Perform benchmark comparison
   */
  private performBenchmarkComparison(qualityDimensions: any): BenchmarkComparison {
    const yourScore = this.calculateOverallQualityScore(qualityDimensions)
    
    // Calculate percentile (simplified calculation)
    const percentile = Math.min(99, Math.max(1, 
      Math.round((yourScore / this.INDUSTRY_BENCHMARKS.overall) * 50)
    ))

    let ranking: 'excellent' | 'above_average' | 'average' | 'below_average' | 'poor'
    if (yourScore >= this.INDUSTRY_BENCHMARKS.overall + 10) ranking = 'excellent'
    else if (yourScore >= this.INDUSTRY_BENCHMARKS.overall + 5) ranking = 'above_average'
    else if (yourScore >= this.INDUSTRY_BENCHMARKS.overall - 5) ranking = 'average'
    else if (yourScore >= this.INDUSTRY_BENCHMARKS.overall - 15) ranking = 'below_average'
    else ranking = 'poor'

    return {
      industryAverage: this.INDUSTRY_BENCHMARKS.overall,
      topPerformers: 95,
      yourScore,
      percentile,
      ranking,
      gapAnalysis: {
        accuracyGap: this.INDUSTRY_BENCHMARKS.accuracy - qualityDimensions.accuracy,
        completenessGap: this.INDUSTRY_BENCHMARKS.completeness - qualityDimensions.completeness,
        consistencyGap: this.INDUSTRY_BENCHMARKS.consistency - qualityDimensions.consistency,
        complianceGap: this.INDUSTRY_BENCHMARKS.compliance - qualityDimensions.compliance
      }
    }
  }

  /**
   * Analyze quality trends (mock implementation)
   */
  private analyzeQualityTrends(qualityDimensions: any): QualityTrend[] {
    // In a real implementation, this would analyze historical data
    return Object.entries(qualityDimensions).map(([metric, currentValue]) => ({
      metric,
      timeframe: 'weekly' as const,
      currentValue: currentValue as number,
      previousValue: (currentValue as number) - Math.random() * 10 + 5,
      change: Math.random() * 10 - 5,
      changePercentage: (Math.random() * 20 - 10),
      trend: Math.random() > 0.5 ? 'improving' as const : 'stable' as const,
      significance: Math.random() > 0.7 ? 'significant' as const : 'moderate' as const
    }))
  }

  /**
   * Generate action items
   */
  private async generateActionItems(
    criticalIssues: ValidationIssue[],
    improvements: QualityImprovement[],
    alerts: QualityAlert[]
  ): Promise<ActionItem[]> {
    const actionItems: ActionItem[] = []

    // Create action items for critical issues
    criticalIssues.forEach((issue, index) => {
      actionItems.push({
        id: `action-critical-${index}`,
        title: `Fix Critical Issue: ${issue.message}`,
        description: issue.suggestion || 'Address this critical validation issue',
        priority: 'critical',
        category: issue.category,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
        estimatedEffort: '2-4 hours',
        dependencies: [],
        status: 'pending',
        createdAt: new Date()
      })
    })

    // Create action items for high-priority improvements
    improvements
      .filter(imp => imp.priority >= 7)
      .forEach(improvement => {
        actionItems.push({
          id: `action-improvement-${improvement.id}`,
          title: improvement.title,
          description: improvement.description,
          priority: 'high',
          category: improvement.category,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
          estimatedEffort: improvement.estimatedTimeframe,
          dependencies: improvement.dependencies,
          status: 'pending',
          createdAt: new Date()
        })
      })

    // Create action items for critical alerts
    alerts
      .filter(alert => alert.type === 'critical')
      .forEach(alert => {
        actionItems.push({
          id: `action-alert-${alert.id}`,
          title: `Address Alert: ${alert.title}`,
          description: alert.message,
          priority: 'critical',
          category: alert.category,
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
          estimatedEffort: '1-2 days',
          dependencies: [],
          status: 'pending',
          createdAt: new Date()
        })
      })

    return actionItems.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Generate quality report
   */
  private generateQualityReport(
    overallScore: number,
    qualityDimensions: any,
    criticalIssues: ValidationIssue[],
    improvements: QualityImprovement[],
    benchmark: BenchmarkComparison
  ): QualityReport {
    const executiveSummary = this.generateExecutiveSummary(overallScore, benchmark)
    const keyFindings = this.generateKeyFindings(qualityDimensions, criticalIssues)
    const strengthAreas = this.identifyStrengthAreas(qualityDimensions)
    const improvementAreas = this.identifyImprovementAreas(qualityDimensions)
    const riskAssessment = this.generateRiskAssessment(criticalIssues, qualityDimensions)
    const recommendations = this.generateReportRecommendations(improvements)
    const nextSteps = this.generateNextSteps(criticalIssues, improvements)

    return {
      executiveSummary,
      keyFindings,
      strengthAreas,
      improvementAreas,
      riskAssessment,
      recommendations,
      nextSteps
    }
  }

  // Helper methods for report generation
  private generateExecutiveSummary(score: number, benchmark: BenchmarkComparison): string {
    const grade = this.determineQualityGrade(score)
    return `Overall quality assessment shows a ${grade} grade with a score of ${score}/100. ` +
           `Performance is ${benchmark.ranking} compared to industry standards, ` +
           `ranking in the ${benchmark.percentile}th percentile.`
  }

  private generateKeyFindings(qualityDimensions: any, criticalIssues: ValidationIssue[]): string[] {
    const findings: string[] = []
    
    // Analyze dimensions
    Object.entries(qualityDimensions).forEach(([dimension, score]) => {
      const numScore = score as number
      if (numScore >= 90) {
        findings.push(`${dimension} performance is excellent (${numScore}%)`)
      } else if (numScore < 70) {
        findings.push(`${dimension} requires immediate attention (${numScore}%)`)
      }
    })

    // Add critical issues finding
    if (criticalIssues.length > 0) {
      findings.push(`${criticalIssues.length} critical issues identified requiring immediate resolution`)
    }

    return findings
  }

  private identifyStrengthAreas(qualityDimensions: any): string[] {
    return Object.entries(qualityDimensions)
      .filter(([_, score]) => (score as number) >= 85)
      .map(([dimension, score]) => `${dimension} (${score}%)`)
  }

  private identifyImprovementAreas(qualityDimensions: any): string[] {
    return Object.entries(qualityDimensions)
      .filter(([_, score]) => (score as number) < 80)
      .map(([dimension, score]) => `${dimension} (${score}%)`)
  }

  private generateRiskAssessment(criticalIssues: ValidationIssue[], qualityDimensions: any): RiskAssessment {
    const riskFactors: RiskFactor[] = []
    
    // Assess risk based on critical issues
    if (criticalIssues.length > 5) {
      riskFactors.push({
        factor: 'High number of critical issues',
        riskLevel: 'high',
        impact: 'May lead to processing failures and compliance issues',
        likelihood: 'high',
        mitigation: 'Implement systematic issue resolution process'
      })
    }

    // Assess risk based on quality dimensions
    Object.entries(qualityDimensions).forEach(([dimension, score]) => {
      if ((score as number) < 60) {
        riskFactors.push({
          factor: `Low ${dimension} score`,
          riskLevel: 'high',
          impact: `Poor ${dimension} may affect overall system reliability`,
          likelihood: 'medium',
          mitigation: `Focus improvement efforts on ${dimension}`
        })
      }
    })

    const overallRisk = riskFactors.some(rf => rf.riskLevel === 'high') ? 'high' :
                       riskFactors.some(rf => rf.riskLevel === 'medium') ? 'medium' : 'low'

    return {
      overallRisk,
      riskFactors,
      mitigationStrategies: riskFactors.map(rf => rf.mitigation)
    }
  }

  private generateReportRecommendations(improvements: QualityImprovement[]): string[] {
    return improvements
      .slice(0, 5)
      .map(imp => `${imp.title}: ${imp.description}`)
  }

  private generateNextSteps(criticalIssues: ValidationIssue[], improvements: QualityImprovement[]): string[] {
    const steps: string[] = []
    
    if (criticalIssues.length > 0) {
      steps.push('Address all critical issues within 24-48 hours')
    }
    
    if (improvements.length > 0) {
      steps.push(`Implement top ${Math.min(3, improvements.length)} improvement recommendations`)
    }
    
    steps.push('Schedule follow-up quality assessment in 1 week')
    steps.push('Establish continuous monitoring for key quality metrics')
    
    return steps
  }

  // Additional helper methods
  private getDimensionCategory(dimension: string): 'extraction' | 'validation' | 'compliance' | 'process' {
    const categoryMap: { [key: string]: 'extraction' | 'validation' | 'compliance' | 'process' } = {
      accuracy: 'extraction',
      completeness: 'extraction',
      consistency: 'validation',
      compliance: 'compliance',
      reliability: 'process',
      usability: 'process'
    }
    return categoryMap[dimension] || 'process'
  }

  private calculateImprovementPriority(score: number, impact: string, effort: string): number {
    let priority = 5 // base priority
    
    // Adjust for score
    if (score < 50) priority += 3
    else if (score < 70) priority += 2
    else if (score < 85) priority += 1
    
    // Adjust for impact
    if (impact === 'high') priority += 2
    else if (impact === 'medium') priority += 1
    
    // Adjust for effort (inverse relationship)
    if (effort === 'low') priority += 1
    else if (effort === 'high') priority -= 1
    
    return Math.max(1, Math.min(10, priority))
  }

  private getImprovementSteps(dimension: string): string[] {
    const stepMap: { [key: string]: string[] } = {
      accuracy: [
        'Review data extraction algorithms',
        'Improve AI model training',
        'Implement additional validation checks',
        'Test with diverse document types'
      ],
      completeness: [
        'Identify missing data patterns',
        'Enhance extraction coverage',
        'Implement completeness validation',
        'Add fallback extraction methods'
      ],
      consistency: [
        'Implement cross-validation checks',
        'Add consistency rules',
        'Review data correlation logic',
        'Test edge cases'
      ],
      compliance: [
        'Review EOSCAR specifications',
        'Update compliance validation rules',
        'Test with bureau requirements',
        'Implement format checking'
      ]
    }
    return stepMap[dimension] || ['Review and improve system components']
  }

  private getEstimatedTimeframe(effort: string): string {
    const timeframeMap: { [key: string]: string } = {
      low: '1-2 weeks',
      medium: '2-4 weeks',
      high: '1-2 months'
    }
    return timeframeMap[effort] || '2-4 weeks'
  }

  private getImprovementDependencies(dimension: string): string[] {
    const dependencyMap: { [key: string]: string[] } = {
      accuracy: ['AI model updates', 'training data'],
      completeness: ['extraction algorithms', 'validation rules'],
      consistency: ['validation system', 'data correlation logic'],
      compliance: ['EOSCAR specifications', 'bureau requirements']
    }
    return dependencyMap[dimension] || []
  }

  private getSuccessMetrics(dimension: string): string[] {
    const metricsMap: { [key: string]: string[] } = {
      accuracy: ['Increase accuracy score by 10%', 'Reduce false positives by 50%'],
      completeness: ['Achieve 95% completeness', 'Reduce missing data by 75%'],
      consistency: ['Achieve 90% consistency score', 'Eliminate major inconsistencies'],
      compliance: ['Achieve 98% compliance score', 'Pass all bureau validations']
    }
    return metricsMap[dimension] || ['Improve score by 10%']
  }

  private determineOverallHealth(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent'
    if (score >= 80) return 'good'
    if (score >= 70) return 'fair'
    return 'poor'
  }
}

export const qualityAssuranceEngine = new QualityAssuranceEngine()