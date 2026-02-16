import { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import Modal from '../components/Modal';
import { fetchNews } from '../utils/newsService';
import {
    TrendingUp, Search, Bookmark, BookmarkCheck, ExternalLink,
    Eye, Globe, Loader, RefreshCw
} from 'lucide-react';
import './Trending.css';

const API_BASE = import.meta.env.VITE_API_URL || 'https://tenx-tracking-716qhpgum-hitens-projects-b4b594f8.vercel.app';

export default function Trending() {
    const { bookmarks, toggleBookmark, markArticleRead, isArticleRead } = useData();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchInfo, setFetchInfo] = useState({ fetchCount: 0, maxFetches: 10 });
    const [searchQ, setSearchQ] = useState('');
    const [filterCat, setFilterCat] = useState('all');
    const [filterState, setFilterState] = useState('all');
    const [readerArticle, setReaderArticle] = useState(null);

    // Fetch news from backend API, falling back to frontend newsService
    const loadNews = useCallback(async (isRefresh = false) => {
        try {
            const bookmarkedIds = bookmarks.map(b => b.id).join(',');
            const endpoint = isRefresh ? '/api/news/refresh' : '/api/news';
            const url = `${API_BASE}${endpoint}${bookmarkedIds ? `?bookmarked=${bookmarkedIds}` : ''}`;

            const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (resp.ok) {
                const data = await resp.json();
                // Map backend fields to frontend expected fields
                const mapped = (data.articles || []).map(a => ({
                    id: a.id,
                    title: a.title,
                    summary: a.description || a.summary || '',
                    content: a.content || a.description || '',
                    image: a.image || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=340&fit=crop',
                    source: typeof a.source === 'object' ? a.source.name : (a.source || 'Unknown'),
                    url: a.url,
                    date: a.date || a.publishedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
                    category: a.category || 'AI',
                }));
                setArticles(mapped);
                setFetchInfo({ fetchCount: data.fetchCount || 0, maxFetches: data.maxFetches || 10 });
                return;
            }
        } catch (e) {
            console.warn('Backend news fetch failed, using local service:', e.message);
        }

        // Fallback to local newsService
        const localData = await fetchNews();
        setArticles(localData);
    }, [bookmarks]);

    useEffect(() => {
        loadNews().finally(() => setLoading(false));
    }, []);

    const handleRefresh = async () => {
        if (refreshing) return;
        setRefreshing(true);
        await loadNews(true);
        setRefreshing(false);
    };

    const isBookmarked = (id) => bookmarks.some(b => b.id === id);

    const filtered = useMemo(() => {
        // Merge: current articles + bookmarked articles not in current set
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
                    <span className="trending-fetch-info">
                        {fetchInfo.fetchCount}/{fetchInfo.maxFetches} fetches today
                    </span>
                    <button
                        className={`btn btn-ghost btn-sm trending-refresh-btn ${refreshing ? 'spinning' : ''}`}
                        onClick={handleRefresh}
                        disabled={refreshing || fetchInfo.fetchCount >= fetchInfo.maxFetches}
                        title={fetchInfo.fetchCount >= fetchInfo.maxFetches ? 'Daily fetch limit reached' : 'Fetch new articles'}
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

