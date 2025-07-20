-- =============================================
-- Production Migration Script
-- Migrate existing data to enhanced schema
-- =============================================

-- This script safely migrates existing data to the new enhanced schema
-- while preserving all existing functionality and data integrity

BEGIN;

-- =============================================
-- 1. DATA MIGRATION PREPARATION
-- =============================================

-- Create temporary backup tables
CREATE TABLE IF NOT EXISTS migration_backup_credit_reports AS 
SELECT * FROM credit_reports;

CREATE TABLE IF NOT EXISTS migration_backup_dispute_letters AS 
SELECT * FROM dispute_letters WHERE EXISTS (SELECT 1 FROM dispute_letters LIMIT 1);

-- Log migration start
INSERT INTO system_logs (log_type, message, metadata, created_at) 
VALUES ('maintenance', 'Production migration started', 
        jsonb_build_object('timestamp', NOW(), 'backup_created', true), NOW());

-- =============================================
-- 2. MIGRATE EXISTING CREDIT REPORTS
-- =============================================

-- Update existing credit reports with enhanced fields
UPDATE credit_reports 
SET 
    extraction_metadata = jsonb_build_object(
        'extractionTimestamp', created_at,
        'aiModelsUsed', ARRAY['gemini-pro'],
        'confidenceScores', jsonb_build_object('gemini-pro', COALESCE(confidence_score, 75)),
        'processingTime', COALESCE(processing_time_ms, 5000),
        'documentQuality', jsonb_build_object('readability', 'good', 'completeness', 'full')
    ),
    quality_metrics = jsonb_build_object(
        'dataCompleteness', CASE 
            WHEN analysis_result IS NOT NULL AND analysis_result != '{}' THEN 85
            ELSE 60
        END,
        'dataAccuracy', COALESCE(confidence_score, 75),
        'consistencyScore', 80,
        'validationScore', 75,
        'overallQuality', COALESCE(confidence_score, 75)
    ),
    provider_detected = CASE 
        WHEN analysis_result::text ILIKE '%experian%' THEN 'experian'
        WHEN analysis_result::text ILIKE '%equifax%' THEN 'equifax'
        WHEN analysis_result::text ILIKE '%transunion%' THEN 'transunion'
        ELSE 'unknown'
    END,
    updated_at = NOW()
WHERE extraction_metadata IS NULL;

-- =============================================
-- 3. MIGRATE EXISTING DISPUTE LETTERS TO ENHANCED DISPUTES
-- =============================================

-- Insert existing dispute letters as enhanced disputes
INSERT INTO enhanced_disputes (
    id,
    user_id,
    dispute_items,
    submission_method,
    bureau_submissions,
    tracking_info,
    status,
    strategy,
    success_probability,
    estimated_impact,
    created_at,
    updated_at
)
SELECT 
    dl.id,
    dl.user_id,
    -- Convert dispute letter content to structured dispute items
    jsonb_build_array(
        jsonb_build_object(
            'creditorName', COALESCE(dl.creditor_name, 'Unknown'),
            'accountNumber', COALESCE(dl.account_number, ''),
            'disputeReason', COALESCE(dl.dispute_reason, 'Inaccurate information'),
            'requestedAction', 'UPDATE',
            'supportingDocuments', ARRAY[]::text[]
        )
    ),
    'certified_mail',
    -- Create bureau submissions based on letter content
    jsonb_build_array(
        jsonb_build_object(
            'bureau', 'experian',
            'submissionDate', dl.created_at,
            'submissionMethod', 'certified_mail',
            'eoscarLetter', jsonb_build_object(
                'rawContent', dl.letter_content,
                'complianceStatus', 'legacy_format'
            )
        )
    ),
    jsonb_build_object(
        'submissionDate', dl.created_at,
        'expectedResponseDate', dl.created_at + INTERVAL '30 days',
        'currentPhase', 'submitted'
    ),
    CASE 
        WHEN dl.status = 'sent' THEN 'submitted'
        WHEN dl.status = 'responded' THEN 'responded'
        ELSE 'draft'
    END,
    jsonb_build_object(
        'approach', 'standard',
        'priority', 'medium',
        'legalBasis', ARRAY['15 U.S.C. § 1681i']
    ),
    75, -- Default success probability
    50, -- Default estimated impact
    dl.created_at,
    NOW()
FROM dispute_letters dl
WHERE NOT EXISTS (
    SELECT 1 FROM enhanced_disputes ed WHERE ed.id = dl.id
);

-- =============================================
-- 4. CREATE DISPUTE TRACKING RECORDS
-- =============================================

-- Create tracking records for migrated disputes
INSERT INTO dispute_tracking (
    dispute_id,
    current_phase,
    milestones,
    timeline_entries,
    next_actions,
    created_at,
    updated_at
)
SELECT 
    ed.id,
    CASE 
        WHEN ed.status = 'draft' THEN 'preparation'
        WHEN ed.status = 'submitted' THEN 'investigation'
        WHEN ed.status = 'responded' THEN 'review'
        ELSE 'preparation'
    END,
    jsonb_build_array(
        jsonb_build_object(
            'milestone', 'dispute_created',
            'date', ed.created_at,
            'status', 'completed'
        ),
        jsonb_build_object(
            'milestone', 'dispute_submitted',
            'date', ed.created_at,
            'status', CASE WHEN ed.status != 'draft' THEN 'completed' ELSE 'pending' END
        )
    ),
    jsonb_build_array(
        jsonb_build_object(
            'date', ed.created_at,
            'event', 'Dispute created',
            'details', 'Migrated from legacy dispute letter system'
        )
    ),
    CASE 
        WHEN ed.status = 'submitted' THEN 
            jsonb_build_array(
                jsonb_build_object(
                    'action', 'monitor_response',
                    'dueDate', ed.created_at + INTERVAL '30 days',
                    'priority', 'high'
                )
            )
        ELSE jsonb_build_array()
    END,
    ed.created_at,
    NOW()
FROM enhanced_disputes ed
WHERE NOT EXISTS (
    SELECT 1 FROM dispute_tracking dt WHERE dt.dispute_id = ed.id
);

-- =============================================
-- 5. MIGRATE CREDIT SCORE TRACKING
-- =============================================

-- Migrate existing credit score data if it exists
INSERT INTO credit_scores (
    user_id,
    score,
    provider,
    date,
    factors,
    improvements,
    created_at,
    updated_at
)
SELECT 
    cst.user_id,
    cst.score,
    COALESCE(cst.provider, 'unknown'),
    cst.date,
    COALESCE(cst.factors, '[]'::jsonb),
    '[]'::jsonb, -- Default empty improvements
    cst.created_at,
    NOW()
FROM credit_score_tracking cst
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_score_tracking')
AND NOT EXISTS (
    SELECT 1 FROM credit_scores cs 
    WHERE cs.user_id = cst.user_id 
    AND cs.date = cst.date 
    AND cs.provider = COALESCE(cst.provider, 'unknown')
)
ON CONFLICT DO NOTHING;

-- =============================================
-- 6. CREATE INITIAL ANALYTICS DATA
-- =============================================

-- Generate initial analytics for existing users
INSERT INTO dispute_analytics (
    user_id,
    period_start,
    period_end,
    total_disputes,
    successful_disputes,
    success_rate,
    score_improvement,
    negative_items_removed,
    accounts_updated,
    average_response_time,
    bureau_performance,
    created_at
)
SELECT 
    ed.user_id,
    DATE_TRUNC('month', MIN(ed.created_at)),
    DATE_TRUNC('month', MAX(ed.created_at)) + INTERVAL '1 month' - INTERVAL '1 day',
    COUNT(*),
    COUNT(*) FILTER (WHERE ed.status IN ('resolved', 'partially_resolved')),
    ROUND(
        COUNT(*) FILTER (WHERE ed.status IN ('resolved', 'partially_resolved'))::DECIMAL / 
        COUNT(*) * 100, 2
    ),
    0, -- Default score improvement
    COUNT(*) FILTER (WHERE ed.status = 'resolved'),
    COUNT(*) FILTER (WHERE ed.status IN ('resolved', 'partially_resolved')),
    30.0, -- Default response time
    jsonb_build_object(
        'experian', jsonb_build_object('success_rate', 75, 'avg_response_time', 28),
        'equifax', jsonb_build_object('success_rate', 72, 'avg_response_time', 32),
        'transunion', jsonb_build_object('success_rate', 78, 'avg_response_time', 25)
    ),
    NOW()
FROM enhanced_disputes ed
GROUP BY ed.user_id, DATE_TRUNC('month', ed.created_at)
ON CONFLICT DO NOTHING;

-- =============================================
-- 7. VALIDATION AND CLEANUP
-- =============================================

-- Validate migration results
DO $
DECLARE
    original_count INTEGER;
    migrated_count INTEGER;
    validation_passed BOOLEAN := TRUE;
BEGIN
    -- Check credit reports migration
    SELECT COUNT(*) INTO original_count FROM migration_backup_credit_reports;
    SELECT COUNT(*) INTO migrated_count FROM credit_reports WHERE extraction_metadata IS NOT NULL;
    
    IF migrated_count < original_count THEN
        RAISE WARNING 'Credit reports migration incomplete: % original, % migrated', original_count, migrated_count;
        validation_passed := FALSE;
    END IF;
    
    -- Check disputes migration
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dispute_letters') THEN
        SELECT COUNT(*) INTO original_count FROM dispute_letters;
        SELECT COUNT(*) INTO migrated_count FROM enhanced_disputes;
        
        IF migrated_count < original_count THEN
            RAISE WARNING 'Disputes migration incomplete: % original, % migrated', original_count, migrated_count;
            validation_passed := FALSE;
        END IF;
    END IF;
    
    -- Log validation results
    IF validation_passed THEN
        INSERT INTO system_logs (log_type, message, created_at) 
        VALUES ('maintenance', 'Migration validation passed', NOW());
        RAISE NOTICE 'Migration validation passed successfully';
    ELSE
        INSERT INTO system_logs (log_type, message, created_at) 
        VALUES ('warning', 'Migration validation found issues', NOW());
        RAISE WARNING 'Migration validation found issues - please review';
    END IF;
END;
$;

-- =============================================
-- 8. POST-MIGRATION OPTIMIZATION
-- =============================================

-- Update table statistics
ANALYZE credit_reports;
ANALYZE enhanced_disputes;
ANALYZE dispute_tracking;
ANALYZE credit_scores;
ANALYZE dispute_analytics;

-- Refresh materialized views if they exist
DO $
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'bureau_performance_summary') THEN
        REFRESH MATERIALIZED VIEW bureau_performance_summary;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'user_success_metrics') THEN
        REFRESH MATERIALIZED VIEW user_success_metrics;
    END IF;
END;
$;

-- =============================================
-- 9. MIGRATION COMPLETION
-- =============================================

-- Log migration completion
INSERT INTO system_logs (log_type, message, metadata, created_at) 
VALUES ('maintenance', 'Production migration completed', 
        jsonb_build_object(
            'timestamp', NOW(),
            'migrated_tables', ARRAY['credit_reports', 'enhanced_disputes', 'dispute_tracking', 'credit_scores'],
            'backup_tables_created', true
        ), NOW());

-- Create migration summary
DO $
DECLARE
    summary_text TEXT;
BEGIN
    SELECT string_agg(
        format('%s: %s records', table_name, row_count), 
        E'\n'
    ) INTO summary_text
    FROM (
        SELECT 'credit_reports' as table_name, COUNT(*) as row_count FROM credit_reports
        UNION ALL
        SELECT 'enhanced_disputes', COUNT(*) FROM enhanced_disputes
        UNION ALL
        SELECT 'dispute_tracking', COUNT(*) FROM dispute_tracking
        UNION ALL
        SELECT 'credit_scores', COUNT(*) FROM credit_scores
        UNION ALL
        SELECT 'dispute_analytics', COUNT(*) FROM dispute_analytics
    ) t;
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '%', summary_text;
    
    INSERT INTO system_logs (log_type, message, metadata, created_at) 
    VALUES ('maintenance', 'Migration summary', 
            jsonb_build_object('summary', summary_text), NOW());
END;
$;

COMMIT;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

COMMENT ON TABLE migration_backup_credit_reports IS 'Backup of credit_reports table before production migration';