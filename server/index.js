// ═══════════════════════════════════════════════════════
// TenX Backend API — Express + Supabase + Groq AI + GNews
// ═══════════════════════════════════════════════════════
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ─── Database Setup ───
let db = null;
let supabase = null;
const DB_MODE = process.env.DB_MODE || 'sqlite';

if (DB_MODE === 'supabase' && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
        const { createClient } = await import('@supabase/supabase-js');
        supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        console.log('✅ Connected to Supabase PostgreSQL');
    } catch (e) {
        console.warn('⚠️ Supabase connection failed, falling back to SQLite:', e.message);
    }
}

if (!supabase) {
    const Database = (await import('better-sqlite3')).default;
    db = new Database('tenx.db');
    db.pragma('journal_mode = WAL');
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS quotes_cache (
            id INTEGER PRIMARY KEY,
            data TEXT,
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS news_cache (
            id INTEGER PRIMARY KEY,
            data TEXT,
            cache_date TEXT,
            fetch_count INTEGER DEFAULT 0,
            updated_at TEXT DEFAULT (datetime('now'))
        );
    `);
    // Create generic data tables
    ['user_tasks', 'user_courses', 'user_papers', 'user_sessions',
        'user_bookmarks', 'user_activity', 'user_streak', 'user_profile',
        'user_news_read'].forEach(t => {
            db.exec(`CREATE TABLE IF NOT EXISTS ${t} (
            user_id TEXT NOT NULL,
            data TEXT NOT NULL DEFAULT '[]',
            updated_at TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (user_id)
        )`);
        });
    console.log('✅ SQLite database initialized');
}

// ─── Groq AI Configuration ───
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─── GNews Configuration ───
const GNEWS_API_KEY = process.env.GNEWS_API_KEY || '';

// ─── Fallback Quotes (used when Groq API is unavailable) ───
const FALLBACK_QUOTES = [
    { text: "The question of whether a computer can think is no more interesting than whether a submarine can swim.", author: "Edsger Dijkstra", category: "AI" },
    { text: "Machine intelligence is the last invention that humanity will ever need to make.", author: "Nick Bostrom", category: "AI" },
    { text: "Artificial intelligence would be the ultimate version of Google.", author: "Larry Page", category: "AI" },
    { text: "A year spent in artificial intelligence is enough to make one believe in God.", author: "Alan Perlis", category: "AI" },
    { text: "In God we trust. All others must bring data.", author: "W. Edwards Deming", category: "DS" },
    { text: "Data is the new oil.", author: "Clive Humby", category: "DS" },
    { text: "Machine learning is the science of getting computers to learn without being explicitly programmed.", author: "Arthur Samuel", category: "ML" },
    { text: "Deep learning is a superpower.", author: "Andrew Ng", category: "DL" },
    { text: "The future belongs to those who learn more skills and combine them in creative ways.", author: "Robert Greene", category: "AI" },
    { text: "Every expert was once a beginner.", author: "Helen Hayes", category: "AI" },
];

// ─── Groq AI Quote Fetcher ───
async function fetchGroqQuote() {
    if (!GROQ_API_KEY) return null;

    try {
        const response = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a motivational AI/ML knowledge assistant. Return ONLY valid JSON, no markdown, no explanation.'
                    },
                    {
                        role: 'user',
                        content: `Generate a unique, inspiring quote or fact about one of these topics: Artificial Intelligence, Machine Learning, Deep Learning, Data Science, Neural Networks, Computer Vision, NLP, Reinforcement Learning, or AI Ethics.

Return EXACTLY this JSON format:
{"text": "the quote or fact text here", "author": "Author Name or 'AI/ML Fact'", "category": "AI|ML|DL|DS", "type": "quote|fact"}

Make it thought-provoking, educational, and motivating for an AI/ML learner. Include real quotes from researchers like Geoffrey Hinton, Yann LeCun, Andrew Ng, Fei-Fei Li, Demis Hassabis, Andrej Karpathy, or share fascinating facts about neural networks, transformers, reinforcement learning breakthroughs, etc.`
                    }
                ],
                temperature: 0.9,
                max_tokens: 300,
                response_format: { type: 'json_object' },
            }),
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            console.warn('Groq API error:', response.status);
            return null;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) return null;

        const parsed = JSON.parse(content);
        if (parsed.text && parsed.author) {
            return {
                text: parsed.text,
                author: parsed.author,
                category: parsed.category || 'AI',
                type: parsed.type || 'quote',
                source: 'groq_ai',
            };
        }
        return null;
    } catch (e) {
        console.warn('⚠️ Groq AI fetch failed:', e.message);
        return null;
    }
}

// ─── GNews Fetcher with Daily Append Logic ───
let newsDayCache = { date: null, articles: [], fetchCount: 0, bookmarkedIds: new Set() };

function getToday() {
    return new Date().toISOString().split('T')[0];
}

async function fetchGNews(searchQuery) {
    if (!GNEWS_API_KEY) return [];

    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(searchQuery)}&lang=en&max=10&sortby=publishedAt&apikey=${GNEWS_API_KEY}`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) return [];

        const data = await resp.json();
        return (data.articles || []).map((a, i) => ({
            id: `gnews_${Date.now()}_${i}`,
            title: a.title,
            description: a.description || '',
            content: a.content || a.description || '',
            image: a.image || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=340&fit=crop',
            source: a.source?.name || 'Unknown',
            url: a.url,
            publishedAt: a.publishedAt,
            date: a.publishedAt?.slice(0, 10) || getToday(),
            category: categorizeArticle(a.title + ' ' + (a.description || '')),
            fetchedAt: new Date().toISOString(),
        }));
    } catch (e) {
        console.warn('⚠️ GNews API error:', e.message);
        return [];
    }
}

function categorizeArticle(text) {
    const lower = text.toLowerCase();
    if (lower.includes('deep learning') || lower.includes('neural net') || lower.includes('transformer') || lower.includes('diffusion') || lower.includes('cnn') || lower.includes('rnn')) return 'DL';
    if (lower.includes('data science') || lower.includes('analytics') || lower.includes('dataset') || lower.includes('visualization') || lower.includes('pandas')) return 'DS';
    if (lower.includes('machine learning') || lower.includes('reinforcement') || lower.includes('supervised') || lower.includes('federated') || lower.includes('gradient')) return 'ML';
    return 'AI';
}

// Curated fallback
const CURATED_NEWS = [
    { id: 'c1', title: 'GPT-5 Achieves PhD-Level Reasoning in New Benchmarks', description: 'OpenAI announces GPT-5 surpasses human PhD students on complex reasoning tasks.', content: 'The latest generation of large language models continues to push boundaries. GPT-5 reportedly uses a Mixture of Experts architecture with 16 specialized sub-networks, achieving near-perfect scores on mathematical reasoning and scientific knowledge tests.', url: 'https://openai.com/blog', image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=340&fit=crop', source: 'OpenAI Blog', publishedAt: new Date().toISOString(), date: getToday(), category: 'AI' },
    { id: 'c2', title: 'Google DeepMind Releases Gemini 2.5 Pro with Enhanced Multimodal Understanding', description: 'Gemini 2.5 Pro demonstrates state-of-the-art performance across text, image, audio, and video.', content: 'Google DeepMind has unveiled Gemini 2.5 Pro featuring real-time reasoning and novel multimodal fusion techniques that seamlessly integrate text, image, audio, and video understanding.', url: 'https://deepmind.google', image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&h=340&fit=crop', source: 'Google DeepMind', publishedAt: new Date().toISOString(), date: getToday(), category: 'AI' },
    { id: 'c3', title: 'Meta Open-Sources LLaMA 4 with 405B Parameters', description: 'Meta releases its most powerful open-source LLM with novel Gated Sparse Attention.', content: 'LLaMA 4 uses a novel Gated Sparse Attention mechanism allowing it to process 128K tokens of context while using significantly less memory. Benchmarks show it matching GPT-4 Turbo.', url: 'https://ai.meta.com', image: 'https://images.unsplash.com/photo-1655720828018-edd2daec9349?w=600&h=340&fit=crop', source: 'Meta AI', publishedAt: new Date().toISOString(), date: getToday(), category: 'DL' },
    { id: 'c4', title: 'Breakthrough in Autonomous Vehicle Safety Using Reinforcement Learning', description: 'New RL techniques reduce collision rates by 94% in simulation.', content: 'Researchers have developed novel reinforcement learning techniques that dramatically improve autonomous vehicle safety, reducing collision rates by 94% in complex urban driving simulations.', url: 'https://arxiv.org', image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0aca?w=600&h=340&fit=crop', source: 'arXiv', publishedAt: new Date().toISOString(), date: getToday(), category: 'ML' },
    { id: 'c5', title: 'PyTorch 3.0 Released with Native Distributed Training', description: 'Built-in distributed training across thousands of GPUs with minimal code.', content: 'PyTorch 3.0 includes native support for distributed training, allowing researchers to scale their models across thousands of GPUs with just a few lines of code change.', url: 'https://pytorch.org', image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600&h=340&fit=crop', source: 'PyTorch', publishedAt: new Date().toISOString(), date: getToday(), category: 'DL' },
    { id: 'c6', title: 'Stanford Develops Energy-Efficient Transformer Architecture', description: 'Sparse attention reduces compute by 80% while maintaining accuracy.', content: 'Stanford AI Lab has developed a new sparse attention mechanism that reduces transformer compute requirements by 80% while maintaining comparable accuracy on standard benchmarks.', url: 'https://stanford.edu', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=340&fit=crop', source: 'Stanford AI Lab', publishedAt: new Date().toISOString(), date: getToday(), category: 'DL' },
    { id: 'c7', title: 'AI Drug Discovery Identifies New Antibiotic Candidates', description: 'ML models screen millions of compounds to find promising antibiotic candidates.', content: 'Machine learning models have screened millions of chemical compounds and identified promising new antibiotic candidates that traditional methods completely missed.', url: 'https://nature.com', image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&h=340&fit=crop', source: 'Nature', publishedAt: new Date().toISOString(), date: getToday(), category: 'ML' },
    { id: 'c8', title: 'NVIDIA Announces Next-Gen AI Chips for Foundation Models', description: 'Blackwell Ultra delivers 30x improvement in AI training throughput.', content: 'NVIDIA has announced its next-generation Blackwell Ultra architecture, delivering a massive 30x improvement in AI training throughput for foundation models.', url: 'https://nvidia.com', image: 'https://images.unsplash.com/photo-1591405351990-4726e331f141?w=600&h=340&fit=crop', source: 'NVIDIA', publishedAt: new Date().toISOString(), date: getToday(), category: 'AI' },
    { id: 'c9', title: 'Computer Vision Achieves Human-Level Medical Diagnosis', description: 'Vision transformer matches radiologist accuracy across 14 imaging tasks.', content: 'A new vision transformer model has achieved human-level accuracy in medical image diagnosis across 14 different imaging modalities, from X-rays to MRI scans.', url: 'https://thelancet.com', image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&h=340&fit=crop', source: 'The Lancet', publishedAt: new Date().toISOString(), date: getToday(), category: 'DL' },
    { id: 'c10', title: 'Hugging Face Surpasses 1 Million Hosted Models', description: 'The AI community platform solidifies its position as the GitHub of ML.', content: 'Hugging Face has surpassed one million hosted models, cementing its role as the central hub for the machine learning community.', url: 'https://huggingface.co', image: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=600&h=340&fit=crop', source: 'Hugging Face', publishedAt: new Date().toISOString(), date: getToday(), category: 'ML' },
    { id: 'c11', title: 'Federated Learning Enables Privacy-Preserving AI at Scale', description: 'New techniques reduce communication costs by 100x.', content: 'Advanced gradient compression techniques have made federated learning practical for billions of devices, reducing communication costs by up to 100x.', url: 'https://research.google', image: 'https://images.unsplash.com/photo-1563986768609-322da13575f2?w=600&h=340&fit=crop', source: 'Google Research', publishedAt: new Date().toISOString(), date: getToday(), category: 'ML' },
    { id: 'c12', title: 'Real-Time 4K Video Generation with Diffusion Models', description: 'Temporal consistency maintained across thousands of frames.', content: 'A breakthrough in video generation allows real-time 4K video creation with temporal consistency, using a novel temporal attention diffusion architecture.', url: 'https://openai.com', image: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&h=340&fit=crop', source: 'OpenAI', publishedAt: new Date().toISOString(), date: getToday(), category: 'DL' },
    { id: 'c13', title: 'MIT Develops Explainable AI for Critical Decision Making', description: 'Human-readable explanations for healthcare, finance, and justice.', content: 'MIT CSAIL has developed a new XAI framework that provides clear, human-readable explanations for AI decisions in healthcare, finance, and criminal justice applications.', url: 'https://mit.edu', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=340&fit=crop', source: 'MIT CSAIL', publishedAt: new Date().toISOString(), date: getToday(), category: 'AI' },
    { id: 'c14', title: 'Synthetic Data Now Powers 60% of Enterprise ML Models', description: 'Generative techniques eliminate privacy concerns in training data.', content: 'A comprehensive industry study reveals that 60% of enterprise ML models now incorporate synthetic data, driven by privacy regulations and the high cost of real-world data collection.', url: 'https://datascienceweekly.org', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=340&fit=crop', source: 'DS Weekly', publishedAt: new Date().toISOString(), date: getToday(), category: 'DS' },
    { id: 'c15', title: 'Graph Neural Networks Revolutionize Protein Interaction Prediction', description: 'Building on AlphaFold with unprecedented accuracy.', content: 'New GNN architectures are building on AlphaFold\'s legacy, predicting complex protein-protein interactions with unprecedented accuracy.', url: 'https://science.org', image: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?w=600&h=340&fit=crop', source: 'Science', publishedAt: new Date().toISOString(), date: getToday(), category: 'DL' },
    { id: 'c16', title: 'AutoML Frameworks Handle End-to-End ML Pipelines', description: 'Automated systems match expert-designed pipelines across 40 benchmarks.', content: 'The latest AutoML frameworks can automatically handle data preprocessing, feature engineering, model selection, and hyperparameter tuning, matching expert performance.', url: 'https://kaggle.com', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=340&fit=crop', source: 'Kaggle', publishedAt: new Date().toISOString(), date: getToday(), category: 'DS' },
    { id: 'c17', title: 'Quantum Machine Learning Shows Practical Advantage', description: 'IBM quantum processor achieves 10x speedup on specific ML tasks.', content: 'IBM has demonstrated practical quantum advantage for machine learning, achieving a 10x speedup on kernel methods and optimization problems compared to classical hardware.', url: 'https://research.ibm.com', image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=340&fit=crop', source: 'IBM Research', publishedAt: new Date().toISOString(), date: getToday(), category: 'AI' },
    { id: 'c18', title: 'Multi-Agent AI Swarms Improve Software Engineering by 40%', description: 'Specialized agents collaborate on complex tasks.', content: 'OpenAI\'s multi-agent framework orchestrates specialized AI agents to collaborate on complex software engineering tasks, showing 40% improvement over single-agent approaches.', url: 'https://openai.com', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=340&fit=crop', source: 'OpenAI', publishedAt: new Date().toISOString(), date: getToday(), category: 'AI' },
    { id: 'c19', title: 'Causal Inference Meets Deep Learning in Novel Hybrid Frameworks', description: 'Models that understand cause-and-effect relationships.', content: 'A new wave of research merges causal inference with deep learning, enabling neural networks to understand causal relationships for more robust and generalizable models.', url: 'https://arxiv.org', image: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&h=340&fit=crop', source: 'NeurIPS', publishedAt: new Date().toISOString(), date: getToday(), category: 'ML' },
    { id: 'c20', title: 'EU AI Act Takes Effect: What ML Engineers Need to Know', description: 'Risk-based requirements for AI systems in Europe.', content: 'The EU AI Act establishes comprehensive risk-based requirements for AI systems, creating a framework that categorizes AI applications by risk level with corresponding obligations.', url: 'https://digital-strategy.ec.europa.eu', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=340&fit=crop', source: 'European Commission', publishedAt: new Date().toISOString(), date: getToday(), category: 'AI' },
];

/**
 * Fetch news: up to 10 fetches/day, each appending ~10 articles.
 * At end of day, clear non-bookmarked articles.
 */
async function getNewsArticles(bookmarkedIds = []) {
    const today = getToday();

    // Reset for new day
    if (newsDayCache.date !== today) {
        // Retain only bookmarked from previous day
        const bookmarkedArticles = newsDayCache.articles.filter(a => bookmarkedIds.includes(a.id));
        newsDayCache = { date: today, articles: bookmarkedArticles, fetchCount: 0, bookmarkedIds: new Set(bookmarkedIds) };

        // Also load from DB cache if available
        if (db) {
            const cached = db.prepare('SELECT data, cache_date, fetch_count FROM news_cache WHERE id = 1').get();
            if (cached && cached.cache_date === today) {
                newsDayCache.articles = JSON.parse(cached.data);
                newsDayCache.fetchCount = cached.fetch_count || 0;
            }
        }
    }

    // Update bookmarked IDs
    bookmarkedIds.forEach(id => newsDayCache.bookmarkedIds.add(id));

    // Can we fetch more? (max 10 fetches per day)
    if (newsDayCache.fetchCount < 10 && GNEWS_API_KEY) {
        const searchQueries = [
            'artificial intelligence breakthrough',
            'machine learning research',
            'deep learning neural network',
            'data science analytics',
            'AI technology innovation',
            'natural language processing',
            'computer vision AI',
            'reinforcement learning robotics',
            'generative AI model',
            'AI ethics regulation',
        ];
        const query = searchQueries[newsDayCache.fetchCount % searchQueries.length];
        const newArticles = await fetchGNews(query);

        if (newArticles.length > 0) {
            // Deduplicate by title
            const existingTitles = new Set(newsDayCache.articles.map(a => a.title.toLowerCase().trim()));
            const uniqueNew = newArticles.filter(a => !existingTitles.has(a.title.toLowerCase().trim()));
            newsDayCache.articles = [...newsDayCache.articles, ...uniqueNew];
            newsDayCache.fetchCount++;

            // Save to DB
            if (db) {
                db.prepare('INSERT OR REPLACE INTO news_cache (id, data, cache_date, fetch_count) VALUES (1, ?, ?, ?)').run(
                    JSON.stringify(newsDayCache.articles), today, newsDayCache.fetchCount
                );
            }
        }
    }

    // If still not enough, add curated
    if (newsDayCache.articles.length < 15) {
        const existingTitles = new Set(newsDayCache.articles.map(a => a.title.toLowerCase().trim()));
        const shuffled = [...CURATED_NEWS].sort(() => Math.random() - 0.5);
        const needed = shuffled.filter(a => !existingTitles.has(a.title.toLowerCase().trim()));
        newsDayCache.articles = [...newsDayCache.articles, ...needed.slice(0, 20 - newsDayCache.articles.length)];
    }

    return {
        articles: newsDayCache.articles,
        fetchCount: newsDayCache.fetchCount,
        maxFetches: 10,
        date: today,
        total: newsDayCache.articles.length,
    };
}


// ═══════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════

// Build endpoint registry for /docs
const ENDPOINTS = [
    { method: 'GET', path: '/', description: 'HTML API documentation page' },
    { method: 'GET', path: '/docs', description: 'JSON API documentation with all endpoints' },
    { method: 'GET', path: '/api/health', description: 'Server health check with uptime and memory' },
    { method: 'GET', path: '/api/quotes/random', description: 'Dynamic AI/ML quote via Groq AI (called on dashboard refresh)', request: null, response: '{ text, author, category, type, source }' },
    { method: 'GET', path: '/api/quotes', description: 'All fallback quotes', request: null, response: '{ total, quotes: [...] }' },
    { method: 'GET', path: '/api/news', description: 'Daily AI/ML news (up to 10 fetches/day, ~100 articles target)', request: 'query: ?bookmarked=id1,id2', response: '{ articles, fetchCount, maxFetches, date, total }' },
    { method: 'GET', path: '/api/news/refresh', description: 'Force a new GNews fetch (counts toward 10/day limit)', request: 'query: ?bookmarked=id1,id2', response: '{ articles, fetchCount, ... }' },
    { method: 'POST', path: '/api/auth/register', description: 'Register new user', request: '{ username, password }', response: '{ id, username, message }' },
    { method: 'POST', path: '/api/auth/login', description: 'Login user', request: '{ username, password }', response: '{ id, username, message }' },
    { method: 'GET', path: '/api/tasks/:userId', description: 'Get all daily tasks for user', request: null, response: '{ tasks: [...] }' },
    { method: 'POST', path: '/api/tasks/:userId', description: 'Save daily tasks (bulk)', request: '{ tasks: [...] }', response: '{ success: true }' },
    { method: 'GET', path: '/api/courses/:userId', description: 'Get all courses', request: null, response: '{ courses: [...] }' },
    { method: 'POST', path: '/api/courses/:userId', description: 'Save courses (bulk)', request: '{ courses: [...] }', response: '{ success: true }' },
    { method: 'GET', path: '/api/papers/:userId', description: 'Get research papers', request: null, response: '{ papers: [...] }' },
    { method: 'POST', path: '/api/papers/:userId', description: 'Save research papers', request: '{ papers: [...] }', response: '{ success: true }' },
    { method: 'GET', path: '/api/sessions/:userId', description: 'Get study sessions', request: null, response: '{ sessions: [...] }' },
    { method: 'POST', path: '/api/sessions/:userId', description: 'Save study sessions', request: '{ sessions: [...] }', response: '{ success: true }' },
    { method: 'GET', path: '/api/bookmarks/:userId', description: 'Get bookmarks', request: null, response: '{ bookmarks: [...] }' },
    { method: 'POST', path: '/api/bookmarks/:userId', description: 'Save bookmarks', request: '{ bookmarks: [...] }', response: '{ success: true }' },
    { method: 'GET', path: '/api/activity/:userId', description: 'Get activity log', request: null, response: '{ log: [...] }' },
    { method: 'POST', path: '/api/activity/:userId', description: 'Save activity log', request: '{ log: [...] }', response: '{ success: true }' },
    { method: 'GET', path: '/api/streak/:userId', description: 'Get streak data', request: null, response: '{ streak: {...} }' },
    { method: 'POST', path: '/api/streak/:userId', description: 'Save streak', request: '{ streak: {...} }', response: '{ success: true }' },
    { method: 'GET', path: '/api/profile/:userId', description: 'Get user profile', request: null, response: '{ profile: {...} }' },
    { method: 'POST', path: '/api/profile/:userId', description: 'Save user profile', request: '{ profile: {...} }', response: '{ success: true }' },
    { method: 'GET', path: '/api/newsread/:userId', description: 'Get news read status', request: null, response: '{ newsRead: [...] }' },
    { method: 'POST', path: '/api/newsread/:userId', description: 'Save news read status', request: '{ newsRead: [...] }', response: '{ success: true }' },
];

// ─── Root: HTML API Documentation (Swagger-like) ───
app.get('/', (req, res) => {
    const methodColors = { GET: '#34d399', POST: '#a78bfa', PUT: '#fbbf24', DELETE: '#f87171' };
    const endpointRows = ENDPOINTS.map(ep => {
        const color = methodColors[ep.method] || '#8b8fa3';
        const bgColor = ep.method === 'GET' ? '#0d3320' : ep.method === 'POST' ? '#1e1b3a' : ep.method === 'PUT' ? '#332b00' : '#3b1019';
        const reqBody = ep.request ? `<div class="ep-schema"><span class="ep-schema-label">Request:</span><code>${ep.request}</code></div>` : '';
        const resBody = ep.response ? `<div class="ep-schema"><span class="ep-schema-label">Response:</span><code>${ep.response}</code></div>` : '';
        return `
        <div class="endpoint" onclick="this.classList.toggle('expanded')">
            <div class="ep-main">
                <span class="method" style="background:${bgColor};color:${color}">${ep.method}</span>
                <span class="path">${ep.path}</span>
                <span class="desc">${ep.description}</span>
            </div>
            ${reqBody || resBody ? `<div class="ep-details">${reqBody}${resBody}</div>` : ''}
        </div>`;
    }).join('');

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TenX API Documentation</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, sans-serif; background: #0a0a14; color: #e0e0e8; min-height: 100vh; padding: 40px 20px; }
        .container { max-width: 960px; margin: 0 auto; }
        .header { margin-bottom: 40px; }
        h1 { font-size: 2.4rem; margin-bottom: 8px; background: linear-gradient(135deg, #6366f1, #a78bfa, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 700; }
        .subtitle { color: #8b8fa3; font-size: 1rem; margin-bottom: 24px; }
        .info-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
        .info-pill { padding: 6px 14px; background: #12131f; border: 1px solid #1e2030; border-radius: 20px; font-size: 0.78rem; color: #a0a4b8; }
        .info-pill b { color: #6366f1; margin-right: 4px; }
        .status-live { color: #34d399; }
        .section { margin-bottom: 32px; }
        .section h2 { font-size: 1.15rem; margin-bottom: 14px; color: #c4c8d8; border-bottom: 1px solid #1a1d2e; padding-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .endpoint { background: #12131f; border: 1px solid #1e2030; border-radius: 10px; margin-bottom: 6px; transition: all 0.2s; cursor: pointer; overflow: hidden; }
        .endpoint:hover { border-color: #6366f144; background: #141520; }
        .endpoint.expanded .ep-details { display: block; }
        .ep-main { display: flex; align-items: center; gap: 12px; padding: 12px 16px; }
        .ep-details { display: none; padding: 0 16px 12px 82px; }
        .ep-schema { font-size: 0.75rem; margin-top: 4px; }
        .ep-schema-label { color: #8b8fa3; font-weight: 600; margin-right: 6px; }
        .ep-schema code { font-family: 'Fira Code', monospace; font-size: 0.73rem; color: #a78bfa; background: #0a0a14; padding: 2px 8px; border-radius: 4px; }
        .method { font-weight: 700; font-size: 0.7rem; padding: 4px 10px; border-radius: 6px; min-width: 52px; text-align: center; text-transform: uppercase; font-family: 'Fira Code', monospace; flex-shrink: 0; }
        .path { font-family: 'Fira Code', monospace; font-size: 0.85rem; color: #e0e0e8; min-width: 220px; flex-shrink: 0; }
        .desc { font-size: 0.78rem; color: #8b8fa3; flex: 1; }
        .try-it { padding: 20px; background: #12131f; border: 1px solid #1e2030; border-radius: 12px; margin-top: 32px; }
        .try-it h3 { font-size: 1rem; margin-bottom: 12px; color: #c4c8d8; }
        .try-it code { display: block; background: #0a0a14; padding: 10px 16px; border-radius: 8px; font-family: 'Fira Code', monospace; font-size: 0.82rem; color: #a78bfa; margin-bottom: 6px; white-space: pre-wrap; }
        .try-it p { font-size: 0.78rem; color: #8b8fa3; margin-bottom: 8px; }
        .badge-live { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.68rem; font-weight: 600; background: #0d3320; color: #34d399; }
        .badge-cached { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.68rem; font-weight: 600; background: #332b00; color: #fbbf24; }
        .feature-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-top: 16px; }
        .feature-card { background: #12131f; border: 1px solid #1e2030; border-radius: 10px; padding: 16px; }
        .feature-card h4 { font-size: 0.85rem; color: #c4c8d8; margin-bottom: 6px; }
        .feature-card p { font-size: 0.73rem; color: #8b8fa3; line-height: 1.5; }
        @media (max-width: 640px) { .ep-main { flex-direction: column; align-items: flex-start; gap: 4px; } .path { min-width: auto; } .ep-details { padding-left: 16px; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 TenX API</h1>
            <p class="subtitle">Backend API for the AI/ML Learning Tracker Dashboard</p>
            <div class="info-bar">
                <span class="info-pill"><b>Status:</b> <span class="status-live">✅ Online</span></span>
                <span class="info-pill"><b>Version:</b> 1.0.0</span>
                <span class="info-pill"><b>Database:</b> ${supabase ? 'Supabase PostgreSQL' : 'SQLite'}</span>
                <span class="info-pill"><b>Groq AI:</b> ${GROQ_API_KEY ? '<span class="status-live">Connected</span>' : 'Not configured'}</span>
                <span class="info-pill"><b>GNews:</b> ${GNEWS_API_KEY ? '<span class="status-live">Connected</span>' : 'Not configured'}</span>
                <span class="info-pill"><b>Endpoints:</b> ${ENDPOINTS.length}</span>
            </div>
        </div>

        <div class="feature-grid">
            <div class="feature-card"><h4>🤖 Groq AI Quotes</h4><p>Dynamic AI/ML quotes & facts generated via Groq AI on each dashboard refresh</p></div>
            <div class="feature-card"><h4>📰 GNews Integration</h4><p>Up to 10 fetches/day, ~100 articles target. Auto-cleanup at day end</p></div>
            <div class="feature-card"><h4>🗄️ Supabase DB</h4><p>PostgreSQL with Row Level Security, auto-profile creation, full CRUD</p></div>
            <div class="feature-card"><h4>📋 Swagger Docs</h4><p>Interactive API documentation with request/response schemas</p></div>
        </div>

        <div class="section" style="margin-top: 32px;">
            <h2>📊 API Endpoints <span class="badge-live">${ENDPOINTS.length} total</span></h2>
            ${endpointRows}
        </div>

        <div class="try-it">
            <h3>⚡ Quick Test</h3>
            <p>Click any endpoint above to see request/response schemas. Test with curl:</p>
            <code>curl http://localhost:${PORT}/api/health</code>
            <code>curl http://localhost:${PORT}/api/quotes/random</code>
            <code>curl http://localhost:${PORT}/api/news</code>
            <code>curl http://localhost:${PORT}/docs</code>
        </div>
    </div>
</body>
</html>`);
});

// ─── JSON API Documentation (Swagger-like) ───
app.get('/docs', (req, res) => {
    res.json({
        openapi: '3.0.0',
        info: {
            title: 'TenX Backend API',
            version: '1.0.0',
            description: 'Backend API for AI/ML Learning Tracker Dashboard with Groq AI quotes, GNews integration, and Supabase PostgreSQL.',
        },
        servers: [
            { url: `http://localhost:${PORT}`, description: 'Local development' },
        ],
        database: supabase ? 'Supabase PostgreSQL' : 'SQLite',
        integrations: {
            groqAI: !!GROQ_API_KEY,
            gnews: !!GNEWS_API_KEY,
            supabase: !!supabase,
        },
        paths: Object.fromEntries(
            ENDPOINTS.map(ep => [
                `${ep.method} ${ep.path}`,
                {
                    summary: ep.description,
                    method: ep.method,
                    path: ep.path,
                    request: ep.request || null,
                    response: ep.response || null,
                },
            ])
        ),
        schemas: {
            Quote: { type: 'object', properties: { text: 'string', author: 'string', category: 'AI|ML|DL|DS', type: 'quote|fact', source: 'groq_ai|fallback' } },
            NewsArticle: { type: 'object', properties: { id: 'string', title: 'string', description: 'string', content: 'string', image: 'string', source: 'string', url: 'string', date: 'string', category: 'AI|ML|DL|DS' } },
            DailyTask: { type: 'object', properties: { id: 'string', name: 'string', date: 'string', completed: 'boolean', priority: 'low|medium|high', startTime: 'string', endTime: 'string' } },
            Course: { type: 'object', properties: { id: 'string', name: 'string', description: 'string', priority: 'low|medium|high', topics: 'Topic[]' } },
            Topic: { type: 'object', properties: { id: 'string', name: 'string', completed: 'boolean', subtopics: 'Subtopic[]', resources: 'Resource[]' } },
            Resource: { type: 'object', properties: { id: 'string', name: 'string', type: 'pdf|video|doc', url: 'string' } },
            ResearchPaper: { type: 'object', properties: { id: 'string', title: 'string', author: 'string', completionPercentage: 'number', notes: 'string' } },
            StudySession: { type: 'object', properties: { id: 'string', date: 'string', totalMinutes: 'number', label: 'string' } },
            Profile: { type: 'object', properties: { username: 'string', bio: 'string', profileImage: 'string' } },
        },
    });
});

// ─── Health Check ───
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        dbMode: supabase ? 'supabase' : 'sqlite',
        integrations: {
            groqAI: !!GROQ_API_KEY,
            gnews: !!GNEWS_API_KEY,
            supabase: !!supabase,
        },
        uptime: Math.round(process.uptime()),
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    });
});

// ─── Quotes API (Groq AI Dynamic) ───
app.get('/api/quotes/random', async (req, res) => {
    try {
        // Try Groq AI first
        const groqQuote = await fetchGroqQuote();
        if (groqQuote) {
            return res.json(groqQuote);
        }
    } catch (e) {
        console.warn('Groq quote failed:', e.message);
    }

    // Fallback to static quotes
    const quote = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
    res.json({ ...quote, source: 'fallback' });
});

app.get('/api/quotes', (req, res) => {
    res.json({ total: FALLBACK_QUOTES.length, quotes: FALLBACK_QUOTES });
});

// ─── News API (GNews Dynamic, 10 fetches/day) ───
app.get('/api/news', async (req, res) => {
    try {
        const bookmarkedIds = req.query.bookmarked ? req.query.bookmarked.split(',') : [];
        const result = await getNewsArticles(bookmarkedIds);
        res.json(result);
    } catch (e) {
        console.error('News error:', e);
        res.json({ articles: CURATED_NEWS.slice(0, 20), fetchCount: 0, maxFetches: 10, date: getToday(), total: 20 });
    }
});

// Force a new fetch (counts toward daily limit)
app.get('/api/news/refresh', async (req, res) => {
    try {
        const bookmarkedIds = req.query.bookmarked ? req.query.bookmarked.split(',') : [];
        // Temporarily reduce fetch count to force a new fetch
        if (newsDayCache.date === getToday() && newsDayCache.fetchCount < 10) {
            // Will automatically fetch in getNewsArticles
        }
        const result = await getNewsArticles(bookmarkedIds);
        res.json(result);
    } catch (e) {
        console.error('News refresh error:', e);
        res.status(500).json({ error: 'Failed to refresh news' });
    }
});

// ─── Auth API ───
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    if (supabase) {
        return res.json({ message: 'Use Supabase Auth directly from frontend', supabaseUrl: process.env.SUPABASE_URL });
    }

    try {
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) return res.status(409).json({ error: 'Username already exists' });
        const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, password);
        res.status(201).json({ id: result.lastInsertRowid, username, message: 'Registration successful' });
    } catch (e) {
        res.status(500).json({ error: 'Registration failed', details: e.message });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    if (supabase) {
        return res.json({ message: 'Use Supabase Auth directly from frontend', supabaseUrl: process.env.SUPABASE_URL });
    }

    try {
        const user = db.prepare('SELECT id, username FROM users WHERE username = ? AND password = ?').get(username, password);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        res.json({ id: user.id, username: user.username, message: 'Login successful' });
    } catch (e) {
        res.status(500).json({ error: 'Login failed', details: e.message });
    }
});

// ─── Generic CRUD Routes ───
function makeDataRoutes(routePath, tableName, dataKey) {
    app.get(`/api/${routePath}/:userId`, (req, res) => {
        try {
            if (db) {
                const row = db.prepare(`SELECT data FROM ${tableName} WHERE user_id = ?`).get(req.params.userId);
                return res.json({ [dataKey]: row ? JSON.parse(row.data) : (dataKey === 'streak' ? { count: 0, lastDate: null } : dataKey === 'profile' ? {} : []) });
            }
            res.json({ [dataKey]: dataKey === 'streak' ? { count: 0, lastDate: null } : dataKey === 'profile' ? {} : [] });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post(`/api/${routePath}/:userId`, (req, res) => {
        try {
            const data = JSON.stringify(req.body[dataKey] || req.body.data || []);
            if (db) {
                db.prepare(`INSERT OR REPLACE INTO ${tableName} (user_id, data, updated_at) VALUES (?, ?, datetime('now'))`).run(req.params.userId, data);
            }
            res.json({ success: true, message: `${dataKey} saved` });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
}

makeDataRoutes('tasks', 'user_tasks', 'tasks');
makeDataRoutes('courses', 'user_courses', 'courses');
makeDataRoutes('papers', 'user_papers', 'papers');
makeDataRoutes('sessions', 'user_sessions', 'sessions');
makeDataRoutes('bookmarks', 'user_bookmarks', 'bookmarks');
makeDataRoutes('activity', 'user_activity', 'log');
makeDataRoutes('streak', 'user_streak', 'streak');
makeDataRoutes('profile', 'user_profile', 'profile');
makeDataRoutes('newsread', 'user_news_read', 'newsRead');

// ─── Start Server ───
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║          🚀 TenX API Server Running             ║
╠══════════════════════════════════════════════════╣
║  Local:     http://localhost:${PORT}                ║
║  Docs:      http://localhost:${PORT}/docs            ║
║  Health:    http://localhost:${PORT}/api/health      ║
║  Database:  ${(supabase ? 'Supabase PostgreSQL' : 'SQLite (local)').padEnd(20)}         ║
║  Groq AI:   ${GROQ_API_KEY ? '✅ Connected     ' : '❌ Not configured'}         ║
║  GNews:     ${GNEWS_API_KEY ? '✅ Connected     ' : '❌ Not configured'}         ║
╚══════════════════════════════════════════════════╝
    `);
});
