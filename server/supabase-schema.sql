-- ═══════════════════════════════════════════════════════
-- TENX Track Learning — Supabase PostgreSQL Schema v3
-- 
-- TABLE MAP (for easy reference):
--   profiles              → User profile (username, bio, avatar, theme, join date)
--   user_daily_tasks      → Daily tasks list (JSONB array)
--   user_courses          → Courses & curriculum (JSONB array)
--   user_research_papers  → Research papers tracking (JSONB array)
--   user_study_sessions   → Study session logs (JSONB array)
--   user_bookmarks        → Bookmarked articles (JSONB array)
--   user_activity_log     → Daily activity history (JSONB array)
--   user_streak_data      → Current streak info (JSONB object)
--   user_profile_prefs    → Profile preferences (JSONB object)
--   user_news_read        → Read article IDs (JSONB array)
--   user_resources        → Uploaded files/documents (JSONB array)
--   news_article_cache    → Cached GNews articles (JSONB, date-keyed)
--
-- Run this in Supabase SQL Editor after creating project
-- ═══════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════
-- 1. PROFILES — extends Supabase auth.users
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT NOT NULL DEFAULT '',
    bio TEXT DEFAULT '',
    profile_image TEXT DEFAULT '',
    theme TEXT DEFAULT 'dark',         -- 'dark' or 'light'
    color_theme TEXT DEFAULT '#6366f1', -- accent color hex
    date_joined TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, date_joined)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════
-- 2. USER DATA TABLES — JSONB blob per user per category
-- ═══════════════════════════════════════════════════════

-- Daily Tasks: [{id, name, description, date, priority, completed, ...}]
CREATE TABLE IF NOT EXISTS user_daily_tasks (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses: [{id, name, description, topics: [{name, subtopics, resources}], ...}]
CREATE TABLE IF NOT EXISTS user_courses (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research Papers: [{id, name, author, completionPercentage, ...}]
CREATE TABLE IF NOT EXISTS user_research_papers (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study Sessions: [{id, date, totalMinutes, ...}]
CREATE TABLE IF NOT EXISTS user_study_sessions (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookmarks: [{id, title, url, category, ...}]
CREATE TABLE IF NOT EXISTS user_bookmarks (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log: [{date, tasks, curriculum, papers, resources, articlesRead}]
CREATE TABLE IF NOT EXISTS user_activity_log (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Streak Data: {count, lastDate}
CREATE TABLE IF NOT EXISTS user_streak_data (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profile Preferences: {displayName, bio, profileImage, ...}
CREATE TABLE IF NOT EXISTS user_profile_prefs (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- News Read Tracking: [articleId1, articleId2, ...]
CREATE TABLE IF NOT EXISTS user_news_read (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uploaded Resources: [{id, fileName, fileType, base64Data, courseId, topicId, ...}]
CREATE TABLE IF NOT EXISTS user_resources (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- 3. CACHE TABLES
-- ═══════════════════════════════════════════════════════

-- News Article Cache (server-side, date-keyed)
CREATE TABLE IF NOT EXISTS news_article_cache (
    cache_date DATE PRIMARY KEY,
    articles JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- 4. ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_research_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streak_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_news_read ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_resources ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- Generic RLS policy for all user data tables
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'user_daily_tasks', 'user_courses', 'user_research_papers',
        'user_study_sessions', 'user_bookmarks', 'user_activity_log',
        'user_streak_data', 'user_profile_prefs', 'user_news_read',
        'user_resources'
    ] LOOP
        EXECUTE format('
            CREATE POLICY "Users can view own data" ON %I
                FOR SELECT USING (auth.uid() = user_id);
            CREATE POLICY "Users can insert own data" ON %I
                FOR INSERT WITH CHECK (auth.uid() = user_id);
            CREATE POLICY "Users can update own data" ON %I
                FOR UPDATE USING (auth.uid() = user_id);
            CREATE POLICY "Users can delete own data" ON %I
                FOR DELETE USING (auth.uid() = user_id);
        ', tbl, tbl, tbl, tbl);
    END LOOP;
END
$$;

-- News cache: public read, service role write
ALTER TABLE news_article_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read news cache" ON news_article_cache FOR SELECT USING (true);
CREATE POLICY "Service role can write news cache" ON news_article_cache FOR ALL USING (true);

-- ═══════════════════════════════════════════════════════
-- 5. MIGRATION from old table names (if needed)
-- Run these ONLY if you had the old schema:
-- ═══════════════════════════════════════════════════════
-- INSERT INTO user_daily_tasks SELECT * FROM user_data_tasks ON CONFLICT DO NOTHING;
-- INSERT INTO user_courses SELECT * FROM user_data_courses ON CONFLICT DO NOTHING;
-- INSERT INTO user_research_papers SELECT * FROM user_data_papers ON CONFLICT DO NOTHING;
-- INSERT INTO user_study_sessions SELECT * FROM user_data_sessions ON CONFLICT DO NOTHING;
-- INSERT INTO user_bookmarks SELECT * FROM user_data_bookmarks ON CONFLICT DO NOTHING;
-- INSERT INTO user_activity_log SELECT * FROM user_data_activity ON CONFLICT DO NOTHING;
-- INSERT INTO user_streak_data SELECT * FROM user_data_streak ON CONFLICT DO NOTHING;
-- INSERT INTO user_profile_prefs SELECT * FROM user_data_profile ON CONFLICT DO NOTHING;
-- INSERT INTO user_news_read SELECT * FROM user_data_newsread ON CONFLICT DO NOTHING;
