-- =============================================
-- Database Security Deployment Script
-- Complete security setup for CreditAI production deployment
-- =============================================

-- This script must be run as a database administrator
-- Make sure all required extensions are available

DO $SECURITY_DEPLOYMENT$
BEGIN
    RAISE NOTICE 'Starting CreditAI Database Security Deployment...';
END $SECURITY_DEPLOYMENT$;

-- =============================================
-- 1. ENVIRONMENT VALIDATION
-- =============================================

DO $ENV_VALIDATION$
DECLARE
    env_name text;
BEGIN
    -- Check if we're in the correct environment
    SELECT current_setting('app.environment', true) INTO env_name;
    
    IF env_name IS NULL THEN
        RAISE WARNING 'Environment not set. Assuming production deployment.';
        PERFORM set_config('app.environment', 'production', false);
    END IF;
    
    RAISE NOTICE 'Deploying to environment: %', COALESCE(env_name, 'production');
END $ENV_VALIDATION$;

-- =============================================
-- 2. BACKUP EXISTING SECURITY CONFIGURATION
-- =============================================

-- Create backup schema for rollback if needed
CREATE SCHEMA IF NOT EXISTS security_backup;

-- Backup existing security tables if they exist
DO $BACKUP$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_audit_log') THEN
        EXECUTE 'CREATE TABLE security_backup.security_audit_log_backup AS SELECT * FROM security.enhanced_audit_log';
        RAISE NOTICE 'Backed up existing audit log data';
    END IF;
END $BACKUP$;

-- =============================================
-- 3. ENABLE REQUIRED EXTENSIONS
-- =============================================

-- Enable extensions with error handling
DO $EXTENSIONS$
BEGIN
    -- Enable pgcrypto for encryption functions
    BEGIN
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
        RAISE NOTICE 'pgcrypto extension enabled';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to enable pgcrypto extension: %', SQLERRM;
    END;
    
    -- Enable uuid-ossp for UUID generation
    BEGIN
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        RAISE NOTICE 'uuid-ossp extension enabled';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to enable uuid-ossp extension: %', SQLERRM;
    END;
    
    -- Enable pg_stat_statements for query monitoring (if available)
    BEGIN
        CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
        RAISE NOTICE 'pg_stat_statements extension enabled for monitoring';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'pg_stat_statements extension not available: %', SQLERRM;
    END;
END $EXTENSIONS$;

-- =============================================
-- 4. CREATE SECURITY ROLES WITH PROPER HIERARCHY
-- =============================================

DO $ROLES$
BEGIN
    -- Create admin role if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'creditai_admin') THEN
        CREATE ROLE creditai_admin WITH
            LOGIN
            CREATEDB
            CREATEROLE
            INHERIT
            REPLICATION
            CONNECTION LIMIT 10;
        RAISE NOTICE 'Created creditai_admin role';
    END IF;
    
    -- Create API service role
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'creditai_api') THEN
        CREATE ROLE creditai_api WITH
            LOGIN
            NOSUPERUSER
            INHERIT
            NOCREATEDB
            NOCREATEROLE
            NOREPLICATION
            CONNECTION LIMIT 100;
        RAISE NOTICE 'Created creditai_api role';
    END IF;
    
    -- Create user role
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'creditai_user') THEN
        CREATE ROLE creditai_user WITH
            LOGIN
            NOSUPERUSER
            INHERIT
            NOCREATEDB
            NOCREATEROLE
            NOREPLICATION
            CONNECTION LIMIT 50;
        RAISE NOTICE 'Created creditai_user role';
    END IF;
    
    -- Create read-only analytics role
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'creditai_readonly') THEN
        CREATE ROLE creditai_readonly WITH
            LOGIN
            NOSUPERUSER
            INHERIT
            NOCREATEDB
            NOCREATEROLE
            NOREPLICATION
            CONNECTION LIMIT 20;
        RAISE NOTICE 'Created creditai_readonly role';
    END IF;
    
    -- Create analyst role for anonymized data access
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'creditai_analyst') THEN
        CREATE ROLE creditai_analyst WITH
            LOGIN
            NOSUPERUSER
            INHERIT
            NOCREATEDB
            NOCREATEROLE
            NOREPLICATION
            CONNECTION LIMIT 10;
        RAISE NOTICE 'Created creditai_analyst role';
    END IF;
END $ROLES$;

-- =============================================
-- 5. CONFIGURE CONNECTION SECURITY
-- =============================================

-- Set password security requirements
ALTER SYSTEM SET password_encryption = 'scram-sha-256';
ALTER SYSTEM SET ssl = 'on';
ALTER SYSTEM SET ssl_prefer_server_ciphers = 'on';

-- Configure connection limits and timeouts
ALTER SYSTEM SET max_connections = '200';
ALTER SYSTEM SET idle_in_transaction_session_timeout = '300000'; -- 5 minutes
ALTER SYSTEM SET statement_timeout = '30000'; -- 30 seconds
ALTER SYSTEM SET lock_timeout = '10000'; -- 10 seconds

-- Log configuration for security monitoring
ALTER SYSTEM SET log_statement = 'ddl'; -- Log DDL statements
ALTER SYSTEM SET log_min_duration_statement = '1000'; -- Log slow queries
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
ALTER SYSTEM SET log_hostname = 'on';

-- =============================================
-- 6. APPLY ENHANCED SECURITY MIGRATION
-- =============================================

-- Source the enhanced security migration
\i supabase/migrations/20240124000000_enhanced_security_rbac.sql

-- =============================================
-- 7. CONFIGURE ADDITIONAL SECURITY POLICIES
-- =============================================

-- Enhanced RLS policies for sensitive tables
DO $ENHANCED_RLS$
BEGIN
    -- Credit reports enhanced security
    DROP POLICY IF EXISTS "Enhanced credit reports access" ON credit_reports;
    CREATE POLICY "Enhanced credit reports access" ON credit_reports
        FOR ALL USING (
            -- Users can only access their own data
            auth.uid() = user_id
            -- Or service role with proper context
            OR (auth.role() = 'service_role' AND current_setting('request.jwt.claims', true)::json->>'role' = 'service_role')
        );
    
    -- Documents enhanced security
    DROP POLICY IF EXISTS "Enhanced documents access" ON documents;
    CREATE POLICY "Enhanced documents access" ON documents
        FOR ALL USING (
            auth.uid() = user_id
            OR (auth.role() = 'service_role' AND current_setting('request.jwt.claims', true)::json->>'role' = 'service_role')
        );
    
    -- Disputes enhanced security  
    DROP POLICY IF EXISTS "Enhanced disputes access" ON disputes;
    CREATE POLICY "Enhanced disputes access" ON disputes
        FOR ALL USING (
            auth.uid() = user_id
            OR (auth.role() = 'service_role' AND current_setting('request.jwt.claims', true)::json->>'role' = 'service_role')
        );
    
    RAISE NOTICE 'Enhanced RLS policies applied';
END $ENHANCED_RLS$;

-- =============================================
-- 8. GRANT ROLE PERMISSIONS
-- =============================================

-- Grant permissions to creditai_api (primary application role)
GRANT USAGE ON SCHEMA public TO creditai_api;
GRANT USAGE ON SCHEMA security TO creditai_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO creditai_api;
GRANT SELECT, INSERT ON security.enhanced_audit_log TO creditai_api;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO creditai_api;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA security TO creditai_api;

-- Grant permissions to creditai_user (limited user access)
GRANT USAGE ON SCHEMA public TO creditai_user;
GRANT SELECT, INSERT, UPDATE ON profiles TO creditai_user;
GRANT SELECT, INSERT, UPDATE ON credit_reports TO creditai_user;
GRANT SELECT, INSERT, UPDATE ON disputes TO creditai_user;
GRANT SELECT, INSERT, UPDATE ON documents TO creditai_user;
GRANT SELECT ON user_progress TO creditai_user;

-- Grant permissions to creditai_readonly (analytics and reporting)
GRANT USAGE ON SCHEMA public TO creditai_readonly;
GRANT USAGE ON SCHEMA security TO creditai_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO creditai_readonly;
GRANT SELECT ON security.enhanced_audit_log TO creditai_readonly;
GRANT SELECT ON security.security_dashboard TO creditai_readonly;
GRANT SELECT ON security.compliance_report TO creditai_readonly;

-- Grant permissions to creditai_analyst (anonymized data only)
GRANT USAGE ON SCHEMA public TO creditai_analyst;
GRANT SELECT (id, bureau, report_date, score, created_at) ON credit_reports TO creditai_analyst;
GRANT SELECT (id, subscription_tier, subscription_status, created_at) ON profiles TO creditai_analyst;
GRANT EXECUTE ON FUNCTION security.anonymize_credit_data TO creditai_analyst;

-- Grant admin permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO creditai_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA security TO creditai_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO creditai_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA security TO creditai_admin;

-- =============================================
-- 9. CREATE MONITORING AND ALERTING FUNCTIONS
-- =============================================

-- Function to monitor failed login attempts
CREATE OR REPLACE FUNCTION security.monitor_failed_logins()
RETURNS void AS $$
DECLARE
    failed_attempts integer;
    suspicious_ips text[];
BEGIN
    -- Check for excessive failed login attempts in the last hour
    SELECT COUNT(*)
    INTO failed_attempts
    FROM security.enhanced_audit_log
    WHERE event_type = 'failed_login'
      AND timestamp > NOW() - INTERVAL '1 hour';
    
    IF failed_attempts > 50 THEN
        -- Log critical security event
        PERFORM security.log_operation(
            'security_alert',
            'excessive_failed_logins',
            NULL,
            NULL,
            NULL,
            jsonb_build_object('failed_attempts', failed_attempts),
            NULL,
            'critical'
        );
    END IF;
    
    -- Get top suspicious IP addresses
    SELECT ARRAY_AGG(ip_address::text)
    INTO suspicious_ips
    FROM (
        SELECT ip_address, COUNT(*) as attempt_count
        FROM security.enhanced_audit_log
        WHERE event_type = 'failed_login'
          AND timestamp > NOW() - INTERVAL '1 hour'
        GROUP BY ip_address
        HAVING COUNT(*) > 5
        ORDER BY attempt_count DESC
        LIMIT 10
    ) t;
    
    IF array_length(suspicious_ips, 1) > 0 THEN
        PERFORM security.log_operation(
            'security_alert',
            'suspicious_ip_activity',
            NULL,
            NULL,
            NULL,
            jsonb_build_object('suspicious_ips', suspicious_ips),
            NULL,
            'high'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to monitor data access patterns
CREATE OR REPLACE FUNCTION security.monitor_data_access()
RETURNS void AS $$
DECLARE
    bulk_access_users uuid[];
    unusual_access_patterns text[];
BEGIN
    -- Check for unusual bulk data access
    SELECT ARRAY_AGG(user_id)
    INTO bulk_access_users
    FROM (
        SELECT user_id, COUNT(*) as access_count
        FROM security.enhanced_audit_log
        WHERE event_type = 'data_access'
          AND timestamp > NOW() - INTERVAL '1 hour'
        GROUP BY user_id
        HAVING COUNT(*) > 100
    ) t;
    
    IF array_length(bulk_access_users, 1) > 0 THEN
        PERFORM security.log_operation(
            'security_alert',
            'bulk_data_access_detected',
            NULL,
            NULL,
            NULL,
            jsonb_build_object('users', bulk_access_users),
            NULL,
            'high'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 10. SETUP AUTOMATED SECURITY TASKS
-- =============================================

-- Create function to run periodic security checks
CREATE OR REPLACE FUNCTION security.run_security_checks()
RETURNS void AS $$
BEGIN
    -- Monitor failed logins
    PERFORM security.monitor_failed_logins();
    
    -- Monitor data access patterns
    PERFORM security.monitor_data_access();
    
    -- Clean up old audit logs (retain 1 year)
    PERFORM security.cleanup_old_audit_logs(365);
    
    -- Log the security check completion
    PERFORM security.log_operation(
        'system_maintenance',
        'security_checks_completed',
        NULL,
        NULL,
        NULL,
        jsonb_build_object('timestamp', NOW()),
        NULL,
        'low'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 11. CONFIGURE DEFAULT SECURITY SETTINGS
-- =============================================

-- Insert security configuration
INSERT INTO security.config (key, value, description) VALUES
    ('max_login_attempts', '5', 'Maximum failed login attempts before account lockout'),
    ('lockout_duration_minutes', '30', 'Account lockout duration in minutes'),
    ('session_timeout_minutes', '60', 'User session timeout in minutes'),
    ('password_min_length', '12', 'Minimum password length'),
    ('password_require_symbols', 'true', 'Require special characters in passwords'),
    ('enable_2fa', 'true', 'Enable two-factor authentication'),
    ('audit_retention_days', '365', 'Audit log retention period in days'),
    ('encryption_key_rotation_days', '90', 'Encryption key rotation period'),
    ('failed_login_monitoring', 'true', 'Enable failed login monitoring'),
    ('suspicious_activity_detection', 'true', 'Enable suspicious activity detection')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- =============================================
-- 12. CREATE SECURITY INDEXES FOR PERFORMANCE
-- =============================================

-- Performance indexes for audit logging
CREATE INDEX IF NOT EXISTS idx_audit_log_performance_user_time 
    ON security.enhanced_audit_log(user_id, timestamp DESC);
    
CREATE INDEX IF NOT EXISTS idx_audit_log_performance_event_risk 
    ON security.enhanced_audit_log(event_type, risk_level, timestamp DESC);
    
CREATE INDEX IF NOT EXISTS idx_audit_log_performance_ip_time 
    ON security.enhanced_audit_log(ip_address, timestamp DESC);

-- Performance indexes for main tables
CREATE INDEX IF NOT EXISTS idx_credit_reports_security_lookup 
    ON credit_reports(user_id, created_at DESC, bureau);
    
CREATE INDEX IF NOT EXISTS idx_documents_security_lookup 
    ON documents(user_id, created_at DESC, document_type);

-- =============================================
-- 13. GRANT EXECUTION PERMISSIONS
-- =============================================

-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION security.monitor_failed_logins() TO creditai_admin;
GRANT EXECUTE ON FUNCTION security.monitor_data_access() TO creditai_admin;
GRANT EXECUTE ON FUNCTION security.run_security_checks() TO creditai_admin;

-- =============================================
-- 14. FINALIZE DEPLOYMENT
-- =============================================

-- Reload configuration
SELECT pg_reload_conf();

-- Log deployment completion
DO $DEPLOYMENT_LOG$
BEGIN
    PERFORM security.log_operation(
        'system_deployment',
        'security_configuration_deployed',
        NULL,
        NULL,
        NULL,
        jsonb_build_object(
            'deployment_time', NOW(),
            'version', '1.0.0',
            'environment', current_setting('app.environment', true)
        ),
        NULL,
        'medium'
    );
    
    RAISE NOTICE 'CreditAI Database Security Deployment Completed Successfully!';
    RAISE NOTICE 'Security features enabled:';
    RAISE NOTICE '  - Role-based access control (RBAC)';
    RAISE NOTICE '  - Enhanced audit logging';
    RAISE NOTICE '  - Data encryption support';
    RAISE NOTICE '  - Automated security monitoring';
    RAISE NOTICE '  - Connection security hardening';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Configure environment-specific passwords for roles';
    RAISE NOTICE '  2. Set up SSL certificates';
    RAISE NOTICE '  3. Configure backup encryption';
    RAISE NOTICE '  4. Test security configurations in staging';
    RAISE NOTICE '  5. Schedule periodic security reviews';
END $DEPLOYMENT_LOG$;

-- =============================================
-- DEPLOYMENT COMPLETE
-- =============================================