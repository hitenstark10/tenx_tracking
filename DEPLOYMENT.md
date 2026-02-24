# TENX Track Learning App - Deployment Guide

This guide covers the necessary steps to deploy the application (Frontend + Backend) and properly configure the environment parameters in a production setting.

## Architecture
- **Frontend**: React (Vite)
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL with Auth and JSONB Data Storage)
- **External APIs**: Groq AI (Quotes), GNews (Tech News)

---

## 1. Secrets & Environment Variables

**CRITICAL:** Do NOT hardcode secrets in the source code. All secrets should be injected via environment variables on your hosting platforms (e.g., Render, Vercel, Netlify).

### Backend (`server/.env`)
Required variables for your production Node.js environment:
```env
# Server
PORT=5005
FRONTEND_URL=https://your-frontend-domain.com

# Supabase (Database & Auth)
SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
SUPABASE_ANON_KEY=[YOUR_SUPABASE_ANON_KEY]

# External APIs
GROQ_API_KEY=[YOUR_GROQ_API_KEY]
GNEWS_API_KEY=[YOUR_GNEWS_API_KEY]

# Application Branding (Optional)
WEBSITE_NAME="TENX Track Learning"
LOGO_TEXT="TENX Industries"
```

### Frontend (`.env` or embedded)
The frontend requires the backend URL to function. In production, configure this in your hosting provider's build settings.
```env
# For Vite, prefix with VITE_
VITE_BACKEND_URL=https://your-backend-domain.onrender.com
```
*Note: The frontend code in `config.js` will automatically fallback to the specified VITE_BACKEND_URL or a production default if explicitly coded.*

---

## 2. Deploying the Backend (e.g., Render, Heroku)

1. Connect your repository to your backend hosting platform.
2. Set the Base Directory to `/server` (if supported) or define the pre-build command to `cd server && npm install`.
3. Set the **Build Command**: `npm install`
4. Set the **Start Command**: `node index.js`
5. Map all the **Backend Environment Variables** specified above in the service settings.
6. Verify the deployment by accessing `https://your-backend-domain.com/` which should return the TENX API Interactive Test UI.

---

## 3. Deploying the Frontend (e.g., Vercel, Netlify)

1. Connect the root directory of the repository to your frontend hosting platform.
2. Ensure the Framework Preset is set to **Vite**.
3. Set the **Build Command**: `npm run build`
4. Set the **Output Directory**: `dist`
5. Inject the `VITE_BACKEND_URL` environment variable pointing to your deployed backend URL.
6. **Crucial Routing Step**: If deploying to Vercel/Netlify/Surge, you MUST configure rewrites for SPA routing. 
   - **Vercel** (`vercel.json`):
     ```json
     {
       "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
     }
     ```
   - **Netlify** (`public/_redirects`):
     ```
     /*  /index.html  200
     ```

---

## 4. Post-Deployment Checks (QA)

After deployment, perform the following validation:

*   **API Health**: Check `${BACKEND_URL}/api/health` to ensure Supabase, Groq, and GNews connections are active.
*   **Authentication Flow**: Perform a test user Registration ➔ Login ➔ Logout.
*   **Cross-Browser Synchronization**: Open the dashboard in an Incognito window and normal window simultaneously to verify the Supabase JSON database properly restores lists upon a refresh.
*   **Video Embedding Check**: In a Course Topic, add a Resource of type `Video` with a standard YouTube URL format to confirm the browser doesn't block the standard IFrames.

## 5. Security & Maintenance

1. Rotate your Supabase Service Keys/API Keys on a monthly/quarterly schedule.
2. Use strong passwords for user testing accounts (like `Hiten@12345` was used initially, consider deleting or isolating testing accounts on Production DB).
3. The GNews and Groq tiers might be rate-limited on free versions. The backend dynamically falls back to an internal cache or hardcoded quotes to guarantee stability if limits are hit.
