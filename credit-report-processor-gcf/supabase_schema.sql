-- Supabase Schema for Credit Report Analysis
-- This schema supports the Google Cloud Function for credit report processing

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Credit Reports Analysis Table
CREATE TABLE IF NOT EXISTS credit_reports_analysis (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pdf_url TEXT NOT NULL,
    extracted_text TEXT NOT NULL,
    parsed_data JSONB NOT NULL,
    violations JSONB NOT NULL DEFAULT '[]'::jsonb,
    dispute_letter TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_credit_reports_analysis_user_id ON credit_reports_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_reports_analysis_processed_at ON credit_reports_analysis(processed_at);

-- Violation Summary View
CREATE OR REPLACE VIEW credit_report_violation_summary AS
SELECT 
    id,
    user_id,
    processed_at,
    jsonb_array_length(violations) as violation_count,
    jsonb_array_length(parsed_data->'accounts') as account_count,
    jsonb_array_length(parsed_data->'inquiries') as inquiry_count,
    parsed_data->'personal_info'->>'name' as consumer_name,
    CASE 
        WHEN jsonb_array_length(violations) = 0 THEN 'No Violations'
        WHEN jsonb_array_length(violations) <= 2 THEN 'Low Risk'
        WHEN jsonb_array_length(violations) <= 5 THEN 'Medium Risk'
        ELSE 'High Risk'
    END as risk_level
FROM credit_reports_analysis;

-- Row Level Security (RLS) Policies
ALTER TABLE credit_reports_analysis ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own credit report analyses
CREATE POLICY "Users can view own credit report analyses" ON credit_reports_analysis
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own credit report analyses
CREATE POLICY "Users can insert own credit report analyses" ON credit_reports_analysis
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own credit report analyses
CREATE POLICY "Users can update own credit report analyses" ON credit_reports_analysis
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own credit report analyses
CREATE POLICY "Users can delete own credit report analyses" ON credit_reports_analysis
    FOR DELETE USING (auth.uid() = user_id);

-- Service role can perform all operations (for Google Cloud Function)
CREATE POLICY "Service role can perform all operations" ON credit_reports_analysis
    FOR ALL USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_credit_reports_analysis_updated_at 
    BEFORE UPDATE ON credit_reports_analysis 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get violation statistics
CREATE OR REPLACE FUNCTION get_violation_statistics(user_uuid UUID)
RETURNS TABLE (
    total_reports INTEGER,
    total_violations INTEGER,
    avg_violations_per_report DECIMAL,
    most_common_violation_type TEXT,
    risk_level_distribution JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*) as total_reports,
            SUM(jsonb_array_length(violations)) as total_violations,
            AVG(jsonb_array_length(violations)) as avg_violations_per_report
        FROM credit_reports_analysis 
        WHERE user_id = user_uuid
    ),
    violation_types AS (
        SELECT 
            violation->>'title' as violation_title,
            COUNT(*) as count
        FROM credit_reports_analysis,
             jsonb_array_elements(violations) as violation
        WHERE user_id = user_uuid
        GROUP BY violation->>'title'
        ORDER BY count DESC
        LIMIT 1
    ),
    risk_levels AS (
        SELECT 
            jsonb_object_agg(
                risk_level, 
                COUNT(*)::TEXT
            ) as distribution
        FROM credit_report_violation_summary
        WHERE user_id = user_uuid
        GROUP BY user_id
    )
    SELECT 
        stats.total_reports,
        stats.total_violations,
        stats.avg_violations_per_report,
        violation_types.violation_title,
        risk_levels.distribution
    FROM stats
    LEFT JOIN violation_types ON true
    LEFT JOIN risk_levels ON true;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role; 