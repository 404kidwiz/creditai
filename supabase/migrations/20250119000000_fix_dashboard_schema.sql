-- =============================================
-- Fix Dashboard Schema - Add missing columns
-- =============================================

-- Add missing columns to credit_reports table
ALTER TABLE credit_reports 
ADD COLUMN IF NOT EXISTS processing_method TEXT DEFAULT 'ai_analysis',
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.85 CHECK (confidence_score >= 0 AND confidence_score <= 1),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS processing_time INTEGER,
ADD COLUMN IF NOT EXISTS user_hash TEXT,
ADD COLUMN IF NOT EXISTS encrypted_data TEXT,
ADD COLUMN IF NOT EXISTS encryption_iv TEXT,
ADD COLUMN IF NOT EXISTS encryption_auth_tag TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;

-- Add missing columns to disputes table
ALTER TABLE disputes 
ADD COLUMN IF NOT EXISTS dispute_type TEXT DEFAULT 'accuracy' CHECK (dispute_type IN ('accuracy', 'incomplete', 'outdated', 'unauthorized', 'other')),
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS expected_resolution_date DATE;

-- Update disputes status check constraint to include more statuses
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_status_check;
ALTER TABLE disputes 
ADD CONSTRAINT disputes_status_check 
CHECK (status IN ('pending', 'sent', 'investigating', 'resolved', 'rejected', 'submitted', 'in_progress', 'under_review'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_reports_user_id ON credit_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_reports_created_at ON credit_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);

-- Update existing records with default values
UPDATE credit_reports 
SET 
    processing_method = 'ai_analysis',
    confidence_score = 0.85,
    status = 'completed',
    updated_at = NOW()
WHERE processing_method IS NULL;

UPDATE disputes 
SET 
    dispute_type = 'accuracy',
    priority = 'medium'
WHERE dispute_type IS NULL;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_credit_reports_updated_at
    BEFORE UPDATE ON credit_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create security_audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add RLS policies
ALTER TABLE credit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Credit reports policies
DROP POLICY IF EXISTS "Users can view their own credit reports" ON credit_reports;
CREATE POLICY "Users can view their own credit reports"
    ON credit_reports FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own credit reports" ON credit_reports;
CREATE POLICY "Users can insert their own credit reports"
    ON credit_reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own credit reports" ON credit_reports;
CREATE POLICY "Users can update their own credit reports"
    ON credit_reports FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own credit reports" ON credit_reports;
CREATE POLICY "Users can delete their own credit reports"
    ON credit_reports FOR DELETE
    USING (auth.uid() = user_id);

-- Disputes policies
DROP POLICY IF EXISTS "Users can view their own disputes" ON disputes;
CREATE POLICY "Users can view their own disputes"
    ON disputes FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own disputes" ON disputes;
CREATE POLICY "Users can insert their own disputes"
    ON disputes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own disputes" ON disputes;
CREATE POLICY "Users can update their own disputes"
    ON disputes FOR UPDATE
    USING (auth.uid() = user_id);

-- Security audit log policies (read-only for users)
DROP POLICY IF EXISTS "Users can view their own audit logs" ON security_audit_log;
CREATE POLICY "Users can view their own audit logs"
    ON security_audit_log FOR SELECT
    USING (auth.uid() = user_id);