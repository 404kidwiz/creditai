/**
 * Global Type Definitions
 * 
 * This file contains common types used throughout the application.
 */

// ===================================
// Base Types
// ===================================
export type ID = string
export type Timestamp = string
export type Email = string
export type Phone = string
export type URL = string

// ===================================
// Utility Types
// ===================================
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & 
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys]

// ===================================
// API Types
// ===================================
export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: Timestamp
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface APIError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// ===================================
// User Types
// ===================================
export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise'

export interface User {
  id: ID
  email: Email
  firstName: string
  lastName: string
  phoneNumber?: Phone
  dateOfBirth?: string
  ssn?: string
  address?: Address
  createdAt: Timestamp
  updatedAt: Timestamp
  isVerified: boolean
  subscriptionTier: SubscriptionTier
  mfaEnabled: boolean
  profilePicture?: URL
}

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface UserProfile extends User {
  preferences: UserPreferences
  settings: UserSettings
  statistics: UserStatistics
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  notifications: NotificationPreferences
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  sms: boolean
  disputeUpdates: boolean
  creditScoreChanges: boolean
  marketingEmails: boolean
}

export interface UserSettings {
  twoFactorEnabled: boolean
  sessionTimeout: number
  dataRetention: number
  privacySettings: PrivacySettings
}

export interface PrivacySettings {
  shareDataWithPartners: boolean
  allowAnalytics: boolean
  allowMarketing: boolean
}

export interface UserStatistics {
  totalDisputes: number
  resolvedDisputes: number
  creditScoreImprovement: number
  accountAge: number
  lastActivity: Timestamp
}

// ===================================
// Credit Types
// ===================================
export type CreditBureau = 'experian' | 'equifax' | 'transunion'
export type CreditScoreRange = 'poor' | 'fair' | 'good' | 'very_good' | 'excellent'

export interface CreditReport {
  id: ID
  userId: ID
  bureau: CreditBureau
  reportData: CreditReportData
  creditScore: number
  reportDate: string
  createdAt: Timestamp
  analysisResults?: AnalysisResult[]
}

export interface CreditReportData {
  personalInfo: PersonalInfo
  accounts: CreditAccount[]
  inquiries: CreditInquiry[]
  publicRecords: PublicRecord[]
  collections: Collection[]
}

export interface PersonalInfo {
  name: string
  address: Address
  ssn: string
  dateOfBirth: string
  phoneNumbers: Phone[]
  employers: Employer[]
}

export interface Employer {
  name: string
  address: Address
  startDate: string
  endDate?: string
}

export interface CreditAccount {
  id: string
  creditorName: string
  accountNumber: string
  accountType: string
  balance: number
  creditLimit: number
  paymentHistory: PaymentHistory[]
  dateOpened: string
  dateClosed?: string
  status: string
}

export interface PaymentHistory {
  date: string
  status: 'on_time' | 'late_30' | 'late_60' | 'late_90' | 'late_120+'
  amount: number
}

export interface CreditInquiry {
  id: string
  creditorName: string
  inquiryDate: string
  inquiryType: 'soft' | 'hard'
  purpose: string
}

export interface PublicRecord {
  id: string
  type: string
  court: string
  dateEntered: string
  amount?: number
  status: string
}

export interface Collection {
  id: string
  creditorName: string
  originalCreditor: string
  amount: number
  dateOpened: string
  status: string
}

// ===================================
// Analysis Types
// ===================================
export type ViolationType = 
  | 'inaccurate_personal_info'
  | 'duplicate_accounts'
  | 'outdated_information'
  | 'unauthorized_inquiries'
  | 'incorrect_payment_history'
  | 'identity_theft'
  | 'mixed_files'
  | 'obsolete_information'

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'

export interface AnalysisResult {
  id: ID
  creditReportId: ID
  violationType: ViolationType
  description: string
  severity: SeverityLevel
  recommendation: string
  affectedAccounts: string[]
  potentialImpact: number
  confidence: number
  createdAt: Timestamp
}

// ===================================
// Dispute Types
// ===================================
export type DisputeStatus = 
  | 'draft'
  | 'pending_review'
  | 'sent'
  | 'in_progress'
  | 'resolved'
  | 'rejected'
  | 'escalated'

export type DisputeOutcome = 'deleted' | 'updated' | 'verified' | 'partial'
export type LetterType = 'initial' | 'follow_up' | 'escalation' | 'goodwill'

export interface DisputeLetter {
  id: ID
  userId: ID
  creditReportId: ID
  violationId: ID
  letterType: LetterType
  bureau: CreditBureau
  content: string
  status: DisputeStatus
  createdAt: Timestamp
  sentAt?: Timestamp
  responseAt?: Timestamp
  outcome?: DisputeOutcome
  tracking?: DisputeTracking
}

export interface DisputeTracking {
  confirmationNumber?: string
  expectedResponseDate?: string
  actualResponseDate?: string
  followUpRequired: boolean
  nextActionDate?: string
}

// ===================================
// Document Types
// ===================================
export type DocumentCategory = 
  | 'credit_report'
  | 'dispute_response'
  | 'identity_verification'
  | 'income_verification'
  | 'supporting_documents'

export interface Document {
  id: ID
  userId: ID
  fileName: string
  fileType: string
  fileSize: number
  fileUrl: URL
  uploadedAt: Timestamp
  category: DocumentCategory
  ocrText?: string
  isProcessed: boolean
  metadata?: DocumentMetadata
}

export interface DocumentMetadata {
  extractedData?: Record<string, unknown>
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed'
  processingError?: string
  tags?: string[]
}

// ===================================
// Progress & Gamification Types
// ===================================
export interface Progress {
  id: ID
  userId: ID
  totalDisputes: number
  activeDisputes: number
  resolvedDisputes: number
  creditScoreChange: number
  completedTasks: string[]
  achievements: Achievement[]
  currentLevel: number
  experiencePoints: number
  streaks: ProgressStreak[]
  updatedAt: Timestamp
}

export interface Achievement {
  id: ID
  title: string
  description: string
  icon: string
  earnedAt: Timestamp
  points: number
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface ProgressStreak {
  type: string
  current: number
  longest: number
  lastActivity: Timestamp
}

// ===================================
// Form Types
// ===================================
export interface FormState<T = Record<string, unknown>> {
  data: T
  errors: FormErrors
  isLoading: boolean
  isSubmitting: boolean
  isValid: boolean
  isDirty: boolean
}

export interface FormErrors {
  [key: string]: string | string[] | undefined
}

export interface ValidationResult {
  isValid: boolean
  errors: FormErrors
}

// ===================================
// UI Component Types
// ===================================
export interface LoadingState {
  isLoading: boolean
  error: string | null
  lastFetch?: Timestamp
}

export interface ComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface ButtonProps extends ComponentProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
}

export interface InputProps extends ComponentProps {
  type?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  error?: string
  disabled?: boolean
  required?: boolean
}

// ===================================
// App State Types
// ===================================
export interface AppState {
  user: User | null
  isAuthenticated: boolean
  loading: LoadingState
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  notifications: Notification[]
}

export interface Notification {
  id: ID
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Timestamp
  read: boolean
  actions?: NotificationAction[]
}

export interface NotificationAction {
  label: string
  action: () => void
  variant?: 'primary' | 'secondary'
}

// ===================================
// Analytics Types
// ===================================
export interface AnalyticsEvent {
  name: string
  properties?: Record<string, unknown>
  timestamp: Timestamp
  userId?: ID
  sessionId?: string
}

export interface PageView extends AnalyticsEvent {
  page: string
  referrer?: string
  userAgent?: string
}

// ===================================
// Feature Flag Types
// ===================================
export interface FeatureFlags {
  enableAnalytics: boolean
  enablePWA: boolean
  enableOfflineMode: boolean
  enableDebugMode: boolean
  maintenanceMode: boolean
  [key: string]: boolean
}

// ===================================
// Integration Types
// ===================================
export interface ExternalIntegration {
  id: ID
  provider: string
  config: Record<string, unknown>
  isActive: boolean
  lastSync?: Timestamp
  error?: string
}

// ===================================
// Audit Types
// ===================================
export interface AuditLog {
  id: ID
  userId: ID
  action: string
  resourceType: string
  resourceId: ID
  ipAddress: string
  userAgent: string
  timestamp: Timestamp
  metadata?: Record<string, unknown>
}