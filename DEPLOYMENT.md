# TenX Dashboard - Full Stack Deployment Guide

> Step-by-step instructions to deploy the AI/ML Learning Tracker to the web for **FREE**.

---

## Architecture Overview

| Component  | Technology              | Free Platform              |
|-----------|------------------------|---------------------------|
| Frontend  | React + Vite            | **Vercel** or **Netlify** |
| Backend   | Express.js              | **Render** or **Railway** |
| Database  | Supabase PostgreSQL     | **Supabase Free Tier**    |
| Auth      | Supabase Auth           | **Supabase Free Tier**    |
| AI Quotes | Groq AI (LLaMA 3.1)     | **Groq Free Tier**        |
| News API  | GNews (10 fetches/day)  | **GNews Free Tier**       |
| API Docs  | Swagger-like HTML/JSON  | Built into backend        |
| Fallback DB | SQLite (local dev)   | Included with backend     |

---

## Step 1: Set Up Supabase (Database + Auth)

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → Sign up (free)
2. Click **"New Project"**
3. Set:
   - **Project name**: `tenx-dashboard`
   - **Database password**: (save this somewhere safe)
   - **Region**: Choose nearest to your users
4. Wait for the project to be provisioned (~2 minutes)

### 1.2 Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `server/supabase-schema.sql`
4. Paste into the SQL editor
5. Click **"Run"**
6. You should see all tables created: `profiles`, `daily_tasks`, `courses`, `topics`, `subtopics`, `resources`, `research_papers`, `paper_progress`, `paper_resources`, `study_sessions`, `bookmarks`, `news_read`, `activity_log`, `streaks`, `news_cache`

### 1.3 Get Your API Keys

1. Go to **Settings → API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon (public) key**: Used by frontend
   - **service_role key**: Used by backend (keep secret!)

### 1.4 Enable Email Auth (Optional)

1. Go to **Authentication → Providers**
2. Email provider is enabled by default
3. Optionally disable "Confirm email" for easier testing

---

## Step 2: Prepare the Backend

### 2.1 Configure Environment Variables

Create a `.env` file in the `server/` directory:

```env
# Database
DB_MODE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Server
PORT=5000
FRONTEND_URL=https://your-frontend.vercel.app

# Groq AI (for dynamic quotes)
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.1-70b-versatile

# News (optional, 10 fetches/day)
GNEWS_API_KEY=your-gnews-api-key
```

### 2.2 Test Locally

```bash
cd server
npm install
node index.js
```

Visit `http://localhost:5000` to see the API docs page. Test these endpoints:

```bash
# Health check
curl http://localhost:5000/api/health

# Random quote
curl http://localhost:5000/api/quotes/random

# Daily news
curl http://localhost:5000/api/news

# JSON docs
curl http://localhost:5000/docs
```

### 2.3 (Optional) For local dev without Supabase:

Set `DB_MODE=sqlite` in `.env` — the server will use a local SQLite database.

---

## Step 3: Prepare the Frontend

### 3.1 Configure API Base URL

Create `src/config.js`:

```js
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

### 3.2 Update API Calls

Replace hardcoded `http://localhost:5000` in `Dashboard.jsx` and `Trending.jsx` with:

```js
import { API_BASE } from '../config';
// Then use: fetch(`${API_BASE}/api/quotes/random`)
```

### 3.3 Build

```bash
npm run build
```

---

## Step 4: Deploy Backend to Render (FREE)

### 4.1 Push to GitHub

```bash
cd server
git init
git add .
git commit -m "TenX backend"
git remote add origin https://github.com/YOUR_USER/tenx-backend.git
git push -u origin main
```

### 4.2 Create Web Service on Render

1. Go to [render.com](https://render.com) → Sign up → Connect GitHub
2. Click **"New" → "Web Service"**
3. Select your backend repo
4. Configure:
   - **Name**: `tenx-api`
   - **Root Directory**: (leave blank if server repo, or `server` if monorepo)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: `Free`

### 4.3 Set Environment Variables on Render

| Variable | Value |
|----------|-------|
| `DB_MODE` | `supabase` |
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `your-service-role-key` |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `GROQ_API_KEY` | `your-groq-api-key` |
| `GROQ_MODEL` | `llama-3.1-70b-versatile` |
| `GNEWS_API_KEY` | (optional) |

### 4.4 Deploy

Click **Deploy**. Your backend will be at: `https://tenx-api.onrender.com`

> **Note:** Render free tier sleeps after 15 min inactivity. Use [cron-job.org](https://cron-job.org) to ping `/api/health` every 14 minutes.

---

## Step 5: Deploy Frontend to Vercel (FREE)

### 5.1 Push to GitHub

```bash
# From project root (not server/)
git init
git add .
git commit -m "TenX frontend"
git remote add origin https://github.com/YOUR_USER/tenx-dashboard.git
git push -u origin main
```

### 5.2 Import on Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up → Connect GitHub
2. **"New Project"** → Import your frontend repo
3. Configure:
   - **Framework**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 5.3 Set Environment Variable

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://tenx-api.onrender.com` |

### 5.4 Deploy

Click **Deploy**. Your frontend will be at: `https://tenx-dashboard.vercel.app`

---

## Step 6: Connect Everything

1. Go back to **Render** → Your backend → **Environment**
2. Set `FRONTEND_URL` = `https://tenx-dashboard.vercel.app`
3. Redeploy the backend

---

## Alternative: Netlify (Frontend)

```bash
npm run build
```

1. Go to [netlify.com](https://netlify.com) → Import from GitHub
2. Set build command: `npm run build`, publish dir: `dist`
3. Add env: `VITE_API_URL=https://tenx-api.onrender.com`
4. Create `public/_redirects`: `/*  /index.html  200`

---

## Alternative: Railway (Backend)

1. [railway.app](https://railway.app) → New Project → From GitHub
2. Select server directory
3. Set env vars (same as Render)
4. Auto-deploys on push

---

## Supabase Schema Reference

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles | id, username, bio, profile_image |
| `daily_tasks` | Daily task items | user_id, name, date, completed, priority |
| `courses` | Learning courses | user_id, name, description, priority |
| `topics` | Course topics | course_id, name, completed, priority |
| `subtopics` | Topic subtopics | topic_id, name, completed |
| `resources` | Uploaded docs/media | topic_id, subtopic_id, name, type, url |
| `research_papers` | Papers tracking | user_id, title, author, completion_percentage |
| `paper_progress` | Completion history | paper_id, percentage, date |
| `paper_resources` | Paper resources | paper_id, name, type, url |
| `study_sessions` | Study time log | user_id, date, total_minutes |
| `bookmarks` | Saved articles | user_id, title, url, image |
| `news_read` | Read tracking | user_id, article_id |
| `activity_log` | Daily activity | user_id, date, tasks/curriculum/papers/articles |
| `streaks` | Streak tracking | user_id, count, best_count |
| `news_cache` | Server-side cache | cache_date, articles (JSONB) |

### Security

- All tables have **Row Level Security (RLS)** enabled
- Users can only access their own data
- Auth is handled by Supabase Auth

---

## Environment Variables Summary

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_MODE` | Yes | `supabase` or `sqlite` |
| `SUPABASE_URL` | If supabase | Project URL |
| `SUPABASE_SERVICE_KEY` | If supabase | Service role key |
| `PORT` | No | Default: 5000 |
| `FRONTEND_URL` | Yes | For CORS |
| `GROQ_API_KEY` | No | For AI-generated quotes (get from console.groq.com) |
| `GROQ_MODEL` | No | Default: llama-3.1-70b-versatile |
| `GNEWS_API_KEY` | No | For live news (10 fetches/day) |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API URL |

---

## Testing Checklist

- [ ] `http://localhost:5000/` → Shows interactive Swagger-like HTML API docs
- [ ] `http://localhost:5000/docs` → Returns OpenAPI-style JSON docs
- [ ] `http://localhost:5000/api/health` → Returns { status: "ok", integrations: { groqAI, gnews, supabase } }
- [ ] `http://localhost:5000/api/quotes/random` → Returns AI-generated quote (Groq) or fallback
- [ ] `http://localhost:5000/api/news` → Returns articles with fetchCount/maxFetches
- [ ] `http://localhost:5000/api/news/refresh` → Fetches new batch (counts toward 10/day)
- [ ] Frontend builds successfully (`npm run build`)
- [ ] Login/Register works
- [ ] Dashboard shows Groq AI quote with "✨ AI Generated" badge
- [ ] Trending page shows news with Refresh button and fetch counter
- [ ] Course resource viewer opens in full-browser window
- [ ] Heatmap displays 7-day column layout on all pages
- [ ] Profile page is fully dynamic
- [ ] All CRUD operations work

---

## Troubleshooting

### "Cannot GET /" on backend
**Fixed.** The root route now serves HTML API docs. If you still see this, restart the server.

### CORS errors
Update `FRONTEND_URL` on your backend to exactly match your frontend domain.

### SQLite database resets on Render
Switch to Supabase (`DB_MODE=supabase`). SQLite is only for local development.

### Render service sleeping
Set up a cron job at [cron-job.org](https://cron-job.org) to ping `https://your-backend.onrender.com/api/health` every 14 minutes.

### News articles not loading
- Without `GNEWS_API_KEY`: Falls back to 20 curated articles
- With key: Get a free API key from [gnews.io](https://gnews.io) (100 requests/day)
- Max 10 fetches per day from the backend, each adding ~10 articles

### Groq AI quotes not working
- Without `GROQ_API_KEY`: Falls back to 10 curated static quotes
- Get a free key from [console.groq.com](https://console.groq.com)
- Default model: `llama-3.1-70b-versatile` (can be changed via `GROQ_MODEL`)

### Build fails on Vercel
- Run `npm run build` locally first
- Ensure all imports use correct casing (Linux is case-sensitive)

---

## Quick Reference

```bash
# Start frontend dev server
npm run dev

# Start backend dev server
cd server && node index.js

# Build frontend for production
npm run build

# Test backend APIs
curl http://localhost:5000/api/health
curl http://localhost:5000/api/quotes/random
curl http://localhost:5000/api/news
curl http://localhost:5000/docs
```
