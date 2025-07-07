export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone_number: string | null
          date_of_birth: string | null
          ssn_encrypted: string | null
          address: Json | null
          created_at: string
          updated_at: string
          is_verified: boolean
          subscription_tier: string
          mfa_enabled: boolean
          encrypted_data: string | null
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          phone_number?: string | null
          date_of_birth?: string | null
          ssn_encrypted?: string | null
          address?: Json | null
          created_at?: string
          updated_at?: string
          is_verified?: boolean
          subscription_tier?: string
          mfa_enabled?: boolean
          encrypted_data?: string | null
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone_number?: string | null
          date_of_birth?: string | null
          ssn_encrypted?: string | null
          address?: Json | null
          created_at?: string
          updated_at?: string
          is_verified?: boolean
          subscription_tier?: string
          mfa_enabled?: boolean
          encrypted_data?: string | null
        }
      }
      credit_reports: {
        Row: {
          id: string
          user_id: string
          report_type: string
          report_data: Json
          credit_score: number
          report_date: string
          created_at: string
          encrypted_data: string | null
        }
        Insert: {
          id?: string
          user_id: string
          report_type: string
          report_data: Json
          credit_score: number
          report_date: string
          created_at?: string
          encrypted_data?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          report_type?: string
          report_data?: Json
          credit_score?: number
          report_date?: string
          created_at?: string
          encrypted_data?: string | null
        }
      }
      analysis_results: {
        Row: {
          id: string
          credit_report_id: string
          violation_type: string
          description: string
          severity: string
          recommendation: string
          affected_accounts: string[]
          created_at: string
        }
        Insert: {
          id?: string
          credit_report_id: string
          violation_type: string
          description: string
          severity: string
          recommendation: string
          affected_accounts: string[]
          created_at?: string
        }
        Update: {
          id?: string
          credit_report_id?: string
          violation_type?: string
          description?: string
          severity?: string
          recommendation?: string
          affected_accounts?: string[]
          created_at?: string
        }
      }
      dispute_letters: {
        Row: {
          id: string
          user_id: string
          credit_report_id: string
          violation_id: string
          letter_type: string
          bureau: string
          content: string
          status: string
          created_at: string
          sent_at: string | null
          response_at: string | null
          outcome: string | null
        }
        Insert: {
          id?: string
          user_id: string
          credit_report_id: string
          violation_id: string
          letter_type: string
          bureau: string
          content: string
          status: string
          created_at?: string
          sent_at?: string | null
          response_at?: string | null
          outcome?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          credit_report_id?: string
          violation_id?: string
          letter_type?: string
          bureau?: string
          content?: string
          status?: string
          created_at?: string
          sent_at?: string | null
          response_at?: string | null
          outcome?: string | null
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_type: string
          file_size: number
          file_url: string
          uploaded_at: string
          category: string
          ocr_text: string | null
          is_processed: boolean
          encrypted_data: string | null
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_type: string
          file_size: number
          file_url: string
          uploaded_at?: string
          category: string
          ocr_text?: string | null
          is_processed?: boolean
          encrypted_data?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_type?: string
          file_size?: number
          file_url?: string
          uploaded_at?: string
          category?: string
          ocr_text?: string | null
          is_processed?: boolean
          encrypted_data?: string | null
        }
      }
      progress: {
        Row: {
          id: string
          user_id: string
          total_disputes: number
          active_disputes: number
          resolved_disputes: number
          credit_score_change: number
          completed_tasks: string[]
          achievements: Json[]
          current_level: number
          experience_points: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_disputes?: number
          active_disputes?: number
          resolved_disputes?: number
          credit_score_change?: number
          completed_tasks?: string[]
          achievements?: Json[]
          current_level?: number
          experience_points?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_disputes?: number
          active_disputes?: number
          resolved_disputes?: number
          credit_score_change?: number
          completed_tasks?: string[]
          achievements?: Json[]
          current_level?: number
          experience_points?: number
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string
          ip_address: string
          user_agent: string
          timestamp: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string
          ip_address: string
          user_agent: string
          timestamp?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          resource_type?: string
          resource_id?: string
          ip_address?: string
          user_agent?: string
          timestamp?: string
          metadata?: Json | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}