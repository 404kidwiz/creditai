-- Create dispute_letters table
CREATE TABLE IF NOT EXISTS dispute_letters (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    negative_item_id TEXT NOT NULL,
    letter_type TEXT NOT NULL CHECK (letter_type IN ('inaccurate_information', 'identity_theft', 'outdated_information', 'not_mine', 'paid_in_full', 'settled', 'validation_request')),
    creditor_name TEXT NOT NULL,
    creditor_address TEXT,
    dispute_reason TEXT NOT NULL,
    legal_basis TEXT NOT NULL,
    supporting_documents TEXT[] DEFAULT '{}',
    letter_content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'sent', 'responded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dispute_letters_user_id ON dispute_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_letters_status ON dispute_letters(status);
CREATE INDEX IF NOT EXISTS idx_dispute_letters_created_at ON dispute_letters(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE dispute_letters ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own dispute letters" ON dispute_letters
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dispute letters" ON dispute_letters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dispute letters" ON dispute_letters
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dispute letters" ON dispute_letters
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_dispute_letters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dispute_letters_updated_at
    BEFORE UPDATE ON dispute_letters
    FOR EACH ROW
    EXECUTE FUNCTION update_dispute_letters_updated_at();

-- Grant permissions
GRANT ALL ON dispute_letters TO authenticated;
GRANT SELECT ON dispute_letters TO anon;