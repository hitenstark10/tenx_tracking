// ═══════════════════════════════════════════════════════
// TENX Track Learning — Backend API Server v3.0
// Clean rebuild: Groq AI Quotes + GNews + Supabase CRUD
// ═══════════════════════════════════════════════════════

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

// ─── Configuration ───────────────────────────────────
const PORT = process.env.PORT || 5005;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://tenx-tracking.vercel.app';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GNEWS_API_KEY = process.env.GNEWS_API_KEY || '';

// ─── Express Setup ───────────────────────────────────
const app = express();
app.use(cors({
    origin: [
        FRONTEND_URL,
        'https://tenx-tracking.vercel.app', 'https://tenx-api.onrender.com'
    ],
    credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// ─── Supabase Client ─────────────────────────────────
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
console.log('✅ Supabase connected');


// ═══════════════════════════════════════════════════════
// 1. QUOTES API — Groq Platform AI
//    Every call generates a FRESH, UNIQUE quote.
//    No server-side caching. Frontend handles timers.
// ═══════════════════════════════════════════════════════

const QUOTE_CATEGORIES = [
    'Artificial Intelligence', 'Machine Learning', 'Deep Learning',
    'Data Science', 'Neural Networks', 'Natural Language Processing',
    'Computer Vision', 'Reinforcement Learning', 'Robotics',
    'AI Ethics', 'Generative AI', 'AI History',
];

// ─── Quote history to prevent repetition ───
const quoteHistory = []; // rolling buffer of last 50 quotes
const MAX_QUOTE_HISTORY = 50;

// Similarity check: if 60%+ words overlap, consider it a duplicate
function isQuoteSimilar(newText, existingText) {
    const wordsA = new Set(newText.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const wordsB = new Set(existingText.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    if (wordsA.size === 0 || wordsB.size === 0) return false;
    let overlap = 0;
    wordsA.forEach(w => { if (wordsB.has(w)) overlap++; });
    return overlap / Math.min(wordsA.size, wordsB.size) > 0.6;
}

async function generateQuoteFromGroq() {
    if (!GROQ_API_KEY) return null;

    const fetch = (await import('node-fetch')).default;
    const category = QUOTE_CATEGORIES[Math.floor(Math.random() * QUOTE_CATEGORIES.length)];
    const isQuote = Math.random() > 0.4;
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const prompt = isQuote
        ? `Generate one unique, inspiring, rarely-cited quote about "${category}" from a real expert, scientist, or pioneer in the field. Avoid commonly known or generic quotes. Be creative and surprising. Unique seed: ${seed}. Return ONLY valid JSON (no markdown, no code blocks): {"text": "the quote text", "author": "Full Name", "category": "${category}", "type": "quote"}`
        : `Share one fascinating, lesser-known fact about "${category}" that would surprise even a professional in the field. Unique seed: ${seed}. Return ONLY valid JSON (no markdown, no code blocks): {"text": "the fact text", "author": "Research", "category": "${category}", "type": "fact"}`;

    // Try primary model, then fallback model
    const models = [GROQ_MODEL, 'llama-3.3-70b-versatile'];

    for (const model of models) {
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: 'You return ONLY valid JSON. No markdown, no code blocks, no explanation text. Just a single JSON object.' },
                        { role: 'user', content: prompt },
                    ],
                    temperature: 1.0,
                    top_p: 0.95,
                    max_tokens: 300,
                }),
                signal: AbortSignal.timeout(15000),
            });

            if (!res.ok) {
                console.warn(`Groq API [${model}] HTTP ${res.status}`);
                continue;
            }

            const data = await res.json();
            const raw = data.choices?.[0]?.message?.content?.trim();
            if (!raw) continue;

            // Parse JSON robustly
            const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            try {
                return { ...JSON.parse(cleaned), source: 'groq_ai' };
            } catch {
                // Regex fallback for malformed JSON
                const t = cleaned.match(/"text"\s*:\s*"([^"]+)"/);
                const a = cleaned.match(/"author"\s*:\s*"([^"]+)"/);
                if (t) {
                    return { text: t[1], author: a?.[1] || 'Unknown', category, type: isQuote ? 'quote' : 'fact', source: 'groq_ai' };
                }
            }
        } catch (err) {
            console.warn(`Groq quote [${model}] error:`, err.message);
        }
    }
    return null;
}

// GET /api/quotes/random — Generate a fresh quote every call
app.get('/api/quotes/random', async (_req, res) => {
    // Try up to 5 times to get a unique quote
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const quote = await generateQuoteFromGroq();
            if (quote && quote.text) {
                // Check against history for uniqueness (exact + similarity)
                const isDuplicate = quoteHistory.some(h =>
                    h.toLowerCase().trim() === quote.text.toLowerCase().trim() ||
                    isQuoteSimilar(quote.text, h)
                );
                if (!isDuplicate) {
                    // Add to history (rolling)
                    quoteHistory.push(quote.text);
                    if (quoteHistory.length > MAX_QUOTE_HISTORY) quoteHistory.shift();
                    return res.json(quote);
                }
                // If duplicate and last attempt, still return it
                if (attempt === 4) return res.json(quote);
                continue; // Try again for unique
            }
        } catch (err) {
            console.warn('Quote generation error:', err.message);
        }
    }

    // Fallback pool — shuffle and pick one not in history
    const fallbacks = [
        { text: 'The measure of intelligence is the ability to change.', author: 'Albert Einstein' },
        { text: 'Data is the new oil, but like oil it must be refined to be useful.', author: 'Clive Humby' },
        { text: 'Machine intelligence is the last invention humanity will need to make.', author: 'Nick Bostrom' },
        { text: 'The goal is to turn data into information, and information into insight.', author: 'Carly Fiorina' },
        { text: 'In God we trust. All others must bring data.', author: 'W. Edwards Deming' },
        { text: 'Artificial intelligence would be the ultimate version of Google.', author: 'Larry Page' },
        { text: 'The question of whether a computer can think is no more interesting than whether a submarine can swim.', author: 'Edsger Dijkstra' },
        { text: 'Deep learning is going to be able to do things we have not imagined yet.', author: 'Geoffrey Hinton' },
        { text: 'Technology is best when it brings people together.', author: 'Matt Mullenweg' },
        { text: 'The best way to predict the future is to create it.', author: 'Peter Drucker' },
        { text: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' },
        { text: 'Science is organized knowledge. Wisdom is organized life.', author: 'Immanuel Kant' },
    ];
    // Pick one not recently used
    const unused = fallbacks.filter(f => !quoteHistory.includes(f.text));
    const pool = unused.length > 0 ? unused : fallbacks;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    quoteHistory.push(pick.text);
    if (quoteHistory.length > MAX_QUOTE_HISTORY) quoteHistory.shift();
    res.json({ ...pick, category: 'AI', type: 'quote', source: 'fallback' });
});


// ═══════════════════════════════════════════════════════
// 2. NEWS API — GNews Technology Feed
//    Backend proxies GNews. No caching here.
//    Frontend handles timers, caching, daily reset.
// ═══════════════════════════════════════════════════════

function categorizeArticle(text) {
    const l = (text || '').toLowerCase();
    if (l.includes('deep learning') || l.includes('neural net') || l.includes('transformer') || l.includes('diffusion')) return 'DL';
    if (l.includes('data science') || l.includes('analytics') || l.includes('dataset')) return 'DS';
    if (l.includes('machine learning') || l.includes('reinforcement') || l.includes('supervised')) return 'ML';
    return 'AI';
}

// ─── News cache for deduplication ───
let newsCache = { articles: [], query: '', timestamp: 0 };
const NEWS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min cache

// GET /api/news — Fetch TECHNOLOGY news from GNews (top-headlines, technology category ONLY)
app.get('/api/news', async (req, res) => {
    if (!GNEWS_API_KEY) {
        return res.json({ articles: [], error: 'GNews API key not configured' });
    }

    // Check cache: serve cached if within TTL (shuffle for variety)
    if (newsCache.articles.length > 0 && (Date.now() - newsCache.timestamp) < NEWS_CACHE_TTL_MS) {
        const shuffled = [...newsCache.articles].sort(() => Math.random() - 0.5);
        return res.json({ articles: shuffled, query: 'technology', timestamp: Date.now(), cached: true });
    }

    try {
        const fetch = (await import('node-fetch')).default;

        // Use GNews top-headlines with topic=technology — ONLY tech news
        const gnewsUrl = `https://gnews.io/api/v4/top-headlines?topic=technology&lang=en&max=10&apikey=${GNEWS_API_KEY}`;
        const gnewsRes = await fetch(gnewsUrl, { signal: AbortSignal.timeout(10000) });

        if (!gnewsRes.ok) {
            console.warn(`GNews HTTP ${gnewsRes.status}`);
            return res.json({ articles: newsCache.articles.length > 0 ? newsCache.articles : [], error: `GNews returned ${gnewsRes.status}` });
        }

        const data = await gnewsRes.json();
        const today = new Date().toISOString().slice(0, 10);

        const articles = (data.articles || []).map((a, i) => ({
            id: `gnews-${today}-${Date.now()}-${i}`,
            title: a.title || 'Untitled',
            description: a.description || '',
            content: a.content || a.description || '',
            image: a.image || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=340&fit=crop',
            source: a.source?.name || 'Unknown',
            url: a.url || '#',
            date: a.publishedAt?.slice(0, 10) || today,
            category: categorizeArticle((a.title || '') + ' ' + (a.description || '')),
        }));

        // Merge with previous cached to avoid losing articles (deduplicate by title)
        const existingTitles = new Set(newsCache.articles.map(a => a.title));
        const newUnique = articles.filter(a => !existingTitles.has(a.title));
        const merged = [...newsCache.articles, ...newUnique].slice(-50);

        // Update cache
        newsCache = { articles: merged, query: 'technology', timestamp: Date.now() };

        res.json({ articles, query: 'technology', timestamp: Date.now() });
    } catch (err) {
        console.warn('GNews fetch error:', err.message);
        if (newsCache.articles.length > 0) {
            return res.json({ articles: newsCache.articles, query: newsCache.query, timestamp: Date.now(), cached: true });
        }
        res.json({ articles: [], error: err.message });
    }
});


// ═══════════════════════════════════════════════════════
// 3. AUTH ENDPOINTS — Supabase Auth
// ═══════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ success: false, error: 'Username, email, and password are required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    try {
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { username },
        });
        if (error) return res.status(400).json({ success: false, error: error.message });

        res.json({
            success: true,
            user: { id: data.user.id, email: data.user.email },
            message: 'Account created! You can now sign in.',
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return res.status(401).json({ success: false, error: error.message });

        // Fetch profile if exists
        let profile = null;
        try {
            const { data: prof } = await supabase
                .from('profiles')
                .select('username, bio, profile_image, theme, color_theme, date_joined')
                .eq('id', data.user.id)
                .single();
            profile = prof;
        } catch { /* no profile row yet */ }

        res.json({
            success: true,
            user: {
                id: data.user.id,
                email: data.user.email,
                username: profile?.username || data.user.user_metadata?.username || email.split('@')[0],
                bio: profile?.bio || '',
                profileImage: profile?.profile_image || '',
                theme: profile?.theme || 'dark',
                colorTheme: profile?.color_theme || '#6366f1',
                createdAt: profile?.date_joined || data.user.created_at,
            },
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
            },
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/auth/verify-email
app.post('/api/auth/verify-email', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    try {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const user = users.find(u => u.email === email);
        if (!user) return res.status(400).json({ success: false, error: 'User not found' });

        const { error } = await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });
        if (error) return res.status(400).json({ success: false, error: error.message });
        res.json({ success: true, message: 'Email verified! You can now sign in.' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/auth/reset-password-direct
app.post('/api/auth/reset-password-direct', async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, error: 'Password must be 6+ characters' });

    try {
        const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
        if (listErr) return res.status(500).json({ success: false, error: 'System error' });

        const user = users.find(u => u.email === email);
        if (!user) return res.status(400).json({ success: false, error: 'User not found' });

        const { error } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword, email_confirm: true });
        if (error) return res.status(400).json({ success: false, error: error.message });
        res.json({ success: true, message: 'Password reset successfully!' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/auth/update-password (authenticated)
app.post('/api/auth/update-password', async (req, res) => {
    const { password } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!password || password.length < 6) return res.status(400).json({ success: false, error: 'Password must be 6+ characters' });

    try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) return res.status(401).json({ success: false, error: 'Invalid token' });

        const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
        if (error) return res.status(400).json({ success: false, error: error.message });
        res.json({ success: true, message: 'Password updated' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/auth/delete-account (authenticated)
app.delete('/api/auth/delete-account', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });

    try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) return res.status(401).json({ success: false, error: 'Invalid token' });

        const { error } = await supabase.auth.admin.deleteUser(user.id);
        if (error) return res.status(400).json({ success: false, error: error.message });
        res.json({ success: true, message: 'Account deleted' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});


// ═══════════════════════════════════════════════════════
// 4. DATA CRUD — JSONB Storage in Supabase
//    Generic GET/POST for all user data types
// ═══════════════════════════════════════════════════════

const DATA_ROUTES = {
    tasks: 'user_data_tasks',
    courses: 'user_data_courses',
    papers: 'user_data_papers',
    sessions: 'user_data_sessions',
    bookmarks: 'user_data_bookmarks',
    activity: 'user_data_activity',
    streak: 'user_data_streak',
    profile: 'user_data_profile',
    newsread: 'user_data_newsread',
    resources: 'user_data_resources',
};

// Default empty values by type
const DEFAULTS = {
    streak: {},
    profile: {},
};

// GET /api/data/:type/:userId
app.get('/api/data/:type/:userId', async (req, res) => {
    const { type, userId } = req.params;
    const table = DATA_ROUTES[type];
    if (!table) return res.status(400).json({ error: `Unknown data type: ${type}` });

    try {
        const { data, error } = await supabase
            .from(table)
            .select('data')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no row found
            return res.status(500).json({ error: error.message });
        }

        const defaultVal = DEFAULTS[type] !== undefined ? DEFAULTS[type] : [];
        res.json({ data: data?.data ?? defaultVal });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/data/:type/:userId
app.post('/api/data/:type/:userId', async (req, res) => {
    const { type, userId } = req.params;
    const table = DATA_ROUTES[type];
    if (!table) return res.status(400).json({ error: `Unknown data type: ${type}` });

    try {
        const { error } = await supabase
            .from(table)
            .upsert({
                user_id: userId,
                data: req.body.data,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// ═══════════════════════════════════════════════════════
// 5. PROFILE — Update profiles table (SQL columns)
// ═══════════════════════════════════════════════════════

app.post('/api/profile/:userId', async (req, res) => {
    const { userId } = req.params;
    const { username, bio, profileImage, theme, colorTheme } = req.body;

    try {
        const updates = {};
        if (username !== undefined) updates.username = username;
        if (bio !== undefined) updates.bio = bio;
        if (profileImage !== undefined) updates.profile_image = profileImage;
        if (theme !== undefined) updates.theme = theme;
        if (colorTheme !== undefined) updates.color_theme = colorTheme;

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) return res.status(500).json({ success: false, error: error.message });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});


// ═══════════════════════════════════════════════════════
// 6. HEALTH & CONFIG
// ═══════════════════════════════════════════════════════

app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        services: {
            supabase: true,
            groq: !!GROQ_API_KEY,
            gnews: !!GNEWS_API_KEY,
        },
        timestamp: new Date().toISOString(),
    });
});

app.get('/api/config', (_req, res) => {
    res.json({
        supabaseUrl: SUPABASE_URL,
        supabaseAnonKey: SUPABASE_ANON_KEY,
        websiteName: process.env.WEBSITE_NAME || 'TENX Track Learning',
        logoText: process.env.LOGO_TEXT || 'TENX Track Learning',
    });
});


// ═══════════════════════════════════════════════════════
// 7. API DOCUMENTATION — Interactive Test UI
// ═══════════════════════════════════════════════════════

app.get('/', (_req, res) => {
    res.type('html').send(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TENX API</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:#0b0d14;color:#e0e2ec;min-height:100vh}
.h{background:linear-gradient(135deg,#12151f,#1a1e2e);border-bottom:1px solid #2a2f42;padding:32px 40px}
.h h1{font-size:2rem;font-weight:800;background:linear-gradient(135deg,#6366f1,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.h p{color:#6b7394;margin-top:8px;font-size:.9rem}
.c{max-width:900px;margin:0 auto;padding:24px}
.s{background:#1a1e2e;border:1px solid #2a2f42;border-radius:12px;padding:20px;margin-bottom:16px}
.s h3{font-size:.95rem;margin-bottom:12px;color:#a78bfa}
.b{padding:6px 16px;border-radius:8px;border:1px solid #6366f1;background:rgba(99,102,241,.1);color:#818cf8;font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit;margin-right:8px}
.b:hover{background:#6366f1;color:#fff}
.r{background:#12151f;border-radius:8px;padding:14px;max-height:400px;overflow-y:auto;font-family:'JetBrains Mono',monospace;font-size:.78rem;white-space:pre-wrap;line-height:1.6;margin-top:10px;color:#a0a8c4}
.ok{color:#34d399}.err{color:#f87171}
.badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:.7rem;font-weight:600;margin:2px}
.badge-ok{background:rgba(52,211,153,.12);color:#34d399}
.badge-err{background:rgba(248,113,113,.12);color:#f87171}
</style></head><body>
<div class="h">
<h1>⚡ TENX Track Learning API v3.0</h1>
<p>Clean Architecture — Groq AI · GNews · Supabase</p>
<div style="margin-top:10px">
<span class="badge badge-ok">✅ Supabase</span>
<span class="badge ${GROQ_API_KEY ? 'badge-ok' : 'badge-err'}">${GROQ_API_KEY ? '✅' : '❌'} Groq AI</span>
<span class="badge ${GNEWS_API_KEY ? 'badge-ok' : 'badge-err'}">${GNEWS_API_KEY ? '✅' : '❌'} GNews</span>
</div></div>
<div class="c">
<div class="s"><h3>📝 Test Quotes API</h3>
<button class="b" onclick="testEndpoint('/api/quotes/random','qr')">Get Quote</button>
<button class="b" onclick="test3('qr')">Test 3× Uniqueness</button>
<div id="qr" class="r">Click to test...</div></div>

<div class="s"><h3>📰 Test News API</h3>
<button class="b" onclick="testEndpoint('/api/news','nr')">Get News</button>
<div id="nr" class="r">Click to test...</div></div>

<div class="s"><h3>💚 Health</h3>
<button class="b" onclick="testEndpoint('/api/health','hr')">Check</button>
<div id="hr" class="r">...</div></div>
</div>
<script>
async function testEndpoint(p,id){
const el=document.getElementById(id);el.innerHTML='Loading...';
try{const t=Date.now();const r=await fetch(p);const ms=Date.now()-t;const d=await r.json();
el.innerHTML='<span class="'+(r.ok?'ok':'err')+'">'+r.status+'</span> ('+ms+'ms)\\n\\n'+JSON.stringify(d,null,2);
}catch(e){el.innerHTML='<span class="err">FAILED</span> '+e.message}}
async function test3(id){const el=document.getElementById(id);el.innerHTML='Testing 3 calls...';
const results=[];for(let i=0;i<3;i++){try{const r=await fetch('/api/quotes/random');results.push(await r.json())}catch(e){results.push({error:e.message})}}
const texts=results.map(r=>r.text).filter(Boolean);const uniq=new Set(texts);
el.innerHTML=(uniq.size===texts.length?'<span class="ok">✅ ALL UNIQUE</span>':'<span class="err">⚠️ DUPLICATES</span>')
+'\\n\\n'+results.map((r,i)=>'#'+(i+1)+': "'+r.text+'" — '+r.author).join('\\n\\n')}
</script></body></html>`);
});

app.get('/docs', (_req, res) => {
    res.json({
        name: 'TENX Track Learning API',
        version: '3.0.0',
        endpoints: [
            { method: 'GET', path: '/api/health' },
            { method: 'GET', path: '/api/config' },
            { method: 'GET', path: '/api/quotes/random' },
            { method: 'GET', path: '/api/news' },
            { method: 'POST', path: '/api/auth/register' },
            { method: 'POST', path: '/api/auth/login' },
            { method: 'POST', path: '/api/auth/verify-email' },
            { method: 'POST', path: '/api/auth/reset-password-direct' },
            { method: 'POST', path: '/api/auth/update-password' },
            { method: 'DELETE', path: '/api/auth/delete-account' },
            { method: 'GET', path: '/api/data/:type/:userId' },
            { method: 'POST', path: '/api/data/:type/:userId' },
            { method: 'POST', path: '/api/profile/:userId' },
        ],
    });
});


// ─── Start Server ────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n⚡ TENX API v3.0 — http://localhost:${PORT}`);
    console.log(`🤖 Groq AI: ${GROQ_API_KEY ? '✅' : '❌'} | 📰 GNews: ${GNEWS_API_KEY ? '✅' : '❌'}\n`);
});
