import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getHeatmapMonth } from '../utils/helpers';
import './Heatmap.css';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Heatmap Calendar — 7-day COLUMN layout
 * Days of the week are columns, weeks are rows.
 *
 * trackingMode:
 *   'all'     — use all data sources (default, dashboard)
 *   'tasks'   — only daily tasks (Daily Tasks page)
 *   'courses' — only course topics/subtopics (Courses page)
 */
export default function Heatmap({ activityLog, dailyTasks, courses, researchPapers, onDateClick, selectedDate, trackingMode = 'all' }) {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [tooltip, setTooltip] = useState(null);

    // getHeatmapMonth returns weeks (rows), each with 7 day slots (Sun-Sat)
    const weeks = useMemo(() => {
        const rawWeeks = getHeatmapMonth(year, month, activityLog, dailyTasks, courses, researchPapers);

        if (trackingMode === 'all') return rawWeeks;

        return rawWeeks.map(week =>
            week.map(cell => {
                if (!cell) return null;
                const a = cell.activity;
                let filteredTotal;
                if (trackingMode === 'tasks') {
                    filteredTotal = a.tasks;
                } else if (trackingMode === 'courses') {
                    filteredTotal = a.curriculum;
                } else {
                    filteredTotal = a.total;
                }
                let level;
                if (filteredTotal === 0) level = 0;
                else if (filteredTotal <= 2) level = 1;
                else if (filteredTotal <= 5) level = 2;
                else if (filteredTotal <= 8) level = 3;
                else if (filteredTotal <= 12) level = 4;
                else level = 5;

                return { ...cell, level, filteredTotal };
            })
        );
    }, [year, month, activityLog, dailyTasks, courses, researchPapers, trackingMode]);

    const monthName = new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
    const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

    const renderTooltipRows = (data) => {
        if (trackingMode === 'tasks') {
            return (
                <>
                    <div className="htt-row"><span>Tasks:</span><b>{data.activity.tasks}</b></div>
                    <div className="htt-total">Total: {data.activity.tasks}</div>
                </>
            );
        }
        if (trackingMode === 'courses') {
            return (
                <>
                    <div className="htt-row"><span>Topics & Subtopics:</span><b>{data.activity.curriculum}</b></div>
                    <div className="htt-total">Total: {data.activity.curriculum}</div>
                </>
            );
        }
        return (
            <>
                <div className="htt-row"><span>Tasks:</span><b>{data.activity.tasks}</b></div>
                <div className="htt-row"><span>Curriculum:</span><b>{data.activity.curriculum}</b></div>
                <div className="htt-row"><span>Papers:</span><b>{data.activity.papers}</b></div>
                <div className="htt-row"><span>Resources:</span><b>{data.activity.resources}</b></div>
                <div className="htt-row"><span>Articles:</span><b>{data.activity.articlesRead}</b></div>
                <div className="htt-total">Total: {data.activity.total}</div>
            </>
        );
    };

    return (
        <div className="heatmap-container">
            <div className="heatmap-header">
                <button className="btn btn-ghost btn-icon" onClick={prevMonth}><ChevronLeft size={16} /></button>
                <span className="heatmap-month">{monthName}</span>
                <button className="btn btn-ghost btn-icon" onClick={nextMonth}><ChevronRight size={16} /></button>
            </div>

            {/* Column layout: Day headers across the top, then week rows below */}
            <div className="heatmap-col-grid">
                {/* Day column headers */}
                <div className="heatmap-col-header">
                    <div className="heatmap-col-label-spacer" />
                    {DAY_LABELS.map(d => (
                        <div key={d} className="heatmap-col-day-label">{d}</div>
                    ))}
                </div>

                {/* Week rows: each week = 1 row, each cell is in a day column */}
                {weeks.map((week, wi) => (
                    <div key={wi} className="heatmap-col-row">
                        <div className="heatmap-col-week-label">W{wi + 1}</div>
                        {week.map((cell, di) => (
                            <div key={di}
                                className={`heatmap-cell ${!cell ? 'empty' : ''} ${cell?.isToday ? 'today' : ''} ${cell?.date === selectedDate ? 'selected' : ''}`}
                                style={{ background: cell ? `var(--heatmap-${cell.level})` : 'transparent' }}
                                onClick={() => cell && onDateClick?.(cell.date)}
                                onMouseEnter={(e) => { if (!cell) return; setTooltip({ x: e.clientX, y: e.clientY - 120, data: cell }); }}
                                onMouseLeave={() => setTooltip(null)}
                            >
                                {cell && <span className="heatmap-cell-text">{cell.day}</span>}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div className="heatmap-legend">
                <span className="heatmap-legend-label">Less</span>
                {[0, 1, 2, 3, 4, 5].map(l => <div key={l} className="heatmap-legend-cell" style={{ background: `var(--heatmap-${l})` }} />)}
                <span className="heatmap-legend-label">More</span>
            </div>

            {tooltip && (
                <div className="heatmap-tooltip" style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, zIndex: 9999 }}>
                    <div className="htt-date">{tooltip.data.date}</div>
                    {renderTooltipRows(tooltip.data)}
                </div>
            )}
        </div>
    );
}
