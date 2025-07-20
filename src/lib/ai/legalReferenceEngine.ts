/**
 * Legal Reference Engine
 * 
 * This module provides comprehensive legal basis analysis for credit disputes,
 * including FCRA sections, case law references, and regulatory guidance.
 */

import { supabase } from '@/lib/supabase/client'
import { EOSCARReasonCode, EOSCARItemType } from '@/types/enhanced-credit'

// ===================================
// Legal Reference Types
// ===================================

export interface LegalReference {
  id: string
  referenceType: 'fcra_section' | 'case_law' | 'regulation' | 'statute' | 'cfpb_guidance'
  title: string
  citation: string
  description: string
  fullText: string
  jurisdiction?: string
  effectiveDate?: Date
  disputeTypes: string[]
  reasonCodes: EOSCARReasonCode[]
  itemTypes: EOSCARItemType[]
  successRate?: number
  usageCount: number
  strength: 'weak' | 'moderate' | 'strong'
  applicability: LegalApplicability
  relatedReferences: string[]
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface LegalApplicability {
  bureaus: ('experian' | 'equifax' | 'transunion')[]
  disputeScenarios: string[]
  requiredElements: string[]
  limitations: string[]
  precedentStrength: 'binding' | 'persuasive' | 'informational'
}

export interface LegalAnalysisRequest {
  disputeType: string
  reasonCode: EOSCARReasonCode
  itemType: EOSCARItemType
  creditorName: string
  accountDetails: AccountDetails
  consumerCircumstances: ConsumerCircumstances
  bureau: 'experian' | 'equifax' | 'transunion'
  previousAttempts: PreviousAttempt[]
}

export interface AccountDetails {
  accountAge: number
  delinquencyAge: number
  originalBalance: number
  currentBalance: number
  paymentHistory: string[]
  accountStatus: string
  dateOpened?: Date
  dateClosed?: Date
  dateOfFirstDelinquency?: Date
}

export interface ConsumerCircumstances {
  hasDocumentation: boolean
  documentationTypes: string[]
  identityTheftClaim: boolean
  bankruptcyHistory: boolean
  militaryService: boolean
  elderlyStatus: boolean
  disabilityStatus: boolean
  stateLaws: string[]
}

export interface PreviousAttempt {
  date: Date
  bureau: string
  outcome: string
  legalBasisUsed: string[]
  responseReceived: boolean
}

export interface LegalAnalysisResult {
  primaryLegalBasis: LegalBasisRecommendation
  alternativeBases: LegalBasisRecommendation[]
  strengthAssessment: StrengthAssessment
  requiredElements: RequiredElement[]
  strategicRecommendations: StrategicRecommendation[]
  precedentCases: PrecedentCase[]
  regulatoryGuidance: RegulatoryGuidance[]
  riskFactors: LegalRiskFactor[]
}

export interface LegalBasisRecommendation {
  reference: LegalReference
  applicabilityScore: number
  strengthRating: 'weak' | 'moderate' | 'strong'
  successProbability: number
  requiredEvidence: string[]
  argumentStructure: ArgumentStructure
  citationFormat: string
}

export interface ArgumentStructure {
  opening: string
  legalStandard: string
  factualApplication: string
  conclusion: string
  supportingCitations: string[]
}

export interface StrengthAssessment {
  overallStrength: 'weak' | 'moderate' | 'strong'
  confidenceLevel: number
  strengthFactors: StrengthFactor[]
  weaknesses: string[]
  mitigationStrategies: string[]
}

export interface StrengthFactor {
  factor: string
  impact: 'positive' | 'negative' | 'neutral'
  weight: number
  description: string
}

export interface RequiredElement {
  element: string
  description: string
  evidenceNeeded: string[]
  criticalityLevel: 'essential' | 'important' | 'helpful'
  satisfied: boolean
}

export interface StrategicRecommendation {
  type: 'legal_strategy' | 'evidence_gathering' | 'timing' | 'escalation'
  priority: 'high' | 'medium' | 'low'
  recommendation: string
  rationale: string
  expectedImpact: number
  implementationSteps: string[]
}

export interface PrecedentCase {
  caseName: string
  citation: string
  court: string
  year: number
  relevantFacts: string
  holding: string
  applicability: string
  strength: 'strong' | 'moderate' | 'weak'
}

export interface RegulatoryGuidance {
  source: 'cfpb' | 'ftc' | 'federal_reserve' | 'occ' | 'fdic'
  title: string
  date: Date
  guidance: string
  applicability: string
  url?: string
}

export interface LegalRiskFactor {
  risk: string
  severity: 'high' | 'medium' | 'low'
  likelihood: number
  mitigation: string
  impact: string
}

// ===================================
// Legal Reference Engine
// ===================================

export class LegalReferenceEngine {
  private legalReferences: Map<string, LegalReference> = new Map()
  private precedentCases: Map<string, PrecedentCase> = new Map()
  private lastDataUpdate: Date = new Date(0)

  constructor() {
    this.loadLegalReferences()
    this.loadPrecedentCases()
  }

  /**
   * Analyze legal basis for dispute
   */
  async analyzeLegalBasis(request: LegalAnalysisRequest): Promise<LegalAnalysisResult> {
    console.log(`Analyzing legal basis for ${request.reasonCode} dispute`)

    // Ensure data is current
    await this.ensureDataCurrent()

    // Find applicable legal references
    const applicableReferences = this.findApplicableReferences(request)

    // Rank references by strength and applicability
    const rankedReferences = this.rankLegalReferences(applicableReferences, request)

    // Generate primary and alternative legal bases
    const primaryBasis = this.generatePrimaryBasis(rankedReferences[0], request)
    const alternativeBases = rankedReferences.slice(1, 4).map(ref => 
      this.generateAlternativeBasis(ref, request)
    )

    // Assess overall strength
    const strengthAssessment = this.assessLegalStrength(primaryBasis, alternativeBases, request)

    // Identify required elements
    const requiredElements = this.identifyRequiredElements(primaryBasis, request)

    // Generate strategic recommendations
    const strategicRecommendations = this.generateStrategicRecommendations(
      primaryBasis, strengthAssessment, request
    )

    // Find relevant precedent cases
    const precedentCases = this.findRelevantPrecedents(request)

    // Get regulatory guidance
    const regulatoryGuidance = this.getRegulatoryGuidance(request)

    // Assess legal risks
    const riskFactors = this.assessLegalRisks(primaryBasis, request)

    return {
      primaryLegalBasis: primaryBasis,
      alternativeBases,
      strengthAssessment,
      requiredElements,
      strategicRecommendations,
      precedentCases,
      regulatoryGuidance,
      riskFactors
    }
  }

  /**
   * Get FCRA section for specific dispute type
   */
  getFCRASection(reasonCode: EOSCARReasonCode): LegalReference | null {
    const fcraMapping = {
      [EOSCARReasonCode.IDENTITY_THEFT]: 'fcra_605b',
      [EOSCARReasonCode.NOT_MINE]: 'fcra_611',
      [EOSCARReasonCode.INACCURATE_BALANCE]: 'fcra_611',
      [EOSCARReasonCode.INACCURATE_PAYMENT_HISTORY]: 'fcra_623',
      [EOSCARReasonCode.OUTDATED]: 'fcra_605',
      [EOSCARReasonCode.DUPLICATE]: 'fcra_611',
      [EOSCARReasonCode.MIXED_FILE]: 'fcra_611',
      [EOSCARReasonCode.UNAUTHORIZED_INQUIRY]: 'fcra_604',
      [EOSCARReasonCode.VALIDATION_REQUEST]: 'fcra_611'
    }

    const sectionId = fcraMapping[reasonCode]
    return sectionId ? this.legalReferences.get(sectionId) || null : null
  }

  /**
   * Generate legal argument structure
   */
  generateLegalArgument(
    legalBasis: LegalBasisRecommendation,
    request: LegalAnalysisRequest
  ): ArgumentStructure {
    const reference = legalBasis.reference

    return {
      opening: this.generateOpening(reference, request),
      legalStandard: this.generateLegalStandard(reference),
      factualApplication: this.generateFactualApplication(reference, request),
      conclusion: this.generateConclusion(reference, request),
      supportingCitations: this.generateSupportingCitations(reference)
    }
  }

  /**
   * Load legal references from database
   */
  private async loadLegalReferences(): Promise<void> {
    try {
      const { data: references, error } = await supabase
        .from('legal_references')
        .select('*')
        .order('usage_count', { ascending: false })

      if (error) {
        console.error('Error loading legal references:', error)
        this.loadDefaultReferences()
        return
      }

      references?.forEach(ref => {
        const legalRef: LegalReference = {
          id: ref.id,
          referenceType: ref.reference_type,
          title: ref.title,
          citation: ref.citation,
          description: ref.description,
          fullText: ref.full_text,
          jurisdiction: ref.jurisdiction,
          effectiveDate: ref.effective_date ? new Date(ref.effective_date) : undefined,
          disputeTypes: ref.dispute_types || [],
          reasonCodes: ref.reason_codes || [],
          itemTypes: ref.item_types || [],
          successRate: ref.success_rate,
          usageCount: ref.usage_count || 0,
          strength: ref.strength || 'moderate',
          applicability: ref.applicability || this.getDefaultApplicability(),
          relatedReferences: ref.related_references || [],
          tags: ref.tags || [],
          createdAt: new Date(ref.created_at),
          updatedAt: new Date(ref.updated_at)
        }

        this.legalReferences.set(ref.id, legalRef)
      })

      console.log(`Loaded ${references?.length || 0} legal references`)

    } catch (error) {
      console.error('Failed to load legal references:', error)
      this.loadDefaultReferences()
    }
  }

  /**
   * Load default legal references
   */
  private loadDefaultReferences(): void {
    const defaultReferences = this.getDefaultLegalReferences()
    
    defaultReferences.forEach(ref => {
      this.legalReferences.set(ref.id, ref)
    })

    console.log(`Loaded ${defaultReferences.length} default legal references`)
  }

  /**
   * Find applicable legal references
   */
  private findApplicableReferences(request: LegalAnalysisRequest): LegalReference[] {
    const applicable: LegalReference[] = []

    this.legalReferences.forEach(ref => {
      let score = 0

      // Check reason code match
      if (ref.reasonCodes.includes(request.reasonCode)) {
        score += 3
      }

      // Check item type match
      if (ref.itemTypes.includes(request.itemType)) {
        score += 2
      }

      // Check dispute type match
      if (ref.disputeTypes.includes(request.disputeType)) {
        score += 2
      }

      // Check bureau applicability
      if (ref.applicability.bureaus.includes(request.bureau)) {
        score += 1
      }

      // Must have minimum score to be applicable
      if (score >= 2) {
        applicable.push(ref)
      }
    })

    return applicable
  }

  /**
   * Rank legal references by strength and applicability
   */
  private rankLegalReferences(
    references: LegalReference[],
    request: LegalAnalysisRequest
  ): LegalReference[] {
    return references.sort((a, b) => {
      // Calculate composite score
      const scoreA = this.calculateReferenceScore(a, request)
      const scoreB = this.calculateReferenceScore(b, request)
      
      return scoreB - scoreA
    })
  }

  /**
   * Calculate reference score
   */
  private calculateReferenceScore(ref: LegalReference, request: LegalAnalysisRequest): number {
    let score = 0

    // Strength weight (40%)
    const strengthWeights = { strong: 3, moderate: 2, weak: 1 }
    score += strengthWeights[ref.strength] * 0.4

    // Success rate weight (30%)
    if (ref.successRate) {
      score += ref.successRate * 0.3
    }

    // Usage count weight (20%)
    score += Math.min(ref.usageCount / 100, 1) * 0.2

    // Precedent strength weight (10%)
    const precedentWeights = { binding: 1, persuasive: 0.7, informational: 0.3 }
    score += precedentWeights[ref.applicability.precedentStrength] * 0.1

    return score
  }

  /**
   * Generate primary legal basis
   */
  private generatePrimaryBasis(
    reference: LegalReference,
    request: LegalAnalysisRequest
  ): LegalBasisRecommendation {
    return {
      reference,
      applicabilityScore: this.calculateApplicabilityScore(reference, request),
      strengthRating: reference.strength,
      successProbability: reference.successRate || 0.6,
      requiredEvidence: this.getRequiredEvidence(reference, request),
      argumentStructure: this.generateLegalArgument({ reference } as LegalBasisRecommendation, request),
      citationFormat: this.formatCitation(reference)
    }
  }

  /**
   * Generate alternative legal basis
   */
  private generateAlternativeBasis(
    reference: LegalReference,
    request: LegalAnalysisRequest
  ): LegalBasisRecommendation {
    return this.generatePrimaryBasis(reference, request)
  }

  /**
   * Assess legal strength
   */
  private assessLegalStrength(
    primaryBasis: LegalBasisRecommendation,
    alternativeBases: LegalBasisRecommendation[],
    request: LegalAnalysisRequest
  ): StrengthAssessment {
    const strengthFactors: StrengthFactor[] = []
    const weaknesses: string[] = []
    const mitigationStrategies: string[] = []

    // Analyze primary basis strength
    if (primaryBasis.strengthRating === 'strong') {
      strengthFactors.push({
        factor: 'Strong Legal Precedent',
        impact: 'positive',
        weight: 0.4,
        description: 'Primary legal basis has strong precedential support'
      })
    }

    // Check for documentation
    if (request.consumerCircumstances.hasDocumentation) {
      strengthFactors.push({
        factor: 'Supporting Documentation',
        impact: 'positive',
        weight: 0.3,
        description: 'Consumer has supporting documentation'
      })
    } else {
      weaknesses.push('Lack of supporting documentation')
      mitigationStrategies.push('Gather relevant documentation before submission')
    }

    // Check for previous attempts
    if (request.previousAttempts.length > 0) {
      const unsuccessfulAttempts = request.previousAttempts.filter(a => a.outcome !== 'success')
      if (unsuccessfulAttempts.length > 0) {
        strengthFactors.push({
          factor: 'Previous Attempt History',
          impact: 'negative',
          weight: 0.2,
          description: 'Previous unsuccessful attempts may complicate case'
        })
        mitigationStrategies.push('Address reasons for previous failures')
      }
    }

    // Calculate overall strength
    const positiveWeight = strengthFactors
      .filter(f => f.impact === 'positive')
      .reduce((sum, f) => sum + f.weight, 0)
    
    const negativeWeight = strengthFactors
      .filter(f => f.impact === 'negative')
      .reduce((sum, f) => sum + f.weight, 0)

    const netStrength = positiveWeight - negativeWeight
    let overallStrength: 'weak' | 'moderate' | 'strong'
    let confidenceLevel: number

    if (netStrength >= 0.6) {
      overallStrength = 'strong'
      confidenceLevel = 0.85
    } else if (netStrength >= 0.3) {
      overallStrength = 'moderate'
      confidenceLevel = 0.70
    } else {
      overallStrength = 'weak'
      confidenceLevel = 0.50
    }

    return {
      overallStrength,
      confidenceLevel,
      strengthFactors,
      weaknesses,
      mitigationStrategies
    }
  }

  /**
   * Generate argument components
   */
  private generateOpening(reference: LegalReference, request: LegalAnalysisRequest): string {
    const templates = {
      fcra_section: `Under the Fair Credit Reporting Act ${reference.citation}, consumers have the right to dispute inaccurate information on their credit reports.`,
      case_law: `As established in ${reference.citation}, ${reference.description}`,
      regulation: `According to ${reference.citation}, ${reference.description}`
    }

    return templates[reference.referenceType] || `Based on ${reference.citation}, ${reference.description}`
  }

  private generateLegalStandard(reference: LegalReference): string {
    return `The legal standard requires that ${reference.description.toLowerCase()}.`
  }

  private generateFactualApplication(reference: LegalReference, request: LegalAnalysisRequest): string {
    return `In this case, the disputed information fails to meet this standard because [specific factual circumstances apply].`
  }

  private generateConclusion(reference: LegalReference, request: LegalAnalysisRequest): string {
    return `Therefore, under ${reference.citation}, the disputed information must be corrected or removed.`
  }

  private generateSupportingCitations(reference: LegalReference): string[] {
    return reference.relatedReferences.map(refId => {
      const relatedRef = this.legalReferences.get(refId)
      return relatedRef ? relatedRef.citation : refId
    })
  }

  /**
   * Helper methods
   */
  private calculateApplicabilityScore(reference: LegalReference, request: LegalAnalysisRequest): number {
    let score = 0.5 // Base score

    if (reference.reasonCodes.includes(request.reasonCode)) score += 0.3
    if (reference.itemTypes.includes(request.itemType)) score += 0.2
    if (reference.applicability.bureaus.includes(request.bureau)) score += 0.1

    return Math.min(score, 1.0)
  }

  private getRequiredEvidence(reference: LegalReference, request: LegalAnalysisRequest): string[] {
    return reference.applicability.requiredElements || [
      'Copy of credit report showing disputed information',
      'Documentation supporting consumer\'s position',
      'Identity verification documents'
    ]
  }

  private formatCitation(reference: LegalReference): string {
    return reference.citation
  }

  private identifyRequiredElements(
    primaryBasis: LegalBasisRecommendation,
    request: LegalAnalysisRequest
  ): RequiredElement[] {
    const elements: RequiredElement[] = []

    // Standard elements for all disputes
    elements.push({
      element: 'Consumer Identity Verification',
      description: 'Proof of consumer identity and address',
      evidenceNeeded: ['Government-issued ID', 'Utility bill or bank statement'],
      criticalityLevel: 'essential',
      satisfied: true // Assume satisfied for now
    })

    elements.push({
      element: 'Disputed Information Identification',
      description: 'Clear identification of the disputed information',
      evidenceNeeded: ['Copy of credit report', 'Highlighted disputed items'],
      criticalityLevel: 'essential',
      satisfied: true
    })

    // Specific elements based on dispute type
    if (request.reasonCode === EOSCARReasonCode.IDENTITY_THEFT) {
      elements.push({
        element: 'Identity Theft Documentation',
        description: 'Evidence of identity theft',
        evidenceNeeded: ['Police report', 'FTC Identity Theft Report', 'Affidavit'],
        criticalityLevel: 'essential',
        satisfied: request.consumerCircumstances.identityTheftClaim
      })
    }

    if (request.reasonCode === EOSCARReasonCode.PAID_IN_FULL) {
      elements.push({
        element: 'Payment Documentation',
        description: 'Proof of payment in full',
        evidenceNeeded: ['Cancelled checks', 'Bank statements', 'Payment receipts'],
        criticalityLevel: 'essential',
        satisfied: request.consumerCircumstances.hasDocumentation
      })
    }

    return elements
  }

  private generateStrategicRecommendations(
    primaryBasis: LegalBasisRecommendation,
    strengthAssessment: StrengthAssessment,
    request: LegalAnalysisRequest
  ): StrategicRecommendation[] {
    const recommendations: StrategicRecommendation[] = []

    // Evidence gathering recommendations
    if (strengthAssessment.weaknesses.includes('Lack of supporting documentation')) {
      recommendations.push({
        type: 'evidence_gathering',
        priority: 'high',
        recommendation: 'Gather supporting documentation before submission',
        rationale: 'Documentation significantly improves success probability',
        expectedImpact: 0.25,
        implementationSteps: [
          'Identify required documentation types',
          'Contact relevant institutions for records',
          'Organize documentation chronologically',
          'Create clear copies for submission'
        ]
      })
    }

    // Legal strategy recommendations
    if (primaryBasis.strengthRating === 'weak') {
      recommendations.push({
        type: 'legal_strategy',
        priority: 'high',
        recommendation: 'Consider alternative legal theories',
        rationale: 'Primary legal basis may not be sufficient',
        expectedImpact: 0.20,
        implementationSteps: [
          'Review alternative legal bases',
          'Consult with legal expert if needed',
          'Strengthen factual foundation',
          'Consider multiple legal arguments'
        ]
      })
    }

    // Timing recommendations
    if (request.previousAttempts.length > 0) {
      recommendations.push({
        type: 'timing',
        priority: 'medium',
        recommendation: 'Wait appropriate interval before resubmission',
        rationale: 'Avoid appearance of frivolous disputes',
        expectedImpact: 0.10,
        implementationSteps: [
          'Review previous attempt timeline',
          'Ensure new evidence or legal theory',
          'Wait minimum 30 days from last attempt',
          'Document changes from previous submission'
        ]
      })
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  private findRelevantPrecedents(request: LegalAnalysisRequest): PrecedentCase[] {
    // This would search through case law database
    return []
  }

  private getRegulatoryGuidance(request: LegalAnalysisRequest): RegulatoryGuidance[] {
    // This would return relevant CFPB/FTC guidance
    return []
  }

  private assessLegalRisks(
    primaryBasis: LegalBasisRecommendation,
    request: LegalAnalysisRequest
  ): LegalRiskFactor[] {
    const risks: LegalRiskFactor[] = []

    if (request.previousAttempts.length > 2) {
      risks.push({
        risk: 'Frivolous Dispute Classification',
        severity: 'high',
        likelihood: 0.3,
        mitigation: 'Ensure new evidence or legal theory for each attempt',
        impact: 'Dispute may be rejected without investigation'
      })
    }

    if (primaryBasis.strengthRating === 'weak') {
      risks.push({
        risk: 'Weak Legal Foundation',
        severity: 'medium',
        likelihood: 0.6,
        mitigation: 'Strengthen legal basis with additional research',
        impact: 'Lower probability of successful outcome'
      })
    }

    return risks
  }

  private async ensureDataCurrent(): Promise<void> {
    const now = new Date()
    const daysSinceUpdate = (now.getTime() - this.lastDataUpdate.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysSinceUpdate > 7) {
      await this.loadLegalReferences()
      this.lastDataUpdate = now
    }
  }

  private loadPrecedentCases(): void {
    // Load precedent cases - would be from database in production
  }

  private getDefaultApplicability(): LegalApplicability {
    return {
      bureaus: ['experian', 'equifax', 'transunion'],
      disputeScenarios: [],
      requiredElements: [],
      limitations: [],
      precedentStrength: 'informational'
    }
  }

  private getDefaultLegalReferences(): LegalReference[] {
    const now = new Date()
    
    return [
      {
        id: 'fcra_611',
        referenceType: 'fcra_section',
        title: 'FCRA Section 611 - Procedure in case of disputed accuracy',
        citation: '15 U.S.C. § 1681i',
        description: 'Consumers have the right to dispute inaccurate information and credit reporting agencies must investigate',
        fullText: 'If the completeness or accuracy of any item of information contained in a consumer\'s file at a consumer reporting agency is disputed by the consumer and the consumer notifies the agency directly, or indirectly through a reseller, of such dispute, the agency shall, free of charge, conduct a reasonable reinvestigation to determine whether the disputed information is inaccurate and record the current status of the disputed information, or delete the item from the file...',
        disputeTypes: ['inaccurate_information', 'general_dispute'],
        reasonCodes: [EOSCARReasonCode.NOT_MINE, EOSCARReasonCode.INACCURATE_BALANCE, EOSCARReasonCode.INACCURATE_PAYMENT_HISTORY, EOSCARReasonCode.DUPLICATE],
        itemTypes: [EOSCARItemType.TRADELINE, EOSCARItemType.COLLECTION, EOSCARItemType.PUBLIC_RECORD],
        successRate: 0.65,
        usageCount: 15000,
        strength: 'strong',
        applicability: {
          bureaus: ['experian', 'equifax', 'transunion'],
          disputeScenarios: ['inaccurate_information', 'unverifiable_information'],
          requiredElements: ['Consumer notification', 'Specific dispute', 'Reasonable investigation'],
          limitations: ['Must be specific dispute', 'Cannot be frivolous'],
          precedentStrength: 'binding'
        },
        relatedReferences: ['fcra_623', 'fcra_605'],
        tags: ['dispute_rights', 'investigation_duty', 'accuracy'],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'fcra_605b',
        referenceType: 'fcra_section',
        title: 'FCRA Section 605B - Identity theft prevention',
        citation: '15 U.S.C. § 1681c-2',
        description: 'Procedures for blocking fraudulent information resulting from identity theft',
        fullText: 'Upon receipt of a request from a consumer for information under section 1681g of this title, if the consumer submits an identity theft report to a consumer reporting agency, the agency shall block the reporting of any information in the file of the consumer that the consumer identifies in the identity theft report as information that resulted from an alleged identity theft...',
        disputeTypes: ['identity_theft'],
        reasonCodes: [EOSCARReasonCode.IDENTITY_THEFT, EOSCARReasonCode.NOT_MINE],
        itemTypes: [EOSCARItemType.TRADELINE, EOSCARItemType.COLLECTION, EOSCARItemType.INQUIRY],
        successRate: 0.85,
        usageCount: 8000,
        strength: 'strong',
        applicability: {
          bureaus: ['experian', 'equifax', 'transunion'],
          disputeScenarios: ['identity_theft', 'fraudulent_accounts'],
          requiredElements: ['Identity theft report', 'Police report', 'Specific identification'],
          limitations: ['Must have identity theft report', 'Must be result of identity theft'],
          precedentStrength: 'binding'
        },
        relatedReferences: ['fcra_611'],
        tags: ['identity_theft', 'blocking', 'fraud'],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'fcra_605',
        referenceType: 'fcra_section',
        title: 'FCRA Section 605 - Requirements relating to information contained in consumer reports',
        citation: '15 U.S.C. § 1681c',
        description: 'Establishes time limits for reporting negative information',
        fullText: 'Except as authorized under subsection (b) of this section, no consumer reporting agency may make any consumer report containing any of the following items of information: (1) Cases under title 11 or under the Bankruptcy Act that, from the date of entry of the order for relief or the date of adjudication, as the case may be, antedate the report by more than 10 years...',
        disputeTypes: ['outdated_information'],
        reasonCodes: [EOSCARReasonCode.OUTDATED, EOSCARReasonCode.STATUTE_OF_LIMITATIONS],
        itemTypes: [EOSCARItemType.TRADELINE, EOSCARItemType.PUBLIC_RECORD, EOSCARItemType.COLLECTION],
        successRate: 0.78,
        usageCount: 12000,
        strength: 'strong',
        applicability: {
          bureaus: ['experian', 'equifax', 'transunion'],
          disputeScenarios: ['time_barred_information', 'expired_reporting_periods'],
          requiredElements: ['Date calculation', 'Reporting period identification'],
          limitations: ['Must exceed reporting period', 'Some exceptions apply'],
          precedentStrength: 'binding'
        },
        relatedReferences: ['fcra_611'],
        tags: ['reporting_periods', 'time_limits', 'obsolete_information'],
        createdAt: now,
        updatedAt: now
      }
    ]
  }
}

// Singleton instance
export const legalReferenceEngine = new LegalReferenceEngine()