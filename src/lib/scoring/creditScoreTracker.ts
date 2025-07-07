import { supabase } from '@/lib/supabase/client'

export interface CreditScore {
  id: string
  userId: string
  score: number
  bureau: 'experian' | 'equifax' | 'transunion'
  scoreType: 'fico' | 'vantage' | 'other'
  scoreRange: { min: number; max: number }
  reportDate: Date
  factors: ScoreFactor[]
  accounts: AccountSummary[]
  utilization: UtilizationData
  createdAt: Date
}

export interface ScoreFactor {
  factor: string
  impact: 'positive' | 'negative' | 'neutral'
  weight: number
  description: string
  points: number
}

export interface AccountSummary {
  accountType: string
  count: number
  totalBalance: number
  totalLimit: number
  oldestAccount: string
  newestAccount: string
  avgAge: number
}

export interface UtilizationData {
  overall: number
  perCard: Array<{
    cardName: string
    balance: number
    limit: number
    utilization: number
  }>
  recommendedUtilization: number
}

export interface ScoreTrend {
  period: string
  startScore: number
  endScore: number
  change: number
  changePercent: number
  factors: string[]
}

export interface ScoreGoal {
  id: string
  userId: string
  targetScore: number
  targetDate: Date
  currentScore: number
  progress: number
  strategies: string[]
  milestones: ScoreMilestone[]
  status: 'active' | 'completed' | 'paused'
  createdAt: Date
}

export interface ScoreMilestone {
  score: number
  targetDate: Date
  achieved: boolean
  achievedDate?: Date
  actions: string[]
}

export interface ScoreAlert {
  id: string
  userId: string
  type: 'score_increase' | 'score_decrease' | 'new_account' | 'inquiry' | 'negative_item' | 'goal_progress'
  title: string
  message: string
  severity: 'info' | 'warning' | 'success' | 'error'
  isRead: boolean
  createdAt: Date
  metadata?: Record<string, any>
}

export class CreditScoreTracker {
  /**
   * Add a new credit score entry
   */
  async addCreditScore(
    userId: string,
    scoreData: Omit<CreditScore, 'id' | 'userId' | 'createdAt'>
  ): Promise<CreditScore> {
    const creditScore: CreditScore = {
      id: this.generateId(),
      userId,
      ...scoreData,
      createdAt: new Date()
    }

    // Save to database
    const { error } = await supabase
      .from('credit_scores')
      .insert({
        id: creditScore.id,
        user_id: creditScore.userId,
        score: creditScore.score,
        bureau: creditScore.bureau,
        score_type: creditScore.scoreType,
        score_range: creditScore.scoreRange,
        report_date: creditScore.reportDate.toISOString(),
        factors: creditScore.factors,
        accounts: creditScore.accounts,
        utilization: creditScore.utilization,
        created_at: creditScore.createdAt.toISOString()
      })

    if (error) {
      console.error('Error saving credit score:', error)
      throw new Error('Failed to save credit score')
    }

    // Check for score changes and create alerts
    await this.checkScoreChanges(userId, creditScore)

    return creditScore
  }

  /**
   * Get user's credit score history
   */
  async getCreditScoreHistory(
    userId: string,
    limit: number = 12,
    bureau?: string
  ): Promise<CreditScore[]> {
    let query = supabase
      .from('credit_scores')
      .select('*')
      .eq('user_id', userId)
      .order('report_date', { ascending: false })
      .limit(limit)

    if (bureau) {
      query = query.eq('bureau', bureau)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching credit score history:', error)
      throw new Error('Failed to fetch credit score history')
    }

    return data.map(this.mapDatabaseToScore)
  }

  /**
   * Get latest credit score for user
   */
  async getLatestCreditScore(
    userId: string,
    bureau?: string
  ): Promise<CreditScore | null> {
    let query = supabase
      .from('credit_scores')
      .select('*')
      .eq('user_id', userId)
      .order('report_date', { ascending: false })
      .limit(1)

    if (bureau) {
      query = query.eq('bureau', bureau)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching latest credit score:', error)
      throw new Error('Failed to fetch latest credit score')
    }

    return data.length > 0 ? this.mapDatabaseToScore(data[0]) : null
  }

  /**
   * Calculate score trends over time
   */
  async getScoreTrends(
    userId: string,
    periods: string[] = ['1M', '3M', '6M', '1Y'],
    bureau?: string
  ): Promise<ScoreTrend[]> {
    const scores = await this.getCreditScoreHistory(userId, 50, bureau)
    const trends: ScoreTrend[] = []

    const now = new Date()
    
    for (const period of periods) {
      const startDate = this.getPeriodStartDate(now, period)
      const scoresInPeriod = scores.filter(score => 
        score.reportDate >= startDate
      )

      if (scoresInPeriod.length < 2) continue

      const latestScore = scoresInPeriod[0]
      const earliestScore = scoresInPeriod[scoresInPeriod.length - 1]
      
      const change = latestScore.score - earliestScore.score
      const changePercent = (change / earliestScore.score) * 100

      // Identify key factors that changed
      const factors = this.identifyChangingFactors(earliestScore, latestScore)

      trends.push({
        period,
        startScore: earliestScore.score,
        endScore: latestScore.score,
        change,
        changePercent,
        factors
      })
    }

    return trends
  }

  /**
   * Create or update score goal
   */
  async setScoreGoal(
    userId: string,
    targetScore: number,
    targetDate: Date,
    strategies: string[] = []
  ): Promise<ScoreGoal> {
    const currentScore = await this.getLatestCreditScore(userId)
    if (!currentScore) {
      throw new Error('No credit score found. Please add a credit score first.')
    }

    const progress = this.calculateGoalProgress(currentScore.score, targetScore)
    const milestones = this.generateMilestones(currentScore.score, targetScore, targetDate)

    const goal: ScoreGoal = {
      id: this.generateId(),
      userId,
      targetScore,
      targetDate,
      currentScore: currentScore.score,
      progress,
      strategies,
      milestones,
      status: 'active',
      createdAt: new Date()
    }

    // Save to database
    const { error } = await supabase
      .from('score_goals')
      .insert({
        id: goal.id,
        user_id: goal.userId,
        target_score: goal.targetScore,
        target_date: goal.targetDate.toISOString(),
        current_score: goal.currentScore,
        progress: goal.progress,
        strategies: goal.strategies,
        milestones: goal.milestones,
        status: goal.status,
        created_at: goal.createdAt.toISOString()
      })

    if (error) {
      console.error('Error saving score goal:', error)
      throw new Error('Failed to save score goal')
    }

    return goal
  }

  /**
   * Get user's score goals
   */
  async getScoreGoals(userId: string): Promise<ScoreGoal[]> {
    const { data, error } = await supabase
      .from('score_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching score goals:', error)
      throw new Error('Failed to fetch score goals')
    }

    return data.map(this.mapDatabaseToGoal)
  }

  /**
   * Create score alert
   */
  async createAlert(
    userId: string,
    type: ScoreAlert['type'],
    title: string,
    message: string,
    severity: ScoreAlert['severity'] = 'info',
    metadata?: Record<string, any>
  ): Promise<ScoreAlert> {
    const alert: ScoreAlert = {
      id: this.generateId(),
      userId,
      type,
      title,
      message,
      severity,
      isRead: false,
      createdAt: new Date(),
      metadata
    }

    const { error } = await supabase
      .from('score_alerts')
      .insert({
        id: alert.id,
        user_id: alert.userId,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        is_read: alert.isRead,
        metadata: alert.metadata,
        created_at: alert.createdAt.toISOString()
      })

    if (error) {
      console.error('Error creating alert:', error)
      throw new Error('Failed to create alert')
    }

    return alert
  }

  /**
   * Get user's alerts
   */
  async getAlerts(
    userId: string,
    unreadOnly: boolean = false,
    limit: number = 20
  ): Promise<ScoreAlert[]> {
    let query = supabase
      .from('score_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching alerts:', error)
      throw new Error('Failed to fetch alerts')
    }

    return data.map(this.mapDatabaseToAlert)
  }

  /**
   * Mark alert as read
   */
  async markAlertAsRead(alertId: string): Promise<void> {
    const { error } = await supabase
      .from('score_alerts')
      .update({ is_read: true })
      .eq('id', alertId)

    if (error) {
      console.error('Error marking alert as read:', error)
      throw new Error('Failed to mark alert as read')
    }
  }

  /**
   * Generate score improvement recommendations
   */
  async getScoreRecommendations(userId: string): Promise<string[]> {
    const latestScore = await this.getLatestCreditScore(userId)
    if (!latestScore) return []

    const recommendations: string[] = []

    // Utilization recommendations
    if (latestScore.utilization.overall > 30) {
      recommendations.push('Reduce credit utilization to below 30%')
    } else if (latestScore.utilization.overall > 10) {
      recommendations.push('Reduce credit utilization to below 10% for optimal scoring')
    }

    // Payment history recommendations
    const paymentFactor = latestScore.factors.find(f => 
      f.factor.toLowerCase().includes('payment')
    )
    if (paymentFactor && paymentFactor.impact === 'negative') {
      recommendations.push('Continue making on-time payments to improve payment history')
    }

    // Account age recommendations
    const ageFactor = latestScore.factors.find(f => 
      f.factor.toLowerCase().includes('age') || f.factor.toLowerCase().includes('history')
    )
    if (ageFactor && ageFactor.impact === 'negative') {
      recommendations.push('Keep older accounts open to improve average account age')
    }

    // Credit mix recommendations
    const mixFactor = latestScore.factors.find(f => 
      f.factor.toLowerCase().includes('mix') || f.factor.toLowerCase().includes('type')
    )
    if (mixFactor && mixFactor.impact === 'negative') {
      recommendations.push('Consider diversifying your credit mix with different account types')
    }

    return recommendations
  }

  /**
   * Private helper methods
   */
  private async checkScoreChanges(userId: string, newScore: CreditScore): Promise<void> {
    const previousScore = await this.getPreviousScore(userId, newScore.bureau)
    
    if (previousScore) {
      const change = newScore.score - previousScore.score
      
      if (Math.abs(change) >= 10) {
        const type = change > 0 ? 'score_increase' : 'score_decrease'
        const title = change > 0 ? 'Credit Score Increased!' : 'Credit Score Decreased'
        const message = `Your ${newScore.bureau} credit score ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)} points (${previousScore.score} → ${newScore.score})`
        const severity = change > 0 ? 'success' : 'warning'
        
        await this.createAlert(userId, type, title, message, severity, {
          scoreChange: change,
          newScore: newScore.score,
          previousScore: previousScore.score,
          bureau: newScore.bureau
        })
      }
    }
  }

  private async getPreviousScore(
    userId: string, 
    bureau: string
  ): Promise<CreditScore | null> {
    const { data, error } = await supabase
      .from('credit_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('bureau', bureau)
      .order('report_date', { ascending: false })
      .limit(2)

    if (error || data.length < 2) return null
    
    return this.mapDatabaseToScore(data[1])
  }

  private getPeriodStartDate(endDate: Date, period: string): Date {
    const date = new Date(endDate)
    
    switch (period) {
      case '1M':
        date.setMonth(date.getMonth() - 1)
        break
      case '3M':
        date.setMonth(date.getMonth() - 3)
        break
      case '6M':
        date.setMonth(date.getMonth() - 6)
        break
      case '1Y':
        date.setFullYear(date.getFullYear() - 1)
        break
    }
    
    return date
  }

  private identifyChangingFactors(oldScore: CreditScore, newScore: CreditScore): string[] {
    const factors: string[] = []
    
    // Compare utilization
    if (Math.abs(oldScore.utilization.overall - newScore.utilization.overall) > 5) {
      factors.push('Credit Utilization')
    }
    
    // Compare account counts
    const oldAccountCount = oldScore.accounts.reduce((sum, acc) => sum + acc.count, 0)
    const newAccountCount = newScore.accounts.reduce((sum, acc) => sum + acc.count, 0)
    
    if (oldAccountCount !== newAccountCount) {
      factors.push('New Accounts')
    }
    
    return factors
  }

  private calculateGoalProgress(currentScore: number, targetScore: number): number {
    if (currentScore >= targetScore) return 100
    
    const baseScore = Math.max(currentScore - 100, 300) // Assume starting point
    const totalImprovement = targetScore - baseScore
    const currentImprovement = currentScore - baseScore
    
    return Math.max(0, Math.min(100, (currentImprovement / totalImprovement) * 100))
  }

  private generateMilestones(
    currentScore: number, 
    targetScore: number, 
    targetDate: Date
  ): ScoreMilestone[] {
    const milestones: ScoreMilestone[] = []
    const scoreDiff = targetScore - currentScore
    const monthsToTarget = this.getMonthsDifference(new Date(), targetDate)
    
    if (scoreDiff <= 0 || monthsToTarget <= 0) return milestones
    
    const scoreIncrement = Math.ceil(scoreDiff / Math.min(4, monthsToTarget))
    const timeIncrement = monthsToTarget / Math.min(4, monthsToTarget)
    
    for (let i = 1; i <= Math.min(4, monthsToTarget); i++) {
      const milestoneScore = Math.min(targetScore, currentScore + (scoreIncrement * i))
      const milestoneDate = new Date()
      milestoneDate.setMonth(milestoneDate.getMonth() + Math.round(timeIncrement * i))
      
      milestones.push({
        score: milestoneScore,
        targetDate: milestoneDate,
        achieved: false,
        actions: this.getMilestoneActions(milestoneScore - currentScore)
      })
    }
    
    return milestones
  }

  private getMilestoneActions(scoreIncrease: number): string[] {
    const actions: string[] = []
    
    if (scoreIncrease <= 20) {
      actions.push('Pay down credit card balances')
      actions.push('Make all payments on time')
    } else if (scoreIncrease <= 50) {
      actions.push('Reduce credit utilization below 10%')
      actions.push('Dispute any inaccurate information')
      actions.push('Pay off collections if any')
    } else {
      actions.push('Major credit repair may be needed')
      actions.push('Consider professional credit counseling')
      actions.push('Address all negative items')
    }
    
    return actions
  }

  private getMonthsDifference(startDate: Date, endDate: Date): number {
    const yearDiff = endDate.getFullYear() - startDate.getFullYear()
    const monthDiff = endDate.getMonth() - startDate.getMonth()
    return yearDiff * 12 + monthDiff
  }

  private generateId(): string {
    return `score-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private mapDatabaseToScore(data: any): CreditScore {
    return {
      id: data.id,
      userId: data.user_id,
      score: data.score,
      bureau: data.bureau,
      scoreType: data.score_type,
      scoreRange: data.score_range,
      reportDate: new Date(data.report_date),
      factors: data.factors || [],
      accounts: data.accounts || [],
      utilization: data.utilization || { overall: 0, perCard: [], recommendedUtilization: 30 },
      createdAt: new Date(data.created_at)
    }
  }

  private mapDatabaseToGoal(data: any): ScoreGoal {
    return {
      id: data.id,
      userId: data.user_id,
      targetScore: data.target_score,
      targetDate: new Date(data.target_date),
      currentScore: data.current_score,
      progress: data.progress,
      strategies: data.strategies || [],
      milestones: data.milestones || [],
      status: data.status,
      createdAt: new Date(data.created_at)
    }
  }

  private mapDatabaseToAlert(data: any): ScoreAlert {
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      severity: data.severity,
      isRead: data.is_read,
      createdAt: new Date(data.created_at),
      metadata: data.metadata
    }
  }
}

// Singleton instance
export const creditScoreTracker = new CreditScoreTracker()