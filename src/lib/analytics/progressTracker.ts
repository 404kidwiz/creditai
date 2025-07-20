/**
 * Progress Tracker for Dispute Journey Visualization
 * 
 * This module provides comprehensive dispute progress tracking with timeline
 * visualization, milestone tracking, and achievement notifications.
 */

import { 
  EnhancedDisputeRecord, 
  DisputePhase, 
  DisputeMilestone, 
  DisputeTimelineEntry,
  DisputeStatus,
  BureauResponse,
  FollowUpAction
} from '@/types/enhanced-credit'

export interface ProgressMetrics {
  overallProgress: number // 0-100 percentage
  currentPhase: DisputePhase
  completedMilestones: number
  totalMilestones: number
  daysElapsed: number
  estimatedDaysRemaining: number
  successProbability: number
  scoreImpactPotential: number
}

export interface TimelineVisualization {
  phases: PhaseProgress[]
  milestones: MilestoneProgress[]
  events: TimelineEvent[]
  projectedCompletion: Date
  criticalPath: string[]
}

export interface PhaseProgress {
  phase: DisputePhase
  status: 'completed' | 'in_progress' | 'pending' | 'overdue'
  startDate?: Date
  completedDate?: Date
  expectedDuration: number // days
  actualDuration?: number // days
  progress: number // 0-100 percentage
  keyActivities: string[]
  blockers: string[]
}

export interface MilestoneProgress {
  id: string
  title: string
  description: string
  phase: DisputePhase
  targetDate: Date
  completedDate?: Date
  status: 'completed' | 'in_progress' | 'pending' | 'overdue'
  importance: 'critical' | 'high' | 'medium' | 'low'
  dependencies: string[]
  achievements: Achievement[]
}

export interface TimelineEvent {
  id: string
  timestamp: Date
  eventType: 'milestone' | 'response' | 'action' | 'escalation' | 'achievement'
  title: string
  description: string
  actor: 'user' | 'system' | 'bureau' | 'attorney'
  impact: 'positive' | 'negative' | 'neutral'
  metadata?: Record<string, any>
}

export interface Achievement {
  id: string
  title: string
  description: string
  type: 'milestone' | 'speed' | 'success' | 'persistence'
  points: number
  unlockedAt: Date
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
}

export interface ProgressReport {
  disputeId: string
  userId: string
  reportDate: Date
  metrics: ProgressMetrics
  timeline: TimelineVisualization
  achievements: Achievement[]
  recommendations: string[]
  nextSteps: string[]
  riskFactors: string[]
}

export class ProgressTracker {
  private readonly PHASE_DURATIONS: Record<DisputePhase, number> = {
    [DisputePhase.PREPARATION]: 3,
    [DisputePhase.SUBMISSION]: 1,
    [DisputePhase.INVESTIGATION]: 30,
    [DisputePhase.RESPONSE]: 7,
    [DisputePhase.FOLLOW_UP]: 14,
    [DisputePhase.ESCALATION]: 21,
    [DisputePhase.RESOLUTION]: 7,
    [DisputePhase.CLOSED]: 0
  }

  private readonly MILESTONE_TEMPLATES: Record<DisputePhase, string[]> = {
    [DisputePhase.PREPARATION]: [
      'Dispute strategy finalized',
      'Supporting documents gathered',
      'EOSCAR letter generated',
      'Legal basis validated'
    ],
    [DisputePhase.SUBMISSION]: [
      'Letters submitted to bureaus',
      'Delivery confirmations received',
      'Tracking numbers obtained'
    ],
    [DisputePhase.INVESTIGATION]: [
      'Investigation initiated',
      '15-day checkpoint',
      '30-day deadline approaching'
    ],
    [DisputePhase.RESPONSE]: [
      'Bureau responses received',
      'Response analysis completed',
      'Next steps determined'
    ],
    [DisputePhase.FOLLOW_UP]: [
      'Follow-up letters sent',
      'Additional evidence provided',
      'Escalation triggers evaluated'
    ],
    [DisputePhase.ESCALATION]: [
      'CFPB complaint filed',
      'Attorney consultation scheduled',
      'Regulatory response received'
    ],
    [DisputePhase.RESOLUTION]: [
      'Final outcomes received',
      'Credit reports updated',
      'Score impact verified'
    ],
    [DisputePhase.CLOSED]: [
      'Case documentation completed',
      'Success metrics recorded'
    ]
  }

  /**
   * Calculate comprehensive progress metrics for a dispute
   */
  async calculateProgress(dispute: EnhancedDisputeRecord): Promise<ProgressMetrics> {
    const currentPhase = this.getCurrentPhase(dispute)
    const completedMilestones = this.getCompletedMilestones(dispute)
    const totalMilestones = this.getTotalMilestones(dispute)
    const daysElapsed = this.calculateDaysElapsed(dispute.createdAt)
    const estimatedDaysRemaining = this.estimateRemainingDays(dispute)
    
    const overallProgress = this.calculateOverallProgress(
      dispute,
      completedMilestones,
      totalMilestones
    )

    return {
      overallProgress,
      currentPhase,
      completedMilestones,
      totalMilestones,
      daysElapsed,
      estimatedDaysRemaining,
      successProbability: dispute.successProbability || 0,
      scoreImpactPotential: dispute.estimatedImpact || 0
    }
  }

  /**
   * Generate timeline visualization for dispute journey
   */
  async generateTimeline(dispute: EnhancedDisputeRecord): Promise<TimelineVisualization> {
    const phases = await this.generatePhaseProgress(dispute)
    const milestones = await this.generateMilestoneProgress(dispute)
    const events = await this.generateTimelineEvents(dispute)
    const projectedCompletion = this.calculateProjectedCompletion(dispute)
    const criticalPath = this.identifyCriticalPath(dispute)

    return {
      phases,
      milestones,
      events,
      projectedCompletion,
      criticalPath
    }
  }

  /**
   * Generate comprehensive progress report
   */
  async generateProgressReport(dispute: EnhancedDisputeRecord): Promise<ProgressReport> {
    const metrics = await this.calculateProgress(dispute)
    const timeline = await this.generateTimeline(dispute)
    const achievements = await this.calculateAchievements(dispute)
    const recommendations = await this.generateRecommendations(dispute, metrics)
    const nextSteps = await this.generateNextSteps(dispute)
    const riskFactors = await this.identifyRiskFactors(dispute, metrics)

    return {
      disputeId: dispute.id,
      userId: dispute.userId,
      reportDate: new Date(),
      metrics,
      timeline,
      achievements,
      recommendations,
      nextSteps,
      riskFactors
    }
  }

  /**
   * Track milestone completion and trigger achievements
   */
  async trackMilestone(
    disputeId: string,
    milestoneId: string,
    completedAt: Date = new Date()
  ): Promise<Achievement[]> {
    // This would typically update the database
    // For now, we'll return potential achievements
    
    const achievements: Achievement[] = []
    
    // Check for speed achievements
    const speedAchievement = this.checkSpeedAchievement(milestoneId, completedAt)
    if (speedAchievement) {
      achievements.push(speedAchievement)
    }
    
    // Check for milestone achievements
    const milestoneAchievement = this.checkMilestoneAchievement(milestoneId)
    if (milestoneAchievement) {
      achievements.push(milestoneAchievement)
    }
    
    return achievements
  }

  /**
   * Get current phase based on dispute status and timeline
   */
  private getCurrentPhase(dispute: EnhancedDisputeRecord): DisputePhase {
    if (dispute.trackingInfo?.currentPhase) {
      return dispute.trackingInfo.currentPhase
    }

    // Infer phase from status
    switch (dispute.status) {
      case DisputeStatus.DRAFT:
        return DisputePhase.PREPARATION
      case DisputeStatus.SUBMITTED:
        return DisputePhase.INVESTIGATION
      case DisputeStatus.IN_PROGRESS:
        return DisputePhase.INVESTIGATION
      case DisputeStatus.RESPONDED:
        return DisputePhase.RESPONSE
      case DisputeStatus.PARTIALLY_RESOLVED:
        return DisputePhase.FOLLOW_UP
      case DisputeStatus.ESCALATED:
        return DisputePhase.ESCALATION
      case DisputeStatus.RESOLVED:
        return DisputePhase.RESOLUTION
      case DisputeStatus.CLOSED:
        return DisputePhase.CLOSED
      default:
        return DisputePhase.PREPARATION
    }
  }

  /**
   * Calculate completed milestones
   */
  private getCompletedMilestones(dispute: EnhancedDisputeRecord): number {
    if (!dispute.trackingInfo?.milestones) {
      return 0
    }

    return dispute.trackingInfo.milestones.filter(
      milestone => milestone.status === 'completed'
    ).length
  }

  /**
   * Calculate total expected milestones
   */
  private getTotalMilestones(dispute: EnhancedDisputeRecord): number {
    const currentPhase = this.getCurrentPhase(dispute)
    const phases = Object.values(DisputePhase)
    const currentPhaseIndex = phases.indexOf(currentPhase)
    
    let totalMilestones = 0
    for (let i = 0; i <= currentPhaseIndex; i++) {
      const phase = phases[i]
      totalMilestones += this.MILESTONE_TEMPLATES[phase]?.length || 0
    }
    
    return totalMilestones
  }

  /**
   * Calculate days elapsed since dispute creation
   */
  private calculateDaysElapsed(createdAt: Date | string): number {
    const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - created.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Estimate remaining days to completion
   */
  private estimateRemainingDays(dispute: EnhancedDisputeRecord): number {
    const currentPhase = this.getCurrentPhase(dispute)
    const phases = Object.values(DisputePhase)
    const currentPhaseIndex = phases.indexOf(currentPhase)
    
    let remainingDays = 0
    for (let i = currentPhaseIndex; i < phases.length; i++) {
      const phase = phases[i]
      remainingDays += this.PHASE_DURATIONS[phase]
    }
    
    return remainingDays
  }

  /**
   * Calculate overall progress percentage
   */
  private calculateOverallProgress(
    dispute: EnhancedDisputeRecord,
    completedMilestones: number,
    totalMilestones: number
  ): number {
    if (totalMilestones === 0) return 0
    
    const milestoneProgress = (completedMilestones / totalMilestones) * 100
    
    // Adjust based on current phase
    const currentPhase = this.getCurrentPhase(dispute)
    const phases = Object.values(DisputePhase)
    const phaseProgress = (phases.indexOf(currentPhase) / phases.length) * 100
    
    // Weighted average: 70% milestone completion, 30% phase progression
    return Math.round((milestoneProgress * 0.7) + (phaseProgress * 0.3))
  }

  /**
   * Generate phase progress information
   */
  private async generatePhaseProgress(dispute: EnhancedDisputeRecord): Promise<PhaseProgress[]> {
    const phases = Object.values(DisputePhase)
    const currentPhase = this.getCurrentPhase(dispute)
    const currentPhaseIndex = phases.indexOf(currentPhase)
    
    return phases.map((phase, index) => {
      let status: 'completed' | 'in_progress' | 'pending' | 'overdue'
      
      if (index < currentPhaseIndex) {
        status = 'completed'
      } else if (index === currentPhaseIndex) {
        status = 'in_progress'
      } else {
        status = 'pending'
      }
      
      return {
        phase,
        status,
        expectedDuration: this.PHASE_DURATIONS[phase],
        progress: status === 'completed' ? 100 : (status === 'in_progress' ? 50 : 0),
        keyActivities: this.MILESTONE_TEMPLATES[phase] || [],
        blockers: []
      }
    })
  }

  /**
   * Generate milestone progress information
   */
  private async generateMilestoneProgress(dispute: EnhancedDisputeRecord): Promise<MilestoneProgress[]> {
    const milestones: MilestoneProgress[] = []
    const createdAt = new Date(dispute.createdAt)
    
    Object.entries(this.MILESTONE_TEMPLATES).forEach(([phase, templates], phaseIndex) => {
      templates.forEach((template, templateIndex) => {
        const targetDate = new Date(createdAt)
        targetDate.setDate(targetDate.getDate() + (phaseIndex * 7) + templateIndex)
        
        milestones.push({
          id: `${phase}-${templateIndex}`,
          title: template,
          description: `${template} for ${phase} phase`,
          phase: phase as DisputePhase,
          targetDate,
          status: 'pending',
          importance: templateIndex === 0 ? 'high' : 'medium',
          dependencies: [],
          achievements: []
        })
      })
    })
    
    return milestones
  }

  /**
   * Generate timeline events
   */
  private async generateTimelineEvents(dispute: EnhancedDisputeRecord): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = []
    
    // Add creation event
    events.push({
      id: 'created',
      timestamp: new Date(dispute.createdAt),
      eventType: 'milestone',
      title: 'Dispute Created',
      description: 'Dispute case initiated',
      actor: 'user',
      impact: 'positive'
    })
    
    // Add submission events
    if (dispute.bureauSubmissions) {
      dispute.bureauSubmissions.forEach((submission, index) => {
        events.push({
          id: `submission-${index}`,
          timestamp: submission.submissionDate,
          eventType: 'action',
          title: `Submitted to ${submission.bureau}`,
          description: `Dispute letter submitted via ${submission.submissionMethod}`,
          actor: 'system',
          impact: 'positive'
        })
      })
    }
    
    // Add response events
    if (dispute.responses) {
      dispute.responses.forEach((response, index) => {
        events.push({
          id: `response-${index}`,
          timestamp: response.responseDate,
          eventType: 'response',
          title: `Response from ${response.bureau}`,
          description: `${response.responseType}: ${response.outcome}`,
          actor: 'bureau',
          impact: response.outcome === 'DELETED' ? 'positive' : 'neutral'
        })
      })
    }
    
    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  /**
   * Calculate projected completion date
   */
  private calculateProjectedCompletion(dispute: EnhancedDisputeRecord): Date {
    const estimatedDays = this.estimateRemainingDays(dispute)
    const completion = new Date()
    completion.setDate(completion.getDate() + estimatedDays)
    return completion
  }

  /**
   * Identify critical path items
   */
  private identifyCriticalPath(dispute: EnhancedDisputeRecord): string[] {
    return [
      'Submit dispute letters',
      'Await bureau investigation',
      'Analyze responses',
      'Execute follow-up strategy',
      'Verify credit report updates'
    ]
  }

  /**
   * Calculate achievements based on dispute progress
   */
  private async calculateAchievements(dispute: EnhancedDisputeRecord): Promise<Achievement[]> {
    const achievements: Achievement[] = []
    
    // First dispute achievement
    achievements.push({
      id: 'first-dispute',
      title: 'Credit Warrior',
      description: 'Filed your first credit dispute',
      type: 'milestone',
      points: 100,
      unlockedAt: new Date(dispute.createdAt),
      rarity: 'common'
    })
    
    // Multi-bureau achievement
    if (dispute.bureauSubmissions && dispute.bureauSubmissions.length >= 3) {
      achievements.push({
        id: 'triple-threat',
        title: 'Triple Threat',
        description: 'Disputed with all three credit bureaus',
        type: 'milestone',
        points: 250,
        unlockedAt: new Date(),
        rarity: 'uncommon'
      })
    }
    
    return achievements
  }

  /**
   * Generate recommendations based on progress
   */
  private async generateRecommendations(
    dispute: EnhancedDisputeRecord,
    metrics: ProgressMetrics
  ): Promise<string[]> {
    const recommendations: string[] = []
    
    if (metrics.overallProgress < 25) {
      recommendations.push('Consider gathering additional supporting documentation')
      recommendations.push('Review dispute strategy for potential improvements')
    }
    
    if (metrics.daysElapsed > 35 && metrics.currentPhase === DisputePhase.INVESTIGATION) {
      recommendations.push('Bureau response is overdue - consider escalation')
      recommendations.push('File CFPB complaint for non-responsive bureau')
    }
    
    if (metrics.successProbability < 50) {
      recommendations.push('Consider alternative dispute strategies')
      recommendations.push('Consult with credit repair attorney')
    }
    
    return recommendations
  }

  /**
   * Generate next steps based on current progress
   */
  private async generateNextSteps(dispute: EnhancedDisputeRecord): Promise<string[]> {
    const currentPhase = this.getCurrentPhase(dispute)
    const nextSteps: string[] = []
    
    switch (currentPhase) {
      case DisputePhase.PREPARATION:
        nextSteps.push('Finalize dispute strategy')
        nextSteps.push('Generate EOSCAR-compliant letters')
        nextSteps.push('Submit to credit bureaus')
        break
        
      case DisputePhase.INVESTIGATION:
        nextSteps.push('Monitor for bureau responses')
        nextSteps.push('Prepare follow-up documentation')
        nextSteps.push('Track response deadlines')
        break
        
      case DisputePhase.RESPONSE:
        nextSteps.push('Analyze bureau responses')
        nextSteps.push('Determine follow-up actions')
        nextSteps.push('Update dispute strategy')
        break
        
      default:
        nextSteps.push('Continue monitoring dispute progress')
    }
    
    return nextSteps
  }

  /**
   * Identify risk factors that could impact success
   */
  private async identifyRiskFactors(
    dispute: EnhancedDisputeRecord,
    metrics: ProgressMetrics
  ): Promise<string[]> {
    const riskFactors: string[] = []
    
    if (metrics.daysElapsed > 45) {
      riskFactors.push('Extended timeline may indicate complex case')
    }
    
    if (metrics.successProbability < 30) {
      riskFactors.push('Low success probability based on historical data')
    }
    
    if (!dispute.legalBasis || dispute.legalBasis.length === 0) {
      riskFactors.push('Weak legal basis may reduce success chances')
    }
    
    return riskFactors
  }

  /**
   * Check for speed-based achievements
   */
  private checkSpeedAchievement(milestoneId: string, completedAt: Date): Achievement | null {
    // Implementation would check if milestone was completed faster than average
    return null
  }

  /**
   * Check for milestone-based achievements
   */
  private checkMilestoneAchievement(milestoneId: string): Achievement | null {
    // Implementation would check for specific milestone achievements
    return null
  }
}

export const progressTracker = new ProgressTracker()