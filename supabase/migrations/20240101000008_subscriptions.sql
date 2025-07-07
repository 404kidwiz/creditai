-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL CHECK (plan IN ('basic', 'pro', 'premium')),
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    usage JSONB DEFAULT '{"disputeLetters": 0, "creditReports": 0, "scoreUpdates": 0}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create payment_history table for tracking payments
CREATE TABLE IF NOT EXISTS payment_history (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'canceled')),
    payment_method TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create billing_addresses table
CREATE TABLE IF NOT EXISTS billing_addresses (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL,
    line1 TEXT NOT NULL,
    line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'US',
    is_default BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create usage_logs table for detailed tracking
CREATE TABLE IF NOT EXISTS usage_logs (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_addresses_user_id ON billing_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_addresses_customer ON billing_addresses(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_addresses_default ON billing_addresses(is_default);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_subscription ON usage_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_feature ON usage_logs(feature);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage subscriptions" ON subscriptions
    FOR ALL USING (true); -- This will be restricted by service role

-- Create RLS policies for payment_history
CREATE POLICY "Users can view their own payment history" ON payment_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage payment history" ON payment_history
    FOR ALL USING (true); -- This will be restricted by service role

-- Create RLS policies for billing_addresses
CREATE POLICY "Users can view their own billing addresses" ON billing_addresses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own billing addresses" ON billing_addresses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own billing addresses" ON billing_addresses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own billing addresses" ON billing_addresses
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for usage_logs
CREATE POLICY "Users can view their own usage logs" ON usage_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage usage logs" ON usage_logs
    FOR ALL USING (true); -- This will be restricted by service role

-- Create triggers for updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscriptions_updated_at();

CREATE OR REPLACE FUNCTION update_billing_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billing_addresses_updated_at
    BEFORE UPDATE ON billing_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_billing_addresses_updated_at();

-- Grant permissions
GRANT ALL ON subscriptions TO authenticated;
GRANT SELECT ON subscriptions TO anon;

GRANT ALL ON payment_history TO authenticated;
GRANT SELECT ON payment_history TO anon;

GRANT ALL ON billing_addresses TO authenticated;
GRANT SELECT ON billing_addresses TO anon;

GRANT ALL ON usage_logs TO authenticated;
GRANT SELECT ON usage_logs TO anon;

-- Create a view for subscription analytics
CREATE OR REPLACE VIEW subscription_analytics AS
SELECT 
    s.plan,
    s.status,
    COUNT(*) as subscriber_count,
    SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_count,
    AVG(EXTRACT(DAYS FROM (s.current_period_end - s.current_period_start))) as avg_period_days,
    AVG((s.usage->>'disputeLetters')::numeric) as avg_dispute_letters,
    AVG((s.usage->>'creditReports')::numeric) as avg_credit_reports
FROM subscriptions s
GROUP BY s.plan, s.status
ORDER BY s.plan, s.status;

-- Grant access to the view
GRANT SELECT ON subscription_analytics TO authenticated;