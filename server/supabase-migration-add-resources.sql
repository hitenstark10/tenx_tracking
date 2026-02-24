-- ═══════════════════════════════════════════════════════
-- TENX Track Learning — Add Resources Table (Run once)
-- This adds the user_data_resources table to existing schema
-- ═══════════════════════════════════════════════════════

-- Resources table (for uploaded PDFs, videos, docs)
CREATE TABLE IF NOT EXISTS user_data_resources (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_data_resources ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view own resources"
    ON user_data_resources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own resources"
    ON user_data_resources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own resources"
    ON user_data_resources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own resources"
    ON user_data_resources FOR DELETE USING (auth.uid() = user_id);

-- Also add missing columns to profiles table (if not present)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS color_theme TEXT DEFAULT '#6366f1';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_joined TIMESTAMPTZ DEFAULT NOW();
