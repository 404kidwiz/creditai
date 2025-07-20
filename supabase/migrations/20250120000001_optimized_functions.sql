-- Optimized database functions for better query performance

-- Function to verify user resource access efficiently
CREATE OR REPLACE FUNCTION verify_user_resource_access(
    p_user_id UUID,
    p_resource_id UUID,
    p_table_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    resource_exists BOOLEAN := FALSE;
BEGIN
    -- Use dynamic SQL with proper escaping
    IF p_table_name = 'credit_reports' THEN
        SELECT EXISTS(
            SELECT 1 FROM credit_reports 
            WHERE user_id = p_user_id AND id = p_resource_id
        ) INTO resource_exists;
    ELSIF p_table_name = 'disputes' THEN
        SELECT EXISTS(
            SELECT 1 FROM disputes 
            WHERE user_id = p_user_id AND id = p_resource_id
        ) INTO resource_exists;
    ELSE
        RAISE EXCEPTION 'Invalid table name: %', p_table_name;
    END IF;
    
    RETURN resource_exists;
END;
$$;

-- Function to get credit report summary with aggregated data
CREATE OR REPLACE FUNCTION get_credit_report_summary(
    p_user_id UUID,
    p_days_back INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    WITH report_stats AS (
        SELECT 
            COUNT(*) as total_reports,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_reports,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_reports,
            COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_reports,
            AVG(confidence_score) as avg_confidence,
            MAX(confidence_score) as max_confidence,
            MIN(confidence_score) as min_confidence,
            AVG(processing_time) as avg_processing_time,
            COUNT(DISTINCT bureau) as unique_bureaus,
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as reports_last_7_days,
            MAX(created_at) as last_report_date
        FROM credit_reports 
        WHERE user_id = p_user_id 
        AND created_at >= CURRENT_DATE - INTERVAL '%s days' % p_days_back
    ),
    bureau_breakdown AS (
        SELECT 
            bureau,
            COUNT(*) as count,
            AVG(confidence_score) as avg_confidence
        FROM credit_reports 
        WHERE user_id = p_user_id 
        AND created_at >= CURRENT_DATE - INTERVAL '%s days' % p_days_back
        GROUP BY bureau
    ),
    processing_method_stats AS (
        SELECT 
            processing_method,
            COUNT(*) as count,
            AVG(confidence_score) as avg_confidence,
            AVG(processing_time) as avg_processing_time
        FROM credit_reports 
        WHERE user_id = p_user_id 
        AND created_at >= CURRENT_DATE - INTERVAL '%s days' % p_days_back
        GROUP BY processing_method
    )
    SELECT json_build_object(
        'summary', row_to_json(report_stats.*),
        'bureau_breakdown', COALESCE(json_agg(row_to_json(bureau_breakdown.*)), '[]'::json),
        'processing_methods', COALESCE(
            (SELECT json_agg(row_to_json(processing_method_stats.*)) FROM processing_method_stats), 
            '[]'::json
        ),
        'generated_at', CURRENT_TIMESTAMP
    ) INTO result
    FROM report_stats, bureau_breakdown;
    
    RETURN result;
END;
$$;

-- Function to get dispute analytics with aggregated data
CREATE OR REPLACE FUNCTION get_dispute_analytics(
    p_user_id UUID,
    p_days_back INTEGER DEFAULT 90
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    WITH dispute_stats AS (
        SELECT 
            COUNT(*) as total_disputes,
            COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_disputes,
            COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_disputes,
            COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_disputes,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_disputes,
            COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_disputes,
            COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority_disputes,
            COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority_disputes,
            AVG(CASE 
                WHEN status = 'resolved' AND resolution_date IS NOT NULL 
                THEN EXTRACT(days FROM resolution_date - created_at)
                ELSE NULL 
            END) as avg_resolution_days,
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as disputes_last_7_days,
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as disputes_last_30_days
        FROM disputes 
        WHERE user_id = p_user_id 
        AND created_at >= CURRENT_DATE - INTERVAL '%s days' % p_days_back
    ),
    dispute_type_breakdown AS (
        SELECT 
            dispute_type,
            COUNT(*) as count,
            COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
            ROUND(
                COUNT(CASE WHEN status = 'resolved' THEN 1 END)::DECIMAL / 
                NULLIF(COUNT(*), 0) * 100, 2
            ) as success_rate
        FROM disputes 
        WHERE user_id = p_user_id 
        AND created_at >= CURRENT_DATE - INTERVAL '%s days' % p_days_back
        GROUP BY dispute_type
    ),
    monthly_trends AS (
        SELECT 
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as disputes_created,
            COUNT(CASE WHEN status = 'resolved' THEN 1 END) as disputes_resolved
        FROM disputes 
        WHERE user_id = p_user_id 
        AND created_at >= CURRENT_DATE - INTERVAL '%s days' % p_days_back
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
    )
    SELECT json_build_object(
        'summary', row_to_json(dispute_stats.*),
        'type_breakdown', COALESCE(json_agg(row_to_json(dispute_type_breakdown.*)), '[]'::json),
        'monthly_trends', COALESCE(
            (SELECT json_agg(row_to_json(monthly_trends.*)) FROM monthly_trends), 
            '[]'::json
        ),
        'generated_at', CURRENT_TIMESTAMP
    ) INTO result
    FROM dispute_stats, dispute_type_breakdown;
    
    RETURN result;
END;
$$;

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(
    p_user_id UUID,
    p_days_back INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    WITH activity_stats AS (
        SELECT 
            -- Credit report activity
            (SELECT COUNT(*) FROM credit_reports 
             WHERE user_id = p_user_id 
             AND created_at >= CURRENT_DATE - INTERVAL '%s days' % p_days_back) as reports_uploaded,
            
            -- Dispute activity
            (SELECT COUNT(*) FROM disputes 
             WHERE user_id = p_user_id 
             AND created_at >= CURRENT_DATE - INTERVAL '%s days' % p_days_back) as disputes_created,
            
            -- Login activity (from security audit log)
            (SELECT COUNT(DISTINCT DATE(timestamp)) FROM security_audit_log 
             WHERE user_id = p_user_id 
             AND event_type = 'login'
             AND timestamp >= CURRENT_DATE - INTERVAL '%s days' % p_days_back) as active_days,
            
            -- Last activity
            GREATEST(
                (SELECT MAX(created_at) FROM credit_reports WHERE user_id = p_user_id),
                (SELECT MAX(created_at) FROM disputes WHERE user_id = p_user_id),
                (SELECT MAX(timestamp) FROM security_audit_log WHERE user_id = p_user_id)
            ) as last_activity_date
    )
    SELECT json_build_object(
        'reports_uploaded', reports_uploaded,
        'disputes_created', disputes_created,
        'active_days', active_days,
        'last_activity_date', last_activity_date,
        'period_days', p_days_back,
        'generated_at', CURRENT_TIMESTAMP
    ) INTO result
    FROM activity_stats;
    
    RETURN result;
END;
$$;

-- Function to clean up old audit logs (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
    p_days_to_keep INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM security_audit_log 
    WHERE timestamp < CURRENT_DATE - INTERVAL '%s days' % p_days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Function to get database performance metrics
CREATE OR REPLACE FUNCTION get_performance_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    WITH table_stats AS (
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
        WHERE schemaname = 'public'
    ),
    index_stats AS (
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan as scans,
            idx_tup_read as tuples_read,
            idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
        LIMIT 10
    )
    SELECT json_build_object(
        'table_statistics', json_agg(row_to_json(table_stats.*)),
        'top_indexes', (SELECT json_agg(row_to_json(index_stats.*)) FROM index_stats),
        'generated_at', CURRENT_TIMESTAMP
    ) INTO result
    FROM table_stats;
    
    RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION verify_user_resource_access(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_report_summary(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dispute_analytics(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary(UUID, INTEGER) TO authenticated;

-- Grant execute permissions for maintenance functions to service role only
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_performance_metrics() TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION verify_user_resource_access IS 'Efficiently verify if user has access to a specific resource';
COMMENT ON FUNCTION get_credit_report_summary IS 'Get aggregated credit report statistics for a user';
COMMENT ON FUNCTION get_dispute_analytics IS 'Get comprehensive dispute analytics and trends';
COMMENT ON FUNCTION get_user_activity_summary IS 'Get user activity summary across all features';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Maintenance function to clean up old audit log entries';
COMMENT ON FUNCTION get_performance_metrics IS 'Get database performance metrics for monitoring';