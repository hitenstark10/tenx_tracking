import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { LineChart } from '../components/Charts';
import Heatmap from '../components/Heatmap';
import {
    CheckCircle, Clock, Zap, BookOpen, FileText, TrendingUp,
    Play, Pause, Save, RotateCcw, Calendar, Flame, BarChart3,
    Sparkles, Quote, Target, Timer, Hourglass, X, Percent,
    Plus, Edit3, Trash2, Newspaper, Award, Trophy, Star,
    Share2, ExternalLink, ChevronRight, Rocket, Crown
} from 'lucide-react';
import {
    getToday, formatMinutesToHHMM, formatSeconds,
    getDaysCountdownTo, getLast7Days, getLast30Days, formatDateShort,
    getCourseProgress, generateId
} from '../utils/helpers';
import { getStopwatch, saveStopwatch, getCountdown, saveCountdown } from '../utils/storage';
import './Dashboard.css';
import { BACKEND_URL } from '../config';

export default function Dashboard() {
    const {
        dailyTasks, courses, researchPapers, studySessions,
        todayTasks, todayCompletedTasks, totalStudyMinutes,
        totalCurriculumItems, completedCurriculumItems, completedPapers,
        streak, addStudySession, activityLog,
        addDailyTask, updateDailyTask, deleteDailyTask,
    } = useData();

    const [statFilter, setStatFilter] = useState('today');
    const [chartRange, setChartRange] = useState('7');

    // ─── Quote from Groq AI API — Frontend Timer: every 144 min (~10/day) ───
    const QUOTE_INTERVAL_MS = 144 * 60 * 1000;
    const [quote, setQuote] = useState(() => {
        try {
            const cached = localStorage.getItem('tenx_quote_cache');
            return cached ? JSON.parse(cached) : { text: '', author: '', category: '', type: '' };
        } catch { return { text: '', author: '', category: '', type: '' }; }
    });
    const quoteTimerRef = useRef(null);

    const fetchQuote = useCallback(() => {
        fetch(`${BACKEND_URL}/api/quotes/random?t=${Date.now()}`)
            .then(r => { if (!r.ok) throw new Error('API error'); return r.json(); })
            .then(data => {
                setQuote(data);
                try { localStorage.setItem('tenx_quote_cache', JSON.stringify(data)); } catch { }
            })
            .catch(() => {
                const cached = localStorage.getItem('tenx_quote_cache');
                if (cached) {
                    try { setQuote(JSON.parse(cached)); } catch { }
                } else {
                    setQuote({ text: 'Every expert was once a beginner.', author: 'Helen Hayes', category: 'AI', type: 'quote', source: 'fallback' });
                }
            });
    }, []);

    useEffect(() => {
        fetchQuote();
        quoteTimerRef.current = setInterval(fetchQuote, QUOTE_INTERVAL_MS);
        return () => clearInterval(quoteTimerRef.current);
    }, [fetchQuote]);

    // ─── News Headlines for Dashboard ───
    const [newsHeadlines, setNewsHeadlines] = useState(() => {
        try {
            const cached = localStorage.getItem('tenx_news_articles');
            return cached ? JSON.parse(cached).slice(0, 8) : [];
        } catch { return []; }
    });

    useEffect(() => {
        const loadNews = () => {
            try {
                const cached = localStorage.getItem('tenx_news_articles');
                if (cached) setNewsHeadlines(JSON.parse(cached).slice(0, 8));
            } catch { }
        };
        loadNews();
        const interval = setInterval(loadNews, 30000);
        return () => clearInterval(interval);
    }, []);

    // ─── Persistent Stopwatch ───
    const [swState, setSwState] = useState(() => getStopwatch());
    const [swDisplay, setSwDisplay] = useState(0);
    const swTimer = useRef(null);

    const calcElapsed = useCallback(() => {
        if (swState.isRunning && swState.startTimestamp) {
            return swState.accumulatedSeconds + Math.floor((Date.now() - swState.startTimestamp) / 1000);
        }
        return swState.accumulatedSeconds;
    }, [swState]);

    useEffect(() => {
        if (swState.isRunning) {
            swTimer.current = setInterval(() => setSwDisplay(calcElapsed()), 1000);
        } else {
            setSwDisplay(swState.accumulatedSeconds);
        }
        return () => clearInterval(swTimer.current);
    }, [swState.isRunning, calcElapsed, swState.accumulatedSeconds]);

    const swToggle = () => {
        setSwState(prev => {
            let next;
            if (prev.isRunning) {
                const elapsed = prev.accumulatedSeconds + Math.floor((Date.now() - prev.startTimestamp) / 1000);
                next = { isRunning: false, startTimestamp: null, accumulatedSeconds: elapsed };
            } else {
                next = { isRunning: true, startTimestamp: Date.now(), accumulatedSeconds: prev.accumulatedSeconds };
            }
            saveStopwatch(next);
            return next;
        });
    };

    const swSave = () => {
        const elapsed = calcElapsed();
        if (elapsed < 1) return;
        addStudySession({ totalMinutes: Math.round(elapsed / 60) });
        const next = { isRunning: false, startTimestamp: null, accumulatedSeconds: 0 };
        setSwState(next);
        saveStopwatch(next);
    };

    const swReset = () => {
        const next = { isRunning: false, startTimestamp: null, accumulatedSeconds: 0 };
        setSwState(next);
        saveStopwatch(next);
    };

    // ─── Persistent Countdown (reverse date counter) ───
    const [cdTarget, setCdTarget] = useState(() => getCountdown());
    const [cdRemaining, setCdRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
    const [showCdInput, setShowCdInput] = useState(false);

    useEffect(() => {
        saveCountdown(cdTarget);
        if (!cdTarget) return;
        const tick = () => setCdRemaining(getDaysCountdownTo(cdTarget));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [cdTarget]);

    const handleSetCountdown = (val) => {
        setCdTarget(val);
        setShowCdInput(false);
    };

    // ─── Inline Task Management ───
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('medium');
    const [showAddTask, setShowAddTask] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [editTaskName, setEditTaskName] = useState('');

    const handleAddTask = () => {
        if (!newTaskName.trim()) return;
        addDailyTask({ name: newTaskName.trim(), date: getToday(), priority: newTaskPriority });
        setNewTaskName('');
        setNewTaskPriority('medium');
        setShowAddTask(false);
    };

    const handleEditTask = (task) => {
        setEditingTask(task.id);
        setEditTaskName(task.name);
    };

    const handleSaveEdit = (taskId) => {
        if (editTaskName.trim()) {
            updateDailyTask(taskId, { name: editTaskName.trim() });
        }
        setEditingTask(null);
        setEditTaskName('');
    };

    // ─── Stat computations ───
    const today = getToday();
    const todayStudyMin = studySessions.filter(s => s.date === today).reduce((s, x) => s + x.totalMinutes, 0);

    let todayCurrTotal = 0, todayCurrDone = 0;
    courses.forEach(c => c.topics?.forEach(t => {
        if (t.date === today || t.completedDate === today) {
            todayCurrTotal++;
            if (t.completed) todayCurrDone++;
        }
        t.subtopics?.forEach(s => {
            if (s.date === today || s.completedDate === today) {
                todayCurrTotal++;
                if (s.completed) todayCurrDone++;
            }
        });
    }));

    const fullyCompletedPapers = researchPapers.filter(p => p.completionPercentage >= 100).length;
    const todayPapersUpdated = researchPapers.filter(p => p.lastUpdated === today).length;

    const overallProgression = totalCurriculumItems > 0
        ? Math.round((completedCurriculumItems / totalCurriculumItems) * 100) : 0;
    const todayProgression = todayCurrTotal > 0 ? Math.round((todayCurrDone / todayCurrTotal) * 100) : 0;

    const statData = statFilter === 'today' ? {
        tasks: `${todayCompletedTasks}/${todayTasks.length}`,
        study: formatMinutesToHHMM(todayStudyMin),
        curriculum: todayCurrTotal === 0 ? '0/0' : `${todayCurrDone}/${todayCurrTotal}`,
        progression: `${todayProgression}%`,
    } : {
        tasks: `${dailyTasks.filter(t => t.completed).length}/${dailyTasks.length}`,
        study: formatMinutesToHHMM(totalStudyMinutes),
        curriculum: `${completedCurriculumItems}/${totalCurriculumItems}`,
        progression: `${overallProgression}%`,
    };

    // ─── Today's Course Topics/Subtopics ───
    const todayCourseItems = useMemo(() => {
        const items = [];
        courses.forEach(c => {
            c.topics?.forEach(t => {
                if (t.date === today || t.completedDate === today) {
                    items.push({ type: 'topic', name: t.name, course: c.name, completed: t.completed, priority: t.priority || 'medium', startTime: t.startTime, endTime: t.endTime });
                }
                t.subtopics?.forEach(s => {
                    if (s.date === today || s.completedDate === today) {
                        items.push({ type: 'subtopic', name: s.name, course: c.name, completed: s.completed, priority: s.priority || 'medium', startTime: s.startTime, endTime: s.endTime });
                    }
                });
            });
        });
        return items;
    }, [courses, today]);

    // ─── Milestones ───
    const milestones = useMemo(() => {
        const totalTasks = dailyTasks.filter(t => t.completed).length;
        const totalStudyHrs = Math.floor(totalStudyMinutes / 60);
        const totalPapers = fullyCompletedPapers;
        const totalCurriculum = completedCurriculumItems;
        const streakDays = streak.count;

        const list = [
            { id: 'tasks_10', icon: <CheckCircle size={18} />, label: '10 Tasks Done', current: totalTasks, goal: 10, color: '#60a5fa', tier: 'bronze' },
            { id: 'tasks_50', icon: <Target size={18} />, label: '50 Tasks Done', current: totalTasks, goal: 50, color: '#818cf8', tier: 'silver' },
            { id: 'tasks_100', icon: <Trophy size={18} />, label: '100 Tasks Done', current: totalTasks, goal: 100, color: '#fbbf24', tier: 'gold' },
            { id: 'study_10', icon: <Clock size={18} />, label: '10 Hours Study', current: totalStudyHrs, goal: 10, color: '#34d399', tier: 'bronze' },
            { id: 'study_50', icon: <Clock size={18} />, label: '50 Hours Study', current: totalStudyHrs, goal: 50, color: '#a78bfa', tier: 'silver' },
            { id: 'streak_7', icon: <Flame size={18} />, label: '7-Day Streak', current: streakDays, goal: 7, color: '#f97316', tier: 'bronze' },
            { id: 'streak_30', icon: <Crown size={18} />, label: '30-Day Streak', current: streakDays, goal: 30, color: '#ef4444', tier: 'gold' },
            { id: 'papers_3', icon: <FileText size={18} />, label: '3 Papers 100%', current: totalPapers, goal: 3, color: '#ec4899', tier: 'silver' },
            { id: 'curriculum_20', icon: <BookOpen size={18} />, label: '20 Topics Done', current: totalCurriculum, goal: 20, color: '#22d3ee', tier: 'bronze' },
            { id: 'curriculum_100', icon: <Rocket size={18} />, label: '100 Topics Done', current: totalCurriculum, goal: 100, color: '#f472b6', tier: 'gold' },
        ];

        return list.map(m => ({
            ...m,
            progress: Math.min(100, Math.round((m.current / m.goal) * 100)),
            completed: m.current >= m.goal,
        }));
    }, [dailyTasks, totalStudyMinutes, fullyCompletedPapers, completedCurriculumItems, streak]);

    // ─── Charts Data ───
    const days = chartRange === '7' ? getLast7Days() : getLast30Days();
    const chartLabels = days.map(d => formatDateShort(d));
    const taskCompData = days.map(d => dailyTasks.filter(t => t.date === d && t.completed).length);
    const studyChartData = days.map(d => studySessions.filter(s => s.date === d).reduce((s, x) => s + x.totalMinutes, 0));
    const currChartData = days.map(d => {
        let c = 0;
        courses.forEach(co => co.topics?.forEach(t => {
            if (t.completed && t.completedDate === d) c++;
            t.subtopics?.forEach(s => { if (s.completed && s.completedDate === d) c++; });
        }));
        return c;
    });
    const paperChartData = days.map(d => researchPapers.filter(p => p.lastUpdated === d).length);

    const [activeChart, setActiveChart] = useState('tasks');
    const chartConfig = {
        tasks: { label: 'Tasks Completed', data: taskCompData, color: '#818cf8' },
        study: { label: 'Study Minutes', data: studyChartData, color: '#34d399' },
        curriculum: { label: 'Items Completed', data: currChartData, color: '#fbbf24' },
        papers: { label: 'Papers Updated', data: paperChartData, color: '#f472b6' },
    };

    const completedMilestones = milestones.filter(m => m.completed).length;

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <h1><TrendingUp size={28} /> Dashboard</h1>
            </div>

            {/* ═══ ROW 0: Motivation Quote + Countdown Timer ═══ */}
            <div className="dash-top-row">
                <div className="card dash-quote-hero">
                    <div className="dash-quote-hero-bg" />
                    <div className="dash-quote-hero-content">
                        <div className="dash-quote-hero-icon">
                            <Sparkles size={28} />
                        </div>
                        <div className="dash-quote-hero-body">
                            <div className="dash-quote-hero-label">
                                <Quote size={14} /> {quote.type === 'fact' ? 'AI/ML Fact' : 'Daily Inspiration'}
                                {quote.category && <span className="dash-quote-cat">{quote.category}</span>}
                                {quote.source === 'groq_ai' && <span className="dash-quote-ai-badge">✨ AI Generated</span>}
                            </div>
                            {quote.text ? (
                                <>
                                    <blockquote className="dash-quote-hero-text">"{quote.text}"</blockquote>
                                    <cite className="dash-quote-hero-author">— {quote.author}</cite>
                                </>
                            ) : (
                                <blockquote className="dash-quote-hero-text" style={{ opacity: 0.4 }}>Loading inspiration from Groq AI...</blockquote>
                            )}
                        </div>
                    </div>
                </div>

                {/* Countdown Timer Card */}
                <div className="card dash-countdown-card" onClick={() => !cdTarget && setShowCdInput(true)}>
                    <div className="dash-cd-icon"><Hourglass size={22} color="var(--accent-primary)" /></div>
                    {cdTarget && !cdRemaining.expired ? (
                        <div className="dash-cd-display">
                            <div className="dash-cd-segment">
                                <span className="dash-cd-num">{cdRemaining.days}</span>
                                <span className="dash-cd-unit">days</span>
                            </div>
                            <span className="dash-cd-sep">:</span>
                            <div className="dash-cd-segment">
                                <span className="dash-cd-num">{String(cdRemaining.hours).padStart(2, '0')}</span>
                                <span className="dash-cd-unit">hrs</span>
                            </div>
                            <span className="dash-cd-sep">:</span>
                            <div className="dash-cd-segment">
                                <span className="dash-cd-num">{String(cdRemaining.minutes).padStart(2, '0')}</span>
                                <span className="dash-cd-unit">min</span>
                            </div>
                            <span className="dash-cd-sep">:</span>
                            <div className="dash-cd-segment">
                                <span className="dash-cd-num">{String(cdRemaining.seconds).padStart(2, '0')}</span>
                                <span className="dash-cd-unit">sec</span>
                            </div>
                        </div>
                    ) : (
                        <div className="dash-cd-display">
                            <span className="dash-cd-placeholder">{cdTarget ? '⏰ Expired!' : 'Set Target Date'}</span>
                        </div>
                    )}
                    <div className="dash-cd-bottom-row">
                        <span className="dash-cd-label">Countdown Timer</span>
                        <div className="dash-cd-actions">
                            <button className="btn-micro btn-micro-primary" onClick={(e) => { e.stopPropagation(); setShowCdInput(true); }} title="Set countdown">
                                <Timer size={11} />
                            </button>
                            {cdTarget && (
                                <button className="btn-micro btn-micro-ghost" onClick={(e) => { e.stopPropagation(); setCdTarget(''); }} title="Clear">
                                    <X size={11} />
                                </button>
                            )}
                        </div>
                    </div>
                    {showCdInput && (
                        <div className="dash-cd-input-popup" onClick={e => e.stopPropagation()}>
                            <input
                                type="datetime-local"
                                className="input input-sm"
                                autoFocus
                                onChange={e => handleSetCountdown(e.target.value)}
                                onBlur={() => setTimeout(() => setShowCdInput(false), 200)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ ROW 1: Overview Stats (4 cards) ═══ */}
            <div className="card dash-stat-unified">
                <div className="dash-stat-header">
                    <h3><BarChart3 size={18} /> Overview</h3>
                    <div className="tabs">
                        <button className={`tab ${statFilter === 'today' ? 'active' : ''}`} onClick={() => setStatFilter('today')}>Today</button>
                        <button className={`tab ${statFilter === 'overall' ? 'active' : ''}`} onClick={() => setStatFilter('overall')}>Overall</button>
                    </div>
                </div>
                <div className="dash-stat-row">
                    <div className="dash-stat-item dash-stat-tasks">
                        <div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, rgba(96,165,250,0.2), rgba(99,102,241,0.15))' }}><CheckCircle size={20} color="#60a5fa" /></div>
                        <div><div className="dash-stat-label">Daily Tasks</div><div className="dash-stat-value">{statData.tasks}</div></div>
                    </div>
                    <div className="dash-stat-item dash-stat-study">
                        <div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.15))' }}><Clock size={20} color="#34d399" /></div>
                        <div><div className="dash-stat-label">Study Hours</div><div className="dash-stat-value">{statData.study}</div></div>
                    </div>
                    <div className="dash-stat-item dash-stat-curriculum">
                        <div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.15))' }}><BookOpen size={20} color="#fbbf24" /></div>
                        <div><div className="dash-stat-label">Curriculum</div><div className="dash-stat-value">{statData.curriculum}</div></div>
                    </div>
                    <div className="dash-stat-item dash-stat-progression">
                        <div className="dash-stat-prog-ring">
                            <svg viewBox="0 0 44 44" className="dash-stat-ring-svg">
                                <circle cx="22" cy="22" r="18" fill="none" stroke="var(--bg-tertiary)" strokeWidth="4" />
                                <circle cx="22" cy="22" r="18" fill="none" stroke="url(#progGradient)" strokeWidth="4"
                                    strokeDasharray={`${(statFilter === 'today' ? todayProgression : overallProgression) * 1.131} 113.1`}
                                    strokeLinecap="round" transform="rotate(-90 22 22)"
                                    style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }}
                                />
                                <defs>
                                    <linearGradient id="progGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#818cf8" />
                                        <stop offset="100%" stopColor="#a78bfa" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <Percent size={14} className="dash-stat-ring-icon" />
                        </div>
                        <div><div className="dash-stat-label">Progression</div><div className="dash-stat-value">{statData.progression}</div></div>
                    </div>
                </div>
            </div>

            {/* ═══ ROW 2: Trending News Ticker ═══ */}
            {newsHeadlines.length > 0 && (
                <div className="card dash-news-card">
                    <h4 className="dash-news-title"><Newspaper size={16} /> Trending News</h4>
                    <div className="dash-news-list">
                        {newsHeadlines.map((article, i) => (
                            <a
                                key={article.id || i}
                                className="dash-news-item"
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={article.title}
                            >
                                {article.image && (
                                    <img
                                        src={article.image}
                                        alt=""
                                        className="dash-news-thumb"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                )}
                                <div className="dash-news-info">
                                    <span className="dash-news-headline">{article.title}</span>
                                    <span className="dash-news-meta">
                                        <span className="dash-news-cat">{article.category || 'AI'}</span>
                                        <span className="dash-news-source">{article.source}</span>
                                    </span>
                                </div>
                                <ChevronRight size={14} className="dash-news-arrow" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ ROW 3: Calendar + Right Side ═══ */}
            <div className="dash-cal-streak-row">
                <div className="card dash-cal-card">
                    <h4 style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Calendar size={20} color="var(--accent-primary)" /> Activity Heatmap
                    </h4>
                    <Heatmap activityLog={activityLog} dailyTasks={dailyTasks} courses={courses} researchPapers={researchPapers} />
                </div>

                {/* Right side: mini cards + snapshot cards */}
                <div className="dash-right-panel">
                    {/* Row 1: Papers Done (100%), Day Streak, Stopwatch - SAME HEIGHT */}
                    <div className="dash-right-row-3">
                        {/* Day Streak */}
                        <div className="card dash-mini-card dash-streak-card">
                            <div className="dash-mini-card-glow dash-streak-glow" />
                            <Flame size={24} color="#f59e0b" className={streak.count > 0 ? 'dash-fire-animate' : ''} />
                            <div className="dash-mini-value">{streak.count}</div>
                            <div className="dash-mini-label">Day Streak</div>
                            {streak.count >= 7 && <div className="dash-mini-badge">🔥</div>}
                        </div>

                        {/* Papers 100% Done */}
                        <div className="card dash-mini-card dash-papers-card">
                            <div className="dash-mini-card-glow dash-papers-glow" />
                            <FileText size={24} color="#ec4899" />
                            <div className="dash-mini-value">{fullyCompletedPapers}/{researchPapers.length}</div>
                            <div className="dash-mini-label">Papers 100%</div>
                            {fullyCompletedPapers > 0 && <div className="dash-mini-badge">📄</div>}
                        </div>

                        {/* Stopwatch */}
                        <div className="card dash-mini-card dash-stopwatch-mini">
                            <div className="dash-mini-card-glow dash-sw-glow" />
                            <Timer size={20} color="var(--accent-primary)" />
                            <div className="dash-mini-value" style={{ fontSize: '1.1rem' }}>
                                {formatSeconds(swState.isRunning ? swDisplay : swState.accumulatedSeconds)}
                            </div>
                            <div className="dash-sw-actions">
                                <button className={`btn-micro ${swState.isRunning ? 'btn-micro-danger' : 'btn-micro-primary'}`} onClick={swToggle}>
                                    {swState.isRunning ? <Pause size={12} /> : <Play size={12} />}
                                </button>
                                <button className="btn-micro btn-micro-ghost" onClick={swSave} disabled={calcElapsed() < 1}>
                                    <Save size={12} />
                                </button>
                                <button className="btn-micro btn-micro-ghost" onClick={swReset}>
                                    <RotateCcw size={12} />
                                </button>
                            </div>
                            <div className="dash-mini-label">Stopwatch</div>
                        </div>
                    </div>

                    {/* Row 2: Today's Tasks + Today's Course Topics */}
                    <div className="dash-right-row-2">
                        {/* Today's Tasks with Add/Edit/Delete */}
                        <div className="card dash-snapshot-card">
                            <div className="dash-snapshot-header">
                                <h4 className="dash-snapshot-title"><CheckCircle size={16} /> Today's Tasks</h4>
                                <button className="btn-micro btn-micro-primary" onClick={() => setShowAddTask(!showAddTask)} title="Add Task">
                                    <Plus size={12} />
                                </button>
                            </div>

                            {showAddTask && (
                                <div className="dash-add-task-form">
                                    <input
                                        type="text"
                                        className="input input-sm"
                                        placeholder="New task name..."
                                        value={newTaskName}
                                        onChange={e => setNewTaskName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                                        autoFocus
                                    />
                                    <div className="dash-add-task-row">
                                        <select className="select" value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)} style={{ width: 100, fontSize: '0.72rem', padding: '4px 6px' }}>
                                            <option value="high">High</option>
                                            <option value="medium">Medium</option>
                                            <option value="low">Low</option>
                                        </select>
                                        <button className="btn btn-primary btn-xs" onClick={handleAddTask}>Add</button>
                                        <button className="btn btn-ghost btn-xs" onClick={() => setShowAddTask(false)}>Cancel</button>
                                    </div>
                                </div>
                            )}

                            {todayTasks.length === 0 ? (
                                <p className="dash-snapshot-empty">No tasks for today</p>
                            ) : (
                                <ul className="dash-task-list">
                                    {todayTasks.map(t => (
                                        <li key={t.id} className={t.completed ? 'done' : ''}>
                                            <input
                                                type="checkbox"
                                                checked={t.completed}
                                                onChange={() => updateDailyTask(t.id, { completed: !t.completed })}
                                                className="dash-task-checkbox"
                                            />
                                            <span className={`dot priority-${t.priority}`} />
                                            {editingTask === t.id ? (
                                                <input
                                                    type="text"
                                                    className="input input-sm dash-edit-input"
                                                    value={editTaskName}
                                                    onChange={e => setEditTaskName(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit(t.id)}
                                                    onBlur={() => handleSaveEdit(t.id)}
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className="truncate" style={{ flex: 1 }}>{t.name}</span>
                                            )}
                                            {(t.startTime || t.endTime) && (
                                                <span className="dash-time-badge">
                                                    {t.startTime}{t.startTime && t.endTime ? '–' : ''}{t.endTime}
                                                </span>
                                            )}
                                            <div className="dash-task-actions">
                                                <button className="btn-micro btn-micro-ghost" onClick={() => handleEditTask(t)} title="Edit">
                                                    <Edit3 size={10} />
                                                </button>
                                                <button className="btn-micro btn-micro-ghost" onClick={() => deleteDailyTask(t.id)} title="Delete">
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                            {t.completed && <CheckCircle size={14} color="var(--success)" />}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Today's Course Topics */}
                        <div className="card dash-snapshot-card">
                            <div className="dash-snapshot-header">
                                <h4 className="dash-snapshot-title"><BookOpen size={16} /> Today's Course Topics</h4>
                            </div>
                            {todayCourseItems.length === 0 ? (
                                <p className="dash-snapshot-empty">No topics scheduled for today</p>
                            ) : (
                                <ul className="dash-task-list">
                                    {todayCourseItems.map((item, i) => (
                                        <li key={i} className={item.completed ? 'done' : ''}>
                                            <span className={`dot priority-${item.priority}`} />
                                            <span className="truncate" style={{ flex: 1 }}>
                                                {item.type === 'subtopic' ? '  ↳ ' : ''}{item.name}
                                            </span>
                                            <span className="dash-course-tag">{item.course}</span>
                                            {(item.startTime || item.endTime) && (
                                                <span className="dash-time-badge">
                                                    {item.startTime}{item.startTime && item.endTime ? '–' : ''}{item.endTime}
                                                </span>
                                            )}
                                            {item.completed && <CheckCircle size={14} color="var(--success)" />}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ Charts Card ═══ */}
            <div className="card dash-charts-unified">
                <div className="dash-charts-header">
                    <div className="dash-chart-tabs">
                        {[
                            { key: 'tasks', label: 'Daily Tasks', icon: <CheckCircle size={14} /> },
                            { key: 'study', label: 'Study Hours', icon: <Clock size={14} /> },
                            { key: 'curriculum', label: 'Curriculum', icon: <BookOpen size={14} /> },
                            { key: 'papers', label: 'Research', icon: <FileText size={14} /> },
                        ].map(t => (
                            <button key={t.key} className={`dash-chart-tab ${activeChart === t.key ? 'active' : ''}`} onClick={() => setActiveChart(t.key)}>
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="tabs">
                        <button className={`tab ${chartRange === '7' ? 'active' : ''}`} onClick={() => setChartRange('7')}>7 Days</button>
                        <button className={`tab ${chartRange === '30' ? 'active' : ''}`} onClick={() => setChartRange('30')}>30 Days</button>
                    </div>
                </div>
                <LineChart
                    labels={chartLabels}
                    datasets={[{ label: chartConfig[activeChart].label, data: chartConfig[activeChart].data }]}
                    height={280}
                />
            </div>

            {/* ═══ Milestones Card ═══ */}
            <div className="card dash-milestones-card">
                <div className="dash-milestones-header">
                    <h3><Award size={18} /> Milestones</h3>
                    <div className="dash-milestone-summary">
                        <Trophy size={14} color="#fbbf24" />
                        <span>{completedMilestones}/{milestones.length} Achieved</span>
                    </div>
                </div>
                <div className="dash-milestones-grid">
                    {milestones.map(m => (
                        <div key={m.id} className={`dash-milestone-item ${m.completed ? 'completed' : ''} tier-${m.tier}`}>
                            <div className="dash-milestone-icon" style={{ color: m.color }}>
                                {m.completed ? <Star size={18} /> : m.icon}
                            </div>
                            <div className="dash-milestone-info">
                                <span className="dash-milestone-label">{m.label}</span>
                                <div className="dash-milestone-bar">
                                    <div className="dash-milestone-fill" style={{ width: `${m.progress}%`, background: m.color }} />
                                </div>
                                <span className="dash-milestone-progress">{m.current}/{m.goal}</span>
                            </div>
                            {m.completed && <div className="dash-milestone-check">✓</div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
