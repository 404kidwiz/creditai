-- =============================================
-- CreditAI Database Schema - Complete Migration
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. PROFILES TABLE (extends auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium')),
    subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================
-- 2. CREDIT REPORTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS credit_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    bureau TEXT NOT NULL CHECK (bureau IN ('experian', 'equifax', 'transunion')),
    report_date DATE NOT NULL,
    score INTEGER CHECK (score >= 300 AND score <= 850),
    raw_data JSONB,
    ai_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, bureau, report_date)
);

-- =============================================
-- 3. NEGATIVE ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS negative_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    credit_report_id UUID REFERENCES credit_reports(id) ON DELETE SET NULL,
    creditor_name TEXT NOT NULL,
    account_number TEXT,
    balance DECIMAL(12,2),
    status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'disputing', 'resolved', 'verified')),
    dispute_reason TEXT,
    impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================
-- 4. DISPUTES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    negative_item_id UUID NOT NULL REFERENCES negative_items(id) ON DELETE CASCADE,
    dispute_reason TEXT NOT NULL,
    letter_content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'investigating', 'resolved', 'rejected')),
    bureau_response TEXT,
    resolution_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================
-- 5. DOCUMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('identity', 'income', 'bank_statement', 'credit_report', 'dispute_letter', 'response_letter', 'other')),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    ocr_text TEXT,
    ai_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================
-- 6. USER PROGRESS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    achievements JSONB DEFAULT '[]'::jsonb,
    streak_days INTEGER NOT NULL DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id)
);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_negative_items_updated_at 
    BEFORE UPDATE ON negative_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at 
    BEFORE UPDATE ON disputes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at 
    BEFORE UPDATE ON user_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);

-- Credit reports indexes
CREATE INDEX IF NOT EXISTS idx_credit_reports_user_id ON credit_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_reports_bureau ON credit_reports(bureau);
CREATE INDEX IF NOT EXISTS idx_credit_reports_report_date ON credit_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_credit_reports_score ON credit_reports(score);

-- Negative items indexes
CREATE INDEX IF NOT EXISTS idx_negative_items_user_id ON negative_items(user_id);
CREATE INDEX IF NOT EXISTS idx_negative_items_credit_report_id ON negative_items(credit_report_id);
CREATE INDEX IF NOT EXISTS idx_negative_items_status ON negative_items(status);
CREATE INDEX IF NOT EXISTS idx_negative_items_impact_score ON negative_items(impact_score);

-- Disputes indexes
CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_negative_item_id ON disputes(negative_item_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_resolution_date ON disputes(resolution_date);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- User progress indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_level ON user_progress(level);
CREATE INDEX IF NOT EXISTS idx_user_progress_points ON user_progress(points);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE negative_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Credit reports RLS policies
CREATE POLICY "Users can view their own credit reports" ON credit_reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit reports" ON credit_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit reports" ON credit_reports
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit reports" ON credit_reports
    FOR DELETE USING (auth.uid() = user_id);

-- Negative items RLS policies
CREATE POLICY "Users can view their own negative items" ON negative_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own negative items" ON negative_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own negative items" ON negative_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own negative items" ON negative_items
    FOR DELETE USING (auth.uid() = user_id);

-- Disputes RLS policies
CREATE POLICY "Users can view their own disputes" ON disputes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own disputes" ON disputes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own disputes" ON disputes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own disputes" ON disputes
    FOR DELETE USING (auth.uid() = user_id);

-- Documents RLS policies
CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON documents
    FOR DELETE USING (auth.uid() = user_id);

-- User progress RLS policies
CREATE POLICY "Users can view their own progress" ON user_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON user_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON user_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to create initial user profile
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name, phone, subscription_tier, subscription_status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        'free',
        'active'
    );
    
    -- Create initial user progress
    INSERT INTO user_progress (user_id, points, level, achievements, streak_days)
    VALUES (NEW.id, 0, 1, '[]'::jsonb, 0);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically create profile when user signs up
CREATE TRIGGER create_user_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Function to update user progress when disputes are resolved
CREATE OR REPLACE FUNCTION update_user_progress_on_dispute_resolution()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        UPDATE user_progress 
        SET points = points + 50,
            last_activity = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update progress when disputes are resolved
CREATE TRIGGER update_progress_on_dispute_resolution
    AFTER UPDATE ON disputes
    FOR EACH ROW EXECUTE FUNCTION update_user_progress_on_dispute_resolution();

-- =============================================
-- INITIAL DATA SETUP
-- =============================================

-- Insert default achievements
INSERT INTO user_progress (user_id, achievements) 
SELECT id, '[
    {"id": "first_report", "name": "First Report", "description": "Upload your first credit report", "earned": false},
    {"id": "first_dispute", "name": "First Dispute", "description": "File your first dispute", "earned": false},
    {"id": "dispute_master", "name": "Dispute Master", "description": "Resolve 10 disputes", "earned": false},
    {"id": "credit_improver", "name": "Credit Improver", "description": "Improve credit score by 50 points", "earned": false},
    {"id": "document_collector", "name": "Document Collector", "description": "Upload 5 documents", "earned": false}
]'::jsonb
FROM profiles 
WHERE NOT EXISTS (SELECT 1 FROM user_progress WHERE user_id = profiles.id)
ON CONFLICT (user_id) DO NOTHING;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users with credit repair specific fields';
COMMENT ON TABLE credit_reports IS 'Credit reports from different bureaus with AI analysis';
COMMENT ON TABLE negative_items IS 'Negative items found in credit reports that can be disputed';
COMMENT ON TABLE disputes IS 'Dispute cases for negative items with tracking and responses';
COMMENT ON TABLE documents IS 'User uploaded documents with OCR and AI analysis';
COMMENT ON TABLE user_progress IS 'Gamification progress tracking with points, levels, and achievements';

-- =============================================
-- SCHEMA COMPLETE
-- ============================================= 