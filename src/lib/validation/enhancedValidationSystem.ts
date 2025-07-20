/**
 * Enhanced Validation System
 * 
 * Multi-layer validation system that extends the existing validation system
 * with comprehensive data quality, consistency, and completeness validation.
 */

import { 
  EnhancedCreditReportData, 
  ValidationResult, 
  ValidationIssue,
  QualityMetrics
} from '@/types/enhanced-credit'

import { dataQualityValidator, DataQualityResult } from './dataQualityValidator'
import { consistencyChecker, ConsistencyResult } from './consistencyChecker'
import { completenessValidator, CompletenessResult } from './completenessValidator'
import { validationSystem as baseValidationSystem } from '@/lib/ai/validationSystem'

export interface EnhancedValidationResult {
  overallScore: number
  qualityMetrics: QualityMetrics
  dataQuality: DataQualityResult
  consistency: ConsistencyResult
  completeness: CompletenessResult
  baseValidation?: any // Results from existing validation system
  issues: ValidationIssue[]
  recommendations: string[]
  validatedAt: Date
  validatedBy: string
  processingTime: number
}

export interface ValidationConfig {
  enableDataQuality: boolean
  enableConsistency: boolean
  enableCompleteness: boolean
  enableBaseValidation: boolean
  strictMode: boolean
  confidenceThreshold: number
  qualityThreshold: number
}

export class EnhancedValidationSystem {
  private readonly DEFAULT_CONFIG: ValidationConfig = {
    enableDataQuality: true,
    enableConsistency: true,
    enableCompleteness: true,
    enableBaseValidation: true,
    strictMode: false,
    confidenceThreshold: 0.7,
    qualityThreshold: 70
  }

  private readonly VALIDATION_WEIGHTS = {
    dataQuality: 0.35,
    consistency: 0.30,
    completeness: 0.25,
    baseValidation: 0.10
  }

  /**
   * Perform comprehensive enhanced validation
   */
  async validateEnhancedCreditReport(
    data: EnhancedCreditReportData,
    originalText?: string,
    config: Partial<ValidationConfig> = {}
  ): Promise<EnhancedValidationResult> {
    const startTime = Date.now()
    const validationConfig = { ...this.DEFAULT_CONFIG, ...config }
    
    const allIssues: ValidationIssue[] = []
    const allRecommendations: string[] = []

    // Initialize results
    let dataQualityResult: DataQualityResult | null = null
    let consistencyResult: ConsistencyResult | null = null
    let completenessResult: CompletenessResult | null = null
    let baseValidationResult: any = null

    try {
      // Run data quality validation
      if (validationConfig.enableDataQuality) {
        dataQualityResult = await dataQualityValidator.validateDataQuality(data)
        allIssues.push(...dataQualityResult.issues)
        allRecommendations.push(...dataQualityResult.recommendations)
      }

      // Run consistency validation
      if (validationConfig.enableConsistency) {
        consistencyResult = await consistencyChecker.validateConsistency(data)
        allIssues.push(...consistencyResult.issues)
        allRecommendations.push(...consistencyResult.recommendations)
      }

      // Run completeness validation
      if (validationConfig.enableCompleteness) {
        completenessResult = await completenessValidator.validateCompleteness(data)
        allIssues.push(...completenessResult.issues)
        allRecommendations.push(...completenessResult.recommendations)
      }

      // Run base validation system if enabled and original text available
      if (validationConfig.enableBaseValidation && originalText) {
        try {
          // Convert enhanced data to format expected by base validation system
          const baseAnalysisResult = this.convertToBaseFormat(data)
          baseValidationResult = baseValidationSystem.validateAnalysis(
            originalText,
            baseAnalysisResult
          )
          
          // Convert base validation issues to enhanced format
          if (baseValidationResult.issues) {
            allIssues.push(...baseValidationResult.issues)
          }
          if (baseValidationResult.recommendations) {
            allRecommendations.push(...baseValidationResult.recommendations)
          }
        } catch (error) {
          console.warn('Base validation system failed:', error)
          allIssues.push({
            type: 'warning',
            category: 'accuracy',
            message: 'Base validation system encountered an error',
            severity: 'low',
            suggestion: 'Review base validation system compatibility'
          })
        }
      }

      // Calculate overall score and quality metrics
      const overallScore = this.calculateOverallScore(
        dataQualityResult,
        consistencyResult,
        completenessResult,
        baseValidationResult,
        validationConfig
      )

      const qualityMetrics = this.calculateQualityMetrics(
        dataQualityResult,
        consistencyResult,
        completenessResult,
        baseValidationResult
      )

      // Generate enhanced recommendations
      this.generateEnhancedRecommendations(
        overallScore,
        dataQualityResult,
        consistencyResult,
        completenessResult,
        allIssues,
        allRecommendations,
        validationConfig
      )

      // Remove duplicate recommendations
      const uniqueRecommendations = [...new Set(allRecommendations)]

      const processingTime = Date.now() - startTime

      return {
        overallScore,
        qualityMetrics,
        dataQuality: dataQualityResult!,
        consistency: consistencyResult!,
        completeness: completenessResult!,
        baseValidation: baseValidationResult,
        issues: allIssues,
        recommendations: uniqueRecommendations,
        validatedAt: new Date(),
        validatedBy: 'EnhancedValidationSystem',
        processingTime
      }

    } catch (error) {
      console.error('Enhanced validation failed:', error)
      
      // Return error result
      return {
        overallScore: 0,
        qualityMetrics: this.getDefaultQualityMetrics(),
        dataQuality: dataQualityResult || this.getDefaultDataQualityResult(),
        consistency: consistencyResult || this.getDefaultConsistencyResult(),
        completeness: completenessResult || this.getDefaultCompletenessResult(),
        baseValidation: baseValidationResult,
        issues: [{
          type: 'error',
          category: 'accuracy',
          message: 'Enhanced validation system encountered a critical error',
          severity: 'high',
          suggestion: 'Review validation system configuration and data format'
        }],
        recommendations: ['Fix validation system errors before proceeding'],
        validatedAt: new Date(),
        validatedBy: 'EnhancedValidationSystem',
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Validate specific sections of the credit report
   */
  async validateSection(
    data: EnhancedCreditReportData,
    section: 'personalInfo' | 'creditScores' | 'accounts' | 'negativeItems' | 'inquiries' | 'publicRecords',
    config: Partial<ValidationConfig> = {}
  ): Promise<Partial<EnhancedValidationResult>> {
    const validationConfig = { ...this.DEFAULT_CONFIG, ...config }
    const issues: ValidationIssue[] = []
    const recommendations: string[] = []

    // Create a minimal data object with only the requested section
    const sectionData = {
      ...this.getEmptyEnhancedData(),
      [section]: (data as any)[section]
    }

    // Run validations on the specific section
    const results: any = {}

    if (validationConfig.enableDataQuality) {
      results.dataQuality = await dataQualityValidator.validateDataQuality(sectionData)
      issues.push(...results.dataQuality.issues)
      recommendations.push(...results.dataQuality.recommendations)
    }

    if (validationConfig.enableConsistency) {
      results.consistency = await consistencyChecker.validateConsistency(sectionData)
      issues.push(...results.consistency.issues)
      recommendations.push(...results.consistency.recommendations)
    }

    if (validationConfig.enableCompleteness) {
      results.completeness = await completenessValidator.validateCompleteness(sectionData)
      issues.push(...results.completeness.issues)
      recommendations.push(...results.completeness.recommendations)
    }

    return {
      ...results,
      issues,
      recommendations: [...new Set(recommendations)],
      validatedAt: new Date(),
      validatedBy: 'EnhancedValidationSystem'
    }
  }

  /**
   * Validate credit report data (alias for enhanced validation)
   */
  async validateCreditReportData(
    data: EnhancedCreditReportData,
    originalText?: string,
    config: Partial<ValidationConfig> = {}
  ): Promise<EnhancedValidationResult> {
    return this.validateEnhancedCreditReport(data, originalText, config)
  }

  /**
   * Quick validation for real-time feedback
   */
  async quickValidate(
    data: EnhancedCreditReportData,
    focusAreas: string[] = []
  ): Promise<{
    score: number
    criticalIssues: ValidationIssue[]
    quickRecommendations: string[]
  }> {
    const criticalIssues: ValidationIssue[] = []
    const quickRecommendations: string[] = []

    // Quick data quality check
    if (focusAreas.length === 0 || focusAreas.includes('dataQuality')) {
      const dataQualityResult = await dataQualityValidator.validateDataQuality(data)
      const highPriorityIssues = dataQualityResult.issues.filter(issue => issue.severity === 'high')
      criticalIssues.push(...highPriorityIssues)
      
      if (dataQualityResult.overallScore < 60) {
        quickRecommendations.push('Data quality is below acceptable threshold')
      }
    }

    // Quick completeness check
    if (focusAreas.length === 0 || focusAreas.includes('completeness')) {
      const completenessResult = await completenessValidator.validateCompleteness(data)
      if (completenessResult.criticalMissing.length > 0) {
        criticalIssues.push({
          type: 'error',
          category: 'completeness',
          message: `${completenessResult.criticalMissing.length} critical fields missing`,
          severity: 'high',
          suggestion: 'Address missing critical information'
        })
        quickRecommendations.push('Critical information is missing')
      }
    }

    // Calculate quick score
    const score = criticalIssues.length === 0 ? 85 : Math.max(30, 85 - (criticalIssues.length * 15))

    return {
      score,
      criticalIssues,
      quickRecommendations
    }
  }

  /**
   * Calculate overall validation score
   */
  private calculateOverallScore(
    dataQuality: DataQualityResult | null,
    consistency: ConsistencyResult | null,
    completeness: CompletenessResult | null,
    baseValidation: any,
    config: ValidationConfig
  ): number {
    let weightedScore = 0
    let totalWeight = 0

    if (dataQuality && config.enableDataQuality) {
      weightedScore += dataQuality.overallScore * this.VALIDATION_WEIGHTS.dataQuality
      totalWeight += this.VALIDATION_WEIGHTS.dataQuality
    }

    if (consistency && config.enableConsistency) {
      weightedScore += consistency.overallConsistency * this.VALIDATION_WEIGHTS.consistency
      totalWeight += this.VALIDATION_WEIGHTS.consistency
    }

    if (completeness && config.enableCompleteness) {
      weightedScore += completeness.overallCompleteness * this.VALIDATION_WEIGHTS.completeness
      totalWeight += this.VALIDATION_WEIGHTS.completeness
    }

    if (baseValidation && config.enableBaseValidation) {
      weightedScore += baseValidation.overallScore * this.VALIDATION_WEIGHTS.baseValidation
      totalWeight += this.VALIDATION_WEIGHTS.baseValidation
    }

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0
  }

  /**
   * Calculate comprehensive quality metrics
   */
  private calculateQualityMetrics(
    dataQuality: DataQualityResult | null,
    consistency: ConsistencyResult | null,
    completeness: CompletenessResult | null,
    baseValidation: any
  ): QualityMetrics {
    return {
      dataCompleteness: completeness?.overallCompleteness || 0,
      dataAccuracy: dataQuality?.overallScore || 0,
      consistencyScore: consistency?.overallConsistency || 0,
      validationScore: baseValidation?.overallScore || 0,
      overallQuality: this.calculateOverallScore(dataQuality, consistency, completeness, baseValidation, this.DEFAULT_CONFIG),
      
      // Detailed metrics
      extractionQuality: dataQuality?.overallScore || 0,
      crossValidationScore: consistency?.crossSectionConsistency || 0,
      bureauConsistency: consistency?.bureauConsistency || 0,
      temporalConsistency: consistency?.temporalConsistency || 0
    }
  }

  /**
   * Generate enhanced recommendations
   */
  private generateEnhancedRecommendations(
    overallScore: number,
    dataQuality: DataQualityResult | null,
    consistency: ConsistencyResult | null,
    completeness: CompletenessResult | null,
    issues: ValidationIssue[],
    recommendations: string[],
    config: ValidationConfig
  ): void {
    // Overall score recommendations
    if (overallScore >= 90) {
      recommendations.unshift('Excellent validation results - proceed with high confidence')
    } else if (overallScore >= 75) {
      recommendations.unshift('Good validation results - minor improvements recommended')
    } else if (overallScore >= 60) {
      recommendations.unshift('Fair validation results - address identified issues before proceeding')
    } else {
      recommendations.unshift('Poor validation results - significant improvements required')
    }

    // Priority-based recommendations
    const highPriorityIssues = issues.filter(issue => issue.severity === 'high')
    const mediumPriorityIssues = issues.filter(issue => issue.severity === 'medium')

    if (highPriorityIssues.length > 0) {
      recommendations.splice(1, 0, `URGENT: Address ${highPriorityIssues.length} high-priority validation issues`)
    }

    if (mediumPriorityIssues.length > 3) {
      recommendations.push(`Consider addressing ${mediumPriorityIssues.length} medium-priority issues for better quality`)
    }

    // Strict mode recommendations
    if (config.strictMode) {
      if (overallScore < config.qualityThreshold) {
        recommendations.push(`Strict mode: Quality score ${overallScore} is below threshold ${config.qualityThreshold}`)
      }
      
      const lowConfidenceIssues = issues.filter(issue => 
        issue.field && issue.field.includes('confidence')
      )
      if (lowConfidenceIssues.length > 0) {
        recommendations.push(`Strict mode: ${lowConfidenceIssues.length} fields have confidence below threshold`)
      }
    }

    // Section-specific recommendations
    if (dataQuality && dataQuality.overallScore < 70) {
      recommendations.push('Focus on improving data extraction quality')
    }
    
    if (consistency && consistency.overallConsistency < 70) {
      recommendations.push('Address data consistency issues across sections')
    }
    
    if (completeness && completeness.overallCompleteness < 70) {
      recommendations.push('Improve data completeness by extracting missing information')
    }
  }

  /**
   * Convert enhanced data to base validation system format
   */
  private convertToBaseFormat(data: EnhancedCreditReportData): any {
    // Convert enhanced format to the format expected by base validation system
    return {
      extractedData: {
        personalInfo: {
          name: data.personalInfo.name,
          address: data.personalInfo.address,
          ssn: data.personalInfo.ssn,
          dateOfBirth: data.personalInfo.dateOfBirth
        },
        creditScore: {
          score: data.creditScores.experian?.score || data.creditScores.equifax?.score || data.creditScores.transunion?.score || 0,
          bureau: data.creditScores.experian?.bureau || data.creditScores.equifax?.bureau || data.creditScores.transunion?.bureau || 'unknown',
          date: data.creditScores.experian?.date || data.creditScores.equifax?.date || data.creditScores.transunion?.date || new Date().toISOString()
        },
        accounts: data.accounts.map(account => ({
          creditorName: account.creditorName,
          accountNumber: account.accountNumber,
          balance: account.balance,
          status: account.status
        })),
        negativeItems: data.negativeItems.map(item => ({
          creditorName: item.creditorName,
          amount: item.amount,
          date: item.date,
          type: item.type,
          impactScore: item.impactScore
        })),
        inquiries: data.inquiries.map(inquiry => ({
          creditorName: inquiry.creditorName,
          date: inquiry.date,
          type: inquiry.type
        })),
        publicRecords: data.publicRecords.map(record => ({
          type: record.type,
          amount: record.amount,
          date: record.date,
          status: record.status
        }))
      },
      confidence: data.extractionMetadata?.consensusScore || 0,
      provider: data.extractionMetadata?.providerDetected || 'unknown',
      recommendations: [],
      summary: 'Enhanced credit report analysis'
    }
  }

  /**
   * Get default quality metrics for error cases
   */
  private getDefaultQualityMetrics(): QualityMetrics {
    return {
      dataCompleteness: 0,
      dataAccuracy: 0,
      consistencyScore: 0,
      validationScore: 0,
      overallQuality: 0,
      extractionQuality: 0,
      crossValidationScore: 0,
      bureauConsistency: 0,
      temporalConsistency: 0
    }
  }

  /**
   * Get default data quality result for error cases
   */
  private getDefaultDataQualityResult(): DataQualityResult {
    return {
      overallScore: 0,
      metrics: {
        personalInfo: 0,
        creditScore: 0,
        accounts: 0,
        negativeItems: 0,
        inquiries: 0,
        publicRecords: 0
      },
      issues: [],
      recommendations: [],
      validatedFields: [],
      failedFields: []
    }
  }

  /**
   * Get default consistency result for error cases
   */
  private getDefaultConsistencyResult(): ConsistencyResult {
    return {
      overallConsistency: 0,
      crossSectionConsistency: 0,
      bureauConsistency: 0,
      temporalConsistency: 0,
      logicalConsistency: 0,
      issues: [],
      discrepancies: [],
      recommendations: []
    }
  }

  /**
   * Get default completeness result for error cases
   */
  private getDefaultCompletenessResult(): CompletenessResult {
    return {
      overallCompleteness: 0,
      sectionCompleteness: {
        personalInfo: 0,
        creditScores: 0,
        accounts: 0,
        negativeItems: 0,
        inquiries: 0,
        publicRecords: 0
      },
      criticalMissing: [],
      optionalMissing: [],
      issues: [],
      recommendations: []
    }
  }

  /**
   * Get empty enhanced data structure
   */
  private getEmptyEnhancedData(): EnhancedCreditReportData {
    return {
      personalInfo: {
        name: '',
        address: '',
        nameConfidence: 0,
        addressConfidence: 0,
        ssnValidated: false,
        dobValidated: false
      },
      creditScores: {},
      accounts: [],
      negativeItems: [],
      inquiries: [],
      publicRecords: [],
      extractionMetadata: {
        extractionTimestamp: new Date(),
        aiModelsUsed: [],
        confidenceScores: {},
        consensusScore: 0,
        processingTime: 0,
        documentQuality: {
          textClarity: 0,
          completeness: 0,
          structureScore: 0,
          overallQuality: 0,
          issues: []
        },
        providerDetected: 'unknown',
        extractionMethod: 'ai'
      },
      validationResults: [],
      qualityMetrics: this.getDefaultQualityMetrics(),
      providerSpecificData: {
        provider: 'unknown'
      },
      crossReferenceData: {
        duplicateAccounts: [],
        inconsistentData: [],
        missingData: [],
        correlationScore: 0,
        verificationStatus: {}
      }
    }
  }
}

export const enhancedValidationSystem = new EnhancedValidationSystem()

// Export individual validator components for testing
export { dataQualityValidator as DataQualityValidator } from './dataQualityValidator'
export { consistencyChecker as ConsistencyChecker } from './consistencyChecker'
export { completenessValidator as CompletenessValidator } from './completenessValidator'

// Import and export EOSCAR compliance validator
export { eoscarComplianceValidator as EOSCARComplianceValidator } from './eoscarComplianceValidator'
export { qualityAssuranceEngine as QualityAssuranceEngine } from './qualityAssuranceEngine'