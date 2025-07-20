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
          extraction_metadata: any | null
          validation_results: any | null
          quality_metrics: any | null
          provider_detected: string | null
          confidence_score: number | null
          processing_time_ms: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          bureau: 'experian' | 'equifax' | 'transunion'
          report_date: string
          score?: number | null
          raw_data?: any | null
          ai_analysis?: any | null
          extraction_metadata?: any | null
          validation_results?: any | null
          quality_metrics?: any | null
          provider_detected?: string | null
          confidence_score?: number | null
          processing_time_ms?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          bureau?: 'experian' | 'equifax' | 'transunion'
          report_date?: string
          score?: number | null
          raw_data?: any | null
          ai_analysis?: any | null
          extraction_metadata?: any | null
          validation_results?: any | null
          quality_metrics?: any | null
          provider_detected?: string | null
          confidence_score?: number | null
          processing_time_ms?: number | null
          created_at?: string
          updated_at?: string | null
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
          file_name: string
          file_size: number | null
          ocr_text: string | null
          ai_analysis: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_type: DocumentType
          file_url: string
          file_name: string
          file_size?: number | null
          ocr_text?: string | null
          ai_analysis?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_type?: DocumentType
          file_url?: string
          file_name?: string
          file_size?: number | null
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
      creditor_database: {
        Row: {
          id: string
          creditor_name: string
          standardized_name: string
          creditor_code: string | null
          aliases: string[]
          address: string | null
          phone: string | null
          website: string | null
          industry: string | null
          eoscar_code: string | null
          bureau_codes: Json
          usage_count: number
          last_used: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creditor_name: string
          standardized_name: string
          creditor_code?: string | null
          aliases?: string[]
          address?: string | null
          phone?: string | null
          website?: string | null
          industry?: string | null
          eoscar_code?: string | null
          bureau_codes?: Json
          usage_count?: number
          last_used?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creditor_name?: string
          standardized_name?: string
          creditor_code?: string | null
          aliases?: string[]
          address?: string | null
          phone?: string | null
          website?: string | null
          industry?: string | null
          eoscar_code?: string | null
          bureau_codes?: Json
          usage_count?: number
          last_used?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      legal_references: {
        Row: {
          id: string
          reference_type: 'fcra_section' | 'case_law' | 'regulation' | 'statute' | 'cfpb_guidance'
          title: string
          description: string
          full_text: string | null
          citation: string
          jurisdiction: string | null
          effective_date: string | null
          dispute_types: string[]
          success_rate: number | null
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reference_type: 'fcra_section' | 'case_law' | 'regulation' | 'statute' | 'cfpb_guidance'
          title: string
          description: string
          full_text?: string | null
          citation: string
          jurisdiction?: string | null
          effective_date?: string | null
          dispute_types?: string[]
          success_rate?: number | null
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reference_type?: 'fcra_section' | 'case_law' | 'regulation' | 'statute' | 'cfpb_guidance'
          title?: string
          description?: string
          full_text?: string | null
          citation?: string
          jurisdiction?: string | null
          effective_date?: string | null
          dispute_types?: string[]
          success_rate?: number | null
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      eoscar_templates: {
        Row: {
          id: string
          template_name: string
          template_type: 'dispute_letter' | 'follow_up' | 'escalation' | 'validation_request'
          bureau: 'experian' | 'equifax' | 'transunion' | 'all'
          template_content: string
          variables: string[]
          eoscar_version: string
          compliance_validated: boolean
          last_validated: string | null
          validation_notes: string | null
          usage_count: number
          success_rate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_name: string
          template_type: 'dispute_letter' | 'follow_up' | 'escalation' | 'validation_request'
          bureau: 'experian' | 'equifax' | 'transunion' | 'all'
          template_content: string
          variables?: string[]
          eoscar_version?: string
          compliance_validated?: boolean
          last_validated?: string | null
          validation_notes?: string | null
          usage_count?: number
          success_rate?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_name?: string
          template_type?: 'dispute_letter' | 'follow_up' | 'escalation' | 'validation_request'
          bureau?: 'experian' | 'equifax' | 'transunion' | 'all'
          template_content?: string
          variables?: string[]
          eoscar_version?: string
          compliance_validated?: boolean
          last_validated?: string | null
          validation_notes?: string | null
          usage_count?: number
          success_rate?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      enhanced_dispute_records: {
        Row: {
          id: string
          user_id: string
          dispute_items: Json
          submission_method: 'online_portal' | 'certified_mail' | 'email' | 'fax' | 'eoscar_electronic'
          bureau_submissions: Json
          tracking_info: Json
          responses: Json
          follow_up_actions: Json
          status: 'draft' | 'submitted' | 'in_progress' | 'responded' | 'partially_resolved' | 'resolved' | 'escalated' | 'closed'
          strategy: Json | null
          legal_basis: string[]
          success_probability: number | null
          estimated_impact: number | null
          coordination_plan: Json | null
          created_at: string
          updated_at: string
          created_by: string | null
          last_modified_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          dispute_items?: Json
          submission_method: 'online_portal' | 'certified_mail' | 'email' | 'fax' | 'eoscar_electronic'
          bureau_submissions?: Json
          tracking_info?: Json
          responses?: Json
          follow_up_actions?: Json
          status?: 'draft' | 'submitted' | 'in_progress' | 'responded' | 'partially_resolved' | 'resolved' | 'escalated' | 'closed'
          strategy?: Json | null
          legal_basis?: string[]
          success_probability?: number | null
          estimated_impact?: number | null
          coordination_plan?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          last_modified_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          dispute_items?: Json
          submission_method?: 'online_portal' | 'certified_mail' | 'email' | 'fax' | 'eoscar_electronic'
          bureau_submissions?: Json
          tracking_info?: Json
          responses?: Json
          follow_up_actions?: Json
          status?: 'draft' | 'submitted' | 'in_progress' | 'responded' | 'partially_resolved' | 'resolved' | 'escalated' | 'closed'
          strategy?: Json | null
          legal_basis?: string[]
          success_probability?: number | null
          estimated_impact?: number | null
          coordination_plan?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          last_modified_by?: string | null
        }
      }
      bureau_performance: {
        Row: {
          id: string
          bureau: 'experian' | 'equifax' | 'transunion'
          dispute_id: string | null
          response_time_days: number | null
          resolution_time_days: number | null
          communication_quality: number | null
          outcome: 'deleted' | 'updated' | 'verified' | 'partial' | 'rejected' | 'pending' | null
          submission_date: string
          response_date: string | null
          resolution_date: string | null
          escalation_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bureau: 'experian' | 'equifax' | 'transunion'
          dispute_id?: string | null
          response_time_days?: number | null
          resolution_time_days?: number | null
          communication_quality?: number | null
          outcome?: 'deleted' | 'updated' | 'verified' | 'partial' | 'rejected' | 'pending' | null
          submission_date: string
          response_date?: string | null
          resolution_date?: string | null
          escalation_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bureau?: 'experian' | 'equifax' | 'transunion'
          dispute_id?: string | null
          response_time_days?: number | null
          resolution_time_days?: number | null
          communication_quality?: number | null
          outcome?: 'deleted' | 'updated' | 'verified' | 'partial' | 'rejected' | 'pending' | null
          submission_date?: string
          response_date?: string | null
          resolution_date?: string | null
          escalation_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      dispute_analytics: {
        Row: {
          id: string
          user_id: string | null
          period_start: string
          period_end: string
          total_disputes: number
          successful_disputes: number
          success_rate: number | null
          score_improvement: number
          negative_items_removed: number
          accounts_updated: number
          inquiries_removed: number
          average_response_time: number | null
          average_resolution_time: number | null
          escalation_rate: number | null
          bureau_performance: Json
          calculated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          period_start: string
          period_end: string
          total_disputes?: number
          successful_disputes?: number
          success_rate?: number | null
          score_improvement?: number
          negative_items_removed?: number
          accounts_updated?: number
          inquiries_removed?: number
          average_response_time?: number | null
          average_resolution_time?: number | null
          escalation_rate?: number | null
          bureau_performance?: Json
          calculated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          period_start?: string
          period_end?: string
          total_disputes?: number
          successful_disputes?: number
          success_rate?: number | null
          score_improvement?: number
          negative_items_removed?: number
          accounts_updated?: number
          inquiries_removed?: number
          average_response_time?: number | null
          average_resolution_time?: number | null
          escalation_rate?: number | null
          bureau_performance?: Json
          calculated_at?: string
          created_at?: string
        }
      }
      validation_history: {
        Row: {
          id: string
          credit_report_id: string | null
          validation_type: 'extraction' | 'eoscar_compliance' | 'legal_compliance' | 'quality_assurance'
          overall_score: number | null
          issues: Json
          recommendations: Json
          validator_type: 'ai' | 'manual' | 'automated'
          validator_version: string | null
          validation_time_ms: number | null
          validated_at: string
          validated_by: string | null
        }
        Insert: {
          id?: string
          credit_report_id?: string | null
          validation_type: 'extraction' | 'eoscar_compliance' | 'legal_compliance' | 'quality_assurance'
          overall_score?: number | null
          issues?: Json
          recommendations?: Json
          validator_type: 'ai' | 'manual' | 'automated'
          validator_version?: string | null
          validation_time_ms?: number | null
          validated_at?: string
          validated_by?: string | null
        }
        Update: {
          id?: string
          credit_report_id?: string | null
          validation_type?: 'extraction' | 'eoscar_compliance' | 'legal_compliance' | 'quality_assurance'
          overall_score?: number | null
          issues?: Json
          recommendations?: Json
          validator_type?: 'ai' | 'manual' | 'automated'
          validator_version?: string | null
          validation_time_ms?: number | null
          validated_at?: string
          validated_by?: string | null
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

// Enhanced table row types
export type CreditorDatabase = Database['public']['Tables']['creditor_database']['Row']
export type LegalReference = Database['public']['Tables']['legal_references']['Row']
export type EOSCARTemplate = Database['public']['Tables']['eoscar_templates']['Row']
export type EnhancedDisputeRecord = Database['public']['Tables']['enhanced_dispute_records']['Row']
export type BureauPerformance = Database['public']['Tables']['bureau_performance']['Row']
export type DisputeAnalytics = Database['public']['Tables']['dispute_analytics']['Row']
export type ValidationHistory = Database['public']['Tables']['validation_history']['Row']

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type CreditReportInsert = Database['public']['Tables']['credit_reports']['Insert']
export type NegativeItemInsert = Database['public']['Tables']['negative_items']['Insert']
export type DisputeInsert = Database['public']['Tables']['disputes']['Insert']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type UserProgressInsert = Database['public']['Tables']['user_progress']['Insert']

// Enhanced table insert types
export type CreditorDatabaseInsert = Database['public']['Tables']['creditor_database']['Insert']
export type LegalReferenceInsert = Database['public']['Tables']['legal_references']['Insert']
export type EOSCARTemplateInsert = Database['public']['Tables']['eoscar_templates']['Insert']
export type EnhancedDisputeRecordInsert = Database['public']['Tables']['enhanced_dispute_records']['Insert']
export type BureauPerformanceInsert = Database['public']['Tables']['bureau_performance']['Insert']
export type DisputeAnalyticsInsert = Database['public']['Tables']['dispute_analytics']['Insert']
export type ValidationHistoryInsert = Database['public']['Tables']['validation_history']['Insert']

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type CreditReportUpdate = Database['public']['Tables']['credit_reports']['Update']
export type NegativeItemUpdate = Database['public']['Tables']['negative_items']['Update']
export type DisputeUpdate = Database['public']['Tables']['disputes']['Update']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']
export type UserProgressUpdate = Database['public']['Tables']['user_progress']['Update']

// Enhanced table update types
export type CreditorDatabaseUpdate = Database['public']['Tables']['creditor_database']['Update']
export type LegalReferenceUpdate = Database['public']['Tables']['legal_references']['Update']
export type EOSCARTemplateUpdate = Database['public']['Tables']['eoscar_templates']['Update']
export type EnhancedDisputeRecordUpdate = Database['public']['Tables']['enhanced_dispute_records']['Update']
export type BureauPerformanceUpdate = Database['public']['Tables']['bureau_performance']['Update']
export type DisputeAnalyticsUpdate = Database['public']['Tables']['dispute_analytics']['Update']
export type ValidationHistoryUpdate = Database['public']['Tables']['validation_history']['Update']

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
  paymentHistory: PaymentHistoryEntry[]
  dateOpened: string
  dateReported: string
  isNegative: boolean
}

export interface PaymentHistoryEntry {
  month: string // YYYY-MM format
  status: 'current' | '30_days_late' | '60_days_late' | '90_days_late' | '120_days_late' | 'charge_off' | 'collection' | 'paid' | 'closed'
  amount?: number
  dateReported?: string
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