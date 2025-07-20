/**
 * Enhanced Credit Analysis Types
 * 
 * This file contains enhanced types for the improved credit analysis system
 * with EOSCAR support, multi-model AI analysis, and comprehensive validation.
 */

// ===================================
// Enhanced Credit Report Data Types
// ===================================

export interface EnhancedCreditReportData {
  // Core data (existing)
  personalInfo: EnhancedPersonalInfo
  creditScores: EnhancedCreditScores
  accounts: EnhancedCreditAccount[]
  negativeItems: EnhancedNegativeItem[]
  inquiries: EnhancedCreditInquiry[]
  publicRecords: EnhancedPublicRecord[]
  
  // Enhanced metadata
  extractionMetadata: ExtractionMetadata
  validationResults: ValidationResult[]
  qualityMetrics: QualityMetrics
  providerSpecificData: ProviderSpecificData
  crossReferenceData: CrossReferenceData
}

export interface EnhancedPersonalInfo {
  name: string
  address: string
  ssn?: string
  dateOfBirth?: string
  phone?: string
  previousAddresses?: string[]
  aliases?: string[]
  employers?: EmploymentInfo[]
  
  // Validation metadata
  nameConfidence: number
  addressConfidence: number
  ssnValidated: boolean
  dobValidated: boolean
}

export interface EmploymentInfo {
  employerName: string
  position?: string
  startDate?: string
  endDate?: string
  address?: string
  verified: boolean
}

export interface EnhancedCreditScores {
  experian?: EnhancedCreditScore
  equifax?: EnhancedCreditScore
  transunion?: EnhancedCreditScore
  
  // Cross-bureau analysis
  averageScore?: number
  scoreVariance?: number
  consistencyScore?: number
}

export interface EnhancedCreditScore {
  score: number
  bureau: 'experian' | 'equifax' | 'transunion'
  date: string
  scoreRange: { min: number; max: number }
  model?: string // FICO 8, VantageScore 3.0, etc.
  factors?: ScoreFactor[]
  
  // Enhanced metadata
  confidence: number
  dataQuality: number
  lastUpdated: string
  trend?: ScoreTrend
}

export interface ScoreFactor {
  factor: string
  impact: 'positive' | 'negative' | 'neutral'
  weight: number
  description: string
  recommendation?: string
}

export interface ScoreTrend {
  direction: 'up' | 'down' | 'stable'
  change: number
  timeframe: string
  confidence: number
}

export interface EnhancedCreditAccount {
  id: string
  creditorName: string
  standardizedCreditorName: string
  creditorCode?: string
  accountNumber: string
  accountType: 'credit_card' | 'auto_loan' | 'mortgage' | 'personal_loan' | 'student_loan' | 'other'
  balance: number
  creditLimit?: number
  paymentHistory: EnhancedPaymentHistoryEntry[]
  status: 'open' | 'closed' | 'paid' | 'charged_off'
  openDate: string
  lastReported: string
  bureaus: ('experian' | 'equifax' | 'transunion')[]
  
  // Enhanced fields
  utilization?: number
  monthsReviewed?: number
  paymentPerformance?: PaymentPerformance
  bureauData?: BureauSpecificAccountData
  disputeHistory?: AccountDisputeHistory[]
  riskFactors?: string[]
  recommendations?: string[]
  
  // Validation metadata
  dataQuality: number
  confidence: number
  lastValidated: string
}

export interface EnhancedPaymentHistoryEntry {
  month: string // YYYY-MM format
  status: 'current' | '30_days_late' | '60_days_late' | '90_days_late' | '120_days_late' | 'charge_off' | 'collection' | 'paid' | 'closed'
  amount?: number
  dateReported?: string
  bureau?: 'experian' | 'equifax' | 'transunion'
  
  // Enhanced metadata
  confidence: number
  verified: boolean
  discrepancies?: string[]
}

export interface PaymentPerformance {
  onTimePercentage: number
  latePaymentCount: number
  worstStatus: string
  improvementTrend: 'improving' | 'declining' | 'stable'
  riskScore: number
}

export interface BureauSpecificAccountData {
  experian?: {
    balance?: number
    status?: string
    lastReported?: string
    paymentHistory?: EnhancedPaymentHistoryEntry[]
  }
  equifax?: {
    balance?: number
    status?: string
    lastReported?: string
    paymentHistory?: EnhancedPaymentHistoryEntry[]
  }
  transunion?: {
    balance?: number
    status?: string
    lastReported?: string
    paymentHistory?: EnhancedPaymentHistoryEntry[]
  }
}

export interface AccountDisputeHistory {
  disputeId: string
  disputeDate: string
  disputeReason: string
  outcome: string
  bureau: 'experian' | 'equifax' | 'transunion'
}

export interface EnhancedNegativeItem {
  id: string
  type: 'late_payment' | 'collection' | 'charge_off' | 'bankruptcy' | 'tax_lien' | 'judgment' | 'foreclosure'
  creditorName: string
  standardizedCreditorName: string
  originalCreditor?: string
  accountNumber?: string
  amount: number
  date: string
  dateOfDelinquency?: string
  status: string
  description: string
  disputeReasons: string[]
  impactScore: number // 1-100, how much it affects credit score
  
  // Enhanced fields
  bureauReporting: ('experian' | 'equifax' | 'transunion')[]
  ageInYears: number
  statuteOfLimitations?: StatuteInfo
  disputeStrategy?: DisputeStrategy
  successProbability?: number
  legalBasis?: string[]
  supportingEvidence?: string[]
  
  // Validation metadata
  confidence: number
  verified: boolean
  lastValidated: string
  discrepancies?: BureauDiscrepancy[]
}

export interface StatuteInfo {
  state: string
  yearsLimit: number
  isExpired: boolean
  expirationDate?: string
}

export interface DisputeStrategy {
  primaryReason: string
  secondaryReasons: string[]
  recommendedApproach: 'aggressive' | 'moderate' | 'conservative'
  timing: 'immediate' | 'delayed' | 'strategic'
  expectedOutcome: string
  alternativeStrategies: string[]
}

export interface BureauDiscrepancy {
  bureau: 'experian' | 'equifax' | 'transunion'
  field: string
  reportedValue: any
  expectedValue: any
  severity: 'low' | 'medium' | 'high'
}

export interface EnhancedCreditInquiry {
  id: string
  creditorName: string
  standardizedCreditorName: string
  date: string
  type: 'hard' | 'soft'
  purpose: string
  bureau: 'experian' | 'equifax' | 'transunion'
  
  // Enhanced fields
  authorized: boolean
  removable: boolean
  impactScore: number
  ageInMonths: number
  disputeReasons?: string[]
  
  // Validation metadata
  confidence: number
  verified: boolean
}

export interface EnhancedPublicRecord {
  id: string
  type: 'bankruptcy' | 'tax_lien' | 'judgment' | 'foreclosure'
  amount?: number
  date: string
  status: string
  court?: string
  description?: string
  
  // Enhanced fields
  dischargeDate?: string
  chapter?: string // For bankruptcies
  jurisdiction?: string
  caseNumber?: string
  disputeReasons?: string[]
  impactScore: number
  ageInYears: number
  
  // Validation metadata
  confidence: number
  verified: boolean
}

// ===================================
// Analysis and Validation Types
// ===================================

export interface ExtractionMetadata {
  extractionTimestamp: Date
  aiModelsUsed: string[]
  confidenceScores: { [model: string]: number }
  consensusScore: number
  processingTime: number
  documentQuality: DocumentQuality
  providerDetected: string
  extractionMethod: 'ai' | 'ocr' | 'manual' | 'hybrid'
}

export interface DocumentQuality {
  textClarity: number
  completeness: number
  structureScore: number
  overallQuality: number
  issues: string[]
}

export interface ValidationResult {
  overallScore: number
  dataQuality: DataQualityMetrics
  accuracy: AccuracyMetrics
  issues: ValidationIssue[]
  recommendations: string[]
  validatedAt: Date
  validatedBy: string
}

export interface DataQualityMetrics {
  personalInfo: number
  creditScore: number
  accounts: number
  negativeItems: number
  inquiries: number
  publicRecords: number
}

export interface AccuracyMetrics {
  textExtraction: number
  dataParsing: number
  providerDetection: number
  aiAnalysis: number
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info'
  category: 'data_quality' | 'accuracy' | 'completeness' | 'consistency'
  message: string
  severity: 'high' | 'medium' | 'low'
  field?: string
  suggestion?: string
  affectedItems?: string[]
}

export interface QualityMetrics {
  dataCompleteness: number
  dataAccuracy: number
  consistencyScore: number
  validationScore: number
  overallQuality: number
  
  // Detailed metrics
  extractionQuality: number
  crossValidationScore: number
  bureauConsistency: number
  temporalConsistency: number
}

export interface ProviderSpecificData {
  provider: string
  formatVersion?: string
  reportId?: string
  generationDate?: string
  customFields?: { [key: string]: any }
  processingNotes?: string[]
}

export interface CrossReferenceData {
  duplicateAccounts: string[]
  inconsistentData: BureauDiscrepancy[]
  missingData: string[]
  correlationScore: number
  verificationStatus: { [field: string]: boolean }
}

// ===================================
// EOSCAR Format Types
// ===================================

export interface EOSCARLetter {
  header: EOSCARHeader
  consumerInfo: EOSCARConsumerInfo
  disputeItems: EOSCARDisputeItem[]
  supportingDocs: EOSCARAttachment[]
  footer: EOSCARFooter
  rawContent: string
  complianceStatus: ComplianceStatus
  
  // Metadata
  generatedAt: Date
  version: string
  bureau: 'experian' | 'equifax' | 'transunion'
  submissionMethod: 'online' | 'mail' | 'fax'
}

export interface EOSCARHeader {
  transmissionId: string
  submissionDate: Date
  submitterInfo: SubmitterInfo
  bureauDestination: 'experian' | 'equifax' | 'transunion'
  formatVersion: string
  recordCount: number
}

export interface SubmitterInfo {
  name: string
  address: string
  phone: string
  email: string
  licenseNumber?: string
  organizationType: 'individual' | 'attorney' | 'credit_repair' | 'other'
}

export interface EOSCARConsumerInfo {
  firstName: string
  lastName: string
  middleName?: string
  suffix?: string
  ssn: string
  dateOfBirth: Date
  currentAddress: EOSCARAddress
  previousAddresses?: EOSCARAddress[]
  phoneNumbers: EOSCARPhoneNumber[]
  identification: EOSCARIdentification
}

export interface EOSCARAddress {
  street: string
  city: string
  state: string
  zipCode: string
  country?: string
  addressType: 'current' | 'previous' | 'mailing'
  dateRange?: {
    from: Date
    to?: Date
  }
}

export interface EOSCARPhoneNumber {
  number: string
  type: 'home' | 'work' | 'mobile' | 'other'
  isPrimary: boolean
}

export interface EOSCARIdentification {
  driversLicense?: {
    number: string
    state: string
    expirationDate: Date
  }
  passport?: {
    number: string
    country: string
    expirationDate: Date
  }
  other?: {
    type: string
    number: string
    issuingAuthority: string
  }
}

export interface EOSCARDisputeItem {
  sequenceNumber: number
  itemType: EOSCARItemType
  creditorName: string
  creditorCode?: string
  accountNumber: string
  disputeReasonCode: EOSCARReasonCode
  disputeDescription: string
  requestedAction: EOSCARAction
  supportingDocuments: string[]
  
  // Optional fields
  originalBalance?: number
  currentBalance?: number
  dateOpened?: Date
  dateReported?: Date
  dateOfFirstDelinquency?: Date
  
  // Enhanced fields
  legalBasis?: string
  specificInaccuracy?: string
  correctInformation?: string
  impactOnScore?: number
}

export enum EOSCARItemType {
  TRADELINE = "TRADELINE",
  INQUIRY = "INQUIRY", 
  PUBLIC_RECORD = "PUBLIC_RECORD",
  COLLECTION = "COLLECTION",
  PERSONAL_INFO = "PERSONAL_INFO"
}

export enum EOSCARReasonCode {
  NOT_MINE = "01",
  INACCURATE_BALANCE = "02",
  INACCURATE_PAYMENT_HISTORY = "03", 
  ACCOUNT_CLOSED = "04",
  PAID_IN_FULL = "05",
  SETTLED = "06",
  OUTDATED = "07",
  DUPLICATE = "08",
  IDENTITY_THEFT = "09",
  MIXED_FILE = "10",
  UNAUTHORIZED_INQUIRY = "11",
  INCORRECT_PERSONAL_INFO = "12",
  BANKRUPTCY_DISCHARGED = "13",
  STATUTE_OF_LIMITATIONS = "14",
  VALIDATION_REQUEST = "15"
}

export enum EOSCARAction {
  DELETE = "DELETE",
  UPDATE = "UPDATE",
  VERIFY = "VERIFY", 
  INVESTIGATE = "INVESTIGATE",
  CORRECT = "CORRECT",
  REMOVE = "REMOVE"
}

export interface EOSCARAttachment {
  id: string
  fileName: string
  fileType: string
  description: string
  relatedDisputeItems: number[]
  base64Content?: string
  fileUrl?: string
}

export interface EOSCARFooter {
  totalItems: number
  submissionDate: Date
  expectedResponseDate: Date
  contactInfo: SubmitterInfo
  legalNotices: string[]
  signature: EOSCARSignature
}

export interface EOSCARSignature {
  signerName: string
  signatureDate: Date
  electronicSignature: boolean
  ipAddress?: string
  deviceInfo?: string
}

export interface ComplianceStatus {
  isCompliant: boolean
  complianceScore: number
  issues: string[]
  warnings: string[]
  validatedAt: Date
  validatedBy: string
}

// ===================================
// Dispute Tracking Types
// ===================================

export interface EnhancedDisputeRecord {
  id: string
  userId: string
  disputeItems: EnhancedDisputeItem[]
  submissionMethod: SubmissionMethod
  bureauSubmissions: BureauSubmission[]
  trackingInfo: DisputeTracking
  responses: BureauResponse[]
  followUpActions: FollowUpAction[]
  status: DisputeStatus
  
  // Enhanced fields
  strategy: DisputeStrategy
  legalBasis: string[]
  successProbability: number
  estimatedImpact: number
  coordinationPlan?: MultiBureauCoordination
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  createdBy: string
  lastModifiedBy: string
}

export interface EnhancedDisputeItem {
  id: string
  negativeItemId: string
  disputeReason: string
  eoscarReasonCode: EOSCARReasonCode
  requestedAction: EOSCARAction
  legalBasis: string
  supportingEvidence: string[]
  expectedOutcome: string
  
  // Enhanced fields
  priority: 'high' | 'medium' | 'low'
  complexity: 'simple' | 'moderate' | 'complex'
  successProbability: number
  estimatedImpact: number
  timelineEstimate: string
}

export enum SubmissionMethod {
  ONLINE_PORTAL = "ONLINE_PORTAL",
  CERTIFIED_MAIL = "CERTIFIED_MAIL", 
  EMAIL = "EMAIL",
  FAX = "FAX",
  EOSCAR_ELECTRONIC = "EOSCAR_ELECTRONIC"
}

export interface BureauSubmission {
  bureau: 'experian' | 'equifax' | 'transunion'
  submissionDate: Date
  submissionMethod: SubmissionMethod
  trackingNumber?: string
  confirmationNumber?: string
  eoscarLetter: EOSCARLetter
  deliveryConfirmation?: DeliveryConfirmation
  
  // Enhanced tracking
  expectedResponseDate: Date
  actualResponseDate?: Date
  responseReceived: boolean
  followUpRequired: boolean
  escalationLevel: number
}

export interface DeliveryConfirmation {
  delivered: boolean
  deliveryDate?: Date
  recipient?: string
  trackingEvents: TrackingEvent[]
}

export interface TrackingEvent {
  timestamp: Date
  status: string
  location?: string
  description: string
}

export interface DisputeTracking {
  currentPhase: DisputePhase
  milestones: DisputeMilestone[]
  timeline: DisputeTimelineEntry[]
  nextActions: ScheduledAction[]
  escalationTriggers: EscalationTrigger[]
  
  // Performance metrics
  averageResponseTime?: number
  successRate?: number
  escalationRate?: number
}

export enum DisputePhase {
  PREPARATION = "PREPARATION",
  SUBMISSION = "SUBMISSION",
  INVESTIGATION = "INVESTIGATION", 
  RESPONSE = "RESPONSE",
  FOLLOW_UP = "FOLLOW_UP",
  ESCALATION = "ESCALATION",
  RESOLUTION = "RESOLUTION",
  CLOSED = "CLOSED"
}

export interface DisputeMilestone {
  phase: DisputePhase
  completedAt?: Date
  expectedAt: Date
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  notes?: string
}

export interface DisputeTimelineEntry {
  timestamp: Date
  event: string
  description: string
  actor: 'user' | 'system' | 'bureau' | 'attorney'
  metadata?: { [key: string]: any }
}

export interface ScheduledAction {
  id: string
  actionType: string
  scheduledFor: Date
  description: string
  automated: boolean
  completed: boolean
  completedAt?: Date
}

export interface EscalationTrigger {
  condition: string
  threshold: any
  action: string
  automated: boolean
  triggered: boolean
  triggeredAt?: Date
}

export interface BureauResponse {
  bureau: 'experian' | 'equifax' | 'transunion'
  responseDate: Date
  responseType: ResponseType
  outcome: DisputeOutcome
  updatedItems: UpdatedItem[]
  explanationLetter?: string
  nextSteps?: string[]
  
  // Enhanced response data
  responseMethod: 'mail' | 'online' | 'email'
  processingTime: number
  investigationNotes?: string
  contactInfo?: string
  appealRights?: string
  regulatoryInfo?: string
}

export enum ResponseType {
  INVESTIGATION_COMPLETE = "INVESTIGATION_COMPLETE",
  PARTIAL_RESPONSE = "PARTIAL_RESPONSE",
  REQUEST_MORE_INFO = "REQUEST_MORE_INFO",
  FRIVOLOUS_DISPUTE = "FRIVOLOUS_DISPUTE",
  NO_RESPONSE = "NO_RESPONSE"
}

export enum DisputeOutcome {
  DELETED = "DELETED",
  UPDATED = "UPDATED", 
  VERIFIED = "VERIFIED",
  PARTIAL = "PARTIAL",
  REJECTED = "REJECTED",
  PENDING = "PENDING"
}

export interface UpdatedItem {
  itemId: string
  previousValue: any
  newValue: any
  changeType: 'deletion' | 'modification' | 'correction'
  effectiveDate: Date
  impactOnScore?: number
}

export interface FollowUpAction {
  id: string
  actionType: 'second_dispute' | 'escalation' | 'cfpb_complaint' | 'legal_action'
  scheduledDate: Date
  description: string
  automated: boolean
  completed: boolean
  result?: string
}

export enum DisputeStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  IN_PROGRESS = "IN_PROGRESS", 
  RESPONDED = "RESPONDED",
  PARTIALLY_RESOLVED = "PARTIALLY_RESOLVED",
  RESOLVED = "RESOLVED",
  ESCALATED = "ESCALATED",
  CLOSED = "CLOSED"
}

export interface MultiBureauCoordination {
  strategy: 'simultaneous' | 'sequential' | 'targeted'
  timing: CoordinationTiming
  bureauPriority: ('experian' | 'equifax' | 'transunion')[]
  consistencyChecks: boolean
  escalationCoordination: boolean
}

export interface CoordinationTiming {
  startDate: Date
  staggerDelay?: number // days between submissions
  followUpDelay?: number // days between follow-ups
  escalationDelay?: number // days before escalation
}

// ===================================
// Analytics and Reporting Types
// ===================================

export interface DisputeAnalytics {
  successRates: SuccessRateMetrics
  timelineAnalysis: TimelineMetrics
  bureauPerformance: BureauPerformanceMetrics
  impactAnalysis: ImpactMetrics
  trendAnalysis: TrendMetrics
}

export interface SuccessRateMetrics {
  overall: number
  byBureau: { [bureau: string]: number }
  byDisputeType: { [type: string]: number }
  byReasonCode: { [code: string]: number }
  byTimeframe: { [period: string]: number }
}

export interface TimelineMetrics {
  averageResponseTime: number
  averageResolutionTime: number
  escalationRate: number
  followUpRate: number
  timeToResolution: { [outcome: string]: number }
}

export interface BureauPerformanceMetrics {
  responseTime: { [bureau: string]: number }
  successRate: { [bureau: string]: number }
  communicationQuality: { [bureau: string]: number }
  consistencyScore: { [bureau: string]: number }
}

export interface ImpactMetrics {
  scoreImprovement: number
  pointsGained: number
  negativeItemsRemoved: number
  accountsUpdated: number
  inquiriesRemoved: number
}

export interface TrendMetrics {
  monthlySuccess: { [month: string]: number }
  seasonalPatterns: { [season: string]: number }
  improvementTrend: 'improving' | 'declining' | 'stable'
  predictedOutcomes: { [outcome: string]: number }
}

// ===================================
// Database Schema Types
// ===================================

export interface EnhancedCreditReportTable {
  id: string
  user_id: string
  bureau: 'experian' | 'equifax' | 'transunion'
  report_date: string
  score?: number
  raw_data?: any
  ai_analysis?: any
  
  // Enhanced fields
  extraction_metadata: ExtractionMetadata
  validation_results: ValidationResult[]
  quality_metrics: QualityMetrics
  provider_detected: string
  confidence_score: number
  processing_time_ms: number
  
  created_at: string
  updated_at: string
}

export interface CreditorDatabaseTable {
  id: string
  creditor_name: string
  standardized_name: string
  creditor_code?: string
  aliases: string[]
  address?: string
  phone?: string
  website?: string
  industry: string
  
  // EOSCAR specific
  eoscar_code?: string
  bureau_codes: { [bureau: string]: string }
  
  created_at: string
  updated_at: string
}

export interface LegalReferenceTable {
  id: string
  reference_type: 'fcra_section' | 'case_law' | 'regulation' | 'statute'
  title: string
  description: string
  full_text: string
  citation: string
  jurisdiction?: string
  effective_date?: string
  
  // Dispute relevance
  dispute_types: string[]
  success_rate?: number
  usage_count: number
  
  created_at: string
  updated_at: string
}

export interface EOSCARTemplateTable {
  id: string
  template_name: string
  template_type: string
  bureau: 'experian' | 'equifax' | 'transunion' | 'all'
  template_content: string
  variables: string[]
  
  // Compliance
  eoscar_version: string
  compliance_validated: boolean
  last_validated: string
  
  created_at: string
  updated_at: string
}

// ===================================
// Multi-Bureau Coordination Types
// ===================================

export enum CreditBureau {
  EXPERIAN = "EXPERIAN",
  EQUIFAX = "EQUIFAX", 
  TRANSUNION = "TRANSUNION"
}

export interface DisputeRequest {
  itemId: string
  itemType: string
  creditorName: string
  creditorCode?: string
  accountNumber: string
  reasonCode: EOSCARReasonCode
  description: string
  requestedAction: EOSCARAction
  supportingDocuments?: string[]
  consumerInfo: ConsumerInfo
}

export interface ConsumerInfo {
  firstName: string
  lastName: string
  ssn: string
  dateOfBirth: Date
  currentAddress: EOSCARAddress
  phoneNumbers: EOSCARPhoneNumber[]
}

export interface MultiBureauDispute {
  disputeId: string
  experianLetter?: EOSCARLetter
  equifaxLetter?: EOSCARLetter
  transunionLetter?: EOSCARLetter
  coordinationStrategy: CoordinationStrategy
  trackingInfo: DisputeTracking
}

export interface CoordinationStrategy {
  strategyType: 'SYNCHRONIZED' | 'SEQUENTIAL' | 'TARGETED'
  submissionTiming: SubmissionTiming
  bureauPriority: CreditBureau[]
  followUpStrategy: FollowUpStrategy
  riskMitigation: RiskMitigation
}

export interface SubmissionTiming {
  staggered: boolean
  simultaneousSubmission: boolean
  delayBetweenBureaus: number // days
}

export interface FollowUpStrategy {
  coordinatedFollowUp: boolean
  escalationThreshold: number // days
  consistencyCheckInterval: number // days
}

export interface RiskMitigation {
  avoidBureauFatigue: boolean
  maxDisputesPerSubmission: number
  cooldownPeriod: number // days
}

export interface BureauResponseStatus {
  bureau: CreditBureau
  disputeId: string
  status: 'PENDING' | 'RECEIVED' | 'INVESTIGATING' | 'RESPONDED' | 'ESCALATED'
  submissionDate: Date
  responseDate: Date | null
  daysElapsed: number
  nextActionDate: Date
  escalationRequired: boolean
}

export interface ConsistencyAnalysis {
  overallConsistency: number
  discrepancies: ItemConsistencyAnalysis[]
  consistentItems: ItemConsistencyAnalysis[]
  recommendedActions: string[]
  analysisDate: Date
}

export interface ItemConsistencyAnalysis {
  itemId: string
  isConsistent: boolean
  bureauResponses: BureauResponse[]
  discrepancyType: string | null
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  recommendedAction: string
}

export interface EscalationPlan {
  escalationId: string
  discrepancies: ItemConsistencyAnalysis[]
  escalationSteps: EscalationStep[]
  timeline: Map<string, Date>
  expectedOutcome: string
  createdAt: Date
}

export interface EscalationStep {
  stepType: string
  description: string
  timeline: number // days
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface DisputeTracking {
  disputeId: string
  submissionDate: Date
  expectedResponseDate: Date
  bureauStatus: Map<CreditBureau, BureauStatus>
  milestones: DisputeMilestone[]
  nextActions: ScheduledAction[]
  escalationTriggers: EscalationTrigger[]
}

export interface BureauStatus {
  status: string
  lastUpdate: Date
}