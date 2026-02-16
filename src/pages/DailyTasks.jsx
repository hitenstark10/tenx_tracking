import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import Modal from '../components/Modal';
import { BarChart, DoughnutChart } from '../components/Charts';
import Heatmap from '../components/Heatmap';
import {
    Plus, CheckSquare, Search, Trash2, Edit3, Check, Calendar, Clock
} from 'lucide-react';
import { getToday, getLast7Days, getLast30Days, formatDateShort } from '../utils/helpers';
import './DailyTasks.css';

function calcDuration(startTime, endTime) {
    if (!startTime || !endTime) return null;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let diffMin = (eh * 60 + em) - (sh * 60 + sm);
    if (diffMin < 0) diffMin += 24 * 60;
    const hrs = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h`;
    return `${mins}m`;
}

export default function DailyTasks() {
    const { dailyTasks, addDailyTask, updateDailyTask, deleteDailyTask, activityLog } = useData();
    const [modalOpen, setModalOpen] = useState(false);
    const [editTask, setEditTask] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', priority: 'medium', date: getToday(), startTime: '', endTime: '' });
    const [searchQ, setSearchQ] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [timeRange, setTimeRange] = useState('7');

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (!form.name.trim()) return;
        if (editTask) {
            updateDailyTask(editTask.id, { ...form });
            setEditTask(null);
        } else {
            addDailyTask({ ...form });
        }
        setForm({ name: '', description: '', priority: 'medium', date: getToday(), startTime: '', endTime: '' });
        setModalOpen(false);
    };

    const openEdit = (task) => {
        setForm({ name: task.name, description: task.description || '', priority: task.priority, date: task.date, startTime: task.startTime || '', endTime: task.endTime || '' });
        setEditTask(task);
        setModalOpen(true);
    };

    const handleDateClick = (date) => setSelectedDate(date);

    const filtered = useMemo(() => {
        return dailyTasks.filter(t => {
            if (selectedDate && t.date !== selectedDate) return false;
            if (searchQ && !t.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
            if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
            if (filterStatus === 'completed' && !t.completed) return false;
            if (filterStatus === 'pending' && t.completed) return false;
            return true;
        });
    }, [dailyTasks, selectedDate, searchQ, filterPriority, filterStatus]);

    // Analytics
    const todayTasksList = dailyTasks.filter(t => t.date === selectedDate);
    const todayDone = todayTasksList.filter(t => t.completed).length;
    const todayPct = todayTasksList.length > 0 ? Math.round((todayDone / todayTasksList.length) * 100) : 0;

    const days = timeRange === '7' ? getLast7Days() : getLast30Days();
    const labels = days.map(d => formatDateShort(d));
    const completedData = days.map(d => dailyTasks.filter(t => t.date === d && t.completed).length);
    const remainingData = days.map(d => dailyTasks.filter(t => t.date === d && !t.completed).length);

    return (
        <div className="daily-tasks-page">
            <div className="page-header">
                <h1><CheckSquare size={28} /> Daily Tasks</h1>
                <button className="btn btn-primary" onClick={() => { setEditTask(null); setForm({ name: '', description: '', priority: 'medium', date: selectedDate || getToday(), startTime: '', endTime: '' }); setModalOpen(true); }}>
                    <Plus size={16} /> Add Task
                </button>
            </div>

            {/* Analytics Row */}
            <div className="dt-analytics-row">
                <div className="dt-donut-card card">
                    <h4>{selectedDate === getToday() ? "Today's" : selectedDate} Completion</h4>
                    <DoughnutChart
                        labels={['Completed', 'Remaining']}
                        data={[todayDone, todayTasksList.length - todayDone]}
                        centerText={`${todayPct}%`}
                        height={400}
                    />
                </div>
                <div className="dt-bar-card card">
                    <div className="dt-bar-header">
                        <h4>Tasks Overview</h4>
                        <div className="tabs">
                            <button className={`tab ${timeRange === '7' ? 'active' : ''}`} onClick={() => setTimeRange('7')}>7d</button>
                            <button className={`tab ${timeRange === '30' ? 'active' : ''}`} onClick={() => setTimeRange('30')}>30d</button>
                        </div>
                    </div>
                    <BarChart
                        labels={labels}
                        datasets={[
                            { label: 'Completed', data: completedData },
                            { label: 'Remaining', data: remainingData },
                        ]}
                        height={300}
                    />
                </div>
                {/* </div> */}

                {/* Heatmap — only daily tasks */}
                <div className="card" style={{ marginBottom: 24 }}>
                    <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={18} color="var(--accent-primary)" /> Task Activity
                    </h4>
                    <Heatmap
                        activityLog={activityLog}
                        dailyTasks={dailyTasks}
                        courses={[]}
                        researchPapers={[]}
                        onDateClick={handleDateClick}
                        selectedDate={selectedDate}
                        trackingMode="tasks"
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="filter-bar">
                <div className="search-wrapper">
                    <Search size={16} />
                    <input className="input" placeholder="Search tasks..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                </div>
                <select className="select" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                </select>
                <select className="select" style={{ width: 140 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                    <option value="all">All Priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
                <input type="date" className="input" style={{ width: 160 }} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>

            {/* Task List */}
            {filtered.length === 0 ? (
                <div className="empty-state">
                    <CheckSquare size={48} />
                    <h4>No tasks for this date</h4>
                    <p>Add a task or select a different date</p>
                </div>
            ) : (
                <div className="dt-task-grid">
                    {filtered.map(task => {
                        const duration = calcDuration(task.startTime, task.endTime);
                        return (
                            <div key={task.id} className={`dt-task-card card ${task.completed ? 'done' : ''}`}>
                                <div className="dt-task-top">
                                    <div
                                        className={`checkbox ${task.completed ? 'checked' : ''}`}
                                        onClick={() => updateDailyTask(task.id, { completed: !task.completed, completedDate: !task.completed ? getToday() : null })}
                                    >
                                        {task.completed && <Check size={12} color="#fff" />}
                                    </div>
                                    <div className="dt-task-info">
                                        <h4 className={`dt-task-name ${task.completed ? 'completed' : ''}`}>{task.name}</h4>
                                        {task.description && <p className="dt-task-desc">{task.description}</p>}
                                    </div>
                                    <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                                </div>
                                {(task.startTime || task.endTime) && (
                                    <div className="dt-task-time-row">
                                        <Clock size={13} />
                                        {task.startTime && <span className="dt-time-pill">Start: {task.startTime}</span>}
                                        {task.endTime && <span className="dt-time-pill">End: {task.endTime}</span>}
                                        {duration && <span className="dt-time-pill dt-duration">⏱ {duration}</span>}
                                    </div>
                                )}
                                <div className="dt-task-bottom">
                                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{task.date}</span>
                                    <div className="dt-task-actions">
                                        <button className="btn btn-ghost btn-icon btn-xs" onClick={() => openEdit(task)}><Edit3 size={14} /></button>
                                        <button className="btn btn-ghost btn-icon btn-xs" onClick={() => deleteDailyTask(task.id)}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditTask(null); }}
                title={editTask ? 'Edit Task' : 'Add Task'}
                footer={<><button className="btn btn-secondary" onClick={() => { setModalOpen(false); setEditTask(null); }}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>{editTask ? 'Update' : 'Add Task'}</button></>}
            >
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="input-group"><label>Task Name *</label><input className="input" placeholder="What needs to be done?" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                    <div className="input-group"><label>Description</label><textarea className="textarea" placeholder="Optional details..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                    <div className="input-row">
                        <div className="input-group"><label>Priority</label>
                            <select className="select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                            </select>
                        </div>
                        <div className="input-group"><label>Date</label><input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                    </div>
                    <div className="input-row">
                        <div className="input-group"><label>Start Time</label><input type="time" className="input" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} /></div>
                        <div className="input-group"><label>End Time</label><input type="time" className="input" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} /></div>
                    </div>
                    {form.startTime && form.endTime && (
                        <div className="dt-duration-preview">
                            <Clock size={14} /> Duration: <strong>{calcDuration(form.startTime, form.endTime)}</strong>
                        </div>
                    )}
                </form>
            </Modal>
        </div>
    );
}
