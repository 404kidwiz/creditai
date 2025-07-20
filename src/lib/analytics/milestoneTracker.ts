/**
 * Milestone Tracker and Achievement System
 * 
 * This module handles milestone tracking, achievement notifications,
 * and gamification elements for the dispute progress system.
 */

import { 
  EnhancedDisputeRecord,
  DisputePhase,
  DisputeMilestone,
  DisputeStatus
} from '@/types/enhanced-credit'

export interface MilestoneDefinition {
  id: string
  title: string
  description: string
  phase: DisputePhase
  category: 'progress' | 'time' | 'quality' | 'outcome'
  points: number
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
  conditions: MilestoneCondition[]
  rewards: MilestoneReward[]
  dependencies?: string[]
}

export interface MilestoneCondition {
  type: 'status_change' | 'time_elapsed' | 'response_received' | 'success_rate' | 'custom'
  field?: string
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'exists'
  value: any
  description: string
}

export interface MilestoneReward {
  type: 'points' | 'badge' | 'unlock' | 'notification'
  value: any
  description: string
}

export interface AchievementNotification {
  id: string
  userId: string
  disputeId?: string
  milestoneId: string
  title: string
  description: string
  points: number
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
  unlockedAt: Date
  notificationSent: boolean
  metadata?: Record<string, any>
}

export interface UserProgress {
  userId: string
  totalPoints: number
  level: number
  unlockedAchievements: string[]
  milestoneProgress: Record<string, MilestoneProgress>
  streaks: ProgressStreak[]
  statistics: UserStatistics
}

export interface MilestoneProgress {
  milestoneId: string
  progress: number // 0-100 percentage
  completed: boolean
  completedAt?: Date
  currentStep: number
  totalSteps: number
  nextRequirement?: string
}

export interface ProgressStreak {
  type: 'daily_activity' | 'weekly_progress' | 'monthly_disputes' | 'success_streak'
  currentStreak: number
  longestStreak: number
  lastActivity: Date
  isActive: boolean
}

export interface UserStatistics {
  totalDisputes: number
  successfulDisputes: number
  averageResponseTime: number
  totalScoreImprovement: number
  fastestResolution: number
  longestStreak: number
  achievementsUnlocked: number
  currentLevel: number
}

export class MilestoneTracker {
  private milestoneDefinitions: Map<string, MilestoneDefinition> = new Map()
  private userProgress: Map<string, UserProgress> = new Map()

  constructor() {
    this.initializeMilestoneDefinitions()
  }

  /**
   * Initialize predefined milestone definitions
   */
  private initializeMilestoneDefinitions(): void {
    const milestones: MilestoneDefinition[] = [
      // Progress Milestones
      {
        id: 'first_dispute',
        title: 'Credit Warrior',
        description: 'Filed your first credit dispute',
        phase: DisputePhase.PREPARATION,
        category: 'progress',
        points: 100,
        rarity: 'common',
        conditions: [
          {
            type: 'status_change',
            field: 'status',
            operator: 'equals',
            value: 'submitted',
            description: 'Dispute status changed to submitted'
          }
        ],
        rewards: [
          {
            type: 'badge',
            value: 'credit_warrior_badge',
            description: 'Credit Warrior badge'
          },
          {
            type: 'points',
            value: 100,
            description: '100 experience points'
          }
        ]
      },
      {
        id: 'triple_threat',
        title: 'Triple Threat',
        description: 'Disputed with all three credit bureaus simultaneously',
        phase: DisputePhase.SUBMISSION,
        category: 'progress',
        points: 250,
        rarity: 'uncommon',
        conditions: [
          {
            type: 'custom',
            operator: 'equals',
            value: 3,
            description: 'Submitted to all three bureaus'
          }
        ],
        rewards: [
          {
            type: 'badge',
            value: 'triple_threat_badge',
            description: 'Triple Threat badge'
          },
          {
            type: 'points',
            value: 250,
            description: '250 experience points'
          }
        ]
      },
      {
        id: 'speed_demon',
        title: 'Speed Demon',
        description: 'Received bureau response in under 15 days',
        phase: DisputePhase.INVESTIGATION,
        category: 'time',
        points: 200,
        rarity: 'rare',
        conditions: [
          {
            type: 'time_elapsed',
            operator: 'less_than',
            value: 15,
            description: 'Response received in under 15 days'
          }
        ],
        rewards: [
          {
            type: 'badge',
            value: 'speed_demon_badge',
            description: 'Speed Demon badge'
          }
        ]
      },
      {
        id: 'perfect_score',
        title: 'Perfect Score',
        description: 'Achieved 100% success rate on first 5 disputes',
        phase: DisputePhase.RESOLUTION,
        category: 'quality',
        points: 500,
        rarity: 'legendary',
        conditions: [
          {
            type: 'success_rate',
            operator: 'equals',
            value: 100,
            description: '100% success rate on first 5 disputes'
          }
        ],
        rewards: [
          {
            type: 'badge',
            value: 'perfect_score_badge',
            description: 'Perfect Score badge'
          },
          {
            type: 'unlock',
            value: 'premium_features',
            description: 'Unlock premium features'
          }
        ]
      },
      {
        id: 'persistence_pays',
        title: 'Persistence Pays',
        description: 'Successfully resolved a dispute after 3 escalations',
        phase: DisputePhase.ESCALATION,
        category: 'outcome',
        points: 300,
        rarity: 'rare',
        conditions: [
          {
            type: 'custom',
            operator: 'greater_than',
            value: 2,
            description: 'Dispute escalated 3+ times before resolution'
          }
        ],
        rewards: [
          {
            type: 'badge',
            value: 'persistence_badge',
            description: 'Persistence Pays badge'
          }
        ]
      },
      {
        id: 'score_booster',
        title: 'Score Booster',
        description: 'Improved credit score by 50+ points',
        phase: DisputePhase.RESOLUTION,
        category: 'outcome',
        points: 400,
        rarity: 'rare',
        conditions: [
          {
            type: 'custom',
            operator: 'greater_than',
            value: 50,
            description: 'Credit score improved by 50+ points'
          }
        ],
        rewards: [
          {
            type: 'badge',
            value: 'score_booster_badge',
            description: 'Score Booster badge'
          }
        ]
      },
      {
        id: 'consistency_king',
        title: 'Consistency King',
        description: 'Maintained 80%+ success rate over 10 disputes',
        phase: DisputePhase.RESOLUTION,
        category: 'quality',
        points: 350,
        rarity: 'rare',
        conditions: [
          {
            type: 'success_rate',
            operator: 'greater_than',
            value: 80,
            description: '80%+ success rate over 10 disputes'
          }
        ],
        rewards: [
          {
            type: 'badge',
            value: 'consistency_badge',
            description: 'Consistency King badge'
          }
        ]
      },
      {
        id: 'marathon_runner',
        title: 'Marathon Runner',
        description: 'Active dispute journey for 6+ months',
        phase: DisputePhase.CLOSED,
        category: 'time',
        points: 200,
        rarity: 'uncommon',
        conditions: [
          {
            type: 'time_elapsed',
            operator: 'greater_than',
            value: 180,
            description: 'Active for 6+ months'
          }
        ],
        rewards: [
          {
            type: 'badge',
            value: 'marathon_badge',
            description: 'Marathon Runner badge'
          }
        ]
      }
    ]

    milestones.forEach(milestone => {
      this.milestoneDefinitions.set(milestone.id, milestone)
    })
  }

  /**
   * Check for milestone achievements when dispute is updated
   */
  async checkMilestones(
    userId: string,
    dispute: EnhancedDisputeRecord,
    allUserDisputes: EnhancedDisputeRecord[]
  ): Promise<AchievementNotification[]> {
    const achievements: AchievementNotification[] = []
    const userProgress = await this.getUserProgress(userId)

    for (const [milestoneId, milestone] of this.milestoneDefinitions) {
      // Skip if already achieved
      if (userProgress.unlockedAchievements.includes(milestoneId)) {
        continue
      }

      // Check if milestone conditions are met
      const isAchieved = await this.evaluateMilestoneConditions(
        milestone,
        dispute,
        allUserDisputes,
        userProgress
      )

      if (isAchieved) {
        const notification = await this.createAchievementNotification(
          userId,
          dispute.id,
          milestone
        )
        achievements.push(notification)

        // Update user progress
        await this.updateUserProgress(userId, milestone, notification)
      }
    }

    return achievements
  }

  /**
   * Get user's current progress and statistics
   */
  async getUserProgress(userId: string): Promise<UserProgress> {
    if (!this.userProgress.has(userId)) {
      // Initialize new user progress
      const newProgress: UserProgress = {
        userId,
        totalPoints: 0,
        level: 1,
        unlockedAchievements: [],
        milestoneProgress: {},
        streaks: [],
        statistics: {
          totalDisputes: 0,
          successfulDisputes: 0,
          averageResponseTime: 0,
          totalScoreImprovement: 0,
          fastestResolution: 0,
          longestStreak: 0,
          achievementsUnlocked: 0,
          currentLevel: 1
        }
      }
      this.userProgress.set(userId, newProgress)
    }

    return this.userProgress.get(userId)!
  }

  /**
   * Calculate milestone progress for a specific milestone
   */
  async calculateMilestoneProgress(
    milestoneId: string,
    userId: string,
    disputes: EnhancedDisputeRecord[]
  ): Promise<MilestoneProgress> {
    const milestone = this.milestoneDefinitions.get(milestoneId)
    if (!milestone) {
      throw new Error(`Milestone ${milestoneId} not found`)
    }

    const userProgress = await this.getUserProgress(userId)
    let progress = 0
    let currentStep = 0
    const totalSteps = milestone.conditions.length

    // Evaluate each condition
    for (const condition of milestone.conditions) {
      const conditionMet = await this.evaluateCondition(condition, disputes, userProgress)
      if (conditionMet) {
        currentStep++
      }
    }

    progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0
    const completed = progress >= 100

    return {
      milestoneId,
      progress,
      completed,
      completedAt: completed ? new Date() : undefined,
      currentStep,
      totalSteps,
      nextRequirement: this.getNextRequirement(milestone, currentStep)
    }
  }

  /**
   * Get all available milestones with progress
   */
  async getAllMilestonesWithProgress(
    userId: string,
    disputes: EnhancedDisputeRecord[]
  ): Promise<(MilestoneDefinition & { progress: MilestoneProgress })[]> {
    const milestonesWithProgress = []

    for (const [milestoneId, milestone] of this.milestoneDefinitions) {
      const progress = await this.calculateMilestoneProgress(milestoneId, userId, disputes)
      milestonesWithProgress.push({
        ...milestone,
        progress
      })
    }

    return milestonesWithProgress.sort((a, b) => b.progress.progress - a.progress.progress)
  }

  /**
   * Update user streaks based on activity
   */
  async updateStreaks(userId: string, activityType: string): Promise<void> {
    const userProgress = await this.getUserProgress(userId)
    const now = new Date()

    // Find or create streak
    let streak = userProgress.streaks.find(s => s.type === activityType as any)
    if (!streak) {
      streak = {
        type: activityType as any,
        currentStreak: 0,
        longestStreak: 0,
        lastActivity: now,
        isActive: true
      }
      userProgress.streaks.push(streak)
    }

    // Check if streak should continue or reset
    const daysSinceLastActivity = Math.floor(
      (now.getTime() - streak.lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceLastActivity <= 1) {
      // Continue streak
      streak.currentStreak++
      streak.isActive = true
    } else if (daysSinceLastActivity > 7) {
      // Reset streak
      streak.currentStreak = 1
      streak.isActive = true
    }

    // Update longest streak
    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak
    }

    streak.lastActivity = now
  }

  /**
   * Calculate user level based on total points
   */
  calculateLevel(totalPoints: number): number {
    // Level calculation: 100 points for level 1, then 200 more for each subsequent level
    if (totalPoints < 100) return 1
    return Math.floor((totalPoints - 100) / 200) + 2
  }

  /**
   * Get points required for next level
   */
  getPointsForNextLevel(currentLevel: number): number {
    if (currentLevel === 1) return 100
    return 100 + (currentLevel - 1) * 200
  }

  /**
   * Evaluate milestone conditions
   */
  private async evaluateMilestoneConditions(
    milestone: MilestoneDefinition,
    dispute: EnhancedDisputeRecord,
    allDisputes: EnhancedDisputeRecord[],
    userProgress: UserProgress
  ): Promise<boolean> {
    for (const condition of milestone.conditions) {
      const conditionMet = await this.evaluateCondition(condition, allDisputes, userProgress, dispute)
      if (!conditionMet) {
        return false
      }
    }
    return true
  }

  /**
   * Evaluate individual condition
   */
  private async evaluateCondition(
    condition: MilestoneCondition,
    disputes: EnhancedDisputeRecord[],
    userProgress: UserProgress,
    currentDispute?: EnhancedDisputeRecord
  ): Promise<boolean> {
    switch (condition.type) {
      case 'status_change':
        return currentDispute?.status === condition.value

      case 'time_elapsed':
        if (!currentDispute) return false
        const daysElapsed = Math.floor(
          (Date.now() - new Date(currentDispute.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        )
        return this.compareValues(daysElapsed, condition.operator, condition.value)

      case 'response_received':
        return currentDispute?.responses && currentDispute.responses.length > 0

      case 'success_rate':
        const successfulDisputes = disputes.filter(d => d.status === DisputeStatus.RESOLVED).length
        const successRate = disputes.length > 0 ? (successfulDisputes / disputes.length) * 100 : 0
        return this.compareValues(successRate, condition.operator, condition.value)

      case 'custom':
        return this.evaluateCustomCondition(condition, disputes, userProgress, currentDispute)

      default:
        return false
    }
  }

  /**
   * Evaluate custom conditions
   */
  private evaluateCustomCondition(
    condition: MilestoneCondition,
    disputes: EnhancedDisputeRecord[],
    userProgress: UserProgress,
    currentDispute?: EnhancedDisputeRecord
  ): boolean {
    // Custom condition logic based on description
    if (condition.description.includes('all three bureaus')) {
      return currentDispute?.bureauSubmissions?.length === 3
    }

    if (condition.description.includes('escalated 3+ times')) {
      // Check if dispute has been escalated multiple times
      return currentDispute?.status === DisputeStatus.RESOLVED && 
             currentDispute?.followUpActions?.length >= 3
    }

    if (condition.description.includes('Credit score improved')) {
      return (currentDispute?.estimatedImpact || 0) >= condition.value
    }

    if (condition.description.includes('success rate over 10 disputes')) {
      const successfulDisputes = disputes.filter(d => d.status === DisputeStatus.RESOLVED).length
      const successRate = disputes.length >= 10 ? (successfulDisputes / disputes.length) * 100 : 0
      return disputes.length >= 10 && successRate >= condition.value
    }

    if (condition.description.includes('Active for 6+ months')) {
      const oldestDispute = disputes.reduce((oldest, dispute) => 
        new Date(dispute.createdAt) < new Date(oldest.createdAt) ? dispute : oldest
      )
      const monthsActive = Math.floor(
        (Date.now() - new Date(oldestDispute.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
      )
      return monthsActive >= 6
    }

    return false
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected
      case 'greater_than':
        return actual > expected
      case 'less_than':
        return actual < expected
      case 'contains':
        return Array.isArray(actual) ? actual.includes(expected) : actual.toString().includes(expected)
      case 'exists':
        return actual !== null && actual !== undefined
      default:
        return false
    }
  }

  /**
   * Create achievement notification
   */
  private async createAchievementNotification(
    userId: string,
    disputeId: string,
    milestone: MilestoneDefinition
  ): Promise<AchievementNotification> {
    return {
      id: `achievement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      disputeId,
      milestoneId: milestone.id,
      title: milestone.title,
      description: milestone.description,
      points: milestone.points,
      rarity: milestone.rarity,
      unlockedAt: new Date(),
      notificationSent: false,
      metadata: {
        category: milestone.category,
        phase: milestone.phase
      }
    }
  }

  /**
   * Update user progress after achievement
   */
  private async updateUserProgress(
    userId: string,
    milestone: MilestoneDefinition,
    notification: AchievementNotification
  ): Promise<void> {
    const userProgress = await this.getUserProgress(userId)
    
    // Add achievement to unlocked list
    userProgress.unlockedAchievements.push(milestone.id)
    
    // Add points
    userProgress.totalPoints += milestone.points
    
    // Update level
    userProgress.level = this.calculateLevel(userProgress.totalPoints)
    
    // Update statistics
    userProgress.statistics.achievementsUnlocked = userProgress.unlockedAchievements.length
    userProgress.statistics.currentLevel = userProgress.level
    
    // Update milestone progress
    userProgress.milestoneProgress[milestone.id] = {
      milestoneId: milestone.id,
      progress: 100,
      completed: true,
      completedAt: notification.unlockedAt,
      currentStep: milestone.conditions.length,
      totalSteps: milestone.conditions.length
    }
  }

  /**
   * Get next requirement for milestone
   */
  private getNextRequirement(milestone: MilestoneDefinition, currentStep: number): string | undefined {
    if (currentStep < milestone.conditions.length) {
      return milestone.conditions[currentStep].description
    }
    return undefined
  }
}

export const milestoneTracker = new MilestoneTracker()