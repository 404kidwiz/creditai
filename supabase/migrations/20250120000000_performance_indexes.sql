-- Performance Optimization Indexes for CreditAI Platform
-- This migration adds indexes to optimize common query patterns

-- Credit Reports Table Indexes
-- Index for user-specific queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_credit_reports_user_id_created_at 
ON credit_reports (user_id, created_at DESC);

-- Index for status-based queries
CREATE INDEX IF NOT EXISTS idx_credit_reports_user_id_status 
ON credit_reports (user_id, status);

-- Index for processing method analysis
CREATE INDEX IF NOT EXISTS idx_credit_reports_processing_method_confidence 
ON credit_reports (processing_method, confidence_score);

-- Index for bureau-specific queries
CREATE INDEX IF NOT EXISTS idx_credit_reports_user_id_bureau 
ON credit_reports (user_id, bureau);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_credit_reports_report_date 
ON credit_reports (report_date DESC);

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_credit_reports_dashboard 
ON credit_reports (user_id, status, created_at DESC);

-- Disputes Table Indexes
-- Index for user-specific dispute queries
CREATE INDEX IF NOT EXISTS idx_disputes_user_id_created_at 
ON disputes (user_id, created_at DESC);

-- Index for active disputes (most common status queries)
CREATE INDEX IF NOT EXISTS idx_disputes_user_id_status 
ON disputes (user_id, status) 
WHERE status IN ('submitted', 'in_progress', 'under_review');

-- Index for dispute type analysis
CREATE INDEX IF NOT EXISTS idx_disputes_type_status 
ON disputes (dispute_type, status);

-- Index for priority-based queries
CREATE INDEX IF NOT EXISTS idx_disputes_user_id_priority 
ON disputes (user_id, priority, created_at DESC);

-- Index for resolution tracking
CREATE INDEX IF NOT EXISTS idx_disputes_expected_resolution 
ON disputes (expected_resolution_date) 
WHERE status IN ('submitted', 'in_progress', 'under_review');

-- Profiles Table Indexes
-- Index for user lookup optimization
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles (id);

-- Index for subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status 
ON profiles (subscription_status, subscription_tier);

-- Security Audit Log Indexes
-- Index for security monitoring queries
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id_timestamp 
ON security_audit_log (user_id, timestamp DESC);

-- Index for event type analysis
CREATE INDEX IF NOT EXISTS idx_security_audit_event_type_timestamp 
ON security_audit_log (event_type, timestamp DESC);

-- Index for IP-based security analysis
CREATE INDEX IF NOT EXISTS idx_security_audit_ip_timestamp 
ON security_audit_log (ip_address, timestamp DESC) 
WHERE ip_address IS NOT NULL;

-- Dispute Letters Table Indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_dispute_letters_dispute_id 
ON dispute_letters (dispute_id);

CREATE INDEX IF NOT EXISTS idx_dispute_letters_user_id_created_at 
ON dispute_letters (user_id, created_at DESC);

-- Credit Score Tracking Indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_credit_scores_user_id_date 
ON credit_score_tracking (user_id, score_date DESC);

CREATE INDEX IF NOT EXISTS idx_credit_scores_bureau_date 
ON credit_score_tracking (bureau, score_date DESC);

-- Subscriptions Table Indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_status 
ON subscriptions (user_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id 
ON subscriptions (stripe_subscription_id);

-- Partial indexes for better performance on filtered queries
-- Index for recent reports (last 30 days)
CREATE INDEX IF NOT EXISTS idx_credit_reports_recent 
ON credit_reports (user_id, created_at DESC) 
WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days');

-- Index for high-confidence reports
CREATE INDEX IF NOT EXISTS idx_credit_reports_high_confidence 
ON credit_reports (user_id, confidence_score DESC) 
WHERE confidence_score >= 70;

-- Index for failed processing
CREATE INDEX IF NOT EXISTS idx_credit_reports_failed 
ON credit_reports (user_id, created_at DESC) 
WHERE status = 'failed';

-- Covering indexes for common SELECT patterns
-- Dashboard query optimization
CREATE INDEX IF NOT EXISTS idx_credit_reports_dashboard_covering 
ON credit_reports (user_id, created_at DESC) 
INCLUDE (id, processing_method, confidence_score, status, file_name);

-- Dispute summary optimization
CREATE INDEX IF NOT EXISTS idx_disputes_summary_covering 
ON disputes (user_id, status, created_at DESC) 
INCLUDE (id, dispute_type, priority, expected_resolution_date);

-- Add statistics for query planner optimization
ANALYZE credit_reports;
ANALYZE disputes;
ANALYZE profiles;
ANALYZE security_audit_log;

-- Create function to monitor index usage
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE (
    schemaname text,
    tablename text,
    indexname text,
    idx_scan bigint,
    idx_tup_read bigint,
    idx_tup_fetch bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schemaname::text,
        s.tablename::text,
        s.indexname::text,
        s.idx_scan,
        s.idx_tup_read,
        s.idx_tup_fetch
    FROM pg_stat_user_indexes s
    WHERE s.schemaname = 'public'
    ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to identify unused indexes
CREATE OR REPLACE FUNCTION get_unused_indexes()
RETURNS TABLE (
    schemaname text,
    tablename text,
    indexname text,
    index_size text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schemaname::text,
        s.tablename::text,
        s.indexname::text,
        pg_size_pretty(pg_relation_size(s.indexrelid))::text as index_size
    FROM pg_stat_user_indexes s
    WHERE s.idx_scan = 0 
    AND s.schemaname = 'public'
    AND s.indexname NOT LIKE '%_pkey'
    ORDER BY pg_relation_size(s.indexrelid) DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON INDEX idx_credit_reports_user_id_created_at IS 'Optimizes user-specific report queries ordered by creation date';
COMMENT ON INDEX idx_disputes_user_id_status IS 'Optimizes active dispute queries for dashboard';
COMMENT ON INDEX idx_credit_reports_dashboard_covering IS 'Covering index for dashboard queries to avoid table lookups';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_index_usage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unused_indexes() TO authenticated;