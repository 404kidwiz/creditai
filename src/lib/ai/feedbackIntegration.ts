/**
 * AI Feedback Integration System
 * 
 * Implements continuous learning through user feedback to improve:
 * - Extraction accuracy
 * - Dispute recommendations
 * - Score predictions
 * - Pattern recognition
 */

import { supabase } from '@/lib/supabase/client'
import { CreditReportData, AIAnalysisResult } from './creditAnalyzer'
import { DisputeRecommendation } from './disputeLetterGenerator'

// ===================================
// Feedback Types
// ===================================

export interface FeedbackSession {
  id: string
  userId: string
  analysisId: string
  reportType: string
  startedAt: Date
  completedAt?: Date
  feedbackItems: FeedbackItem[]
  overallRating?: number
  comments?: string
}

export interface FeedbackItem {
  id: string
  type: FeedbackType
  category: FeedbackCategory
  targetField: string
  originalValue: any
  correctedValue?: any
  confidence: number
  feedback: 'correct' | 'incorrect' | 'partial'
  severity: 'minor' | 'moderate' | 'major'
  userComments?: string
  timestamp: Date
}

export type FeedbackType = 
  | 'extraction_accuracy'
  | 'score_accuracy'
  | 'dispute_recommendation'
  | 'account_detection'
  | 'negative_item_detection'
  | 'personal_info_accuracy'
  | 'format_detection'
  | 'creditor_name_accuracy'

export type FeedbackCategory = 
  | 'data_extraction'
  | 'analysis_quality'
  | 'recommendation_quality'
  | 'processing_speed'
  | 'user_experience'

export interface FeedbackMetrics {
  totalFeedback: number
  accuracyRate: number
  commonErrors: ErrorPattern[]
  improvementTrends: ImprovementTrend[]
  userSatisfaction: number
  processingTime: ProcessingTimeMetrics
}

export interface ErrorPattern {
  pattern: string
  frequency: number
  examples: FeedbackItem[]
  suggestedFix: string
  priority: 'low' | 'medium' | 'high'
}

export interface ImprovementTrend {
  metric: string
  baseline: number
  current: number
  trend: 'improving' | 'stable' | 'declining'
  timeframe: string
}

export interface ProcessingTimeMetrics {
  average: number
  median: number
  p95: number
  byReportType: { [type: string]: number }
}

export interface LearningUpdate {
  id: string
  timestamp: Date
  feedbackCount: number
  patternsLearned: LearnedPattern[]
  accuracyImprovement: number
  appliedToModels: string[]
}

export interface LearnedPattern {
  type: string
  pattern: string
  confidence: number
  examples: number
  impact: 'low' | 'medium' | 'high'
}

export interface FeedbackCollectionOptions {
  mode: 'interactive' | 'passive' | 'batch'
  granularity: 'field' | 'section' | 'report'
  realTimeUpdates: boolean
  anonymize: boolean
}

// ===================================
// Feedback Integration Class
// ===================================

export class AIFeedbackIntegration {
  private feedbackQueue: FeedbackItem[] = []
  private learningPatterns: Map<string, LearnedPattern> = new Map()
  private metrics: FeedbackMetrics = {
    totalFeedback: 0,
    accuracyRate: 0,
    commonErrors: [],
    improvementTrends: [],
    userSatisfaction: 0,
    processingTime: {
      average: 0,
      median: 0,
      p95: 0,
      byReportType: {}
    }
  }

  /**
   * Start a new feedback session
   */
  async startFeedbackSession(
    userId: string,
    analysisId: string,
    reportType: string
  ): Promise<FeedbackSession> {
    const session: FeedbackSession = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      analysisId,
      reportType,
      startedAt: new Date(),
      feedbackItems: []
    }

    // Store session in database
    const { error } = await supabase
      .from('ai_feedback_sessions')
      .insert({
        id: session.id,
        user_id: userId,
        analysis_id: analysisId,
        report_type: reportType,
        started_at: session.startedAt
      })

    if (error) {
      console.error('Failed to create feedback session:', error)
    }

    return session
  }

  /**
   * Collect feedback on extracted data
   */
  async collectExtractionFeedback(
    sessionId: string,
    extractedData: CreditReportData,
    corrections: Partial<CreditReportData>,
    options?: FeedbackCollectionOptions
  ): Promise<FeedbackItem[]> {
    const feedbackItems: FeedbackItem[] = []

    // Compare extracted vs corrected data
    if (corrections.personalInfo) {
      const personalInfoFeedback = this.comparePersonalInfo(
        extractedData.personalInfo,
        corrections.personalInfo
      )
      feedbackItems.push(...personalInfoFeedback)
    }

    if (corrections.creditScores) {
      const scoreFeedback = this.compareCreditScores(
        extractedData.creditScores,
        corrections.creditScores
      )
      feedbackItems.push(...scoreFeedback)
    }

    if (corrections.accounts) {
      const accountFeedback = this.compareAccounts(
        extractedData.accounts,
        corrections.accounts
      )
      feedbackItems.push(...accountFeedback)
    }

    if (corrections.negativeItems) {
      const negativeFeedback = this.compareNegativeItems(
        extractedData.negativeItems,
        corrections.negativeItems
      )
      feedbackItems.push(...negativeFeedback)
    }

    // Store feedback items
    for (const item of feedbackItems) {
      await this.storeFeedbackItem(sessionId, item)
    }

    // Update learning patterns if real-time updates enabled
    if (options?.realTimeUpdates) {
      await this.updateLearningPatterns(feedbackItems)
    }

    return feedbackItems
  }

  /**
   * Collect feedback on dispute recommendations
   */
  async collectDisputeFeedback(
    sessionId: string,
    recommendations: DisputeRecommendation[],
    userActions: UserDisputeAction[]
  ): Promise<FeedbackItem[]> {
    const feedbackItems: FeedbackItem[] = []

    for (const action of userActions) {
      const recommendation = recommendations.find(r => r.negativeItemId === action.itemId)
      if (!recommendation) continue

      const feedbackItem: FeedbackItem = {
        id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'dispute_recommendation',
        category: 'recommendation_quality',
        targetField: `dispute_${action.itemId}`,
        originalValue: recommendation,
        correctedValue: action,
        confidence: this.calculateConfidence(recommendation, action),
        feedback: action.accepted ? 'correct' : action.modified ? 'partial' : 'incorrect',
        severity: this.calculateSeverity(recommendation, action),
        userComments: action.comments,
        timestamp: new Date()
      }

      feedbackItems.push(feedbackItem)
    }

    // Store feedback
    for (const item of feedbackItems) {
      await this.storeFeedbackItem(sessionId, item)
    }

    return feedbackItems
  }

  /**
   * Process accumulated feedback to improve AI models
   */
  async processFeedbackForLearning(
    minFeedbackCount: number = 100
  ): Promise<LearningUpdate | null> {
    // Check if we have enough feedback
    if (this.feedbackQueue.length < minFeedbackCount) {
      console.log(`Insufficient feedback for learning: ${this.feedbackQueue.length}/${minFeedbackCount}`)
      return null
    }

    // Analyze feedback patterns
    const patterns = this.analyzeFeedbackPatterns(this.feedbackQueue)
    
    // Generate learning updates
    const learningUpdate: LearningUpdate = {
      id: `learning_${Date.now()}`,
      timestamp: new Date(),
      feedbackCount: this.feedbackQueue.length,
      patternsLearned: patterns,
      accuracyImprovement: this.calculateAccuracyImprovement(patterns),
      appliedToModels: []
    }

    // Apply learning to models
    await this.applyLearningToModels(learningUpdate)

    // Store learning update
    await this.storeLearningUpdate(learningUpdate)

    // Clear processed feedback
    this.feedbackQueue = []

    return learningUpdate
  }

  /**
   * Get feedback metrics and insights
   */
  async getFeedbackMetrics(timeframe?: string): Promise<FeedbackMetrics> {
    const { data: feedback, error } = await supabase
      .from('ai_feedback_items')
      .select('*')
      .gte('created_at', this.getTimeframeDate(timeframe))

    if (error || !feedback) {
      return this.metrics
    }

    // Calculate metrics
    const totalFeedback = feedback.length
    const correctFeedback = feedback.filter(f => f.feedback === 'correct').length
    const accuracyRate = totalFeedback > 0 ? (correctFeedback / totalFeedback) * 100 : 0

    // Identify common errors
    const errorPatterns = this.identifyErrorPatterns(feedback)
    
    // Calculate improvement trends
    const trends = this.calculateImprovementTrends(feedback)

    // Calculate user satisfaction
    const satisfaction = await this.calculateUserSatisfaction()

    // Processing time metrics
    const processingMetrics = await this.getProcessingTimeMetrics()

    this.metrics = {
      totalFeedback,
      accuracyRate,
      commonErrors: errorPatterns,
      improvementTrends: trends,
      userSatisfaction: satisfaction,
      processingTime: processingMetrics
    }

    return this.metrics
  }

  /**
   * Apply feedback to improve specific extraction
   */
  async applyFeedbackToExtraction(
    originalExtraction: CreditReportData,
    feedbackItems: FeedbackItem[]
  ): Promise<CreditReportData> {
    const improvedExtraction = { ...originalExtraction }

    for (const feedback of feedbackItems) {
      if (feedback.feedback === 'incorrect' && feedback.correctedValue) {
        // Apply correction based on target field
        this.applyCorrection(improvedExtraction, feedback.targetField, feedback.correctedValue)
      }
    }

    return improvedExtraction
  }

  /**
   * Train pattern recognition from feedback
   */
  async trainPatternRecognition(
    feedbackItems: FeedbackItem[],
    minConfidence: number = 0.8
  ): Promise<LearnedPattern[]> {
    const patterns: LearnedPattern[] = []
    
    // Group feedback by type and field
    const groupedFeedback = this.groupFeedbackByPattern(feedbackItems)
    
    for (const [key, items] of groupedFeedback.entries()) {
      if (items.length < 5) continue // Need minimum examples
      
      const pattern = this.extractPattern(items)
      if (pattern && pattern.confidence >= minConfidence) {
        patterns.push(pattern)
        this.learningPatterns.set(key, pattern)
      }
    }
    
    return patterns
  }

  /**
   * Compare personal info and generate feedback
   */
  private comparePersonalInfo(
    extracted: any,
    corrected: any
  ): FeedbackItem[] {
    const items: FeedbackItem[] = []
    
    if (corrected.name && extracted.name !== corrected.name) {
      items.push(this.createFeedbackItem(
        'personal_info_accuracy',
        'personalInfo.name',
        extracted.name,
        corrected.name,
        extracted.name.toLowerCase() === corrected.name.toLowerCase() ? 'partial' : 'incorrect'
      ))
    }
    
    if (corrected.address && extracted.address !== corrected.address) {
      items.push(this.createFeedbackItem(
        'personal_info_accuracy',
        'personalInfo.address',
        extracted.address,
        corrected.address,
        this.calculateAddressSimilarity(extracted.address, corrected.address) > 0.8 ? 'partial' : 'incorrect'
      ))
    }
    
    return items
  }

  /**
   * Compare credit scores and generate feedback
   */
  private compareCreditScores(
    extracted: any,
    corrected: any
  ): FeedbackItem[] {
    const items: FeedbackItem[] = []
    
    for (const bureau of ['experian', 'equifax', 'transunion']) {
      if (corrected[bureau] && extracted[bureau]) {
        const extractedScore = extracted[bureau].score
        const correctedScore = corrected[bureau].score
        
        if (extractedScore !== correctedScore) {
          const diff = Math.abs(extractedScore - correctedScore)
          items.push(this.createFeedbackItem(
            'score_accuracy',
            `creditScores.${bureau}.score`,
            extractedScore,
            correctedScore,
            diff <= 10 ? 'partial' : 'incorrect',
            diff > 50 ? 'major' : diff > 20 ? 'moderate' : 'minor'
          ))
        }
      }
    }
    
    return items
  }

  /**
   * Compare accounts and generate feedback
   */
  private compareAccounts(
    extracted: any[],
    corrected: any[]
  ): FeedbackItem[] {
    const items: FeedbackItem[] = []
    
    // Check for missing accounts
    const extractedIds = new Set(extracted.map(a => a.accountNumber))
    const correctedIds = new Set(corrected.map(a => a.accountNumber))
    
    for (const account of corrected) {
      if (!extractedIds.has(account.accountNumber)) {
        items.push(this.createFeedbackItem(
          'account_detection',
          `accounts.missing.${account.accountNumber}`,
          null,
          account,
          'incorrect',
          'major'
        ))
      }
    }
    
    // Check account details
    for (const extractedAccount of extracted) {
      const correctedAccount = corrected.find(a => a.accountNumber === extractedAccount.accountNumber)
      if (correctedAccount) {
        // Check creditor name
        if (extractedAccount.creditorName !== correctedAccount.creditorName) {
          items.push(this.createFeedbackItem(
            'creditor_name_accuracy',
            `accounts.${extractedAccount.accountNumber}.creditorName`,
            extractedAccount.creditorName,
            correctedAccount.creditorName,
            this.areCreditorNamesSimilar(extractedAccount.creditorName, correctedAccount.creditorName) ? 'partial' : 'incorrect'
          ))
        }
        
        // Check balance
        if (Math.abs(extractedAccount.balance - correctedAccount.balance) > 1) {
          items.push(this.createFeedbackItem(
            'extraction_accuracy',
            `accounts.${extractedAccount.accountNumber}.balance`,
            extractedAccount.balance,
            correctedAccount.balance,
            'incorrect'
          ))
        }
      }
    }
    
    return items
  }

  /**
   * Compare negative items and generate feedback
   */
  private compareNegativeItems(
    extracted: any[],
    corrected: any[]
  ): FeedbackItem[] {
    const items: FeedbackItem[] = []
    
    // Similar comparison logic for negative items
    for (const correctedItem of corrected) {
      const extractedItem = extracted.find(e => 
        e.creditorName === correctedItem.creditorName && 
        e.type === correctedItem.type
      )
      
      if (!extractedItem) {
        items.push(this.createFeedbackItem(
          'negative_item_detection',
          `negativeItems.missing.${correctedItem.id}`,
          null,
          correctedItem,
          'incorrect',
          'major'
        ))
      }
    }
    
    return items
  }

  /**
   * Create feedback item
   */
  private createFeedbackItem(
    type: FeedbackType,
    targetField: string,
    originalValue: any,
    correctedValue: any,
    feedback: 'correct' | 'incorrect' | 'partial',
    severity: 'minor' | 'moderate' | 'major' = 'moderate'
  ): FeedbackItem {
    return {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      category: this.getCategoryForType(type),
      targetField,
      originalValue,
      correctedValue,
      confidence: this.calculateFieldConfidence(type, originalValue, correctedValue),
      feedback,
      severity,
      timestamp: new Date()
    }
  }

  /**
   * Helper methods
   */
  private getCategoryForType(type: FeedbackType): FeedbackCategory {
    const categoryMap: { [key in FeedbackType]: FeedbackCategory } = {
      'extraction_accuracy': 'data_extraction',
      'score_accuracy': 'data_extraction',
      'dispute_recommendation': 'recommendation_quality',
      'account_detection': 'data_extraction',
      'negative_item_detection': 'data_extraction',
      'personal_info_accuracy': 'data_extraction',
      'format_detection': 'analysis_quality',
      'creditor_name_accuracy': 'data_extraction'
    }
    return categoryMap[type]
  }

  private calculateFieldConfidence(type: FeedbackType, original: any, corrected: any): number {
    // Implement confidence calculation based on type and values
    if (!original) return 0
    if (original === corrected) return 100
    
    // Type-specific confidence calculations
    switch (type) {
      case 'score_accuracy':
        const diff = Math.abs(original - corrected)
        return Math.max(0, 100 - diff)
      
      case 'creditor_name_accuracy':
        return this.calculateStringSimilarity(original, corrected) * 100
      
      default:
        return 50
    }
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0
    
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.getEditDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private getEditDistance(s1: string, s2: string): number {
    const costs: number[] = []
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j
        } else if (j > 0) {
          let newValue = costs[j - 1]
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
          }
          costs[j - 1] = lastValue
          lastValue = newValue
        }
      }
      if (i > 0) costs[s2.length] = lastValue
    }
    return costs[s2.length]
  }

  private calculateAddressSimilarity(addr1: string, addr2: string): number {
    // Normalize addresses for comparison
    const normalize = (addr: string) => 
      addr.toLowerCase()
        .replace(/[.,]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    
    return this.calculateStringSimilarity(normalize(addr1), normalize(addr2))
  }

  private areCreditorNamesSimilar(name1: string, name2: string): boolean {
    const normalize = (name: string) => 
      name.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[.,&-]/g, '')
    
    const n1 = normalize(name1)
    const n2 = normalize(name2)
    
    // Check for common abbreviations
    const abbreviations: { [key: string]: string[] } = {
      'bankofamerica': ['boa', 'bofa'],
      'americanexpress': ['amex'],
      'jpmorgan': ['chase', 'jpmorganchase'],
      // Add more as needed
    }
    
    if (n1 === n2) return true
    
    for (const [full, abbrevs] of Object.entries(abbreviations)) {
      if ((n1.includes(full) || abbrevs.some(a => n1.includes(a))) &&
          (n2.includes(full) || abbrevs.some(a => n2.includes(a)))) {
        return true
      }
    }
    
    return this.calculateStringSimilarity(n1, n2) > 0.8
  }

  private calculateConfidence(recommendation: DisputeRecommendation, action: UserDisputeAction): number {
    if (action.accepted) return 100
    if (action.rejected) return 0
    if (action.modified) {
      // Calculate based on how much was modified
      return 50
    }
    return 75
  }

  private calculateSeverity(recommendation: DisputeRecommendation, action: UserDisputeAction): 'minor' | 'moderate' | 'major' {
    if (action.rejected) return 'major'
    if (action.modified && action.significantChanges) return 'moderate'
    return 'minor'
  }

  private async storeFeedbackItem(sessionId: string, item: FeedbackItem): Promise<void> {
    const { error } = await supabase
      .from('ai_feedback_items')
      .insert({
        session_id: sessionId,
        type: item.type,
        category: item.category,
        target_field: item.targetField,
        original_value: item.originalValue,
        corrected_value: item.correctedValue,
        confidence: item.confidence,
        feedback: item.feedback,
        severity: item.severity,
        user_comments: item.userComments,
        created_at: item.timestamp
      })

    if (error) {
      console.error('Failed to store feedback item:', error)
    } else {
      this.feedbackQueue.push(item)
    }
  }

  private async updateLearningPatterns(feedbackItems: FeedbackItem[]): Promise<void> {
    const patterns = await this.trainPatternRecognition(feedbackItems)
    
    for (const pattern of patterns) {
      // Store pattern in database for persistence
      const { error } = await supabase
        .from('ai_learning_patterns')
        .upsert({
          pattern_key: `${pattern.type}_${pattern.pattern}`,
          type: pattern.type,
          pattern: pattern.pattern,
          confidence: pattern.confidence,
          examples: pattern.examples,
          impact: pattern.impact,
          updated_at: new Date()
        })

      if (error) {
        console.error('Failed to store learning pattern:', error)
      }
    }
  }

  private analyzeFeedbackPatterns(feedback: FeedbackItem[]): LearnedPattern[] {
    const patterns: LearnedPattern[] = []
    
    // Group by type and analyze
    const typeGroups = this.groupBy(feedback, 'type')
    
    for (const [type, items] of Object.entries(typeGroups)) {
      const pattern = this.extractPatternFromGroup(type, items)
      if (pattern) {
        patterns.push(pattern)
      }
    }
    
    return patterns
  }

  private groupBy<T>(array: T[], key: keyof T): { [key: string]: T[] } {
    return array.reduce((result, item) => {
      const group = String(item[key])
      if (!result[group]) result[group] = []
      result[group].push(item)
      return result
    }, {} as { [key: string]: T[] })
  }

  private extractPatternFromGroup(type: string, items: FeedbackItem[]): LearnedPattern | null {
    // Analyze patterns in the feedback group
    const incorrectItems = items.filter(i => i.feedback === 'incorrect')
    if (incorrectItems.length < 3) return null
    
    // Find common patterns in corrections
    const corrections = incorrectItems.map(i => ({
      original: i.originalValue,
      corrected: i.correctedValue,
      field: i.targetField
    }))
    
    // Simple pattern detection - in production, use more sophisticated ML
    const pattern: LearnedPattern = {
      type,
      pattern: this.detectCommonPattern(corrections),
      confidence: incorrectItems.length / items.length,
      examples: incorrectItems.length,
      impact: this.calculatePatternImpact(incorrectItems)
    }
    
    return pattern.confidence > 0.5 ? pattern : null
  }

  private detectCommonPattern(corrections: any[]): string {
    // Simplified pattern detection
    // In production, use ML models for pattern recognition
    return 'common_extraction_error'
  }

  private calculatePatternImpact(items: FeedbackItem[]): 'low' | 'medium' | 'high' {
    const majorCount = items.filter(i => i.severity === 'major').length
    const ratio = majorCount / items.length
    
    if (ratio > 0.5) return 'high'
    if (ratio > 0.2) return 'medium'
    return 'low'
  }

  private calculateAccuracyImprovement(patterns: LearnedPattern[]): number {
    // Calculate expected improvement based on patterns learned
    const highImpactPatterns = patterns.filter(p => p.impact === 'high').length
    const mediumImpactPatterns = patterns.filter(p => p.impact === 'medium').length
    
    return Math.min(
      highImpactPatterns * 5 + mediumImpactPatterns * 2,
      25 // Cap at 25% improvement
    )
  }

  private async applyLearningToModels(update: LearningUpdate): Promise<void> {
    // In production, this would update ML model weights
    // For now, store the patterns for rule-based improvements
    
    for (const pattern of update.patternsLearned) {
      this.learningPatterns.set(
        `${pattern.type}_${pattern.pattern}`,
        pattern
      )
    }
    
    update.appliedToModels = ['rule_engine', 'pattern_matcher']
  }

  private async storeLearningUpdate(update: LearningUpdate): Promise<void> {
    const { error } = await supabase
      .from('ai_learning_updates')
      .insert({
        id: update.id,
        timestamp: update.timestamp,
        feedback_count: update.feedbackCount,
        patterns_learned: update.patternsLearned,
        accuracy_improvement: update.accuracyImprovement,
        applied_to_models: update.appliedToModels
      })

    if (error) {
      console.error('Failed to store learning update:', error)
    }
  }

  private identifyErrorPatterns(feedback: any[]): ErrorPattern[] {
    const errorPatterns: ErrorPattern[] = []
    
    // Group errors by type and field
    const errors = feedback.filter(f => f.feedback === 'incorrect')
    const grouped = this.groupBy(errors, 'target_field')
    
    for (const [field, items] of Object.entries(grouped)) {
      if (items.length >= 3) {
        errorPatterns.push({
          pattern: field,
          frequency: items.length,
          examples: items.slice(0, 3),
          suggestedFix: this.generateSuggestedFix(field, items),
          priority: items.length > 10 ? 'high' : items.length > 5 ? 'medium' : 'low'
        })
      }
    }
    
    return errorPatterns.sort((a, b) => b.frequency - a.frequency)
  }

  private generateSuggestedFix(field: string, items: FeedbackItem[]): string {
    // Analyze the corrections to suggest a fix
    if (field.includes('creditorName')) {
      return 'Improve creditor name normalization and abbreviation handling'
    }
    if (field.includes('score')) {
      return 'Enhance score extraction patterns for this report format'
    }
    if (field.includes('balance')) {
      return 'Improve number parsing and currency handling'
    }
    return 'Review extraction rules for this field'
  }

  private calculateImprovementTrends(feedback: any[]): ImprovementTrend[] {
    // Group feedback by week
    const weeklyGroups = this.groupFeedbackByWeek(feedback)
    const trends: ImprovementTrend[] = []
    
    // Calculate accuracy trend
    const accuracyByWeek = Object.entries(weeklyGroups).map(([week, items]) => {
      const correct = items.filter(i => i.feedback === 'correct').length
      return {
        week,
        accuracy: items.length > 0 ? (correct / items.length) * 100 : 0
      }
    })
    
    if (accuracyByWeek.length >= 2) {
      const baseline = accuracyByWeek[0].accuracy
      const current = accuracyByWeek[accuracyByWeek.length - 1].accuracy
      const trend = current > baseline + 5 ? 'improving' : 
                   current < baseline - 5 ? 'declining' : 'stable'
      
      trends.push({
        metric: 'extraction_accuracy',
        baseline,
        current,
        trend,
        timeframe: `${accuracyByWeek.length} weeks`
      })
    }
    
    return trends
  }

  private groupFeedbackByWeek(feedback: any[]): { [week: string]: any[] } {
    const groups: { [week: string]: any[] } = {}
    
    feedback.forEach(item => {
      const date = new Date(item.created_at)
      const week = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`
      if (!groups[week]) groups[week] = []
      groups[week].push(item)
    })
    
    return groups
  }

  private async calculateUserSatisfaction(): Promise<number> {
    const { data: sessions, error } = await supabase
      .from('ai_feedback_sessions')
      .select('overall_rating')
      .not('overall_rating', 'is', null)
      .gte('created_at', this.getTimeframeDate('30d'))

    if (error || !sessions || sessions.length === 0) return 0

    const totalRating = sessions.reduce((sum, s) => sum + (s.overall_rating || 0), 0)
    return (totalRating / sessions.length / 5) * 100 // Convert to percentage
  }

  private async getProcessingTimeMetrics(): Promise<ProcessingTimeMetrics> {
    const { data: analyses, error } = await supabase
      .from('credit_analyses')
      .select('processing_time, report_type')
      .gte('created_at', this.getTimeframeDate('30d'))

    if (error || !analyses) {
      return {
        average: 0,
        median: 0,
        p95: 0,
        byReportType: {}
      }
    }

    const times = analyses.map(a => a.processing_time).sort((a, b) => a - b)
    const byType: { [type: string]: number[] } = {}
    
    analyses.forEach(a => {
      if (!byType[a.report_type]) byType[a.report_type] = []
      byType[a.report_type].push(a.processing_time)
    })

    return {
      average: times.reduce((sum, t) => sum + t, 0) / times.length,
      median: times[Math.floor(times.length / 2)],
      p95: times[Math.floor(times.length * 0.95)],
      byReportType: Object.entries(byType).reduce((result, [type, typeTimes]) => {
        result[type] = typeTimes.reduce((sum, t) => sum + t, 0) / typeTimes.length
        return result
      }, {} as { [type: string]: number })
    }
  }

  private getTimeframeDate(timeframe?: string): string {
    const now = new Date()
    let date = new Date()
    
    switch (timeframe) {
      case '1d':
        date.setDate(now.getDate() - 1)
        break
      case '7d':
        date.setDate(now.getDate() - 7)
        break
      case '30d':
        date.setDate(now.getDate() - 30)
        break
      case '90d':
        date.setDate(now.getDate() - 90)
        break
      default:
        date.setDate(now.getDate() - 30)
    }
    
    return date.toISOString()
  }

  private groupFeedbackByPattern(feedbackItems: FeedbackItem[]): Map<string, FeedbackItem[]> {
    const groups = new Map<string, FeedbackItem[]>()
    
    feedbackItems.forEach(item => {
      const key = `${item.type}_${item.targetField}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(item)
    })
    
    return groups
  }

  private extractPattern(items: FeedbackItem[]): LearnedPattern | null {
    if (items.length < 5) return null
    
    const incorrectCount = items.filter(i => i.feedback === 'incorrect').length
    const confidence = 1 - (incorrectCount / items.length)
    
    if (confidence < 0.5) return null
    
    return {
      type: items[0].type,
      pattern: `${items[0].targetField}_pattern`,
      confidence,
      examples: items.length,
      impact: this.calculatePatternImpact(items)
    }
  }

  private applyCorrection(data: any, targetField: string, correctedValue: any): void {
    const fields = targetField.split('.')
    let current = data
    
    for (let i = 0; i < fields.length - 1; i++) {
      if (!current[fields[i]]) {
        current[fields[i]] = {}
      }
      current = current[fields[i]]
    }
    
    current[fields[fields.length - 1]] = correctedValue
  }

  /**
   * Get applied learning patterns
   */
  getAppliedPatterns(): LearnedPattern[] {
    return Array.from(this.learningPatterns.values())
  }

  /**
   * Check if pattern applies to extraction
   */
  doesPatternApply(type: string, field: string): LearnedPattern | null {
    const key = `${type}_${field}`
    return this.learningPatterns.get(key) || null
  }
}

// ===================================
// Supporting Types
// ===================================

export interface UserDisputeAction {
  itemId: string
  accepted: boolean
  rejected: boolean
  modified: boolean
  significantChanges?: boolean
  comments?: string
  alternativeStrategy?: string
}

// Export singleton instance
export const aiFeedbackIntegration = new AIFeedbackIntegration()