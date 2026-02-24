# TENX Track Learning — Implementation Plan

## Overview
Website Name: **TENX Track Learning**
Logo: **HI10X Tech** (text-based, bg+text color changes with theme)

---

## Phase 1: Database Schema & Backend (Foundation)

### 1.1 — New Supabase Schema (`supabase-schema-v3.sql`)
Redesign from JSONB blobs to proper relational tables:

| Table | Columns | Keys |
|-------|---------|------|
| `profiles` | id (PK, FK→auth.users), username, email, bio, profile_image, theme, color_theme, date_joined, created_at, updated_at | PK: id |
| `daily_tasks` | id (PK, UUID), user_id (FK), name, description, priority, date, start_time, end_time, completed, completed_date, created_at | PK: id, FK: user_id |
| `courses` | id (PK, UUID), user_id (FK), name, description, priority, start_date, end_date, created_at, updated_at | PK: id, FK: user_id |
| `course_topics` | id (PK, UUID), course_id (FK), name, priority, date, start_time, end_time, completed, completed_date, sort_order, created_at | PK: id, FK: course_id |
| `course_subtopics` | id (PK, UUID), topic_id (FK), name, priority, date, start_time, end_time, completed, completed_date, sort_order, created_at | PK: id, FK: topic_id |
| `resources` | id (PK, UUID), topic_id (FK, nullable), subtopic_id (FK, nullable), paper_id (FK, nullable), name, type, url, created_at | PK: id |
| `research_papers` | id (PK, UUID), user_id (FK), name, description, author, priority, start_date, end_date, paper_url, main_resource, completion_pct, created_at, updated_at | PK: id, FK: user_id |
| `news_articles` | id (PK, UUID), title, description, date, publisher, url, image, category, created_at | PK: id, UNIQUE: url |
| `user_news` | user_id (FK), article_id (FK), bookmarked, read, created_at | PK: (user_id, article_id) |
| `quotes_cache` | id (PK, serial), text, author, category, type, source, fetched_at | PK: id |
| `news_cache` | cache_date (PK, DATE), articles (JSONB), fetch_count, updated_at | PK: cache_date |
| `user_streaks` | user_id (PK, FK), count, best_count, last_date, updated_at | PK: user_id |
| `user_activity` | id (PK, UUID), user_id (FK), type, count, date, created_at | PK: id, FK: user_id |
| `study_sessions` | id (PK, UUID), user_id (FK), total_minutes, date, created_at | PK: id, FK: user_id |
| `milestones` | id (PK, UUID), user_id (FK), milestone_key, achieved, achieved_at | PK: id, FK: user_id |

### 1.2 — Update `.env` with all config
- GROQ_API_KEY, GROQ_MODEL
- GNEWS_API_KEY
- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
- FRONTEND_URL, BACKEND_URL (PORT)
- WEBSITE_NAME=TENX Track Learning
- LOGO_TEXT=HI10X Tech

### 1.3 — Rewrite `server/index.js`
- Keep ONLY 2 external APIs: Groq + GNews
- Groq: Timer-based (10 calls/day), auto-fetch in backend, cache result
- GNews: Timer-based (5 calls/day), stack news, bookmark persistence
- CRUD endpoints for all relational tables
- Fix email verification (use Supabase auth properly)
- Profile CRUD with image upload support
- Password update endpoint

---

## Phase 2: Frontend Config & Theme

### 2.1 — Update `config.js`
- APP_NAME = 'TENX Track Learning'
- APP_LOGO_TEXT = 'HI10X Tech'

### 2.2 — Update ThemeContext
- Already has 18 accent colors ✅
- Already has dark/light toggle ✅

### 2.3 — Update `index.css`
- Add glassmorphism effects
- Add hover/touch/scroll effects
- Improve animations
- Make all components use consistent glass effect

---

## Phase 3: Dashboard Page Changes

### 3.1 — Right side of heatmap layout (6 items):
**Row 1 (4 cards in a row):**
1. Progression (Avg Completion %)
2. Day Streak
3. Day Counter (countdown timer)
4. Stopwatch

**Row 2 (2 cards in a row below):**
5. Today's Daily Task List (with times)
6. Today's Course Topics & Subtopics List (with times)

- Adjust all card sizes — no extra space, content-fitted

---

## Phase 4: Daily Tasks Page Changes

### 4.1 — Analytics row: donut + bar + heatmap
- All 3 in ONE row
- Make them smaller, compact
- Stylish, attractive, professional

---

## Phase 5: Course Page Changes

### 5.1 — Analytics row: donut + bar + heatmap
- Same as Daily Tasks — compact row

### 5.2 — Course cards
- Small square/rectangle cards
- Sized according to content

### 5.3 — Word Frequency Chart in CourseDetail
- New chart component
- Analyze words from topic names + subtopic names
- Word cloud / frequency visualization
- Size of words based on frequency

---

## Phase 6: Profile Page Enhancements

### 6.1 — Profile data CRUD
- Edit/delete/update profile data
- Change profile image (URL or upload to Supabase storage)
- Save changes to Supabase

### 6.2 — Tracking cards (5-6)
- Tasks Done, Study Hours, Courses, Papers, Streak, Progress

### 6.3 — Milestones (100+, progressive)
- Start with first 10 basic milestones
- When all 10 are achieved → show next 10 (higher tier)
- Each tier progressively harder

### 6.4 — Theme switching
- Light/Dark toggle ✅ (already exists)

### 6.5 — Color theme (15-20 combinations)
- Already has 18 accent colors ✅

### 6.6 — Account management
- Sign out ✅
- Update password ✅
- Profile edit ✅

---

## Phase 7: API Cleanup & Fixes

### 7.1 — Groq API
- Use openai/gpt-oss-120b model
- Timer: 10 calls/day, auto-fetch in backend
- Cache quotes, serve from cache between fetches

### 7.2 — GNews API
- 5 calls/day limit
- Stack new news below existing
- Bookmark news persists even after rotation
- Next day: only bookmarked + new fetched

### 7.3 — Error handling
- Graceful fallback if API fails
- Serve from previous cache

### 7.4 — Fix email verification
- Supabase email verification flow

---

## Phase 8: Visual Polish

### 8.1 — Modern effects
- Glassmorphism cards
- Hover animations
- Smooth scrolling
- Touch-friendly
- Transparent/frosted glass effect
- Micro-animations

### 8.2 — Logo
- HI10X Tech text logo
- Background and text color change with theme

### 8.3 — Website name
- TENX Track Learning

---

## Implementation Order

1. ✅ Schema SQL file
2. ✅ .env updates  
3. ✅ Backend server rewrite
4. ✅ Frontend config update
5. ✅ Dashboard layout fix
6. ✅ DailyTasks analytics compact
7. ✅ Courses analytics compact + card sizing
8. ✅ CourseDetail word frequency chart
9. ✅ Profile page enhancements
10. ✅ CSS polish (glass, animations, effects)
11. ✅ Sidebar logo update
