-- =============================================
-- Database Performance Optimization Script
-- Enhanced Credit Analysis and EOSCAR System
-- =============================================

-- This script optimizes the database for production workloads
-- with focus on query performance, indexing, and resource utilization

-- =============================================
-- 1. QUERY PERFORMANCE OPTIMIZATION
-- =============================================

-- Enable query statistics collection
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Optimize commonly used queries with better indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_reports_analysis_performance 
    ON credit_reports(user_id, created_at DESC, confidence_score DESC) 
    WHERE analysis_result IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enhanced_disputes_active_tracking 
    ON enhanced_disputes(user_id, status, created_at DESC) 
    WHERE status IN ('submitted', 'in_progress', 'responded');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bureau_submissions_response_tracking 
    ON bureau_submissions(dispute_id, expected_response_date ASC) 
    WHERE response_received = FALSE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follow_up_actions_due 
    ON follow_up_actions(scheduled_date ASC, completed) 
    WHERE completed = FALSE;

-- Optimize text search performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_creditor_database_fuzzy_search 
    ON creditor_database USING GIN(
        to_tsvector('english', creditor_name || ' ' || COALESCE(standardized_name, '') || ' ' || array_to_string(aliases, ' '))
    );

-- =============================================
-- 2. PARTITIONING FOR LARGE TABLES
-- =============================================

-- Partition system_logs by date for better performance
DO $
BEGIN
    -- Check if table is already partitioned
    IF NOT EXISTS (
        SELECT 1 FROM pg_partitioned_table WHERE partrelid = 'system_logs'::regclass
    ) THEN
        -- Create partitioned table
        CREATE TABLE system_logs_partitioned (
            LIKE system_logs INCLUDING ALL
        ) PARTITION BY RANGE (created_at);
        
        -- Create partitions for current and future months
        FOR i IN 0..11 LOOP
            EXECUTE format('
                CREATE TABLE system_logs_y%s_m%s PARTITION OF system_logs_partitioned
                FOR VALUES FROM (%L) TO (%L)',
                EXTRACT(YEAR FROM NOW() + (i || ' months')::INTERVAL),
                LPAD(EXTRACT(MONTH FROM NOW() + (i || ' months')::INTERVAL)::TEXT, 2, '0'),
                DATE_TRUNC('month', NOW() + (i || ' months')::INTERVAL),
                DATE_TRUNC('month', NOW() + ((i + 1) || ' months')::INTERVAL)
            );
        END LOOP;
        
        -- Note: In production, you would migrate data and rename tables
        -- This is left as a manual step to avoid data loss
    END IF;
END;
$;

-- =============================================
-- 3. MATERIALIZED VIEW OPTIMIZATIONS
-- =============================================

-- Optimize bureau performance summary with better aggregation
DROP MATERIALIZED VIEW IF EXISTS bureau_performance_summary;
CREATE MATERIALIZED VIEW bureau_performance_summary AS
WITH monthly_stats AS (
    SELECT 
        bureau,
        DATE_TRUNC('month', submission_date) as month,
        COUNT(*) as submissions,
        AVG(response_time_days) as avg_response_time,
        AVG(resolution_time_days) as avg_resolution_time,
        COUNT(*) FILTER (WHERE outcome IN ('deleted', 'updated', 'partial'))::DECIMAL / COUNT(*) * 100 as success_rate,
        COUNT(*) FILTER (WHERE escalation_count > 0)::DECIMAL / COUNT(*) * 100 as escalation_rate,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_days) as median_response_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_days) as p95_response_time
    FROM bureau_performance
    WHERE submission_date >= NOW() - INTERVAL '24 months'
    GROUP BY bureau, DATE_TRUNC('month', submission_date)
)
SELECT 
    bureau,
    month,
    submissions,
    ROUND(avg_response_time, 2) as avg_response_time,
    ROUND(avg_resolution_time, 2) as avg_resolution_time,
    ROUND(success_rate, 2) as success_rate,
    ROUND(escalation_rate, 2) as escalation_rate,
    ROUND(median_response_time, 2) as median_response_time,
    ROUND(p95_response_time, 2) as p95_response_time
FROM monthly_stats
ORDER BY bureau, month DESC;

CREATE UNIQUE INDEX idx_bureau_performance_summary_pk 
    ON bureau_performance_summary(bureau, month);

-- Optimize user success metrics with rolling calculations
DROP MATERIALIZED VIEW IF EXISTS user_success_metrics;
CREATE MATERIALIZED VIEW user_success_metrics AS
WITH user_stats AS (
    SELECT 
        ed.user_id,
        COUNT(*) as total_disputes,
        COUNT(*) FILTER (WHERE ed.status IN ('resolved', 'partially_resolved')) as successful_disputes,
        AVG(ed.success_probability) as avg_predicted_success,
        AVG(ed.estimated_impact) as avg_estimated_impact,
        COUNT(DISTINCT bs.bureau) as bureaus_used,
        COUNT(*) FILTER (WHERE ed.submission_method = 'eoscar_electronic')::DECIMAL / COUNT(*) * 100 as eoscar_usage_rate,
        MAX(ed.created_at) as last_dispute_date,
        MIN(ed.created_at) as first_dispute_date,
        -- Rolling 30-day metrics
        COUNT(*) FILTER (WHERE ed.created_at >= NOW() - INTERVAL '30 days') as disputes_last_30d,
        COUNT(*) FILTER (WHERE ed.created_at >= NOW() - INTERVAL '30 days' AND ed.status IN ('resolved', 'partially_resolved')) as successful_last_30d
    FROM enhanced_disputes ed
    LEFT JOIN bureau_submissions bs ON ed.id = bs.dispute_id
    WHERE ed.created_at >= NOW() - INTERVAL '24 months'
    GROUP BY ed.user_id
)
SELECT 
    user_id,
    total_disputes,
    successful_disputes,
    ROUND(successful_disputes::DECIMAL / NULLIF(total_disputes, 0) * 100, 2) as success_rate,
    ROUND(avg_predicted_success, 2) as avg_predicted_success,
    ROUND(avg_estimated_impact, 2) as avg_estimated_impact,
    bureaus_used,
    ROUND(eoscar_usage_rate, 2) as eoscar_usage_rate,
    last_dispute_date,
    first_dispute_date,
    disputes_last_30d,
    successful_last_30d,
    ROUND(successful_last_30d::DECIMAL / NULLIF(disputes_last_30d, 0) * 100, 2) as success_rate_30d
FROM user_stats
WHERE total_disputes > 0;

CREATE UNIQUE INDEX idx_user_success_metrics_pk 
    ON user_success_metrics(user_id);

-- =============================================
-- 4. QUERY OPTIMIZATION FUNCTIONS
-- =============================================

-- Optimized function for user dashboard data
CREATE OR REPLACE FUNCTION get_user_dashboard_data(user_uuid UUID)
RETURNS TABLE (
    active_disputes INTEGER,
    pending_responses INTEGER,
    success_rate DECIMAL,
    total_score_improvement INTEGER,
    recent_activity JSONB,
    next_actions JSONB
) AS $
BEGIN
    RETURN QUERY
    WITH dispute_stats AS (
        SELECT 
            COUNT(*) FILTER (WHERE status IN ('submitted', 'in_progress')) as active_disputes,
            COUNT(*) FILTER (WHERE status = 'submitted') as pending_responses,
            ROUND(
                COUNT(*) FILTER (WHERE status IN ('resolved', 'partially_resolved'))::DECIMAL / 
                NULLIF(COUNT(*), 0) * 100, 2
            ) as success_rate
        FROM enhanced_disputes 
        WHERE user_id = user_uuid
    ),
    score_improvement AS (
        SELECT COALESCE(SUM(estimated_impact), 0) as total_improvement
        FROM enhanced_disputes 
        WHERE user_id = user_uuid AND status = 'resolved'
    ),
    recent_activity AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'date', created_at,
                'type', 'dispute_created',
                'description', 'New dispute submitted'
            ) ORDER BY created_at DESC
        ) as activities
        FROM enhanced_disputes 
        WHERE user_id = user_uuid 
        AND created_at >= NOW() - INTERVAL '7 days'
        LIMIT 5
    ),
    next_actions AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'action', action_type,
                'due_date', scheduled_date,
                'description', description
            ) ORDER BY scheduled_date ASC
        ) as actions
        FROM follow_up_actions fa
        JOIN enhanced_disputes ed ON fa.dispute_id = ed.id
        WHERE ed.user_id = user_uuid 
        AND fa.completed = FALSE
        AND fa.scheduled_date >= NOW()
        LIMIT 3
    )
    SELECT 
        ds.active_disputes::INTEGER,
        ds.pending_responses::INTEGER,
        ds.success_rate,
        si.total_improvement::INTEGER,
        COALESCE(ra.activities, '[]'::jsonb),
        COALESCE(na.actions, '[]'::jsonb)
    FROM dispute_stats ds
    CROSS JOIN score_improvement si
    CROSS JOIN recent_activity ra
    CROSS JOIN next_actions na;
END;
$ LANGUAGE plpgsql;

-- Optimized function for bureau performance analytics
CREATE OR REPLACE FUNCTION get_bureau_analytics(days_back INTEGER DEFAULT 90)
RETURNS TABLE (
    bureau TEXT,
    total_submissions INTEGER,
    success_rate DECIMAL,
    avg_response_time DECIMAL,
    median_response_time DECIMAL,
    escalation_rate DECIMAL,
    trend_direction TEXT
) AS $
BEGIN
    RETURN QUERY
    WITH current_period AS (
        SELECT 
            bp.bureau,
            COUNT(*) as total_submissions,
            ROUND(
                COUNT(*) FILTER (WHERE bp.outcome IN ('deleted', 'updated', 'partial'))::DECIMAL / 
                COUNT(*) * 100, 2
            ) as success_rate,
            ROUND(AVG(bp.response_time_days), 2) as avg_response_time,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY bp.response_time_days), 2) as median_response_time,
            ROUND(
                COUNT(*) FILTER (WHERE bp.escalation_count > 0)::DECIMAL / 
                COUNT(*) * 100, 2
            ) as escalation_rate
        FROM bureau_performance bp
        WHERE bp.submission_date >= NOW() - INTERVAL '1 day' * days_back
        GROUP BY bp.bureau
    ),
    previous_period AS (
        SELECT 
            bp.bureau,
            ROUND(
                COUNT(*) FILTER (WHERE bp.outcome IN ('deleted', 'updated', 'partial'))::DECIMAL / 
                COUNT(*) * 100, 2
            ) as prev_success_rate
        FROM bureau_performance bp
        WHERE bp.submission_date >= NOW() - INTERVAL '1 day' * (days_back * 2)
        AND bp.submission_date < NOW() - INTERVAL '1 day' * days_back
        GROUP BY bp.bureau
    )
    SELECT 
        cp.bureau,
        cp.total_submissions::INTEGER,
        cp.success_rate,
        cp.avg_response_time,
        cp.median_response_time,
        cp.escalation_rate,
        CASE 
            WHEN pp.prev_success_rate IS NULL THEN 'stable'
            WHEN cp.success_rate > pp.prev_success_rate + 5 THEN 'improving'
            WHEN cp.success_rate < pp.prev_success_rate - 5 THEN 'declining'
            ELSE 'stable'
        END as trend_direction
    FROM current_period cp
    LEFT JOIN previous_period pp ON cp.bureau = pp.bureau
    ORDER BY cp.success_rate DESC;
END;
$ LANGUAGE plpgsql;

-- =============================================
-- 5. AUTOMATED MAINTENANCE PROCEDURES
-- =============================================

-- Enhanced maintenance function with performance monitoring
CREATE OR REPLACE FUNCTION enhanced_daily_maintenance()
RETURNS VOID AS $
DECLARE
    slow_queries INTEGER;
    table_bloat DECIMAL;
    maintenance_start TIMESTAMP;
BEGIN
    maintenance_start := NOW();
    
    -- Check for slow queries
    SELECT COUNT(*) INTO slow_queries
    FROM pg_stat_statements 
    WHERE mean_exec_time > 1000; -- queries taking more than 1 second
    
    -- Check for table bloat
    SELECT MAX(n_dead_tup::DECIMAL / NULLIF(n_live_tup, 0)) INTO table_bloat
    FROM pg_stat_user_tables;
    
    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY bureau_performance_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_success_metrics;
    
    -- Update table statistics if needed
    IF table_bloat > 0.2 THEN
        ANALYZE;
    END IF;
    
    -- Clean up old data
    DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '90 days';
    DELETE FROM validation_history WHERE validated_at < NOW() - INTERVAL '1 year';
    
    -- Update creditor usage statistics
    UPDATE creditor_database 
    SET usage_count = (
        SELECT COUNT(*) 
        FROM dispute_items di 
        JOIN enhanced_disputes ed ON di.dispute_id = ed.id
        WHERE di.creditor_name = creditor_database.standardized_name
        AND ed.created_at >= NOW() - INTERVAL '30 days'
    ),
    last_used = (
        SELECT MAX(ed.created_at)
        FROM dispute_items di 
        JOIN enhanced_disputes ed ON di.dispute_id = ed.id
        WHERE di.creditor_name = creditor_database.standardized_name
    );
    
    -- Log maintenance results
    INSERT INTO system_logs (log_type, message, metadata, created_at) 
    VALUES ('maintenance', 'Enhanced daily maintenance completed', 
            jsonb_build_object(
                'duration_seconds', EXTRACT(EPOCH FROM (NOW() - maintenance_start)),
                'slow_queries_count', slow_queries,
                'max_table_bloat', table_bloat,
                'maintenance_timestamp', maintenance_start
            ), NOW());
END;
$ LANGUAGE plpgsql;

-- =============================================
-- 6. PERFORMANCE MONITORING VIEWS
-- =============================================

-- View for monitoring query performance
CREATE OR REPLACE VIEW query_performance_monitor AS
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    stddev_exec_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE calls > 10
ORDER BY mean_exec_time DESC;

-- View for monitoring table performance
CREATE OR REPLACE VIEW table_performance_monitor AS
SELECT 
    schemaname,
    tablename,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    ROUND(n_dead_tup::DECIMAL / NULLIF(n_live_tup, 0) * 100, 2) as bloat_percent,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch
FROM pg_stat_user_tables
ORDER BY bloat_percent DESC NULLS LAST;

-- View for monitoring index usage
CREATE OR REPLACE VIEW index_usage_monitor AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- =============================================
-- 7. PERFORMANCE ALERTS
-- =============================================

-- Function to check performance alerts
CREATE OR REPLACE FUNCTION check_performance_alerts()
RETURNS TABLE (
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    details JSONB
) AS $
BEGIN
    -- Check for slow queries
    RETURN QUERY
    SELECT 
        'slow_queries'::TEXT,
        'warning'::TEXT,
        'Found ' || COUNT(*) || ' slow queries (>1s average)'::TEXT,
        jsonb_agg(jsonb_build_object('query', LEFT(query, 100), 'avg_time', mean_exec_time))
    FROM pg_stat_statements 
    WHERE mean_exec_time > 1000
    HAVING COUNT(*) > 0;
    
    -- Check for table bloat
    RETURN QUERY
    SELECT 
        'table_bloat'::TEXT,
        CASE WHEN MAX(bloat_percent) > 50 THEN 'critical' ELSE 'warning' END::TEXT,
        'Tables with high bloat detected'::TEXT,
        jsonb_agg(jsonb_build_object('table', tablename, 'bloat_percent', bloat_percent))
    FROM (
        SELECT 
            tablename,
            ROUND(n_dead_tup::DECIMAL / NULLIF(n_live_tup, 0) * 100, 2) as bloat_percent
        FROM pg_stat_user_tables
        WHERE n_dead_tup::DECIMAL / NULLIF(n_live_tup, 0) > 0.3
    ) bloated_tables
    HAVING COUNT(*) > 0;
    
    -- Check for unused indexes
    RETURN QUERY
    SELECT 
        'unused_indexes'::TEXT,
        'info'::TEXT,
        'Found ' || COUNT(*) || ' potentially unused indexes'::TEXT,
        jsonb_agg(jsonb_build_object('index', indexname, 'table', tablename, 'size', pg_size_pretty(pg_relation_size(indexrelid))))
    FROM pg_stat_user_indexes
    WHERE idx_scan < 10
    AND pg_relation_size(indexrelid) > 1024 * 1024 -- larger than 1MB
    HAVING COUNT(*) > 0;
END;
$ LANGUAGE plpgsql;

-- =============================================
-- 8. CONFIGURATION RECOMMENDATIONS
-- =============================================

-- Function to generate configuration recommendations
CREATE OR REPLACE FUNCTION get_performance_recommendations()
RETURNS TABLE (
    category TEXT,
    recommendation TEXT,
    current_value TEXT,
    suggested_value TEXT,
    impact TEXT
) AS $
BEGIN
    -- Memory recommendations
    RETURN QUERY
    SELECT 
        'memory'::TEXT,
        'shared_buffers'::TEXT,
        current_setting('shared_buffers'),
        '25% of available RAM'::TEXT,
        'High - improves cache hit ratio'::TEXT;
    
    RETURN QUERY
    SELECT 
        'memory'::TEXT,
        'effective_cache_size'::TEXT,
        current_setting('effective_cache_size'),
        '75% of available RAM'::TEXT,
        'Medium - helps query planner'::TEXT;
    
    -- Checkpoint recommendations
    RETURN QUERY
    SELECT 
        'checkpoints'::TEXT,
        'checkpoint_completion_target'::TEXT,
        current_setting('checkpoint_completion_target'),
        '0.9'::TEXT,
        'Medium - reduces I/O spikes'::TEXT;
    
    -- WAL recommendations
    RETURN QUERY
    SELECT 
        'wal'::TEXT,
        'wal_buffers'::TEXT,
        current_setting('wal_buffers'),
        '16MB'::TEXT,
        'Low - improves write performance'::TEXT;
END;
$ LANGUAGE plpgsql;

-- =============================================
-- PERFORMANCE OPTIMIZATION COMPLETE
-- =============================================

-- Log optimization completion
INSERT INTO system_logs (log_type, message, metadata, created_at) 
VALUES ('maintenance', 'Database performance optimization completed', 
        jsonb_build_object(
            'optimizations_applied', ARRAY[
                'query_indexes', 'materialized_views', 'maintenance_functions', 
                'monitoring_views', 'performance_alerts'
            ],
            'optimization_timestamp', NOW()
        ), NOW());

COMMENT ON FUNCTION enhanced_daily_maintenance() IS 'Enhanced daily maintenance with performance monitoring';
COMMENT ON VIEW query_performance_monitor IS 'Monitor query performance and identify slow queries';
COMMENT ON VIEW table_performance_monitor IS 'Monitor table statistics and bloat';
COMMENT ON FUNCTION check_performance_alerts() IS 'Check for performance issues and generate alerts';