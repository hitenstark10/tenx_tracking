import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { LineChart } from '../components/Charts';
import Heatmap from '../components/Heatmap';
import {
    CheckCircle, Clock, Zap, BookOpen, FileText, TrendingUp,
    Play, Pause, Save, RotateCcw, Calendar, Flame, BarChart3,
    Sparkles, Quote, Target, Timer, Hourglass, X, Percent
} from 'lucide-react';
import {
    getToday, formatMinutesToHHMM, formatSeconds,
    getDaysCountdownTo, getLast7Days, getLast30Days, formatDateShort,
    getCourseProgress
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
    } = useData();

    const [statFilter, setStatFilter] = useState('today');
    const [chartRange, setChartRange] = useState('7');

    // ─── Quote from Groq AI API — Frontend Timer: every 144 min (~10/day) ───
    const QUOTE_INTERVAL_MS = 144 * 60 * 1000; // 144 minutes
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
                // On failure, keep the currently cached quote
                const cached = localStorage.getItem('tenx_quote_cache');
                if (cached) {
                    try { setQuote(JSON.parse(cached)); } catch { }
                } else {
                    setQuote({ text: 'Every expert was once a beginner.', author: 'Helen Hayes', category: 'AI', type: 'quote', source: 'fallback' });
                }
            });
    }, []);

    useEffect(() => {
        fetchQuote(); // Fetch immediately on mount
        quoteTimerRef.current = setInterval(fetchQuote, QUOTE_INTERVAL_MS);
        return () => clearInterval(quoteTimerRef.current);
    }, [fetchQuote]);

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

    // ─── Persistent Countdown (mini card) ───
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

    // ─── Stat computations ───
    const today = getToday();
    const todayStudyMin = studySessions.filter(s => s.date === today).reduce((s, x) => s + x.totalMinutes, 0);

    // TODAY curriculum: only items with date === today
    let todayCurrTotal = 0, todayCurrDone = 0;
    courses.forEach(c => c.topics?.forEach(t => {
        if (t.date === today) {
            todayCurrTotal++;
            if (t.completed) todayCurrDone++;
        }
        t.subtopics?.forEach(s => {
            if (s.date === today) {
                todayCurrTotal++;
                if (s.completed) todayCurrDone++;
            }
        });
    }));

    // Papers that are 100% done
    const fullyCompletedPapers = researchPapers.filter(p => p.completionPercentage >= 100).length;
    const todayPapersUpdated = researchPapers.filter(p => p.lastUpdated === today).length;

    // Overall Progression
    const overallProgression = totalCurriculumItems > 0
        ? Math.round((completedCurriculumItems / totalCurriculumItems) * 100) : 0;
    const todayProgression = todayCurrTotal > 0 ? Math.round((todayCurrDone / todayCurrTotal) * 100) : 0;

    const statData = statFilter === 'today' ? {
        tasks: `${todayCompletedTasks}/${todayTasks.length}`,
        study: formatMinutesToHHMM(todayStudyMin),
        curriculum: `${todayCurrDone}/${todayCurrTotal || '-'}`,
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

                {/* Countdown Timer Card — Right Side of Quotes */}
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

            {/* ═══ ROW 1: Overview Stats (4 cards: Tasks, Study, Curriculum, Progression %) ═══ */}
            <div className="card dash-stat-unified">
                <div className="dash-stat-header">
                    <h3><BarChart3 size={18} /> Overview</h3>
                    <div className="tabs">
                        <button className={`tab ${statFilter === 'today' ? 'active' : ''}`} onClick={() => setStatFilter('today')}>Today</button>
                        <button className={`tab ${statFilter === 'overall' ? 'active' : ''}`} onClick={() => setStatFilter('overall')}>Overall</button>
                    </div>
                </div>
                <div className="dash-stat-row">
                    <div className="dash-stat-item">
                        <div className="dash-stat-icon" style={{ background: 'var(--info-bg)' }}><CheckCircle size={20} color="var(--info)" /></div>
                        <div><div className="dash-stat-label">Daily Tasks</div><div className="dash-stat-value">{statData.tasks}</div></div>
                    </div>
                    <div className="dash-stat-item">
                        <div className="dash-stat-icon" style={{ background: 'var(--success-bg)' }}><Clock size={20} color="var(--success)" /></div>
                        <div><div className="dash-stat-label">Study Hours</div><div className="dash-stat-value">{statData.study}</div></div>
                    </div>
                    <div className="dash-stat-item">
                        <div className="dash-stat-icon" style={{ background: 'var(--warning-bg)' }}><BookOpen size={20} color="var(--warning)" /></div>
                        <div><div className="dash-stat-label">Curriculum</div><div className="dash-stat-value">{statData.curriculum}</div></div>
                    </div>
                    <div className="dash-stat-item dash-stat-progression">
                        <div className="dash-stat-prog-ring">
                            <svg viewBox="0 0 44 44" className="dash-stat-ring-svg">
                                <circle cx="22" cy="22" r="18" fill="none" stroke="var(--bg-tertiary)" strokeWidth="4" />
                                <circle cx="22" cy="22" r="18" fill="none" stroke="var(--accent-primary)" strokeWidth="4"
                                    strokeDasharray={`${(statFilter === 'today' ? todayProgression : overallProgression) * 1.131} 113.1`}
                                    strokeLinecap="round" transform="rotate(-90 22 22)"
                                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                                />
                            </svg>
                            <Percent size={14} className="dash-stat-ring-icon" />
                        </div>
                        <div><div className="dash-stat-label">Progression</div><div className="dash-stat-value">{statData.progression}</div></div>
                    </div>
                </div>
            </div>

            {/* ═══ ROW 2: Calendar + Right Side ═══ */}
            <div className="dash-cal-streak-row">
                <div className="card dash-cal-card">
                    <h4 style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Calendar size={20} color="var(--accent-primary)" /> Activity Heatmap
                    </h4>
                    <Heatmap activityLog={activityLog} dailyTasks={dailyTasks} courses={courses} researchPapers={researchPapers} />
                </div>

                {/* Right side: mini cards + snapshot cards */}
                <div className="dash-right-panel">
                    {/* Row 1: Papers Done (100%), Day Streak, Stopwatch */}
                    <div className="dash-right-row-3">
                        {/* Papers 100% Done */}
                        <div className="card dash-mini-card">
                            <FileText size={22} color="var(--danger)" />
                            <div className="dash-mini-value">{fullyCompletedPapers}/{researchPapers.length}</div>
                            <div className="dash-mini-label">Papers 100%</div>
                        </div>

                        {/* Day Streak */}
                        <div className="card dash-mini-card">
                            <Flame size={22} color="#f59e0b" />
                            <div className="dash-mini-value">{streak.count}</div>
                            <div className="dash-mini-label">Day Streak</div>
                        </div>

                        {/* Stopwatch */}
                        <div className="card dash-mini-card dash-stopwatch-mini">
                            <Timer size={18} color="var(--accent-primary)" />
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
                        <div className="card dash-snapshot-card">
                            <h4 className="dash-snapshot-title"><CheckCircle size={16} /> Today's Tasks</h4>
                            {todayTasks.length === 0 ? (
                                <p className="dash-snapshot-empty">No tasks for today</p>
                            ) : (
                                <ul className="dash-task-list">
                                    {todayTasks.map(t => (
                                        <li key={t.id} className={t.completed ? 'done' : ''}>
                                            <span className={`dot priority-${t.priority}`} />
                                            <span className="truncate" style={{ flex: 1 }}>{t.name}</span>
                                            {(t.startTime || t.endTime) && (
                                                <span className="dash-time-badge">
                                                    {t.startTime}{t.startTime && t.endTime ? '–' : ''}{t.endTime}
                                                </span>
                                            )}
                                            {t.completed && <CheckCircle size={14} color="var(--success)" />}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="card dash-snapshot-card">
                            <h4 className="dash-snapshot-title"><BookOpen size={16} /> Today's Course Topics</h4>
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
        </div>
    );
}
