# TENX Track Learning — Deployment Guide

> Production deployment instructions for Frontend and Backend, separately.

---

## 📋 Prerequisites

- **Node.js** v18+ and **npm** v9+
- A **Supabase** project with authentication enabled
- A **Groq AI** API key (for AI quotes/facts)
- A **GNews** API key (for technology news)

---

## 🖥️ FRONTEND DEPLOYMENT

### Option A: Vercel (Recommended)

#### Steps:

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/tenx-frontend.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com) → New Project
   - Import your GitHub repository
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Set Environment Variables** in Vercel Dashboard → Settings → Environment Variables:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   VITE_FRONTEND_URL=https://your-app.vercel.app
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Deploy** — Vercel auto-deploys on every push to `main`.

#### Custom Domain:
- Vercel → Project → Settings → Domains → Add your domain
- Update DNS CNAME to point to `cname.vercel-dns.com`

---

### Option B: Netlify

1. **Build locally:**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify:**
   - Drag the `dist/` folder to [app.netlify.com](https://app.netlify.com)
   - Or connect GitHub for auto-deploy

3. **Set Environment Variables** in Netlify → Site → Build & Deploy → Environment:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   VITE_FRONTEND_URL=https://your-app.netlify.app
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Create `public/_redirects`** for SPA routing:
   ```
   /*    /index.html   200
   ```

---

### Option C: Self-Hosted (Nginx)

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Copy `dist/` to your server:**
   ```bash
   scp -r dist/ user@server:/var/www/tenx/
   ```

3. **Nginx Configuration:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       root /var/www/tenx;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

---

## ⚡ BACKEND DEPLOYMENT

### Option A: Render (Recommended)

#### Steps:

1. **Push `server/` to a separate GitHub repo** (or use monorepo):
   ```bash
   cd server
   git init
   git add .
   git commit -m "Backend initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/tenx-backend.git
   git push -u origin main
   ```

2. **Create Web Service on Render:**
   - Go to [render.com](https://render.com) → New → Web Service
   - Connect your GitHub repository
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Environment:** Node

3. **Set Environment Variables** in Render Dashboard:
   ```
   PORT=5005
   FRONTEND_URL=https://your-app.vercel.app
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   GROQ_API_KEY=your_groq_api_key
   GROQ_MODEL=openai/gpt-oss-120b
   GNEWS_API_KEY=your_gnews_api_key
   WEBSITE_NAME=TENX Track Learning
   LOGO_TEXT=TENX Track Learning
   ```

4. **Deploy** — Render auto-deploys on push.

---

### Option B: Railway

1. **Connect GitHub repo** at [railway.app](https://railway.app)
2. Railway auto-detects Node.js
3. Set environment variables (same as Render)
4. Deploy — Railway handles port binding automatically

---

### Option C: Self-Hosted (VPS with PM2)

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Upload server code to your VPS:**
   ```bash
   scp -r server/ user@server:/opt/tenx-api/
   ```

3. **Install dependencies on server:**
   ```bash
   cd /opt/tenx-api
   npm install
   ```

4. **Create `.env` file** with all required environment variables.

5. **Start with PM2:**
   ```bash
   pm2 start index.js --name "tenx-api"
   pm2 save
   pm2 startup
   ```

6. **Nginx Reverse Proxy:**
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:5005;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 🔐 Security Checklist

- [ ] **Never commit `.env` files** — ensure `.gitignore` includes `.env`
- [ ] **Use HTTPS** for both frontend and backend in production
- [ ] **Update CORS origins** in `server/index.js` to match your production URLs
- [ ] **Rotate API keys** if they were exposed in version control
- [ ] **Set Supabase RLS policies** for data security
- [ ] **Rate limit** the API endpoints in production

---

## 🔗 Post-Deployment

### Update CORS in Backend

After deploying, update the CORS whitelist in `server/index.js`:
```javascript
app.use(cors({
    origin: [
        'https://your-app.vercel.app',
        'https://yourdomain.com',
    ],
    credentials: true,
}));
```

### Update Frontend Config

Set the production backend URL:
```
VITE_API_URL=https://your-backend-url.onrender.com
```

### Verify Health

After deployment, check the backend health endpoint:
```bash
curl https://your-backend-url.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "services": {
    "supabase": true,
    "groq": true,
    "gnews": true
  }
}
```

---

## 📊 Supabase Database Setup

If setting up a fresh Supabase instance, run the schema SQL:

1. Go to Supabase Dashboard → SQL Editor
2. Execute `server/supabase-schema-v3.sql`
3. This creates all required tables:
   - `profiles` — User profiles with theme preferences
   - `user_data_tasks` — Daily tasks (JSONB)
   - `user_data_courses` — Courses (JSONB)
   - `user_data_papers` — Research papers (JSONB)
   - `user_data_sessions` — Study sessions (JSONB)
   - `user_data_bookmarks` — Bookmarks (JSONB)
   - `user_data_activity` — Activity log (JSONB)
   - `user_data_streak` — Streak data (JSONB)
   - `user_data_profile` — Profile settings (JSONB)
   - `user_data_newsread` — Read articles (JSONB)
   - `user_data_resources` — Resources (JSONB)

---

## 🚀 Quick Deploy Summary

| Component  | Recommended | Build Command     | Start Command  |
|-----------|-------------|-------------------|----------------|
| Frontend  | Vercel      | `npm run build`   | (static)       |
| Backend   | Render      | `npm install`     | `node index.js`|
| Database  | Supabase    | (managed)         | (managed)      |

---

*© 2026 TENX Industries. All rights reserved.*
