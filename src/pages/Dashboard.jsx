import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { LineChart } from '../components/Charts';
import Heatmap from '../components/Heatmap';
import {
    CheckCircle, Clock, Zap, BookOpen, FileText, TrendingUp,
    Play, Pause, Save, RotateCcw, Calendar, Flame, BarChart3,
    Sparkles, Quote
} from 'lucide-react';
import {
    getToday, formatMinutesToHHMM, formatSeconds,
    getDaysCountdownTo, getLast7Days, getLast30Days, formatDateShort,
    getCourseProgress
} from '../utils/helpers';
import { getStopwatch, saveStopwatch, getCountdown, saveCountdown } from '../utils/storage';
import './Dashboard.css';

const API_BASE = 'https://tenx-tracking-716qhpgum-hitens-projects-b4b594f8.vercel.app';

export default function Dashboard() {
    const {
        dailyTasks, courses, researchPapers, studySessions,
        todayTasks, todayCompletedTasks, totalStudyMinutes,
        totalCurriculumItems, completedCurriculumItems, completedPapers,
        streak, addStudySession, activityLog,
    } = useData();

    const [statFilter, setStatFilter] = useState('today');
    const [chartRange, setChartRange] = useState('7');

    // ─── Quote from Groq AI API (fetched on page refresh only) ───
    const [quote, setQuote] = useState({ text: '', author: '', category: '', type: '' });
    useEffect(() => {
        fetch(`${API_BASE}/api/quotes/random`)
            .then(r => r.json())
            .then(data => setQuote(data))
            .catch(() => {
                setQuote({ text: 'Every expert was once a beginner.', author: 'Helen Hayes', category: 'AI', type: 'quote', source: 'fallback' });
            });
    }, []); // Only on mount (dashboard page refresh)

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

    // ─── Persistent Countdown ───
    const [cdTarget, setCdTarget] = useState(() => getCountdown());
    const [cdRemaining, setCdRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });

    useEffect(() => {
        saveCountdown(cdTarget);
        if (!cdTarget) return;
        const tick = () => setCdRemaining(getDaysCountdownTo(cdTarget));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [cdTarget]);

    // ─── Stat computations ───
    const today = getToday();

    // Today values
    const todayStudyMin = studySessions.filter(s => s.date === today).reduce((s, x) => s + x.totalMinutes, 0);
    let todayCurrTotal = 0, todayCurrDone = 0;
    courses.forEach(c => c.topics?.forEach(t => {
        if (t.completedDate === today) { todayCurrTotal++; todayCurrDone++; }
        else if (t.date === today || !t.completedDate) todayCurrTotal++;
        t.subtopics?.forEach(s => {
            if (s.completedDate === today) { todayCurrTotal++; todayCurrDone++; }
            else if (s.date === today || !s.completedDate) todayCurrTotal++;
        });
    }));
    const todayPapersUpdated = researchPapers.filter(p => p.lastUpdated === today).length;

    const statData = statFilter === 'today' ? {
        tasks: `${todayCompletedTasks}/${todayTasks.length}`,
        study: formatMinutesToHHMM(todayStudyMin),
        curriculum: `${todayCurrDone}/${todayCurrTotal || '-'}`,
        papers: `${todayPapersUpdated}/${researchPapers.length}`,
    } : {
        tasks: `${dailyTasks.filter(t => t.completed).length}/${dailyTasks.length}`,
        study: formatMinutesToHHMM(totalStudyMinutes),
        curriculum: `${completedCurriculumItems}/${totalCurriculumItems}`,
        papers: `${completedPapers}/${researchPapers.length}`,
    };

    // ─── Average completion ───
    const avgCompletion = totalCurriculumItems > 0
        ? Math.round((completedCurriculumItems / totalCurriculumItems) * 100) : 0;

    // ─── Today's Course Topics/Subtopics ───
    const todayCourseItems = useMemo(() => {
        const items = [];
        courses.forEach(c => {
            c.topics?.forEach(t => {
                // Show topics that are scheduled for today OR were completed today
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

            {/* ═══ ROW 0: Motivation Quote — LARGE DECORATIVE CARD AT TOP ═══ */}
            <div className="card dash-quote-hero">
                <div className="dash-quote-hero-bg" />
                <div className="dash-quote-hero-content">
                    <div className="dash-quote-hero-icon">
                        <Sparkles size={32} />
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

            {/* ═══ ROW 1: Unified Stat Card ═══ */}
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
                    <div className="dash-stat-item">
                        <div className="dash-stat-icon" style={{ background: 'var(--danger-bg)' }}><FileText size={20} color="var(--danger)" /></div>
                        <div><div className="dash-stat-label">Papers Done</div><div className="dash-stat-value">{statData.papers}</div></div>
                    </div>
                </div>
            </div>

            {/* ═══ ROW 2: Calendar + Streak/Avg ═══ */}
            <div className="dash-cal-streak-row">
                <div className="card dash-cal-card">
                    <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={16} color="var(--accent-primary)" /> Activity Heatmap
                    </h4>
                    <Heatmap activityLog={activityLog} dailyTasks={dailyTasks} courses={courses} researchPapers={researchPapers} />
                </div>
                <div className="dash-streak-avg-col">
                    <div className="card dash-streak-card">
                        <Flame size={28} color="#f59e0b" />
                        <div className="dash-streak-num">{streak.count}</div>
                        <div className="dash-streak-label">Day Streak</div>
                    </div>
                    <div className="card dash-avg-card">
                        <TrendingUp size={28} color="var(--success)" />
                        <div className="dash-avg-num">{avgCompletion}%</div>
                        <div className="dash-avg-label">Avg Completion</div>
                    </div>
                </div>
            </div>

            {/* ═══ ROW 3: Stopwatch, Countdown ═══ */}
            <div className="dash-time-row">
                <div className="card dash-timer-card">
                    <h4>⏱️ Study Stopwatch</h4>
                    <div className="timer-display">{formatSeconds(swState.isRunning ? swDisplay : swState.accumulatedSeconds)}</div>
                    <div className="timer-actions">
                        <button className={`btn ${swState.isRunning ? 'btn-danger' : 'btn-primary'} btn-sm`} onClick={swToggle}>
                            {swState.isRunning ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Start</>}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={swSave} disabled={calcElapsed() < 1}>
                            <Save size={14} /> Save
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={swReset}>
                            <RotateCcw size={14} />
                        </button>
                    </div>
                </div>
                <div className="card dash-timer-card">
                    <h4>⏳ Countdown Timer</h4>
                    {cdTarget && !cdRemaining.expired ? (
                        <div className="timer-display">
                            {cdRemaining.days}d {String(cdRemaining.hours).padStart(2, '0')}:{String(cdRemaining.minutes).padStart(2, '0')}:{String(cdRemaining.seconds).padStart(2, '0')}
                        </div>
                    ) : (
                        <div className="timer-display" style={{ fontSize: '1.2rem', color: 'var(--text-tertiary)' }}>
                            {cdTarget ? 'Expired!' : 'Set a target'}
                        </div>
                    )}
                    <input type="datetime-local" className="input" style={{ marginTop: 8 }} value={cdTarget} onChange={e => setCdTarget(e.target.value)} />
                </div>
            </div>

            {/* ═══ ROW 4: Today's Tasks + Today's Course Topics ═══ */}
            <div className="dash-snapshots">
                <div className="card">
                    <h4 className="section-title"><CheckCircle size={18} /> Today's Tasks</h4>
                    {todayTasks.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No tasks for today</p> : (
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
                <div className="card">
                    <h4 className="section-title"><BookOpen size={18} /> Today's Course Topics</h4>
                    {todayCourseItems.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No topics scheduled for today</p> : (
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

            {/* ═══ ROW 5: Unified Charts Card ═══ */}
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

