-- Create credit_scores table for tracking score history
CREATE TABLE IF NOT EXISTS credit_scores (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 300 AND score <= 850),
    bureau TEXT NOT NULL CHECK (bureau IN ('experian', 'equifax', 'transunion')),
    score_type TEXT NOT NULL DEFAULT 'fico' CHECK (score_type IN ('fico', 'vantage', 'other')),
    score_range JSONB NOT NULL DEFAULT '{"min": 300, "max": 850}',
    report_date TIMESTAMP WITH TIME ZONE NOT NULL,
    factors JSONB DEFAULT '[]',
    accounts JSONB DEFAULT '[]',
    utilization JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create score_goals table for tracking user goals
CREATE TABLE IF NOT EXISTS score_goals (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_score INTEGER NOT NULL CHECK (target_score >= 300 AND target_score <= 850),
    target_date TIMESTAMP WITH TIME ZONE NOT NULL,
    current_score INTEGER NOT NULL,
    progress NUMERIC(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    strategies TEXT[] DEFAULT '{}',
    milestones JSONB DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create score_alerts table for notifications
CREATE TABLE IF NOT EXISTS score_alerts (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('score_increase', 'score_decrease', 'new_account', 'inquiry', 'negative_item', 'goal_progress')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'success', 'error')),
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_scores_user_id ON credit_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_bureau ON credit_scores(bureau);
CREATE INDEX IF NOT EXISTS idx_credit_scores_report_date ON credit_scores(report_date);
CREATE INDEX IF NOT EXISTS idx_credit_scores_user_bureau_date ON credit_scores(user_id, bureau, report_date DESC);

CREATE INDEX IF NOT EXISTS idx_score_goals_user_id ON score_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_score_goals_status ON score_goals(status);
CREATE INDEX IF NOT EXISTS idx_score_goals_target_date ON score_goals(target_date);

CREATE INDEX IF NOT EXISTS idx_score_alerts_user_id ON score_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_score_alerts_is_read ON score_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_score_alerts_type ON score_alerts(type);
CREATE INDEX IF NOT EXISTS idx_score_alerts_created_at ON score_alerts(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for credit_scores
CREATE POLICY "Users can view their own credit scores" ON credit_scores
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit scores" ON credit_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit scores" ON credit_scores
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit scores" ON credit_scores
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for score_goals
CREATE POLICY "Users can view their own score goals" ON score_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own score goals" ON score_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own score goals" ON score_goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own score goals" ON score_goals
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for score_alerts
CREATE POLICY "Users can view their own score alerts" ON score_alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own score alerts" ON score_alerts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own score alerts" ON score_alerts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own score alerts" ON score_alerts
    FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updated_at timestamp
CREATE OR REPLACE FUNCTION update_score_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_score_goals_updated_at
    BEFORE UPDATE ON score_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_score_goals_updated_at();

-- Grant permissions
GRANT ALL ON credit_scores TO authenticated;
GRANT SELECT ON credit_scores TO anon;

GRANT ALL ON score_goals TO authenticated;
GRANT SELECT ON score_goals TO anon;

GRANT ALL ON score_alerts TO authenticated;
GRANT SELECT ON score_alerts TO anon;

-- Create a view for score trends
CREATE OR REPLACE VIEW score_trends AS
SELECT 
    user_id,
    bureau,
    score,
    report_date,
    LAG(score) OVER (PARTITION BY user_id, bureau ORDER BY report_date) as previous_score,
    score - LAG(score) OVER (PARTITION BY user_id, bureau ORDER BY report_date) as score_change,
    EXTRACT(DAYS FROM report_date - LAG(report_date) OVER (PARTITION BY user_id, bureau ORDER BY report_date)) as days_since_last
FROM credit_scores
ORDER BY user_id, bureau, report_date DESC;

-- Grant access to the view
GRANT SELECT ON score_trends TO authenticated;