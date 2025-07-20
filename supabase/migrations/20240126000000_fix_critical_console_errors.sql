-- Migration to fix critical console errors after credit report upload
-- This addresses: missing dispute_type column, 400 errors from Supabase queries, schema mismatches

-- =============================================
-- 1. Fix missing columns in disputes table
-- =============================================

-- Add missing columns to disputes table (this fixes the main console error)
ALTER TABLE disputes 
ADD COLUMN IF NOT EXISTS dispute_type TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS expected_resolution_date DATE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_disputes_dispute_type ON disputes(dispute_type);
CREATE INDEX IF NOT EXISTS idx_disputes_priority ON disputes(priority);
CREATE INDEX IF NOT EXISTS idx_disputes_expected_resolution_date ON disputes(expected_resolution_date);

-- =============================================
-- 2. Fix documents table schema mismatches
-- =============================================

-- Add missing columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS ocr_confidence DECIMAL,
ADD COLUMN IF NOT EXISTS ai_analysis_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS ai_confidence_score DECIMAL,
ADD COLUMN IF NOT EXISTS extracted_text TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add updated_at column if it doesn't exist
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 3. Fix credit_reports table schema
-- =============================================

-- Add missing columns to credit_reports table
ALTER TABLE credit_reports 
ADD COLUMN IF NOT EXISTS bureau TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS report_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS encrypted_data TEXT,
ADD COLUMN IF NOT EXISTS encryption_key_hash TEXT,
ADD COLUMN IF NOT EXISTS data_hash TEXT,
ADD COLUMN IF NOT EXISTS processing_metadata JSONB DEFAULT '{}';

-- Make bureau and report_date NOT NULL after adding defaults
ALTER TABLE credit_reports 
ALTER COLUMN bureau SET NOT NULL,
ALTER COLUMN report_date SET NOT NULL;

-- =============================================
-- 4. Fix upload_analytics table
-- =============================================

-- First, add missing columns to existing upload_analytics table
DO $$
BEGIN
    -- Add document_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'upload_analytics' AND column_name = 'document_id') THEN
        ALTER TABLE upload_analytics ADD COLUMN document_id UUID REFERENCES documents(id) ON DELETE CASCADE;
    END IF;
    
    -- Add processing_method column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'upload_analytics' AND column_name = 'processing_method') THEN
        ALTER TABLE upload_analytics ADD COLUMN processing_method TEXT NOT NULL DEFAULT 'standard';
    END IF;
    
    -- Add upload_timestamp column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'upload_analytics' AND column_name = 'upload_timestamp') THEN
        ALTER TABLE upload_analytics ADD COLUMN upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- Create the table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS upload_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    processing_method TEXT NOT NULL DEFAULT 'standard',
    upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processing_duration INTEGER, -- milliseconds
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for upload_analytics
CREATE INDEX IF NOT EXISTS idx_upload_analytics_user_id ON upload_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_analytics_document_id ON upload_analytics(document_id);
CREATE INDEX IF NOT EXISTS idx_upload_analytics_upload_timestamp ON upload_analytics(upload_timestamp);

-- =============================================
-- 5. Create missing security_audit_log table
-- =============================================

CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_category TEXT NOT NULL,
    description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    outcome TEXT NOT NULL, -- 'success', 'failure', 'warning'
    severity TEXT DEFAULT 'info', -- 'low', 'medium', 'high', 'critical'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for security_audit_log
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_severity ON security_audit_log(severity);

-- =============================================
-- 6. Fix database functions
-- =============================================

-- Fix insert_document function to match new schema
CREATE OR REPLACE FUNCTION insert_document(
    p_user_id UUID,
    p_file_name TEXT,
    p_file_type TEXT,
    p_file_size INTEGER,
    p_file_path TEXT DEFAULT NULL,
    p_storage_provider TEXT DEFAULT 'supabase'
)
RETURNS UUID AS $$
DECLARE
    doc_id UUID;
BEGIN
    INSERT INTO documents (
        user_id,
        file_name,
        file_type,
        file_size,
        file_path,
        storage_provider,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_file_name,
        p_file_type,
        p_file_size,
        p_file_path,
        p_storage_provider,
        'uploaded',
        now(),
        now()
    ) RETURNING id INTO doc_id;
    
    RETURN doc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create enhanced insert_document function for API routes
CREATE OR REPLACE FUNCTION insert_document_full(
    p_user_id UUID,
    p_file_name TEXT,
    p_file_type TEXT,
    p_file_size INTEGER,
    p_file_path TEXT DEFAULT NULL,
    p_storage_provider TEXT DEFAULT 'supabase',
    p_ocr_confidence DECIMAL DEFAULT NULL,
    p_ai_analysis_status TEXT DEFAULT 'pending',
    p_ai_confidence_score DECIMAL DEFAULT NULL,
    p_extracted_text TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    doc_id UUID;
BEGIN
    INSERT INTO documents (
        user_id,
        file_name,
        file_type,
        file_size,
        file_path,
        storage_provider,
        status,
        ocr_confidence,
        ai_analysis_status,
        ai_confidence_score,
        extracted_text,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_file_name,
        p_file_type,
        p_file_size,
        p_file_path,
        p_storage_provider,
        'uploaded',
        p_ocr_confidence,
        p_ai_analysis_status,
        p_ai_confidence_score,
        p_extracted_text,
        p_metadata,
        now(),
        now()
    ) RETURNING id INTO doc_id;
    
    RETURN doc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix track_document_upload function
CREATE OR REPLACE FUNCTION track_document_upload(
    p_user_id UUID,
    p_document_id UUID,
    p_file_name TEXT,
    p_file_size INTEGER,
    p_processing_method TEXT DEFAULT 'standard',
    p_processing_duration INTEGER DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    analytics_id UUID;
BEGIN
    INSERT INTO upload_analytics (
        user_id,
        document_id,
        file_name,
        file_size,
        processing_method,
        upload_timestamp,
        processing_duration,
        success,
        error_message
    ) VALUES (
        p_user_id,
        p_document_id,
        p_file_name,
        p_file_size,
        p_processing_method,
        now(),
        p_processing_duration,
        p_success,
        p_error_message
    ) RETURNING id INTO analytics_id;
    
    RETURN analytics_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. Enable RLS on new tables
-- =============================================

-- Enable RLS on upload_analytics
ALTER TABLE upload_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for upload_analytics
CREATE POLICY "Users can view their own upload analytics" ON upload_analytics
    FOR ALL USING (auth.uid() = user_id);

-- Enable RLS on security_audit_log  
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for security_audit_log (users can only see their own audit logs)
CREATE POLICY "Users can view their own audit logs" ON security_audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all audit logs (for future admin functionality)
-- This will need to be updated when admin role system is implemented

-- =============================================
-- 8. Grant necessary permissions
-- =============================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant permissions on new tables
GRANT ALL ON upload_analytics TO authenticated;
GRANT ALL ON security_audit_log TO authenticated;

-- Grant execute on functions (with specific signatures to avoid conflicts)
GRANT EXECUTE ON FUNCTION insert_document(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_document_full(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, DECIMAL, TEXT, DECIMAL, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION track_document_upload(UUID, UUID, TEXT, INTEGER, TEXT, INTEGER, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- =============================================
-- Migration completed successfully
-- =============================================