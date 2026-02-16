-- ═══════════════════════════════════════════════════════
-- TenX Dashboard — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor after creating project
-- ═══════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Profiles (extends Supabase auth.users) ───
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT NOT NULL DEFAULT '',
    bio TEXT DEFAULT '',
    profile_image TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Daily Tasks ───
CREATE TABLE IF NOT EXISTS daily_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed BOOLEAN DEFAULT FALSE,
    completed_date DATE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    category TEXT DEFAULT '',
    description TEXT DEFAULT '',
    start_time TEXT DEFAULT '',
    end_time TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_tasks_user ON daily_tasks(user_id);
CREATE INDEX idx_daily_tasks_date ON daily_tasks(user_id, date);

-- ─── Courses ───
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_courses_user ON courses(user_id);

-- ─── Topics (belong to course) ───
CREATE TABLE IF NOT EXISTS topics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_date DATE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    date DATE,
    start_time TEXT DEFAULT '',
    end_time TEXT DEFAULT '',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_topics_course ON topics(course_id);

-- ─── Subtopics (belong to topic) ───
CREATE TABLE IF NOT EXISTS subtopics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_date DATE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    date DATE,
    start_time TEXT DEFAULT '',
    end_time TEXT DEFAULT '',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subtopics_topic ON subtopics(topic_id);

-- ─── Resources (attached to topic or subtopic) ───
CREATE TABLE IF NOT EXISTS resources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE NOT NULL,
    subtopic_id UUID REFERENCES subtopics(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'pdf' CHECK (type IN ('pdf', 'video', 'doc', 'link', 'other')),
    url TEXT DEFAULT '',
    file_size BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resources_topic ON resources(topic_id);
CREATE INDEX idx_resources_subtopic ON resources(subtopic_id);

-- ─── Research Papers ───
CREATE TABLE IF NOT EXISTS research_papers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    author TEXT DEFAULT '',
    description TEXT DEFAULT '',
    paper_url TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    completion_percentage INT DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    start_date DATE,
    target_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_papers_user ON research_papers(user_id);

-- ─── Paper Progress History ───
CREATE TABLE IF NOT EXISTS paper_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    paper_id UUID REFERENCES research_papers(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    percentage INT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(paper_id, date)
);

CREATE INDEX idx_paper_progress ON paper_progress(paper_id);

-- ─── Paper Additional Resources ───
CREATE TABLE IF NOT EXISTS paper_resources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    paper_id UUID REFERENCES research_papers(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'link',
    url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_paper_resources ON paper_resources(paper_id);

-- ─── Study Sessions ───
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    total_minutes INT DEFAULT 0,
    label TEXT DEFAULT '',
    type TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON study_sessions(user_id);
CREATE INDEX idx_sessions_date ON study_sessions(user_id, date);

-- ─── Bookmarks (saved news articles) ───
CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    url TEXT DEFAULT '',
    image TEXT DEFAULT '',
    source TEXT DEFAULT '',
    published_at TIMESTAMPTZ,
    bookmarked_date DATE DEFAULT CURRENT_DATE,
    visited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, user_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);

-- ─── News Read Tracking ───
CREATE TABLE IF NOT EXISTS news_read (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    article_id TEXT NOT NULL,
    read_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

CREATE INDEX idx_news_read_user ON news_read(user_id);

-- ─── Activity Log ───
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    tasks_completed INT DEFAULT 0,
    curriculum_completed INT DEFAULT 0,
    papers_updated INT DEFAULT 0,
    articles_read INT DEFAULT 0,
    resources_added INT DEFAULT 0,
    study_minutes INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE INDEX idx_activity_user_date ON activity_log(user_id, date);

-- ─── Streaks ───
CREATE TABLE IF NOT EXISTS streaks (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    count INT DEFAULT 0,
    last_date DATE,
    best_count INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── News Cache (server-side) ───
CREATE TABLE IF NOT EXISTS news_cache (
    id SERIAL PRIMARY KEY,
    cache_date DATE DEFAULT CURRENT_DATE UNIQUE,
    articles JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ Row Level Security ═══
-- Enable RLS on all user-data tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_read ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own data
CREATE POLICY "Users own profiles" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own tasks" ON daily_tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own courses" ON courses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own topics" ON topics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own subtopics" ON subtopics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own resources" ON resources FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own papers" ON research_papers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own paper progress" ON paper_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own paper resources" ON paper_resources FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own sessions" ON study_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own bookmarks" ON bookmarks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own news read" ON news_read FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own activity" ON activity_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own streaks" ON streaks FOR ALL USING (auth.uid() = user_id);

-- News cache is public (read by server)
ALTER TABLE news_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "News cache public read" ON news_cache FOR SELECT USING (true);
CREATE POLICY "News cache service insert" ON news_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "News cache service update" ON news_cache FOR UPDATE USING (true);
