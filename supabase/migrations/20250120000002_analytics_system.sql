-- Analytics System Database Schema
-- This migration creates all tables needed for the advanced analytics system

-- User behavior tracking tables
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- seconds
    page_views INTEGER DEFAULT 0,
    device_type VARCHAR(50),
    device_os VARCHAR(100),
    device_browser VARCHAR(100),
    screen_resolution VARCHAR(50),
    country VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    timezone VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_behavior_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}',
    page VARCHAR(500),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    metadata JSONB DEFAULT '{}'
);

-- Credit prediction models and results
CREATE TABLE IF NOT EXISTS credit_prediction_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    algorithm VARCHAR(100) NOT NULL,
    features TEXT[] NOT NULL,
    accuracy DECIMAL(5,4),
    last_trained TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'training',
    model_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_score_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    model_id UUID REFERENCES credit_prediction_models(id) ON DELETE CASCADE,
    current_score INTEGER,
    predicted_score INTEGER,
    timeframe INTEGER, -- months
    confidence DECIMAL(5,4),
    factors JSONB DEFAULT '[]',
    recommendations TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business intelligence metrics
CREATE TABLE IF NOT EXISTS business_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    active_users INTEGER DEFAULT 0,
    new_signups INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,
    churn_rate DECIMAL(5,4) DEFAULT 0,
    average_session_duration INTEGER DEFAULT 0, -- seconds
    page_views INTEGER DEFAULT 0,
    upload_count INTEGER DEFAULT 0,
    analysis_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date)
);

-- A/B testing framework
CREATE TABLE IF NOT EXISTS ab_test_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    target_metric VARCHAR(255) NOT NULL,
    segments TEXT[] DEFAULT '{}',
    traffic_allocation DECIMAL(3,2) DEFAULT 0.1, -- 0 to 1
    statistical_significance DECIMAL(5,4),
    config JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_test_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES ab_test_experiments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    weight DECIMAL(3,2) DEFAULT 0.5, -- 0 to 1
    config JSONB DEFAULT '{}',
    participant_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_test_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES ab_test_experiments(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    converted BOOLEAN DEFAULT FALSE,
    conversion_date TIMESTAMP WITH TIME ZONE,
    UNIQUE(experiment_id, user_id)
);

-- Custom reporting system
CREATE TABLE IF NOT EXISTS custom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    config JSONB NOT NULL DEFAULT '{}',
    schedule JSONB DEFAULT '{}',
    last_generated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES custom_reports(id) ON DELETE CASCADE,
    execution_time INTEGER, -- milliseconds
    status VARCHAR(50) DEFAULT 'running',
    result_data JSONB DEFAULT '{}',
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics insights and automated analysis
CREATE TABLE IF NOT EXISTS analytics_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(50) DEFAULT 'medium',
    confidence DECIMAL(5,4),
    data JSONB DEFAULT '{}',
    recommendations TEXT[],
    acknowledged BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dashboard configuration
CREATE TABLE IF NOT EXISTS analytics_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT FALSE,
    widgets JSONB DEFAULT '[]',
    layout JSONB DEFAULT '{}',
    refresh_interval INTEGER, -- minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User segments for analytics
CREATE TABLE IF NOT EXISTS user_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL DEFAULT '[]',
    user_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_segment_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_id UUID REFERENCES user_segments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(segment_id, user_id)
);

-- Funnel analysis
CREATE TABLE IF NOT EXISTS funnel_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]',
    conversion_rates DECIMAL(5,4)[] DEFAULT '{}',
    drop_off_points JSONB DEFAULT '[]',
    date_range JSONB NOT NULL,
    segment_id UUID REFERENCES user_segments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cohort analysis
CREATE TABLE IF NOT EXISTS cohort_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cohort_type VARCHAR(50) NOT NULL,
    time_unit VARCHAR(20) NOT NULL,
    metric VARCHAR(100) NOT NULL,
    data JSONB DEFAULT '[]',
    date_range JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Predictive models
CREATE TABLE IF NOT EXISTS predictive_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    target_variable VARCHAR(255) NOT NULL,
    features JSONB DEFAULT '[]',
    performance JSONB DEFAULT '{}',
    model_data JSONB DEFAULT '{}',
    last_trained TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'training',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_start_time ON user_sessions(start_time);
CREATE INDEX idx_user_behavior_events_user_id ON user_behavior_events(user_id);
CREATE INDEX idx_user_behavior_events_session_id ON user_behavior_events(session_id);
CREATE INDEX idx_user_behavior_events_event_type ON user_behavior_events(event_type);
CREATE INDEX idx_user_behavior_events_timestamp ON user_behavior_events(timestamp);
CREATE INDEX idx_credit_score_predictions_user_id ON credit_score_predictions(user_id);
CREATE INDEX idx_business_metrics_date ON business_metrics(date);
CREATE INDEX idx_ab_test_assignments_experiment_id ON ab_test_assignments(experiment_id);
CREATE INDEX idx_ab_test_assignments_user_id ON ab_test_assignments(user_id);
CREATE INDEX idx_custom_reports_user_id ON custom_reports(user_id);
CREATE INDEX idx_analytics_insights_type ON analytics_insights(type);
CREATE INDEX idx_analytics_insights_created_at ON analytics_insights(created_at);
CREATE INDEX idx_user_segment_memberships_segment_id ON user_segment_memberships(segment_id);
CREATE INDEX idx_user_segment_memberships_user_id ON user_segment_memberships(user_id);

-- Functions for automated metrics calculation
CREATE OR REPLACE FUNCTION calculate_daily_metrics()
RETURNS VOID AS $$
DECLARE
    target_date DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
    INSERT INTO business_metrics (
        date,
        active_users,
        new_signups,
        page_views,
        upload_count,
        analysis_count,
        average_session_duration
    )
    SELECT 
        target_date,
        COUNT(DISTINCT us.user_id) as active_users,
        COUNT(DISTINCT CASE WHEN u.created_at::date = target_date THEN u.id END) as new_signups,
        COALESCE(SUM(us.page_views), 0) as page_views,
        COUNT(DISTINCT CASE WHEN ube.event_type = 'file_upload' THEN ube.id END) as upload_count,
        COUNT(DISTINCT CASE WHEN ube.event_type = 'analysis_complete' THEN ube.id END) as analysis_count,
        COALESCE(AVG(us.duration), 0)::INTEGER as average_session_duration
    FROM user_sessions us
    LEFT JOIN auth.users u ON us.user_id = u.id
    LEFT JOIN user_behavior_events ube ON us.id = ube.session_id
    WHERE us.start_time::date = target_date
    ON CONFLICT (date) DO UPDATE SET
        active_users = EXCLUDED.active_users,
        new_signups = EXCLUDED.new_signups,
        page_views = EXCLUDED.page_views,
        upload_count = EXCLUDED.upload_count,
        analysis_count = EXCLUDED.analysis_count,
        average_session_duration = EXCLUDED.average_session_duration;
END;
$$ LANGUAGE plpgsql;

-- Function to update user segment memberships
CREATE OR REPLACE FUNCTION update_user_segments()
RETURNS VOID AS $$
DECLARE
    segment_record RECORD;
    user_record RECORD;
    meets_criteria BOOLEAN;
BEGIN
    FOR segment_record IN SELECT * FROM user_segments WHERE is_active = TRUE LOOP
        -- Clear existing memberships for this segment
        DELETE FROM user_segment_memberships WHERE segment_id = segment_record.id;
        
        -- Recalculate memberships based on criteria
        FOR user_record IN SELECT * FROM auth.users LOOP
            -- This is a simplified criteria check - in practice, you'd implement
            -- a more sophisticated criteria evaluation system
            meets_criteria := TRUE; -- Placeholder logic
            
            IF meets_criteria THEN
                INSERT INTO user_segment_memberships (segment_id, user_id)
                VALUES (segment_record.id, user_record.id)
                ON CONFLICT (segment_id, user_id) DO NOTHING;
            END IF;
        END LOOP;
        
        -- Update user count for segment
        UPDATE user_segments 
        SET user_count = (
            SELECT COUNT(*) 
            FROM user_segment_memberships 
            WHERE segment_id = segment_record.id
        ),
        last_updated = NOW()
        WHERE id = segment_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session duration when session ends
CREATE OR REPLACE FUNCTION update_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND OLD.end_time IS NULL THEN
        NEW.duration := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_duration
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_session_duration();

-- RLS Policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_score_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own events" ON user_behavior_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own predictions" ON credit_score_predictions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own reports" ON custom_reports
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public reports" ON custom_reports
    FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can manage their own dashboards" ON analytics_dashboards
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON business_metrics TO authenticated;
GRANT SELECT ON analytics_insights TO authenticated;
GRANT SELECT ON ab_test_experiments TO authenticated;
GRANT SELECT ON ab_test_variants TO authenticated;
GRANT SELECT ON user_segments TO authenticated;
GRANT SELECT ON funnel_analyses TO authenticated;
GRANT SELECT ON cohort_analyses TO authenticated;
GRANT SELECT ON predictive_models TO authenticated;