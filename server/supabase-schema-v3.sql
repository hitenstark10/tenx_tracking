-- ═══════════════════════════════════════════════════════
-- TENX Track Learning — Supabase PostgreSQL Schema v3
-- Full Relational Database (normalized tables)
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════
-- 1. PROFILES (extends Supabase auth.users)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT NOT NULL DEFAULT '',
    email TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    profile_image TEXT DEFAULT '',
    theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
    color_theme TEXT DEFAULT '#6366f1',
    date_joined TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email, date_joined)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
        NEW.email,
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
-- 2. DAILY TASKS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS daily_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIME,
    end_time TIME,
    completed BOOLEAN DEFAULT FALSE,
    completed_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_user ON daily_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_date ON daily_tasks(user_id, date);

-- ═══════════════════════════════════════════════════════
-- 3. COURSES
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_user ON courses(user_id);

-- ═══════════════════════════════════════════════════════
-- 4. COURSE TOPICS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS course_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    date DATE,
    start_time TIME,
    end_time TIME,
    completed BOOLEAN DEFAULT FALSE,
    completed_date DATE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_topics_course ON course_topics(course_id);

-- ═══════════════════════════════════════════════════════
-- 5. COURSE SUBTOPICS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS course_subtopics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES course_topics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    date DATE,
    start_time TIME,
    end_time TIME,
    completed BOOLEAN DEFAULT FALSE,
    completed_date DATE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_subtopics_topic ON course_subtopics(topic_id);

-- ═══════════════════════════════════════════════════════
-- 6. RESOURCES (for topics, subtopics, or research papers)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID REFERENCES course_topics(id) ON DELETE CASCADE,
    subtopic_id UUID REFERENCES course_subtopics(id) ON DELETE CASCADE,
    paper_id UUID, -- will reference research_papers once created
    name TEXT NOT NULL,
    type TEXT DEFAULT 'pdf' CHECK (type IN ('pdf', 'video', 'doc', 'txt', 'link', 'other')),
    url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- at least one parent FK should be set
    CONSTRAINT resources_parent_check CHECK (
        topic_id IS NOT NULL OR subtopic_id IS NOT NULL OR paper_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_resources_topic ON resources(topic_id);
CREATE INDEX IF NOT EXISTS idx_resources_subtopic ON resources(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_resources_paper ON resources(paper_id);

-- ═══════════════════════════════════════════════════════
-- 7. RESEARCH PAPERS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS research_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    author TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    start_date DATE,
    end_date DATE,
    paper_url TEXT DEFAULT '',
    main_resource TEXT DEFAULT '',
    completion_pct INTEGER DEFAULT 0 CHECK (completion_pct >= 0 AND completion_pct <= 100),
    notes TEXT DEFAULT '',
    progress_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_papers_user ON research_papers(user_id);

-- Add FK for resources -> research_papers now
ALTER TABLE resources
    DROP CONSTRAINT IF EXISTS resources_paper_id_fkey;
ALTER TABLE resources
    ADD CONSTRAINT resources_paper_id_fkey
    FOREIGN KEY (paper_id) REFERENCES research_papers(id) ON DELETE CASCADE;

-- ═══════════════════════════════════════════════════════
-- 8. NEWS ARTICLES (cached from GNews)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    date DATE,
    publisher TEXT DEFAULT '',
    url TEXT NOT NULL,
    image TEXT DEFAULT '',
    category TEXT DEFAULT 'AI' CHECK (category IN ('AI', 'ML', 'DL', 'DS')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT news_articles_url_unique UNIQUE (url)
);

CREATE INDEX IF NOT EXISTS idx_news_articles_date ON news_articles(date DESC);

-- ═══════════════════════════════════════════════════════
-- 9. USER NEWS (bookmark/read tracking per user)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_news (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
    bookmarked BOOLEAN DEFAULT FALSE,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_user_news_user ON user_news(user_id);
CREATE INDEX IF NOT EXISTS idx_user_news_bookmarked ON user_news(user_id) WHERE bookmarked = TRUE;

-- ═══════════════════════════════════════════════════════
-- 10. QUOTES CACHE (from Groq AI)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS quotes_cache (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    author TEXT DEFAULT 'Unknown',
    category TEXT DEFAULT 'AI',
    type TEXT DEFAULT 'quote' CHECK (type IN ('quote', 'fact')),
    source TEXT DEFAULT 'groq_ai',
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- 11. NEWS CACHE (date-based API call tracking)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS news_cache (
    cache_date DATE PRIMARY KEY,
    articles JSONB NOT NULL DEFAULT '[]'::jsonb,
    fetch_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- 12. USER STREAKS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    count INTEGER DEFAULT 0,
    best_count INTEGER DEFAULT 0,
    last_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- 13. USER ACTIVITY LOG
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('tasks', 'curriculum', 'papers', 'resources', 'articlesRead', 'study')),
    count INTEGER DEFAULT 1,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id, date);

-- ═══════════════════════════════════════════════════════
-- 14. STUDY SESSIONS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_minutes INTEGER NOT NULL DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id, date);

-- ═══════════════════════════════════════════════════════
-- 15. MILESTONES
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    milestone_key TEXT NOT NULL,
    achieved BOOLEAN DEFAULT FALSE,
    achieved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT milestones_user_key_unique UNIQUE (user_id, milestone_key)
);

CREATE INDEX IF NOT EXISTS idx_milestones_user ON milestones(user_id);

-- ═══════════════════════════════════════════════════════
-- LEGACY JSONB TABLES (keep for backward compatibility)
-- These can be used as fallback during migration
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_data_tasks (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_data_courses (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_data_papers (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_data_sessions (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_data_bookmarks (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_data_activity (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_data_streak (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_data_profile (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_data_newsread (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- Legacy tables
ALTER TABLE user_data_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data_streak ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data_newsread ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User-owned tables (standard CRUD policies)
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'daily_tasks', 'courses', 'research_papers',
        'user_news', 'user_streaks', 'user_activity',
        'study_sessions', 'milestones'
    ] LOOP
        EXECUTE format('
            CREATE POLICY "%1$s_select" ON %1$I FOR SELECT USING (auth.uid() = user_id);
            CREATE POLICY "%1$s_insert" ON %1$I FOR INSERT WITH CHECK (auth.uid() = user_id);
            CREATE POLICY "%1$s_update" ON %1$I FOR UPDATE USING (auth.uid() = user_id);
            CREATE POLICY "%1$s_delete" ON %1$I FOR DELETE USING (auth.uid() = user_id);
        ', tbl);
    END LOOP;
END
$$;

-- Course topics: access through course ownership
CREATE POLICY "course_topics_select" ON course_topics FOR SELECT
    USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_topics.course_id AND courses.user_id = auth.uid()));
CREATE POLICY "course_topics_insert" ON course_topics FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_topics.course_id AND courses.user_id = auth.uid()));
CREATE POLICY "course_topics_update" ON course_topics FOR UPDATE
    USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_topics.course_id AND courses.user_id = auth.uid()));
CREATE POLICY "course_topics_delete" ON course_topics FOR DELETE
    USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_topics.course_id AND courses.user_id = auth.uid()));

-- Course subtopics: access through topic -> course ownership
CREATE POLICY "course_subtopics_select" ON course_subtopics FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM course_topics ct
        JOIN courses c ON c.id = ct.course_id
        WHERE ct.id = course_subtopics.topic_id AND c.user_id = auth.uid()
    ));
CREATE POLICY "course_subtopics_insert" ON course_subtopics FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM course_topics ct
        JOIN courses c ON c.id = ct.course_id
        WHERE ct.id = course_subtopics.topic_id AND c.user_id = auth.uid()
    ));
CREATE POLICY "course_subtopics_update" ON course_subtopics FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM course_topics ct
        JOIN courses c ON c.id = ct.course_id
        WHERE ct.id = course_subtopics.topic_id AND c.user_id = auth.uid()
    ));
CREATE POLICY "course_subtopics_delete" ON course_subtopics FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM course_topics ct
        JOIN courses c ON c.id = ct.course_id
        WHERE ct.id = course_subtopics.topic_id AND c.user_id = auth.uid()
    ));

-- Resources: accessible if user owns the parent entity
CREATE POLICY "resources_select" ON resources FOR SELECT USING (true);
CREATE POLICY "resources_insert" ON resources FOR INSERT WITH CHECK (true);
CREATE POLICY "resources_update" ON resources FOR UPDATE USING (true);
CREATE POLICY "resources_delete" ON resources FOR DELETE USING (true);

-- News articles: public read
CREATE POLICY "news_articles_select" ON news_articles FOR SELECT USING (true);
CREATE POLICY "news_articles_insert" ON news_articles FOR INSERT WITH CHECK (true);

-- Quotes cache: public read
CREATE POLICY "quotes_cache_select" ON quotes_cache FOR SELECT USING (true);
CREATE POLICY "quotes_cache_insert" ON quotes_cache FOR INSERT WITH CHECK (true);

-- News cache: public read, service role write
CREATE POLICY "news_cache_select" ON news_cache FOR SELECT USING (true);
CREATE POLICY "news_cache_all" ON news_cache FOR ALL USING (true);

-- Legacy JSONB tables
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'user_data_tasks', 'user_data_courses', 'user_data_papers',
        'user_data_sessions', 'user_data_bookmarks', 'user_data_activity',
        'user_data_streak', 'user_data_profile', 'user_data_newsread'
    ] LOOP
        EXECUTE format('
            CREATE POLICY "%1$s_select" ON %1$I FOR SELECT USING (auth.uid() = user_id);
            CREATE POLICY "%1$s_insert" ON %1$I FOR INSERT WITH CHECK (auth.uid() = user_id);
            CREATE POLICY "%1$s_update" ON %1$I FOR UPDATE USING (auth.uid() = user_id);
            CREATE POLICY "%1$s_delete" ON %1$I FOR DELETE USING (auth.uid() = user_id);
        ', tbl);
    END LOOP;
END
$$;

-- ═══════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'profiles', 'daily_tasks', 'courses', 'course_topics',
        'course_subtopics', 'research_papers', 'user_streaks'
    ] LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS set_updated_at ON %I;
            CREATE TRIGGER set_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        ', tbl, tbl);
    END LOOP;
END
$$;
