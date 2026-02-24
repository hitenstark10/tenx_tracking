import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import Modal from '../components/Modal';
import {
    TrendingUp, Search, Bookmark, BookmarkCheck, ExternalLink,
    Eye, Globe, Loader, RefreshCw
} from 'lucide-react';
import './Trending.css';
import { BACKEND_URL } from '../config';

// ─── Constants ───
const NEWS_INTERVAL_MS = 288 * 60 * 1000; // 288 minutes (~5 calls/day)
const NEWS_CACHE_KEY = 'tenx_news_articles';
const NEWS_CACHE_DATE_KEY = 'tenx_news_cache_date';

function getToday() {
    return new Date().toISOString().slice(0, 10);
}

export default function Trending() {
    const { bookmarks, toggleBookmark, markArticleRead, isArticleRead } = useData();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQ, setSearchQ] = useState('');
    const [filterCat, setFilterCat] = useState('all');
    const [filterState, setFilterState] = useState('all');
    const [readerArticle, setReaderArticle] = useState(null);
    const newsTimerRef = useRef(null);

    // ─── Daily Reset Logic ───
    // On each load: if it's a new day, clear non-bookmarked articles from cache
    const performDailyReset = useCallback(() => {
        const cachedDate = localStorage.getItem(NEWS_CACHE_DATE_KEY);
        const today = getToday();

        if (cachedDate && cachedDate !== today) {
            // New day: remove all non-bookmarked articles
            const bookmarkedIds = new Set(bookmarks.map(b => b.id));
            const cached = JSON.parse(localStorage.getItem(NEWS_CACHE_KEY) || '[]');
            const kept = cached.filter(a => bookmarkedIds.has(a.id));
            localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(kept));
            localStorage.setItem(NEWS_CACHE_DATE_KEY, today);
            return kept;
        }

        if (!cachedDate) {
            localStorage.setItem(NEWS_CACHE_DATE_KEY, today);
        }

        // Same day: return existing cache
        try {
            return JSON.parse(localStorage.getItem(NEWS_CACHE_KEY) || '[]');
        } catch {
            return [];
        }
    }, [bookmarks]);

    // ─── Fetch news from backend API ───
    const fetchNews = useCallback(async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/news?t=${Date.now()}`, {
                signal: AbortSignal.timeout(10000),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const newArticles = (data.articles || []).map(a => ({
                id: a.id,
                title: a.title,
                summary: a.description || a.summary || '',
                content: a.content || a.description || '',
                image: a.image || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=340&fit=crop',
                source: typeof a.source === 'object' ? a.source.name : (a.source || 'Unknown'),
                url: a.url,
                date: a.date || a.publishedAt?.slice(0, 10) || getToday(),
                category: a.category || 'AI',
            }));

            if (newArticles.length > 0) {
                // APPEND new articles below existing ones (no duplicates)
                setArticles(prev => {
                    const existingTitles = new Set(prev.map(a => a.title));
                    const unique = newArticles.filter(a => !existingTitles.has(a.title));
                    const merged = [...prev, ...unique];

                    // Persist to localStorage
                    try {
                        localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(merged));
                        localStorage.setItem(NEWS_CACHE_DATE_KEY, getToday());
                    } catch { }

                    return merged;
                });
            }

            return newArticles;
        } catch (err) {
            console.warn('News API fetch failed, using cache:', err.message);
            // On failure: use cached articles (already loaded)
            return [];
        }
    }, []);

    // ─── Initialize: Daily reset → Load cache → Fetch fresh ───
    useEffect(() => {
        const init = async () => {
            // 1. Perform daily reset (clears non-bookmarked if new day)
            const cachedArticles = performDailyReset();
            setArticles(cachedArticles);

            // 2. Fetch fresh articles from API
            await fetchNews();
            setLoading(false);
        };
        init();

        // 3. Set up timer: fetch every 288 minutes
        newsTimerRef.current = setInterval(fetchNews, NEWS_INTERVAL_MS);
        return () => clearInterval(newsTimerRef.current);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Manual Refresh ───
    const handleRefresh = async () => {
        if (refreshing) return;
        setRefreshing(true);
        await fetchNews();
        setRefreshing(false);
    };

    const isBookmarked = (id) => bookmarks.some(b => b.id === id);

    // ─── Filtering: merge current articles + bookmarks not in list ───
    const filtered = useMemo(() => {
        const mergedMap = new Map();
        articles.forEach(a => mergedMap.set(a.id, a));
        bookmarks.forEach(b => { if (!mergedMap.has(b.id)) mergedMap.set(b.id, b); });
        let list = Array.from(mergedMap.values());

        if (searchQ) list = list.filter(n => n.title.toLowerCase().includes(searchQ.toLowerCase()) || (n.summary || '').toLowerCase().includes(searchQ.toLowerCase()));
        if (filterCat !== 'all') list = list.filter(n => n.category === filterCat);
        if (filterState === 'bookmarked') list = list.filter(n => isBookmarked(n.id));
        if (filterState === 'read') list = list.filter(n => isArticleRead(n.id));
        if (filterState === 'unread') list = list.filter(n => !isArticleRead(n.id));
        return list;
    }, [articles, searchQ, filterCat, filterState, bookmarks, isArticleRead]);

    const openReader = (article) => {
        setReaderArticle(article);
        markArticleRead(article.id);
    };

    const visitSource = (article) => {
        markArticleRead(article.id);
        window.open(article.url, '_blank');
    };

    if (loading) return (
        <div className="empty-state"><Loader size={32} className="animate-spin" /><h4>Loading news...</h4></div>
    );

    return (
        <div className="trending-page">
            <div className="page-header">
                <h1><TrendingUp size={28} /> Trending in AI/ML</h1>
                <div className="trending-header-actions">
                    <button
                        className={`btn btn-ghost btn-sm trending-refresh-btn ${refreshing ? 'spinning' : ''}`}
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        {refreshing ? 'Fetching...' : 'Refresh'}
                    </button>
                </div>
            </div>

            <div className="filter-bar">
                <div className="search-wrapper"><Search size={16} /><input className="input" placeholder="Search articles..." value={searchQ} onChange={e => setSearchQ(e.target.value)} /></div>
                <select className="select" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: 120 }}>
                    <option value="all">All Topics</option><option value="AI">AI</option><option value="ML">ML</option><option value="DL">DL</option><option value="DS">DS</option>
                </select>
                <select className="select" value={filterState} onChange={e => setFilterState(e.target.value)} style={{ width: 150 }}>
                    <option value="all">All Articles</option><option value="bookmarked">Bookmarked</option><option value="read">Read</option><option value="unread">Unread</option>
                </select>
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state"><Globe size={48} /><h4>No articles found</h4><p>Adjust filters or check back later</p></div>
            ) : (
                <div className="news-grid">
                    {filtered.map(article => (
                        <div key={article.id} className={`news-card ${isArticleRead(article.id) ? 'visited' : ''}`}>
                            <div className="news-card-image" onClick={() => openReader(article)}>
                                <img src={article.image} alt={article.title} loading="lazy" />
                                <div className="news-card-category"><span className="badge badge-info">{article.category}</span></div>
                                {isArticleRead(article.id) && <div className="news-read-badge"><Eye size={12} /> Read</div>}
                            </div>
                            <div className="news-card-body">
                                <h3 className="news-card-title" onClick={() => openReader(article)}>{article.title}</h3>
                                <p className="news-card-summary">{article.summary}</p>
                                <div className="news-card-footer">
                                    <div className="news-card-meta">
                                        <span className="news-source">{article.source}</span>
                                        <span className="news-date">{article.date}</span>
                                    </div>
                                    <div className="news-card-actions">
                                        <button className={`btn btn-ghost btn-icon btn-sm ${isBookmarked(article.id) ? 'bookmarked' : ''}`}
                                            onClick={() => toggleBookmark(article)} title={isBookmarked(article.id) ? 'Remove' : 'Bookmark'}>
                                            {isBookmarked(article.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                                        </button>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => visitSource(article)} title="Source"><ExternalLink size={16} /></button>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openReader(article)} title="Read"><Eye size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reader Modal */}
            <Modal isOpen={!!readerArticle} onClose={() => setReaderArticle(null)} title="" size="lg">
                {readerArticle && (
                    <div className="reader-view">
                        <div className="reader-header">
                            <span className="badge badge-info">{readerArticle.category}</span>
                            <span className="reader-source">{readerArticle.source} · {readerArticle.date}</span>
                        </div>
                        <h1 className="reader-title">{readerArticle.title}</h1>
                        <img src={readerArticle.image} alt="" className="reader-image" />
                        <div className="reader-content">
                            {(readerArticle.content || readerArticle.summary || '').split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
                        </div>
                        <div className="reader-footer">
                            <button className="btn btn-primary" onClick={() => window.open(readerArticle.url, '_blank')}><ExternalLink size={16} /> Read Full Article</button>
                            <button className={`btn ${isBookmarked(readerArticle.id) ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => toggleBookmark(readerArticle)}>
                                {isBookmarked(readerArticle.id) ? <><BookmarkCheck size={16} /> Bookmarked</> : <><Bookmark size={16} /> Bookmark</>}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
