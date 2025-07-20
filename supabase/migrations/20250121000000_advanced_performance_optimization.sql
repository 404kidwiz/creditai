-- Sprint 4 Performance Optimization: Advanced Database Performance
-- PERF-4.1: Database optimization with comprehensive indexes and query optimization

-- =======================
-- ADVANCED INDEXING STRATEGY
-- =======================

-- Drop existing indexes if they exist to recreate with better optimization
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_credit_reports_user_id;
DROP INDEX IF EXISTS idx_credit_reports_status;
DROP INDEX IF EXISTS idx_dispute_letters_user_id;
DROP INDEX IF EXISTS idx_credit_scores_user_id;

-- =======================
-- CORE ENTITY INDEXES
-- =======================

-- Users table - optimized for authentication and lookup patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_hash
  ON auth.users USING hash(email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at_desc
  ON auth.users(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified_at
  ON auth.users(email_confirmed_at) 
  WHERE email_confirmed_at IS NOT NULL;

-- Profiles table - user dashboard optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id_active
  ON profiles(user_id) 
  WHERE updated_at > NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_subscription_status
  ON profiles(subscription_status)
  WHERE subscription_status IS NOT NULL;

-- =======================
-- CREDIT REPORTS OPTIMIZATION
-- =======================

-- Credit reports - multi-column indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_reports_user_status_date
  ON credit_reports(user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_reports_processing_status
  ON credit_reports(status, created_at)
  WHERE status IN ('processing', 'pending', 'analyzing');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_reports_completed_recent
  ON credit_reports(user_id, created_at DESC)
  WHERE status = 'completed' AND created_at > NOW() - INTERVAL '90 days';

-- Partial index for failed reports requiring retry
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_reports_failed_retry
  ON credit_reports(user_id, created_at)
  WHERE status = 'failed' AND created_at > NOW() - INTERVAL '7 days';

-- =======================
-- ANALYTICS & MONITORING INDEXES
-- =======================

-- Credit scores tracking - time-series optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_scores_user_bureau_date
  ON credit_scores(user_id, bureau, recorded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_scores_trend_analysis
  ON credit_scores(user_id, recorded_at DESC)
  WHERE score IS NOT NULL;

-- Dispute letters - workflow optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dispute_letters_user_status_priority
  ON dispute_letters(user_id, status, priority, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dispute_letters_active_campaigns
  ON dispute_letters(user_id, created_at DESC)
  WHERE status IN ('draft', 'sent', 'follow_up_needed');

-- =======================
-- SYSTEM PERFORMANCE INDEXES
-- =======================

-- File uploads - storage optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_uploads_user_type_date
  ON file_uploads(user_id, file_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_uploads_processing_queue
  ON file_uploads(status, created_at)
  WHERE status IN ('pending', 'processing');

-- Analytics events - reporting optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_user_date
  ON analytics_events(user_id, created_at DESC)
  WHERE created_at > NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_type_aggregation
  ON analytics_events(event_type, DATE(created_at));

-- =======================
-- SUBSCRIPTION & BILLING INDEXES
-- =======================

-- Subscriptions - billing optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_status_period
  ON subscriptions(user_id, status, current_period_end DESC)
  WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_renewal_queue
  ON subscriptions(current_period_end)
  WHERE status = 'active' AND current_period_end BETWEEN NOW() AND NOW() + INTERVAL '7 days';

-- =======================
-- FULL-TEXT SEARCH OPTIMIZATION
-- =======================

-- Credit report content search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_reports_content_search
  ON credit_reports USING gin(to_tsvector('english', 
    COALESCE(extracted_text, '') || ' ' || COALESCE(analysis_summary, '')));

-- Dispute letter content search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dispute_letters_content_search
  ON dispute_letters USING gin(to_tsvector('english',
    COALESCE(letter_content, '') || ' ' || COALESCE(dispute_reasons, '')));

-- =======================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =======================

-- Dashboard queries - user activity overview
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_dashboard
  ON credit_reports(user_id, status, created_at DESC, analysis_confidence);

-- Report processing pipeline optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_pipeline_queue
  ON credit_reports(status, priority, created_at)
  WHERE status IN ('pending', 'processing', 'analyzing')
  AND created_at > NOW() - INTERVAL '24 hours';

-- Credit improvement tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_improvement_tracking
  ON credit_scores(user_id, bureau, score, recorded_at DESC)
  WHERE recorded_at > NOW() - INTERVAL '12 months';

-- =======================
-- PERFORMANCE MONITORING TABLES
-- =======================

-- Query performance tracking
CREATE TABLE IF NOT EXISTS query_performance_log (
  id BIGSERIAL PRIMARY KEY,
  query_type VARCHAR(100) NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  rows_affected INTEGER,
  query_hash VARCHAR(64),
  user_id UUID REFERENCES auth.users(id),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_plan JSONB,
  cache_hit BOOLEAN DEFAULT FALSE
);

-- Index for query performance analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_type_time
  ON query_performance_log(query_type, executed_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_slow_queries
  ON query_performance_log(execution_time_ms DESC, executed_at DESC)
  WHERE execution_time_ms > 1000;

-- Database connection pool monitoring
CREATE TABLE IF NOT EXISTS connection_pool_metrics (
  id BIGSERIAL PRIMARY KEY,
  active_connections INTEGER NOT NULL,
  idle_connections INTEGER NOT NULL,
  waiting_connections INTEGER NOT NULL,
  total_connections INTEGER NOT NULL,
  peak_connections INTEGER NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for connection monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connection_metrics_time
  ON connection_pool_metrics(recorded_at DESC);

-- =======================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =======================

-- User dashboard summary - refreshed every 15 minutes
CREATE MATERIALIZED VIEW IF NOT EXISTS user_dashboard_summary AS
SELECT 
  u.id as user_id,
  u.email,
  p.subscription_status,
  COUNT(cr.id) as total_reports,
  COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed_reports,
  COUNT(CASE WHEN cr.status = 'processing' THEN 1 END) as processing_reports,
  MAX(cr.created_at) as last_report_date,
  AVG(CASE WHEN cs.score IS NOT NULL THEN cs.score END) as avg_credit_score,
  COUNT(dl.id) as total_disputes,
  COUNT(CASE WHEN dl.status = 'sent' THEN 1 END) as active_disputes,
  MAX(cs.recorded_at) as last_score_update
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
LEFT JOIN credit_reports cr ON u.id = cr.user_id
LEFT JOIN credit_scores cs ON u.id = cs.user_id
LEFT JOIN dispute_letters dl ON u.id = dl.user_id
WHERE u.created_at > NOW() - INTERVAL '6 months'
GROUP BY u.id, u.email, p.subscription_status;

-- Index for materialized view
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_user_dashboard_summary_user_id
  ON user_dashboard_summary(user_id);

-- Credit score trends - refreshed daily
CREATE MATERIALIZED VIEW IF NOT EXISTS credit_score_trends AS
SELECT 
  user_id,
  bureau,
  DATE(recorded_at) as score_date,
  AVG(score) as avg_daily_score,
  MIN(score) as min_daily_score,
  MAX(score) as max_daily_score,
  COUNT(*) as readings_count
FROM credit_scores
WHERE recorded_at > NOW() - INTERVAL '12 months'
GROUP BY user_id, bureau, DATE(recorded_at);

-- Index for credit score trends
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_score_trends_user_bureau_date
  ON credit_score_trends(user_id, bureau, score_date DESC);

-- =======================
-- PERFORMANCE OPTIMIZATION FUNCTIONS
-- =======================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_performance_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_dashboard_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY credit_score_trends;
  
  -- Log the refresh
  INSERT INTO query_performance_log (query_type, execution_time_ms, rows_affected)
  VALUES ('materialized_view_refresh', EXTRACT(EPOCH FROM NOW())::integer * 1000, 2);
END;
$$;

-- Function to analyze query performance
CREATE OR REPLACE FUNCTION log_query_performance(
  p_query_type VARCHAR(100),
  p_execution_time_ms INTEGER,
  p_rows_affected INTEGER DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_cache_hit BOOLEAN DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO query_performance_log (
    query_type, 
    execution_time_ms, 
    rows_affected, 
    user_id, 
    cache_hit
  )
  VALUES (
    p_query_type, 
    p_execution_time_ms, 
    p_rows_affected, 
    p_user_id, 
    p_cache_hit
  );
END;
$$;

-- Function to get slow queries report
CREATE OR REPLACE FUNCTION get_slow_queries_report(
  time_range INTERVAL DEFAULT INTERVAL '24 hours'
)
RETURNS TABLE (
  query_type VARCHAR(100),
  avg_execution_time_ms NUMERIC,
  max_execution_time_ms INTEGER,
  execution_count BIGINT,
  cache_hit_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qpl.query_type,
    ROUND(AVG(qpl.execution_time_ms), 2) as avg_execution_time_ms,
    MAX(qpl.execution_time_ms) as max_execution_time_ms,
    COUNT(*) as execution_count,
    ROUND(
      (COUNT(CASE WHEN qpl.cache_hit THEN 1 END)::NUMERIC / COUNT(*)) * 100, 
      2
    ) as cache_hit_rate
  FROM query_performance_log qpl
  WHERE qpl.executed_at > NOW() - time_range
  GROUP BY qpl.query_type
  ORDER BY avg_execution_time_ms DESC;
END;
$$;

-- =======================
-- AUTOMATED MAINTENANCE
-- =======================

-- Function to update table statistics
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update statistics for main tables
  ANALYZE auth.users;
  ANALYZE profiles;
  ANALYZE credit_reports;
  ANALYZE credit_scores;
  ANALYZE dispute_letters;
  ANALYZE file_uploads;
  ANALYZE analytics_events;
  ANALYZE subscriptions;
  
  -- Log the maintenance
  INSERT INTO query_performance_log (query_type, execution_time_ms)
  VALUES ('table_statistics_update', EXTRACT(EPOCH FROM NOW())::integer * 1000);
END;
$$;

-- Function to clean old performance logs
CREATE OR REPLACE FUNCTION cleanup_performance_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Keep only last 30 days of query performance logs
  DELETE FROM query_performance_log 
  WHERE executed_at < NOW() - INTERVAL '30 days';
  
  -- Keep only last 7 days of connection metrics
  DELETE FROM connection_pool_metrics 
  WHERE recorded_at < NOW() - INTERVAL '7 days';
  
  -- Log the cleanup
  INSERT INTO query_performance_log (query_type, execution_time_ms)
  VALUES ('performance_logs_cleanup', EXTRACT(EPOCH FROM NOW())::integer * 1000);
END;
$$;

-- =======================
-- SCHEDULED TASKS (using pg_cron if available)
-- =======================

-- Schedule materialized view refresh every 15 minutes
-- SELECT cron.schedule('refresh-performance-views', '*/15 * * * *', 'SELECT refresh_performance_views();');

-- Schedule statistics update daily at 2 AM
-- SELECT cron.schedule('update-table-stats', '0 2 * * *', 'SELECT update_table_statistics();');

-- Schedule performance logs cleanup weekly
-- SELECT cron.schedule('cleanup-perf-logs', '0 3 * * 0', 'SELECT cleanup_performance_logs();');

-- =======================
-- PERFORMANCE MONITORING VIEWS
-- =======================

-- View for current database performance metrics
CREATE OR REPLACE VIEW database_performance_metrics AS
SELECT 
  'Active Connections' as metric_name,
  COUNT(*) as current_value,
  '5 minutes' as time_window
FROM pg_stat_activity 
WHERE state = 'active'
UNION ALL
SELECT 
  'Cache Hit Ratio' as metric_name,
  ROUND(
    (SUM(blks_hit) / NULLIF(SUM(blks_hit + blks_read), 0)) * 100, 
    2
  ) as current_value,
  'Overall' as time_window
FROM pg_stat_database
UNION ALL
SELECT 
  'Average Query Time (ms)' as metric_name,
  ROUND(AVG(mean_exec_time), 2) as current_value,
  'Since last reset' as time_window
FROM pg_stat_statements 
WHERE calls > 0;

-- View for index usage analysis
CREATE OR REPLACE VIEW index_usage_analysis AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  CASE 
    WHEN idx_tup_read = 0 THEN 'Never Used'
    WHEN idx_tup_read < 1000 THEN 'Low Usage'
    WHEN idx_tup_read < 10000 THEN 'Medium Usage'
    ELSE 'High Usage'
  END as usage_level
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;

-- =======================
-- GRANTS AND PERMISSIONS
-- =======================

-- Grant access to performance monitoring
GRANT SELECT ON query_performance_log TO authenticated;
GRANT SELECT ON connection_pool_metrics TO authenticated;
GRANT SELECT ON database_performance_metrics TO authenticated;
GRANT SELECT ON index_usage_analysis TO authenticated;
GRANT SELECT ON user_dashboard_summary TO authenticated;
GRANT SELECT ON credit_score_trends TO authenticated;

-- Grant execute permissions for performance functions
GRANT EXECUTE ON FUNCTION log_query_performance TO authenticated;
GRANT EXECUTE ON FUNCTION get_slow_queries_report TO authenticated;

-- Restrict sensitive functions to service role
GRANT EXECUTE ON FUNCTION refresh_performance_views TO service_role;
GRANT EXECUTE ON FUNCTION update_table_statistics TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_performance_logs TO service_role;

-- =======================
-- COMMENTS AND DOCUMENTATION
-- =======================

COMMENT ON TABLE query_performance_log IS 'Tracks query execution performance for optimization analysis';
COMMENT ON TABLE connection_pool_metrics IS 'Monitors database connection pool utilization';
COMMENT ON MATERIALIZED VIEW user_dashboard_summary IS 'Pre-computed user dashboard data for fast loading';
COMMENT ON MATERIALIZED VIEW credit_score_trends IS 'Daily aggregated credit score trends for analytics';

COMMENT ON FUNCTION refresh_performance_views IS 'Refreshes all materialized views for updated performance data';
COMMENT ON FUNCTION log_query_performance IS 'Logs query execution metrics for performance monitoring';
COMMENT ON FUNCTION get_slow_queries_report IS 'Generates report of slow-performing queries';

-- =======================
-- INITIAL DATA AND SETUP
-- =======================

-- Insert initial connection pool metrics
INSERT INTO connection_pool_metrics (
  active_connections, 
  idle_connections, 
  waiting_connections, 
  total_connections, 
  peak_connections
) VALUES (0, 0, 0, 0, 0);

-- Initial materialized view refresh
SELECT refresh_performance_views();

-- Log the migration completion
INSERT INTO query_performance_log (query_type, execution_time_ms, rows_affected)
VALUES ('database_optimization_migration', EXTRACT(EPOCH FROM NOW())::integer * 1000, 1);

-- =======================
-- PERFORMANCE VALIDATION
-- =======================

-- Validate that all indexes were created successfully
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%';
  
  IF index_count < 15 THEN
    RAISE EXCEPTION 'Index creation validation failed. Expected at least 15 indexes, found %', index_count;
  END IF;
  
  RAISE NOTICE 'Database optimization completed successfully. Created % performance indexes.', index_count;
END $$;