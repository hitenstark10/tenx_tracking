import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import Modal from '../components/Modal';
import { DoughnutChart, BarChart } from '../components/Charts';
import Heatmap from '../components/Heatmap';
import { Plus, BookOpen, Search, Trash2, Edit3, Eye, Calendar, Layers, Upload } from 'lucide-react';
import { getToday, getCourseProgress, getLast7Days, getLast30Days, formatDateShort } from '../utils/helpers';
import './Courses.css';

export default function Courses() {
    const { courses, addCourse, updateCourse, deleteCourse, activityLog } = useData();
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);
    const [editCourse, setEditCourse] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', priority: 'medium', startDate: getToday(), endDate: '' });
    const [searchQ, setSearchQ] = useState('');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [timeRange, setTimeRange] = useState('7');

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (!form.name.trim()) return;
        if (editCourse) { updateCourse(editCourse.id, { ...form }); setEditCourse(null); }
        else { addCourse({ ...form }); }
        setForm({ name: '', description: '', priority: 'medium', startDate: getToday(), endDate: '' });
        setModalOpen(false);
    };

    const openEdit = (course) => {
        setForm({ name: course.name, description: course.description || '', priority: course.priority, startDate: course.startDate || '', endDate: course.endDate || '' });
        setEditCourse(course);
        setModalOpen(true);
    };

    const filtered = useMemo(() => {
        return courses.filter(c => {
            if (searchQ && !c.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
            if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
            const progress = getCourseProgress(c);
            if (filterStatus === 'completed' && progress < 100) return false;
            if (filterStatus === 'in-progress' && (progress <= 0 || progress >= 100)) return false;
            if (filterStatus === 'not-started' && progress > 0) return false;
            return true;
        });
    }, [courses, searchQ, filterPriority, filterStatus]);

    // Today's completion data for donut (only what was completed today)
    const today = getToday();
    let todayCompleted = 0, todayTotal = 0;
    courses.forEach(c => {
        c.topics?.forEach(t => {
            // Count items that are scheduled for today or were completed today
            const isRelevant = t.date === today || t.completedDate === today;
            if (isRelevant || (!t.completed && !t.completedDate)) {
                todayTotal++;
                if (t.completed && t.completedDate === today) todayCompleted++;
            }
            t.subtopics?.forEach(s => {
                const sSched = s.date === today || s.completedDate === today;
                if (sSched || (!s.completed && !s.completedDate)) {
                    todayTotal++;
                    if (s.completed && s.completedDate === today) todayCompleted++;
                }
            });
        });
    });
    const todayPct = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

    // Overall totals for bar chart
    let totalItems = 0, completedItems = 0;
    courses.forEach(c => {
        c.topics?.forEach(t => { totalItems++; if (t.completed) completedItems++; t.subtopics?.forEach(s => { totalItems++; if (s.completed) completedItems++; }); });
    });

    // Curriculum Progress: per day, completed vs remaining topics AND subtopics
    const days = timeRange === '7' ? getLast7Days() : getLast30Days();
    const labels = days.map(d => formatDateShort(d));
    const completedData = days.map(d => {
        let c = 0;
        courses.forEach(co => co.topics?.forEach(t => {
            if (t.completed && t.completedDate === d) c++;
            t.subtopics?.forEach(s => { if (s.completed && s.completedDate === d) c++; });
        }));
        return c;
    });
    const remainingData = days.map(d => {
        let total = 0;
        let done = 0;
        courses.forEach(co => co.topics?.forEach(t => {
            if (t.date === d || t.completedDate === d) {
                total++;
                if (t.completed && t.completedDate === d) done++;
            }
            t.subtopics?.forEach(s => {
                if (s.date === d || s.completedDate === d) {
                    total++;
                    if (s.completed && s.completedDate === d) done++;
                }
            });
        }));
        return Math.max(0, total - done);
    });

    // Helper: get topic/subtopic counts
    const getCounts = (course) => {
        const topicCount = course.topics?.length || 0;
        let subtopicCount = 0;
        course.topics?.forEach(t => { subtopicCount += (t.subtopics?.length || 0); });
        return { topicCount, subtopicCount };
    };

    return (
        <div className="courses-page">
            <div className="page-header">
                <h1><BookOpen size={28} /> Courses</h1>
                <button className="btn btn-primary" onClick={() => { setEditCourse(null); setForm({ name: '', description: '', priority: 'medium', startDate: getToday(), endDate: '' }); setModalOpen(true); }}><Plus size={16} /> Add Course</button>
            </div>

            {/* Analytics Row */}
            <div className="co-analytics-row">
                <div className="co-donut-card card">
                    <h4>Today's Completion</h4>
                    <DoughnutChart labels={['Completed', 'Remaining']} data={[todayCompleted, Math.max(0, todayTotal - todayCompleted)]} centerText={`${todayPct}%`} height={400} />
                </div>
                <div className="co-bar-card card">
                    <div className="co-bar-header">
                        <h4>Curriculum Progress</h4>
                        <div className="tabs">
                            <button className={`tab ${timeRange === '7' ? 'active' : ''}`} onClick={() => setTimeRange('7')}>7d</button>
                            <button className={`tab ${timeRange === '30' ? 'active' : ''}`} onClick={() => setTimeRange('30')}>30d</button>
                        </div>
                    </div>
                    <BarChart labels={labels} datasets={[
                        { label: 'Completed', data: completedData },
                        { label: 'Remaining', data: remainingData },
                    ]} height={300} />
                </div>
                {/* </div> */}

                {/* Heatmap — tracks course topics/subtopics only */}
                <div className="card" style={{ marginBottom: 24 }}>
                    <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={18} color="var(--accent-primary)" /> Course Activity
                    </h4>
                    <Heatmap
                        activityLog={activityLog}
                        dailyTasks={[]}
                        courses={courses}
                        researchPapers={[]}
                        trackingMode="courses"
                    />
                </div>
            </div>

            <div className="filter-bar">
                <div className="search-wrapper"><Search size={16} /><input className="input" placeholder="Search courses..." value={searchQ} onChange={e => setSearchQ(e.target.value)} /></div>
                <select className="select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ width: 140 }}><option value="all">All Priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
                <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 160 }}><option value="all">All Status</option><option value="completed">Completed</option><option value="in-progress">In Progress</option><option value="not-started">Not Started</option></select>
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state"><BookOpen size={48} /><h4>No courses yet</h4><p>Add your first course to start tracking</p></div>
            ) : (
                <div className="co-grid">
                    {filtered.map(c => {
                        const prog = getCourseProgress(c);
                        const { topicCount, subtopicCount } = getCounts(c);
                        const resourceCount = (c.topics || []).reduce((count, t) => {
                            return count + (t.resources?.length || 0) +
                                ((t.subtopics || []).reduce((sc, s) => sc + (s.resources?.length || 0), 0));
                        }, 0);
                        return (
                            <div key={c.id} className="card co-card card-interactive" onClick={() => navigate(`/courses/${c.id}`)}>
                                <div className="co-card-top">
                                    <h3 className="co-card-name">{c.name}</h3>
                                    <span className={`badge badge-${c.priority}`}>{c.priority}</span>
                                </div>
                                {c.description && <p className="co-card-desc">{c.description}</p>}
                                {(c.startDate || c.endDate) && (
                                    <div className="co-card-dates">
                                        <Calendar size={12} />
                                        {c.startDate && <span>{c.startDate}</span>}
                                        {c.startDate && c.endDate && <span>→</span>}
                                        {c.endDate && <span>{c.endDate}</span>}
                                    </div>
                                )}
                                <div className="co-card-counts">
                                    <span className="co-count-pill"><Layers size={12} /> {topicCount} topics</span>
                                    <span className="co-count-pill">{subtopicCount} subtopics</span>
                                    <span className="co-count-pill"><Upload size={12} /> {resourceCount} resources</span>
                                </div>
                                <div className="co-card-progress">
                                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${prog}%` }} /></div>
                                    <span className="progress-label">{prog}%</span>
                                </div>
                                <div className="co-card-footer">
                                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{topicCount} topics · {subtopicCount} subtopics</span>
                                    <div className="co-card-actions" onClick={e => e.stopPropagation()}>
                                        <button className="btn btn-ghost btn-icon btn-xs" onClick={() => openEdit(c)}><Edit3 size={14} /></button>
                                        <button className="btn btn-ghost btn-icon btn-xs" onClick={() => { if (confirm('Delete course?')) deleteCourse(c.id); }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditCourse(null); }} title={editCourse ? 'Edit Course' : 'Add Course'}
                footer={<><button className="btn btn-secondary" onClick={() => { setModalOpen(false); setEditCourse(null); }}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>{editCourse ? 'Update' : 'Add'}</button></>}>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="input-group"><label>Course Name *</label><input className="input" placeholder="e.g., Machine Learning Foundations" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                    <div className="input-group"><label>Description</label><textarea className="textarea" placeholder="Course overview..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                    <div className="input-row">
                        <div className="input-group"><label>Priority</label><select className="select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                    </div>
                    <div className="input-row">
                        <div className="input-group"><label>Start Date</label><input type="date" className="input" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                        <div className="input-group"><label>End Date</label><input type="date" className="input" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
