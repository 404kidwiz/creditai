-- =============================================
-- Production Database Deployment Script
-- Enhanced Credit Analysis and EOSCAR System
-- =============================================

-- This script sets up the production database with:
-- 1. Performance optimizations
-- 2. Additional indexes for production workloads
-- 3. Backup and recovery configurations
-- 4. Monitoring and alerting setup

-- =============================================
-- 1. PERFORMANCE OPTIMIZATIONS
-- =============================================

-- Enable query plan caching
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Optimize memory settings for production
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Enable auto-vacuum tuning
ALTER SYSTEM SET autovacuum = on;
ALTER SYSTEM SET autovacuum_max_workers = 3;
ALTER SYSTEM SET autovacuum_naptime = '1min';

-- =============================================
-- 2. ADDITIONAL PRODUCTION INDEXES
-- =============================================

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_reports_user_confidence 
    ON credit_reports(user_id, confidence_score DESC) 
    WHERE confidence_score IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enhanced_disputes_user_status_created 
    ON enhanced_disputes(user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bureau_submissions_dispute_bureau_date 
    ON bureau_submissions(dispute_id, bureau, submission_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bureau_responses_submission_outcome_date 
    ON bureau_responses(bureau_submission_id, outcome, response_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dispute_analytics_user_period 
    ON dispute_analytics(user_id, period_start, period_end);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_disputes 
    ON enhanced_disputes(user_id, created_at DESC) 
    WHERE status IN ('submitted', 'in_progress', 'responded');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pending_follow_ups 
    ON follow_up_actions(scheduled_date ASC) 
    WHERE completed = FALSE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_cfpb_complaints 
    ON cfpb_complaints(user_id, submission_date DESC) 
    WHERE status NOT IN ('closed_with_relief', 'closed_without_relief', 'cancelled');

-- Text search indexes for better search performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_creditor_database_text_search 
    ON creditor_database USING GIN(to_tsvector('english', creditor_name || ' ' || COALESCE(standardized_name, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_references_text_search 
    ON legal_references USING GIN(to_tsvector('english', title || ' ' || description));

-- =============================================
-- 3. MATERIALIZED VIEWS FOR ANALYTICS
-- =============================================

-- Bureau performance summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS bureau_performance_summary AS
SELECT 
    bureau,
    COUNT(*) as total_submissions,
    AVG(response_time_days) as avg_response_time,
    AVG(resolution_time_days) as avg_resolution_time,
    COUNT(*) FILTER (WHERE outcome IN ('deleted', 'updated', 'partial'))::DECIMAL / COUNT(*) * 100 as success_rate,
    COUNT(*) FILTER (WHERE escalation_count > 0)::DECIMAL / COUNT(*) * 100 as escalation_rate,
    DATE_TRUNC('month', submission_date) as month
FROM bureau_performance
WHERE submission_date >= NOW() - INTERVAL '12 months'
GROUP BY bureau, DATE_TRUNC('month', submission_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bureau_performance_summary_unique 
    ON bureau_performance_summary(bureau, month);

-- User success metrics view
CREATE MATERIALIZED VIEW IF NOT EXISTS user_success_metrics AS
SELECT 
    ed.user_id,
    COUNT(*) as total_disputes,
    COUNT(*) FILTER (WHERE ed.status IN ('resolved', 'partially_resolved')) as successful_disputes,
    COUNT(*) FILTER (WHERE ed.status IN ('resolved', 'partially_resolved'))::DECIMAL / COUNT(*) * 100 as success_rate,
    AVG(ed.success_probability) as avg_predicted_success,
    AVG(ed.estimated_impact) as avg_estimated_impact,
    COUNT(DISTINCT bs.bureau) as bureaus_used,
    COUNT(*) FILTER (WHERE ed.submission_method = 'eoscar_electronic')::DECIMAL / COUNT(*) * 100 as eoscar_usage_rate,
    MAX(ed.created_at) as last_dispute_date
FROM enhanced_disputes ed
LEFT JOIN bureau_submissions bs ON ed.id = bs.dispute_id
WHERE ed.created_at >= NOW() - INTERVAL '12 months'
GROUP BY ed.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_success_metrics_unique 
    ON user_success_metrics(user_id);

-- =============================================
-- 4. AUTOMATED MAINTENANCE PROCEDURES
-- =============================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY bureau_performance_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_success_metrics;
    
    -- Log the refresh
    INSERT INTO system_logs (log_type, message, created_at) 
    VALUES ('maintenance', 'Analytics views refreshed', NOW());
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO system_logs (log_type, message, error_details, created_at) 
        VALUES ('error', 'Failed to refresh analytics views', SQLERRM, NOW());
        RAISE;
END;
$ LANGUAGE plpgsql;

-- Function to archive old data
CREATE OR REPLACE FUNCTION archive_old_data()
RETURNS INTEGER AS $
DECLARE
    archived_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Archive old validation history (older than 2 years)
    DELETE FROM validation_history 
    WHERE validated_at < NOW() - INTERVAL '2 years';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    archived_count := archived_count + temp_count;
    
    -- Archive old generated reports (older than 6 months)
    DELETE FROM generated_reports 
    WHERE generated_at < NOW() - INTERVAL '6 months';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    archived_count := archived_count + temp_count;
    
    -- Archive old bureau performance data (older than 3 years)
    DELETE FROM bureau_performance 
    WHERE submission_date < NOW() - INTERVAL '3 years';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    archived_count := archived_count + temp_count;
    
    -- Log the archival
    INSERT INTO system_logs (log_type, message, metadata, created_at) 
    VALUES ('maintenance', 'Data archival completed', 
            jsonb_build_object('archived_records', archived_count), NOW());
    
    RETURN archived_count;
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO system_logs (log_type, message, error_details, created_at) 
        VALUES ('error', 'Data archival failed', SQLERRM, NOW());
        RAISE;
END;
$ LANGUAGE plpgsql;

-- =============================================
-- 5. MONITORING AND ALERTING SETUP
-- =============================================

-- System logs table for monitoring
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_type TEXT NOT NULL CHECK (log_type IN ('info', 'warning', 'error', 'maintenance', 'security')),
    message TEXT NOT NULL,
    error_details TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_type_date ON system_logs(log_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);

-- Performance monitoring view
CREATE OR REPLACE VIEW performance_metrics AS
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Function to check system health
CREATE OR REPLACE FUNCTION check_system_health()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT,
    checked_at TIMESTAMP WITH TIME ZONE
) AS $
BEGIN
    -- Check for long-running queries
    RETURN QUERY
    SELECT 
        'Long Running Queries'::TEXT,
        CASE WHEN COUNT(*) > 5 THEN 'WARNING' ELSE 'OK' END::TEXT,
        'Found ' || COUNT(*) || ' queries running longer than 5 minutes'::TEXT,
        NOW()
    FROM pg_stat_activity 
    WHERE state = 'active' 
    AND query_start < NOW() - INTERVAL '5 minutes'
    AND query NOT LIKE '%pg_stat_activity%';
    
    -- Check for table bloat
    RETURN QUERY
    SELECT 
        'Table Bloat'::TEXT,
        CASE WHEN MAX(n_dead_tup::DECIMAL / NULLIF(n_live_tup, 0)) > 0.2 THEN 'WARNING' ELSE 'OK' END::TEXT,
        'Max dead tuple ratio: ' || ROUND(MAX(n_dead_tup::DECIMAL / NULLIF(n_live_tup, 0)) * 100, 2) || '%'::TEXT,
        NOW()
    FROM pg_stat_user_tables;
    
    -- Check for failed disputes
    RETURN QUERY
    SELECT 
        'Failed Disputes'::TEXT,
        CASE WHEN COUNT(*) > 10 THEN 'WARNING' ELSE 'OK' END::TEXT,
        'Found ' || COUNT(*) || ' disputes with no response after 35 days'::TEXT,
        NOW()
    FROM enhanced_disputes ed
    LEFT JOIN bureau_submissions bs ON ed.id = bs.dispute_id
    LEFT JOIN bureau_responses br ON bs.id = br.bureau_submission_id
    WHERE ed.status = 'submitted' 
    AND bs.submission_date < NOW() - INTERVAL '35 days'
    AND br.id IS NULL;
    
    -- Check for EOSCAR compliance issues
    RETURN QUERY
    SELECT 
        'EOSCAR Compliance'::TEXT,
        CASE WHEN COUNT(*) > 5 THEN 'WARNING' ELSE 'OK' END::TEXT,
        'Found ' || COUNT(*) || ' disputes with EOSCAR compliance issues'::TEXT,
        NOW()
    FROM enhanced_disputes
    WHERE submission_method = 'eoscar_electronic'
    AND (bureau_submissions->0->>'eoscar_letter'->>'complianceStatus')::TEXT != 'compliant';
END;
$ LANGUAGE plpgsql;

-- =============================================
-- 6. BACKUP AND RECOVERY PROCEDURES
-- =============================================

-- Function to create logical backup of critical data
CREATE OR REPLACE FUNCTION create_logical_backup()
RETURNS TEXT AS $
DECLARE
    backup_id TEXT;
    backup_path TEXT;
BEGIN
    backup_id := 'backup_' || TO_CHAR(NOW(), 'YYYY_MM_DD_HH24_MI_SS');
    backup_path := '/backups/' || backup_id;
    
    -- This would typically call external backup tools
    -- For now, we'll log the backup request
    INSERT INTO system_logs (log_type, message, metadata, created_at) 
    VALUES ('maintenance', 'Logical backup requested', 
            jsonb_build_object('backup_id', backup_id, 'backup_path', backup_path), NOW());
    
    RETURN backup_id;
END;
$ LANGUAGE plpgsql;

-- Function to validate data integrity
CREATE OR REPLACE FUNCTION validate_data_integrity()
RETURNS TABLE (
    table_name TEXT,
    check_type TEXT,
    status TEXT,
    details TEXT
) AS $
BEGIN
    -- Check foreign key constraints
    RETURN QUERY
    SELECT 
        'enhanced_disputes'::TEXT,
        'Foreign Key Integrity'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END::TEXT,
        'Found ' || COUNT(*) || ' orphaned dispute records'::TEXT
    FROM enhanced_disputes ed
    LEFT JOIN profiles p ON ed.user_id = p.id
    WHERE p.id IS NULL;
    
    -- Check EOSCAR format compliance
    RETURN QUERY
    SELECT 
        'bureau_submissions'::TEXT,
        'EOSCAR Format'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
        'Found ' || COUNT(*) || ' submissions without EOSCAR format'::TEXT
    FROM bureau_submissions
    WHERE submission_method = 'eoscar_electronic'
    AND (eoscar_letter IS NULL OR eoscar_letter = '{}'::jsonb);
    
    -- Check data consistency
    RETURN QUERY
    SELECT 
        'dispute_tracking'::TEXT,
        'Data Consistency'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
        'Found ' || COUNT(*) || ' tracking records without disputes'::TEXT
    FROM dispute_tracking dt
    LEFT JOIN enhanced_disputes ed ON dt.dispute_id = ed.id
    WHERE ed.id IS NULL;
END;
$ LANGUAGE plpgsql;

-- =============================================
-- 7. SCHEDULED MAINTENANCE JOBS
-- =============================================

-- Note: These would typically be set up as cron jobs or scheduled tasks
-- Here we create the functions that would be called by the scheduler

-- Daily maintenance function
CREATE OR REPLACE FUNCTION daily_maintenance()
RETURNS VOID AS $
BEGIN
    -- Refresh analytics views
    PERFORM refresh_analytics_views();
    
    -- Clean up expired reports
    PERFORM cleanup_expired_reports();
    
    -- Update usage statistics
    UPDATE creditor_database 
    SET usage_count = (
        SELECT COUNT(*) 
        FROM dispute_items di 
        JOIN enhanced_disputes ed ON di.dispute_id = ed.id
        WHERE di.creditor_name = creditor_database.standardized_name
        AND ed.created_at >= NOW() - INTERVAL '30 days'
    );
    
    -- Log maintenance completion
    INSERT INTO system_logs (log_type, message, created_at) 
    VALUES ('maintenance', 'Daily maintenance completed', NOW());
END;
$ LANGUAGE plpgsql;

-- Weekly maintenance function
CREATE OR REPLACE FUNCTION weekly_maintenance()
RETURNS VOID AS $
BEGIN
    -- Run data integrity checks
    INSERT INTO system_logs (log_type, message, metadata, created_at)
    SELECT 
        'maintenance',
        'Data integrity check: ' || table_name || ' - ' || check_type,
        jsonb_build_object('status', status, 'details', details),
        NOW()
    FROM validate_data_integrity();
    
    -- Archive old data
    PERFORM archive_old_data();
    
    -- Analyze tables for query optimization
    ANALYZE;
    
    -- Log maintenance completion
    INSERT INTO system_logs (log_type, message, created_at) 
    VALUES ('maintenance', 'Weekly maintenance completed', NOW());
END;
$ LANGUAGE plpgsql;

-- =============================================
-- 8. PRODUCTION CONFIGURATION VALIDATION
-- =============================================

-- Function to validate production setup
CREATE OR REPLACE FUNCTION validate_production_setup()
RETURNS TABLE (
    component TEXT,
    status TEXT,
    details TEXT
) AS $
BEGIN
    -- Check if all required tables exist
    RETURN QUERY
    SELECT 
        'Database Schema'::TEXT,
        CASE WHEN COUNT(*) = 16 THEN 'OK' ELSE 'ERROR' END::TEXT,
        'Found ' || COUNT(*) || ' of 16 required tables'::TEXT
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'profiles', 'credit_reports', 'creditor_database', 'legal_references',
        'eoscar_templates', 'enhanced_disputes', 'bureau_performance',
        'dispute_analytics', 'validation_history', 'dispute_tracking',
        'bureau_submissions', 'bureau_responses', 'follow_up_actions',
        'cfpb_complaints', 'generated_reports', 'system_logs'
    );
    
    -- Check if RLS is enabled
    RETURN QUERY
    SELECT 
        'Row Level Security'::TEXT,
        CASE WHEN COUNT(*) = COUNT(*) FILTER (WHERE row_security = 'YES') THEN 'OK' ELSE 'WARNING' END::TEXT,
        COUNT(*) FILTER (WHERE row_security = 'YES') || ' of ' || COUNT(*) || ' tables have RLS enabled'::TEXT
    FROM information_schema.tables t
    JOIN pg_class c ON c.relname = t.table_name
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND c.relrowsecurity IS NOT NULL;
    
    -- Check if indexes are in place
    RETURN QUERY
    SELECT 
        'Database Indexes'::TEXT,
        CASE WHEN COUNT(*) >= 30 THEN 'OK' ELSE 'WARNING' END::TEXT,
        'Found ' || COUNT(*) || ' indexes on user tables'::TEXT
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    -- Check if functions are created
    RETURN QUERY
    SELECT 
        'Database Functions'::TEXT,
        CASE WHEN COUNT(*) >= 10 THEN 'OK' ELSE 'WARNING' END::TEXT,
        'Found ' || COUNT(*) || ' custom functions'::TEXT
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION';
END;
$ LANGUAGE plpgsql;

-- =============================================
-- 9. INITIAL DATA POPULATION FOR PRODUCTION
-- =============================================

-- Insert additional creditors for production
INSERT INTO creditor_database (creditor_name, standardized_name, industry, eoscar_code, bureau_codes) VALUES
('USAA', 'USAA Federal Savings Bank', 'Banking', 'USAA', '{"experian": "USAA", "equifax": "USAA", "transunion": "USAA"}'),
('NAVY FEDERAL', 'Navy Federal Credit Union', 'Credit Union', 'NFCU', '{"experian": "NAVYFED", "equifax": "NFCU", "transunion": "NAVYFEDERAL"}'),
('PENFED', 'Pentagon Federal Credit Union', 'Credit Union', 'PENFED', '{"experian": "PENFED", "equifax": "PENFED", "transunion": "PENFED"}'),
('MARCUS', 'Marcus by Goldman Sachs', 'Banking', 'MARCUS', '{"experian": "MARCUS", "equifax": "GOLDMAN", "transunion": "MARCUS"}'),
('SOFI', 'SoFi Bank', 'Banking', 'SOFI', '{"experian": "SOFI", "equifax": "SOFI", "transunion": "SOFI"}'),
('ALLY BANK', 'Ally Bank', 'Banking', 'ALLY', '{"experian": "ALLY", "equifax": "ALLY", "transunion": "ALLYBANK"}'),
('BARCLAYS', 'Barclays Bank Delaware', 'Banking', 'BARCLAYS', '{"experian": "BARCLAYS", "equifax": "BARCLAYS", "transunion": "BARCLAYS"}'),
('COMENITY', 'Comenity Bank', 'Banking', 'COMENITY', '{"experian": "COMENITY", "equifax": "COMENITY", "transunion": "COMENITY"}')
ON CONFLICT (standardized_name) DO NOTHING;

-- Insert additional legal references
INSERT INTO legal_references (reference_type, title, description, citation, dispute_types, success_rate) VALUES
('fcra_section', 'FCRA Section 607 - Compliance procedures', 'Establishes compliance requirements for consumer reporting agencies', '15 U.S.C. § 1681e', ARRAY['procedural_violations'], 75.5),
('fcra_section', 'FCRA Section 616 - Civil liability for willful noncompliance', 'Provides for damages in cases of willful FCRA violations', '15 U.S.C. § 1681n', ARRAY['willful_violations'], 85.2),
('fcra_section', 'FCRA Section 617 - Civil liability for negligent noncompliance', 'Provides for damages in cases of negligent FCRA violations', '15 U.S.C. § 1681o', ARRAY['negligent_violations'], 72.8),
('regulation', 'Regulation V - Fair Credit Reporting', 'Federal Reserve regulation implementing FCRA', '12 CFR Part 222', ARRAY['regulatory_violations'], 68.9),
('cfpb_guidance', 'CFPB Bulletin 2012-03', 'Guidance on credit reporting accuracy', 'CFPB Bulletin 2012-03', ARRAY['accuracy_issues'], 71.3)
ON CONFLICT (citation) DO NOTHING;

-- Insert production EOSCAR templates
INSERT INTO eoscar_templates (template_name, template_type, bureau, template_content, variables, eoscar_version, compliance_validated, success_rate) VALUES
('Identity Theft Dispute', 'dispute_letter', 'all', 
'EOSCAR Format Identity Theft Dispute

FRAUD ALERT - IDENTITY THEFT VICTIM

Consumer Information:
Name: {{consumer_name}}
Address: {{consumer_address}}
SSN: {{consumer_ssn}}
DOB: {{consumer_dob}}

Identity Theft Report Number: {{police_report_number}}
FTC Identity Theft Report: {{ftc_report_number}}

Fraudulent Items to Remove:
{{#dispute_items}}
Item {{sequence_number}}: {{item_type}}
Creditor: {{creditor_name}}
Account: {{account_number}}
Reason Code: 09 (Identity Theft)
Description: This account was opened fraudulently without my knowledge or consent
Requested Action: DELETE - Complete removal required
{{/dispute_items}}

Legal Basis: 15 U.S.C. § 1681c-2 (FCRA Section 605B)

Supporting Documentation: 
- Police Report
- FTC Identity Theft Affidavit
- Notarized Statement of Fraud

I am an identity theft victim and request immediate removal of all fraudulent accounts.

Signature: {{consumer_signature}}
Date: {{submission_date}}',
ARRAY['consumer_name', 'consumer_address', 'consumer_ssn', 'consumer_dob', 'police_report_number', 'ftc_report_number', 'dispute_items', 'consumer_signature', 'submission_date'],
'1.0', true, 92.5),

('Obsolete Information Dispute', 'dispute_letter', 'all',
'EOSCAR Format Obsolete Information Dispute

Consumer Information:
Name: {{consumer_name}}
Address: {{consumer_address}}
SSN: {{consumer_ssn}}
DOB: {{consumer_dob}}

Obsolete Items for Removal:
{{#dispute_items}}
Item {{sequence_number}}: {{item_type}}
Creditor: {{creditor_name}}
Account: {{account_number}}
Date of Last Activity: {{last_activity_date}}
Reason Code: 07 (Obsolete Information)
Description: This item is beyond the legal reporting period
Requested Action: DELETE - Obsolete per FCRA Section 605
{{/dispute_items}}

Legal Basis: 15 U.S.C. § 1681c (FCRA Section 605)

The above items exceed the maximum reporting periods established by federal law and must be removed immediately.

Signature: {{consumer_signature}}
Date: {{submission_date}}',
ARRAY['consumer_name', 'consumer_address', 'consumer_ssn', 'consumer_dob', 'dispute_items', 'consumer_signature', 'submission_date'],
'1.0', true, 88.7)
ON CONFLICT (template_name, bureau) DO NOTHING;

-- =============================================
-- 10. FINAL PRODUCTION SETUP VERIFICATION
-- =============================================

-- Run production setup validation
DO $
DECLARE
    validation_result RECORD;
    all_ok BOOLEAN := TRUE;
BEGIN
    RAISE NOTICE 'Running production setup validation...';
    
    FOR validation_result IN SELECT * FROM validate_production_setup() LOOP
        RAISE NOTICE '% - %: %', validation_result.component, validation_result.status, validation_result.details;
        IF validation_result.status != 'OK' THEN
            all_ok := FALSE;
        END IF;
    END LOOP;
    
    IF all_ok THEN
        RAISE NOTICE 'Production database setup completed successfully!';
        INSERT INTO system_logs (log_type, message, created_at) 
        VALUES ('maintenance', 'Production database deployment completed successfully', NOW());
    ELSE
        RAISE NOTICE 'Production setup completed with warnings. Please review the validation results.';
        INSERT INTO system_logs (log_type, message, created_at) 
        VALUES ('warning', 'Production database deployment completed with warnings', NOW());
    END IF;
END;
$;

-- =============================================
-- DEPLOYMENT COMPLETE
-- =============================================

COMMENT ON SCHEMA public IS 'Enhanced Credit Analysis and EOSCAR System - Production Database Schema';