// =============================================
// CreditAI Database Types
// =============================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          subscription_tier: 'free' | 'basic' | 'premium'
          subscription_status: 'active' | 'inactive' | 'cancelled' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone?: string | null
          subscription_tier?: 'free' | 'basic' | 'premium'
          subscription_status?: 'active' | 'inactive' | 'cancelled' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          subscription_tier?: 'free' | 'basic' | 'premium'
          subscription_status?: 'active' | 'inactive' | 'cancelled' | 'suspended'
          created_at?: string
          updated_at?: string
        }
      }
      credit_reports: {
        Row: {
          id: string
          user_id: string
          bureau: 'experian' | 'equifax' | 'transunion'
          report_date: string
          score: number | null
          raw_data: any | null
          ai_analysis: any | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bureau: 'experian' | 'equifax' | 'transunion'
          report_date: string
          score?: number | null
          raw_data?: any | null
          ai_analysis?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bureau?: 'experian' | 'equifax' | 'transunion'
          report_date?: string
          score?: number | null
          raw_data?: any | null
          ai_analysis?: any | null
          created_at?: string
        }
      }
      negative_items: {
        Row: {
          id: string
          user_id: string
          credit_report_id: string | null
          creditor_name: string
          account_number: string | null
          balance: number | null
          status: 'identified' | 'disputing' | 'resolved' | 'verified'
          dispute_reason: string | null
          impact_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          credit_report_id?: string | null
          creditor_name: string
          account_number?: string | null
          balance?: number | null
          status?: 'identified' | 'disputing' | 'resolved' | 'verified'
          dispute_reason?: string | null
          impact_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          credit_report_id?: string | null
          creditor_name?: string
          account_number?: string | null
          balance?: number | null
          status?: 'identified' | 'disputing' | 'resolved' | 'verified'
          dispute_reason?: string | null
          impact_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      disputes: {
        Row: {
          id: string
          user_id: string
          negative_item_id: string
          dispute_reason: string
          letter_content: string
          status: 'pending' | 'sent' | 'investigating' | 'resolved' | 'rejected'
          bureau_response: string | null
          resolution_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          negative_item_id: string
          dispute_reason: string
          letter_content: string
          status?: 'pending' | 'sent' | 'investigating' | 'resolved' | 'rejected'
          bureau_response?: string | null
          resolution_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          negative_item_id?: string
          dispute_reason?: string
          letter_content?: string
          status?: 'pending' | 'sent' | 'investigating' | 'resolved' | 'rejected'
          bureau_response?: string | null
          resolution_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          document_type: DocumentType
          file_url: string
          ocr_text: string | null
          ai_analysis: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_type: DocumentType
          file_url: string
          ocr_text?: string | null
          ai_analysis?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_type?: DocumentType
          file_url?: string
          ocr_text?: string | null
          ai_analysis?: Json | null
          created_at?: string
        }
      }
      upload_analytics: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_size: number
          file_type: string
          upload_status: 'success' | 'failed' | 'processing'
          ocr_status: 'pending' | 'processing' | 'success' | 'failed' | null
          ocr_confidence: number | null
          processing_time_ms: number | null
          error_message: string | null
          user_agent: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_size: number
          file_type: string
          upload_status: 'success' | 'failed' | 'processing'
          ocr_status?: 'pending' | 'processing' | 'success' | 'failed' | null
          ocr_confidence?: number | null
          processing_time_ms?: number | null
          error_message?: string | null
          user_agent?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_size?: number
          file_type?: string
          upload_status?: 'success' | 'failed' | 'processing'
          ocr_status?: 'pending' | 'processing' | 'success' | 'failed' | null
          ocr_confidence?: number | null
          processing_time_ms?: number | null
          error_message?: string | null
          user_agent?: string | null
          ip_address?: string | null
          created_at?: string
        }
      }
      user_analytics: {
        Row: {
          id: string
          user_id: string
          event_type: string
          event_data: Json
          page_url: string | null
          user_agent: string | null
          ip_address: string | null
          session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          event_data?: Json
          page_url?: string | null
          user_agent?: string | null
          ip_address?: string | null
          session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          event_data?: Json
          page_url?: string | null
          user_agent?: string | null
          ip_address?: string | null
          session_id?: string | null
          created_at?: string
        }
      }
      user_progress: {
        Row: {
          id: string
          user_id: string
          points: number
          level: number
          achievements: Json
          streak_days: number
          last_activity: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          points?: number
          level?: number
          achievements?: Json
          streak_days?: number
          last_activity?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          points?: number
          level?: number
          achievements?: Json
          streak_days?: number
          last_activity?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_upload_success_rate: {
        Args: {
          user_id_param?: string
          days_back?: number
        }
        Returns: {
          total_uploads: number
          successful_uploads: number
          success_rate: number
          avg_processing_time_ms: number | null
        }[]
      }
      get_ocr_accuracy_stats: {
        Args: {
          user_id_param?: string
          days_back?: number
        }
        Returns: {
          total_ocr_attempts: number
          successful_ocr: number
          avg_confidence: number | null
          high_confidence_rate: number | null
        }[]
      }
      track_user_event: {
        Args: {
          event_type_param: string
          event_data_param?: Json
          page_url_param?: string
          session_id_param?: string
        }
        Returns: string
      }
    }
    Enums: {
      subscription_tier: 'free' | 'basic' | 'premium'
      subscription_status: 'active' | 'inactive' | 'cancelled' | 'suspended'
      bureau: 'experian' | 'equifax' | 'transunion'
      negative_item_status: 'identified' | 'disputing' | 'resolved' | 'verified'
      dispute_status: 'pending' | 'sent' | 'investigating' | 'resolved' | 'rejected'
      document_type: 'identity' | 'income' | 'bank_statement' | 'credit_report' | 'dispute_letter' | 'response_letter' | 'other'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// =============================================
// CONVENIENCE TYPES
// =============================================

// Table row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type CreditReport = Database['public']['Tables']['credit_reports']['Row']
export type NegativeItem = Database['public']['Tables']['negative_items']['Row']
export type Dispute = Database['public']['Tables']['disputes']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type UserProgress = Database['public']['Tables']['user_progress']['Row']

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type CreditReportInsert = Database['public']['Tables']['credit_reports']['Insert']
export type NegativeItemInsert = Database['public']['Tables']['negative_items']['Insert']
export type DisputeInsert = Database['public']['Tables']['disputes']['Insert']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type UserProgressInsert = Database['public']['Tables']['user_progress']['Insert']

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type CreditReportUpdate = Database['public']['Tables']['credit_reports']['Update']
export type NegativeItemUpdate = Database['public']['Tables']['negative_items']['Update']
export type DisputeUpdate = Database['public']['Tables']['disputes']['Update']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']
export type UserProgressUpdate = Database['public']['Tables']['user_progress']['Update']

// Enum types
export type SubscriptionTier = Database['public']['Enums']['subscription_tier']
export type SubscriptionStatus = Database['public']['Enums']['subscription_status']
export type Bureau = Database['public']['Enums']['bureau']
export type NegativeItemStatus = Database['public']['Enums']['negative_item_status']
export type DisputeStatus = Database['public']['Enums']['dispute_status']
export type DocumentType = Database['public']['Enums']['document_type']

// =============================================
// CUSTOM TYPES
// =============================================

export interface Achievement {
  id: string
  name: string
  description: string
  earned: boolean
  earnedAt?: string
  points?: number
}

export interface CreditReportData {
  accounts?: CreditAccount[]
  inquiries?: CreditInquiry[]
  personalInfo?: PersonalInfo
  publicRecords?: PublicRecord[]
  summary?: CreditSummary
}

export interface CreditAccount {
  creditorName: string
  accountNumber: string
  accountType: string
  status: string
  balance: number
  limit: number
  paymentHistory: string[]
  dateOpened: string
  dateReported: string
  isNegative: boolean
}

export interface CreditInquiry {
  creditorName: string
  inquiryDate: string
  inquiryType: 'hard' | 'soft'
}

export interface PersonalInfo {
  name: string
  address: string
  ssn: string
  dateOfBirth: string
  employmentInfo?: string
}

export interface PublicRecord {
  type: string
  status: string
  amount: number
  dateReported: string
  court: string
}

export interface CreditSummary {
  totalAccounts: number
  openAccounts: number
  closedAccounts: number
  totalBalance: number
  totalLimit: number
  utilizationRate: number
  paymentHistory: number
  negativeAccounts: number
}

export interface AIAnalysis {
  summary: string
  recommendations: string[]
  riskFactors: string[]
  improvementPlan: string[]
  timeline: string
  confidenceScore: number
}

export interface DisputeLetter {
  template: string
  customizations: Record<string, string>
  letterType: 'initial' | 'follow_up' | 'escalation'
  bureau: Bureau
  negativeItemIds: string[]
}

// =============================================
// RELATIONSHIP TYPES
// =============================================

export interface ProfileWithProgress extends Profile {
  user_progress: UserProgress
}

export interface CreditReportWithItems extends CreditReport {
  negative_items: NegativeItem[]
}

export interface NegativeItemWithDisputes extends NegativeItem {
  disputes: Dispute[]
}

export interface DisputeWithNegativeItem extends Dispute {
  negative_item: NegativeItem
}

export interface UserWithAllData extends Profile {
  credit_reports: CreditReportWithItems[]
  negative_items: NegativeItemWithDisputes[]
  disputes: Dispute[]
  documents: Document[]
  user_progress: UserProgress
}

// =============================================
// QUERY FILTER TYPES
// =============================================

export interface CreditReportFilters {
  bureau?: Bureau
  dateRange?: {
    start: string
    end: string
  }
  scoreRange?: {
    min: number
    max: number
  }
}

export interface NegativeItemFilters {
  status?: NegativeItemStatus
  creditorName?: string
  impactRange?: {
    min: number
    max: number
  }
  balanceRange?: {
    min: number
    max: number
  }
}

export interface DisputeFilters {
  status?: DisputeStatus
  dateRange?: {
    start: string
    end: string
  }
  bureau?: Bureau
}

export interface DocumentFilters {
  documentType?: DocumentType
  dateRange?: {
    start: string
    end: string
  }
  hasOCR?: boolean
  hasAIAnalysis?: boolean
}

// =============================================
// RESPONSE TYPES
// =============================================

export interface DatabaseResponse<T> {
  data: T | null
  error: string | null
  count?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  error: string | null
  count: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface CreditScoreHistory {
  date: string
  score: number
  bureau: Bureau
  change: number
}

export interface ProgressStats {
  totalPoints: number
  currentLevel: number
  nextLevelPoints: number
  completedAchievements: number
  totalAchievements: number
  streakDays: number
  recentActivity: string[]
}

export interface DisputeStats {
  total: number
  pending: number
  investigating: number
  resolved: number
  rejected: number
  averageResolutionTime: number
}

// =============================================
// FORM TYPES
// =============================================

export interface ProfileFormData {
  fullName: string
  phone: string
  subscriptionTier: SubscriptionTier
}

export interface CreditReportFormData {
  bureau: Bureau
  reportDate: string
  score: number
  rawData: File | null
}

export interface NegativeItemFormData {
  creditorName: string
  accountNumber: string
  balance: number
  disputeReason: string
  impactScore: number
}

export interface DisputeFormData {
  negativeItemId: string
  disputeReason: string
  letterContent: string
  customizations: Record<string, string>
}

export interface DocumentFormData {
  documentType: DocumentType
  file: File
  description?: string
}

export interface UserProgressFormData {
  points: number
  level: number
  achievements: Achievement[]
  streakDays: number
}