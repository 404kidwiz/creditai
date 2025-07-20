/**
 * Analysis Data Adapter
 * Converts API response data to EnhancedCreditReportData format
 */

import { EnhancedCreditReportData, ExtractionMetadata, QualityMetrics, ValidationResult } from '@/types/enhanced-credit'

export interface APIAnalysisResult {
  success: boolean
  extractedText: string
  analysis: any
  confidence: number
  processingTime: number
  processingMethod: string
  securityInfo?: {
    piiMasked: boolean
    dataEncrypted: boolean
    piiSummary: any
  }
  aiAnalysis?: {
    extractedData: any
    recommendations: any[]
    scoreAnalysis: any
    summary: string
    confidence: number
    processingTime: number
  }
}

export class AnalysisDataAdapter {
  /**
   * Convert API response to EnhancedCreditReportData format
   */
  static convertToEnhancedFormat(apiResult: APIAnalysisResult): EnhancedCreditReportData {
    const extractedData = apiResult.aiAnalysis?.extractedData || apiResult.analysis || {}
    
    return {
      // Personal Info
      personalInfo: {
        name: extractedData.personalInfo?.name || 'Not extracted',
        address: extractedData.personalInfo?.address || 'Not extracted',
        ssn: extractedData.personalInfo?.ssn,
        dateOfBirth: extractedData.personalInfo?.dateOfBirth || extractedData.personalInfo?.dob,
        phone: extractedData.personalInfo?.phone,
        previousAddresses: extractedData.personalInfo?.previousAddresses || [],
        aliases: extractedData.personalInfo?.aliases || [],
        employers: extractedData.personalInfo?.employers || [],
        
        // Validation metadata
        nameConfidence: extractedData.personalInfo?.nameConfidence || apiResult.confidence || 75,
        addressConfidence: extractedData.personalInfo?.addressConfidence || apiResult.confidence || 75,
        ssnValidated: extractedData.personalInfo?.ssnValidated || false,
        dobValidated: extractedData.personalInfo?.dobValidated || false
      },

      // Credit Scores
      creditScores: this.convertCreditScores(extractedData.creditScores, apiResult.confidence),

      // Accounts
      accounts: this.convertAccounts(extractedData.accounts || []),

      // Negative Items
      negativeItems: this.convertNegativeItems(extractedData.negativeItems || []),

      // Inquiries
      inquiries: this.convertInquiries(extractedData.inquiries || []),

      // Public Records
      publicRecords: this.convertPublicRecords(extractedData.publicRecords || []),

      // Extraction Metadata
      extractionMetadata: this.createExtractionMetadata(apiResult),

      // Validation Results
      validationResults: this.createValidationResults(apiResult),

      // Quality Metrics
      qualityMetrics: this.createQualityMetrics(apiResult),

      // Provider Specific Data
      providerSpecificData: {
        provider: 'unknown',
        formatVersion: '1.0',
        reportId: `report_${Date.now()}`,
        generationDate: new Date().toISOString(),
        customFields: {},
        processingNotes: []
      },

      // Cross Reference Data
      crossReferenceData: {
        duplicateAccounts: [],
        inconsistentData: [],
        missingData: [],
        correlationScore: apiResult.confidence || 75,
        verificationStatus: {}
      }
    }
  }

  private static convertCreditScores(creditScores: any, defaultConfidence: number) {
    if (!creditScores) return {}

    const converted: any = {}
    
    Object.entries(creditScores).forEach(([bureau, scoreData]: [string, any]) => {
      if (scoreData && typeof scoreData === 'object' && scoreData.score) {
        converted[bureau] = {
          score: scoreData.score,
          bureau: bureau as 'experian' | 'equifax' | 'transunion',
          date: scoreData.date || new Date().toISOString().split('T')[0],
          scoreRange: scoreData.scoreRange || { min: 300, max: 850 },
          model: scoreData.model || 'FICO 8',
          factors: scoreData.factors || [],
          confidence: scoreData.confidence || defaultConfidence || 75,
          dataQuality: scoreData.dataQuality || defaultConfidence || 75,
          lastUpdated: new Date().toISOString(),
          trend: scoreData.trend
        }
      }
    })

    return converted
  }

  private static convertAccounts(accounts: any[]) {
    return accounts.map((account, index) => ({
      id: account.id || `account_${index}`,
      creditorName: account.creditorName || 'Unknown Creditor',
      standardizedCreditorName: account.standardizedCreditorName || account.creditorName || 'Unknown Creditor',
      creditorCode: account.creditorCode,
      accountNumber: account.accountNumber || 'XXXX',
      accountType: account.accountType || 'credit_card',
      balance: account.balance || 0,
      creditLimit: account.creditLimit,
      paymentHistory: this.convertPaymentHistory(account.paymentHistory || []),
      status: account.status || 'open',
      openDate: account.openDate || 'Unknown',
      lastReported: account.lastReported || 'Unknown',
      bureaus: account.bureaus || ['experian'],
      utilization: account.utilization,
      monthsReviewed: account.monthsReviewed || 24,
      paymentPerformance: account.paymentPerformance,
      bureauData: account.bureauData,
      disputeHistory: account.disputeHistory || [],
      riskFactors: account.riskFactors || [],
      recommendations: account.recommendations || [],
      dataQuality: account.dataQuality || 80,
      confidence: account.confidence || 80,
      lastValidated: new Date().toISOString()
    }))
  }

  private static convertPaymentHistory(paymentHistory: any[]) {
    return paymentHistory.map(payment => ({
      month: payment.month || new Date().toISOString().substring(0, 7),
      status: payment.status || 'current',
      amount: payment.amount,
      dateReported: payment.dateReported,
      bureau: payment.bureau,
      confidence: payment.confidence || 80,
      verified: payment.verified || false,
      discrepancies: payment.discrepancies || []
    }))
  }

  private static convertNegativeItems(negativeItems: any[]) {
    return negativeItems.map((item, index) => ({
      id: item.id || `negative_${index}`,
      type: item.type || 'late_payment',
      creditorName: item.creditorName || 'Unknown Creditor',
      standardizedCreditorName: item.standardizedCreditorName || item.creditorName || 'Unknown Creditor',
      originalCreditor: item.originalCreditor,
      accountNumber: item.accountNumber,
      amount: item.amount || 0,
      date: item.date || 'Unknown',
      dateOfDelinquency: item.dateOfDelinquency,
      status: item.status || 'Active',
      description: item.description || 'Negative item',
      disputeReasons: item.disputeReasons || [],
      impactScore: item.impactScore || 50,
      bureauReporting: item.bureauReporting || ['experian'],
      ageInYears: item.ageInYears || 0,
      statuteOfLimitations: item.statuteOfLimitations,
      disputeStrategy: item.disputeStrategy,
      successProbability: item.successProbability,
      legalBasis: item.legalBasis || [],
      supportingEvidence: item.supportingEvidence || [],
      confidence: item.confidence || 80,
      verified: item.verified || false,
      lastValidated: new Date().toISOString(),
      discrepancies: item.discrepancies || []
    }))
  }

  private static convertInquiries(inquiries: any[]) {
    return inquiries.map((inquiry, index) => ({
      id: inquiry.id || `inquiry_${index}`,
      creditorName: inquiry.creditorName || 'Unknown Creditor',
      standardizedCreditorName: inquiry.standardizedCreditorName || inquiry.creditorName || 'Unknown Creditor',
      date: inquiry.date || 'Unknown',
      type: inquiry.type || 'hard',
      purpose: inquiry.purpose || 'Unknown',
      bureau: inquiry.bureau || 'experian',
      authorized: inquiry.authorized !== false,
      removable: inquiry.removable || false,
      impactScore: inquiry.impactScore || 10,
      ageInMonths: inquiry.ageInMonths || 0,
      disputeReasons: inquiry.disputeReasons || [],
      confidence: inquiry.confidence || 80,
      verified: inquiry.verified || false
    }))
  }

  private static convertPublicRecords(publicRecords: any[]) {
    return publicRecords.map((record, index) => ({
      id: record.id || `public_${index}`,
      type: record.type || 'judgment',
      amount: record.amount,
      date: record.date || 'Unknown',
      status: record.status || 'Active',
      court: record.court,
      description: record.description,
      dischargeDate: record.dischargeDate,
      chapter: record.chapter,
      jurisdiction: record.jurisdiction,
      caseNumber: record.caseNumber,
      disputeReasons: record.disputeReasons || [],
      impactScore: record.impactScore || 75,
      ageInYears: record.ageInYears || 0,
      confidence: record.confidence || 80,
      verified: record.verified || false
    }))
  }

  private static createExtractionMetadata(apiResult: APIAnalysisResult): ExtractionMetadata {
    return {
      extractionTimestamp: new Date(),
      aiModelsUsed: [apiResult.processingMethod || 'gemini'],
      confidenceScores: { [apiResult.processingMethod || 'gemini']: apiResult.confidence || 75 },
      consensusScore: apiResult.confidence || 75,
      processingTime: apiResult.processingTime || 0,
      documentQuality: {
        textClarity: this.getQualityScore(apiResult.processingMethod, 'textClarity'),
        completeness: this.getQualityScore(apiResult.processingMethod, 'completeness'),
        structureScore: this.getQualityScore(apiResult.processingMethod, 'structureScore'),
        overallQuality: apiResult.confidence || 75,
        issues: this.getQualityIssues(apiResult)
      },
      providerDetected: 'unknown',
      extractionMethod: this.getExtractionMethod(apiResult.processingMethod)
    }
  }

  private static createValidationResults(apiResult: APIAnalysisResult): ValidationResult[] {
    const issues = this.getValidationIssues(apiResult)
    
    return [{
      overallScore: apiResult.confidence || 75,
      dataQuality: {
        personalInfo: 80,
        creditScore: apiResult.confidence || 75,
        accounts: 80,
        negativeItems: 80,
        inquiries: 80,
        publicRecords: 80
      },
      accuracy: {
        textExtraction: this.getAccuracyScore(apiResult.processingMethod, 'textExtraction'),
        dataParsing: apiResult.confidence || 75,
        providerDetection: 60,
        aiAnalysis: apiResult.confidence || 75
      },
      issues,
      recommendations: this.getValidationRecommendations(apiResult),
      validatedAt: new Date(),
      validatedBy: 'system'
    }]
  }

  private static createQualityMetrics(apiResult: APIAnalysisResult): QualityMetrics {
    const baseScore = apiResult.confidence || 75
    
    return {
      dataCompleteness: baseScore + 5,
      dataAccuracy: baseScore,
      consistencyScore: baseScore - 5,
      validationScore: baseScore,
      overallQuality: baseScore,
      extractionQuality: this.getQualityScore(apiResult.processingMethod, 'extraction'),
      crossValidationScore: baseScore - 10,
      bureauConsistency: 85,
      temporalConsistency: 80
    }
  }

  private static getQualityScore(processingMethod: string, type: string): number {
    const baseScores = {
      document_ai: { textClarity: 95, completeness: 90, structureScore: 85, extraction: 90 },
      vision_api: { textClarity: 85, completeness: 80, structureScore: 75, extraction: 80 },
      tesseract: { textClarity: 70, completeness: 65, structureScore: 60, extraction: 65 },
      fallback: { textClarity: 60, completeness: 55, structureScore: 50, extraction: 55 }
    }
    
    return baseScores[processingMethod as keyof typeof baseScores]?.[type as keyof typeof baseScores.document_ai] || 75
  }

  private static getAccuracyScore(processingMethod: string, type: string): number {
    const accuracyScores = {
      document_ai: { textExtraction: 95 },
      vision_api: { textExtraction: 85 },
      tesseract: { textExtraction: 70 },
      fallback: { textExtraction: 60 }
    }
    
    return accuracyScores[processingMethod as keyof typeof accuracyScores]?.[type as keyof typeof accuracyScores.document_ai] || 75
  }

  private static getQualityIssues(apiResult: APIAnalysisResult): string[] {
    const issues: string[] = []
    
    if (apiResult.confidence < 85) {
      issues.push('Low extraction confidence detected')
    }
    
    if (apiResult.processingMethod === 'fallback' || apiResult.processingMethod === 'tesseract') {
      issues.push('Fallback OCR method used - accuracy may be reduced')
    }
    
    if (!apiResult.aiAnalysis?.extractedData?.creditScores || Object.keys(apiResult.aiAnalysis.extractedData.creditScores).length === 0) {
      issues.push('Credit scores not reliably extracted')
    }
    
    return issues
  }

  private static getValidationIssues(apiResult: APIAnalysisResult) {
    const issues = []
    
    if (apiResult.confidence < 70) {
      issues.push({
        type: 'warning' as const,
        category: 'accuracy' as const,
        message: 'Low extraction confidence may affect data accuracy',
        severity: 'medium' as const,
        field: 'overall',
        suggestion: 'Consider requesting manual review for critical decisions'
      })
    }
    
    if (apiResult.processingMethod === 'fallback') {
      issues.push({
        type: 'warning' as const,
        category: 'data_quality' as const,
        message: 'Fallback processing method used',
        severity: 'medium' as const,
        field: 'processing_method',
        suggestion: 'Document quality may have affected extraction accuracy'
      })
    }
    
    return issues
  }

  private static getValidationRecommendations(apiResult: APIAnalysisResult): string[] {
    const recommendations = []
    
    if (apiResult.confidence < 85) {
      recommendations.push('Consider manual review for improved accuracy')
    }
    
    if (apiResult.processingMethod !== 'document_ai') {
      recommendations.push('For best results, ensure document is clear and well-lit')
    }
    
    recommendations.push('Review extracted data for accuracy before making financial decisions')
    
    return recommendations
  }

  private static getExtractionMethod(processingMethod: string): 'ai' | 'ocr' | 'manual' | 'hybrid' {
    switch (processingMethod) {
      case 'document_ai':
      case 'vision_api':
        return 'ai'
      case 'tesseract':
      case 'fallback':
        return 'ocr'
      default:
        return 'hybrid'
    }
  }
}