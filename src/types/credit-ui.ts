/**
 * Enhanced Credit Data UI Types
 * 
 * TypeScript interfaces for the enhanced credit data display components
 */

import { EnhancedCreditReportData, EnhancedCreditScores, EnhancedDisputeItem } from './enhanced-credit'

// ===================================
// Core UI Data Interfaces
// ===================================

export interface EnhancedAnalysisResult {
  // Core data
  extractedData: EnhancedCreditReportData
  scoreAnalysis: EnhancedCreditScores
  recommendations: EnhancedDisputeItem[]
  
  // UI-specific enhancements
  uiMetadata: UIMetadata
  
  // Export capabilities
  exportOptions: ExportOption[]
  
  // Real-time updates
  processingStatus: ProcessingStatus
}

export interface UIMetadata {
  confidence: number
  processingMethod: string
  completeness: DataCompleteness
  visualizations: VisualizationData
  actionableItems: ActionableItem[]
  lastUpdated: string
}

export interface DataCompleteness {
  personalInfo: number // 0-100%
  creditScores: number
  accounts: number
  negativeItems: number
  inquiries: number
  overall: number
}

export interface VisualizationData {
  scoreCharts: {
    current: ChartData
    projected: ChartData
    historical?: ChartData
  }
  utilizationCharts: ChartData[]
  paymentPatterns: PaymentPattern[]
  impactProjections: ImpactProjection[]
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
    borderWidth?: number
  }[]
}

export interface PaymentPattern {
  accountId: string
  pattern: ('current' | 'late' | 'missed')[]
  months: string[]
  trend: 'improving' | 'declining' | 'stable'
}

export interface ImpactProjection {
  action: string
  estimatedImpact: number
  timeframe: string
  confidence: number
  prerequisites: string[]
}

export interface ActionableItem {
  id: string
  type: 'dispute' | 'payment' | 'utilization' | 'inquiry'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  expectedImpact: number
  timeToComplete: string
  difficulty: 'easy' | 'medium' | 'hard'
}

// ===================================
// Component Props Interfaces
// ===================================

export interface CreditScoreOverviewProps {
  scores: CreditScores
  analysis: EnhancedCreditScores
  confidence: number
  onScoreClick?: (bureau: string) => void
}

export interface CreditScores {
  experian?: BureauScore
  equifax?: BureauScore
  transunion?: BureauScore
}

export interface BureauScore {
  score: number
  bureau: string
  date: string
  scoreRange: { min: number; max: number }
  factors?: string[]
  confidence: number
}

export interface AccountsSectionProps {
  accounts: CreditAccount[]
  onAccountSelect: (accountId: string) => void
  selectedAccount?: string
  viewMode: 'cards' | 'table'
}

export interface CreditAccount {
  id: string
  creditorName: string
  accountNumber: string
  accountType: 'credit_card' | 'auto_loan' | 'mortgage' | 'personal_loan' | 'student_loan' | 'other'
  balance: number
  creditLimit?: number
  paymentHistory: PaymentHistoryEntry[]
  status: 'open' | 'closed' | 'paid' | 'charged_off'
  openDate: string
  lastReported: string
  bureaus: string[]
  confidence: number
  utilizationRate?: number
}

export interface PaymentHistoryEntry {
  month: string
  status: 'current' | '30_days_late' | '60_days_late' | '90_days_late' | '120_days_late' | 'charge_off' | 'collection'
  amount?: number
  dateReported?: string
}

export interface NegativeItemsCenterProps {
  negativeItems: NegativeItem[]
  recommendations: EnhancedDisputeItem[]
  onDisputeStart: (itemId: string) => void
  onViewDetails: (itemId: string) => void
}

export interface NegativeItem {
  id: string
  type: 'late_payment' | 'collection' | 'charge_off' | 'bankruptcy' | 'tax_lien' | 'judgment' | 'foreclosure'
  creditorName: string
  accountNumber?: string
  amount: number
  date: string
  status: string
  description: string
  disputeReasons: string[]
  impactScore: number
  confidence: number
  priority: 'high' | 'medium' | 'low'
}

export interface DataQualityIndicatorProps {
  overallConfidence: number
  sectionConfidence: Record<string, number>
  processingMethod: string
  missingData: string[]
  onRequestManualReview: () => void
}

export interface PersonalInformationPanelProps {
  personalInfo: PersonalInfo
  confidence: number
  showSensitive: boolean
  onToggleSensitive: () => void
}

export interface PersonalInfo {
  name: string
  address: string
  ssn?: string
  dateOfBirth?: string
  phone?: string
  confidence: number
}

export interface InquiriesSectionProps {
  inquiries: CreditInquiry[]
  onInquirySelect?: (inquiryId: string) => void
}

export interface CreditInquiry {
  id: string
  creditorName: string
  date: string
  type: 'hard' | 'soft'
  purpose: string
  bureau: string
  confidence: number
  impact?: 'high' | 'medium' | 'low'
}

// ===================================
// State Management Interfaces
// ===================================

export interface CreditDataState {
  analysisResult: EnhancedAnalysisResult | null
  loading: boolean
  error: string | null
  selectedAccount: string | null
  selectedNegativeItem: string | null
  viewMode: 'overview' | 'detailed' | 'mobile'
  confidenceThreshold: number
  exportInProgress: boolean
  showSensitiveData: boolean
  filters: DataFilters
  preferences: UserPreferences
}

export interface DataFilters {
  accountTypes: string[]
  dateRange: {
    start: string
    end: string
  }
  amountRange: {
    min: number
    max: number
  }
  confidenceThreshold: number
  showOnlyDisputable: boolean
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  defaultView: 'overview' | 'detailed'
  autoHideSensitive: boolean
  exportFormat: 'pdf' | 'csv' | 'json'
  notifications: {
    processing: boolean
    disputes: boolean
    scoreChanges: boolean
  }
}

// ===================================
// Export and Processing Interfaces
// ===================================

export interface ExportOption {
  format: 'pdf' | 'csv' | 'json'
  label: string
  description: string
  includeSensitive: boolean
  available: boolean
}

export interface ProcessingStatus {
  stage: 'uploading' | 'extracting' | 'analyzing' | 'complete' | 'error'
  progress: number
  message: string
  estimatedTimeRemaining?: number
  errors?: ProcessingError[]
}

export interface ProcessingError {
  code: string
  message: string
  severity: 'warning' | 'error' | 'critical'
  recoverable: boolean
  suggestions?: string[]
}

// ===================================
// Animation and Interaction Interfaces
// ===================================

export interface AnimationConfig {
  duration: number
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
  delay?: number
  stagger?: number
}

export interface InteractionState {
  isHovered: boolean
  isFocused: boolean
  isPressed: boolean
  isSelected: boolean
  isExpanded: boolean
}

// ===================================
// Responsive Design Interfaces
// ===================================

export interface BreakpointConfig {
  mobile: number
  tablet: number
  desktop: number
  wide: number
}

export interface ResponsiveProps {
  mobile?: any
  tablet?: any
  desktop?: any
  wide?: any
}

// ===================================
// Accessibility Interfaces
// ===================================

export interface AccessibilityProps {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-expanded'?: boolean
  'aria-selected'?: boolean
  role?: string
  tabIndex?: number
}

// ===================================
// Error Handling Interfaces
// ===================================

export interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: any
}

export interface ErrorRecovery {
  retryProcessing: () => Promise<void>
  requestManualReview: () => Promise<void>
  reportIssue: (details: string) => Promise<void>
  fallbackToBasicView: () => void
}

// ===================================
// Testing Interfaces
// ===================================

export interface TestDataGenerator {
  generateMockAnalysisResult: () => EnhancedAnalysisResult
  generateMockAccount: (overrides?: Partial<CreditAccount>) => CreditAccount
  generateMockNegativeItem: (overrides?: Partial<NegativeItem>) => NegativeItem
  generateMockScores: () => CreditScores
}

// ===================================
// Performance Monitoring Interfaces
// ===================================

export interface PerformanceMetrics {
  renderTime: number
  interactionLatency: number
  memoryUsage: number
  bundleSize: number
  cacheHitRate: number
}

export interface PerformanceConfig {
  enableLazyLoading: boolean
  enableMemoization: boolean
  enableVirtualization: boolean
  maxConcurrentRequests: number
  cacheTimeout: number
}