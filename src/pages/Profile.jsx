import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import {
    User, Mail, Target, Pencil, Flame, Award, BookOpen, CheckCircle,
    FileText, Clock, Calendar, TrendingUp, Sun, Moon, Palette,
    LogOut, Camera, Save, X, Activity, Zap, Star
} from 'lucide-react';
import { formatMinutesToHHMM, getToday } from '../utils/helpers';
import './Profile.css';

const ACCENT_COLORS = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Pink', value: '#ec4899' },
];

export default function Profile() {
    const { user, logout } = useAuth();
    const {
        dailyTasks, courses, researchPapers, studySessions,
        totalStudyMinutes, totalCurriculumItems, completedCurriculumItems,
        completedPapers, streak, profile, updateProfile,
    } = useData();
    const { theme, toggleTheme, accentColor, setAccentColor } = useTheme();
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({ ...profile });

    const today = getToday();

    // ─── Computed Stats ───
    const stats = useMemo(() => {
        const totalTasks = dailyTasks.length;
        const completedTasks = dailyTasks.filter(t => t.completed).length;
        const taskCompRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const totalCourses = courses.length;
        const completedCourses = courses.filter(c => {
            if (!c.topics || c.topics.length === 0) return false;
            return c.topics.every(t => {
                const topicDone = t.completed;
                const allSubsDone = !t.subtopics || t.subtopics.length === 0 || t.subtopics.every(s => s.completed);
                return topicDone && allSubsDone;
            });
        }).length;

        const totalPapers = researchPapers.length;
        const avgPaperCompletion = totalPapers > 0
            ? Math.round(researchPapers.reduce((s, p) => s + (p.completionPercentage || 0), 0) / totalPapers) : 0;

        const totalSessions = studySessions.length;
        const avgSessionMin = totalSessions > 0 ? Math.round(totalStudyMinutes / totalSessions) : 0;

        // Days active
        const uniqueDays = new Set(dailyTasks.map(t => t.date));
        studySessions.forEach(s => uniqueDays.add(s.date));
        const daysActive = uniqueDays.size;

        // Most productive day
        const dayCounts = {};
        dailyTasks.filter(t => t.completed).forEach(t => {
            dayCounts[t.date] = (dayCounts[t.date] || 0) + 1;
        });
        const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

        return {
            totalTasks, completedTasks, taskCompRate,
            totalCourses, completedCourses,
            totalPapers, avgPaperCompletion,
            totalSessions, avgSessionMin,
            daysActive, bestDay: bestDay ? bestDay[0] : 'N/A',
            studyHours: formatMinutesToHHMM(totalStudyMinutes),
            curriculumProgress: totalCurriculumItems > 0
                ? Math.round((completedCurriculumItems / totalCurriculumItems) * 100) : 0,
        };
    }, [dailyTasks, courses, researchPapers, studySessions, totalStudyMinutes, totalCurriculumItems, completedCurriculumItems]);

    const handleSave = useCallback(() => {
        updateProfile(formData);
        setEditing(false);
    }, [formData, updateProfile]);

    const handleCancel = useCallback(() => {
        setFormData({ ...profile });
        setEditing(false);
    }, [profile]);

    const initials = (profile.username || user?.username || 'U').slice(0, 2).toUpperCase();
    const displayName = profile.username || user?.username || 'User';

    return (
        <div className="profile-page">
            {/* ═══ Hero Banner ═══ */}
            <div className="profile-hero" style={{ '--accent': accentColor }}>
                <div className="profile-hero-bg" />
                <div className="profile-hero-content">
                    <div className="profile-avatar-wrapper">
                        {profile.profileImage ? (
                            <img src={profile.profileImage} alt={displayName} className="profile-avatar-img" />
                        ) : (
                            <div className="profile-avatar-initials">{initials}</div>
                        )}
                        <div className="profile-avatar-status" />
                    </div>
                    <div className="profile-hero-info">
                        <h1 className="profile-name">{displayName}</h1>
                        <p className="profile-bio">{profile.bio || 'AI/ML Learner & Researcher'}</p>
                        <div className="profile-hero-badges">
                            <span className="profile-badge">
                                <Flame size={14} /> {streak.count} Day Streak
                            </span>
                            <span className="profile-badge">
                                <Calendar size={14} /> {stats.daysActive} Days Active
                            </span>
                            <span className="profile-badge">
                                <Zap size={14} /> {stats.taskCompRate}% Completion
                            </span>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-sm profile-edit-trigger" onClick={() => { setFormData({ ...profile }); setEditing(true); }}>
                        <Pencil size={14} /> Edit Profile
                    </button>
                </div>
            </div>

            {/* ═══ Stats Overview ═══ */}
            <div className="profile-stats-grid">
                <StatCard icon={<CheckCircle size={20} />} label="Tasks Completed" value={`${stats.completedTasks}/${stats.totalTasks}`} sublabel={`${stats.taskCompRate}% rate`} color="var(--info)" />
                <StatCard icon={<Clock size={20} />} label="Study Time" value={stats.studyHours} sublabel={`${stats.totalSessions} sessions`} color="var(--success)" />
                <StatCard icon={<BookOpen size={20} />} label="Curriculum" value={`${completedCurriculumItems}/${totalCurriculumItems}`} sublabel={`${stats.curriculumProgress}% done`} color="var(--warning)" />
                <StatCard icon={<FileText size={20} />} label="Research Papers" value={`${completedPapers}/${stats.totalPapers}`} sublabel={`${stats.avgPaperCompletion}% avg`} color="var(--danger)" />
                <StatCard icon={<BookOpen size={20} />} label="Courses" value={`${stats.completedCourses}/${stats.totalCourses}`} sublabel="completed" color="#8b5cf6" />
                <StatCard icon={<Flame size={20} />} label="Best Streak" value={`${streak.count}`} sublabel="current streak" color="#f59e0b" />
            </div>

            {/* ═══ Achievement Progress ═══ */}
            <div className="profile-row">
                <div className="card profile-milestones">
                    <h3 className="section-title"><Award size={18} /> Learning Milestones</h3>
                    <div className="milestone-list">
                        <MilestoneItem icon={<Star size={16} />} label="Complete 10 tasks" current={stats.completedTasks} target={10} />
                        <MilestoneItem icon={<Star size={16} />} label="Complete 50 tasks" current={stats.completedTasks} target={50} />
                        <MilestoneItem icon={<Star size={16} />} label="Study 10+ hours" current={Math.round(totalStudyMinutes / 60)} target={10} />
                        <MilestoneItem icon={<Star size={16} />} label="7 day streak" current={streak.count} target={7} />
                        <MilestoneItem icon={<Star size={16} />} label="30 day streak" current={streak.count} target={30} />
                        <MilestoneItem icon={<Star size={16} />} label="Complete a course" current={stats.completedCourses} target={1} />
                    </div>
                </div>

                {/* ═══ Theme & Appearance ═══ */}
                <div className="card profile-appearance">
                    <h3 className="section-title"><Palette size={18} /> Appearance</h3>
                    <div className="appearance-group">
                        <label className="appearance-label">Theme</label>
                        <div className="theme-toggle-row">
                            <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => theme !== 'light' && toggleTheme()}>
                                <Sun size={16} /> Light
                            </button>
                            <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => theme !== 'dark' && toggleTheme()}>
                                <Moon size={16} /> Dark
                            </button>
                        </div>
                    </div>
                    <div className="appearance-group">
                        <label className="appearance-label">Accent Color</label>
                        <div className="accent-color-grid">
                            {ACCENT_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    className={`accent-swatch ${accentColor === c.value ? 'active' : ''}`}
                                    style={{ background: c.value }}
                                    onClick={() => setAccentColor(c.value)}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Account Actions */}
                    <div className="appearance-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginTop: 16 }}>
                        <button className="btn btn-danger btn-sm" onClick={logout} style={{ width: '100%' }}>
                            <LogOut size={14} /> Sign Out
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══ Edit Profile Modal Overlay ═══ */}
            {editing && (
                <div className="profile-edit-overlay" onClick={handleCancel}>
                    <div className="profile-edit-modal card" onClick={e => e.stopPropagation()}>
                        <div className="profile-edit-header">
                            <h3><User size={18} /> Edit Profile</h3>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={handleCancel}><X size={18} /></button>
                        </div>
                        <div className="profile-edit-body">
                            <div className="form-group">
                                <label>Display Name</label>
                                <input className="input" value={formData.username || ''} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))} placeholder="Your name" />
                            </div>
                            <div className="form-group">
                                <label>Bio</label>
                                <textarea className="input" rows={3} value={formData.bio || ''} onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))} placeholder="AI/ML Learner & Researcher" />
                            </div>
                            <div className="form-group">
                                <label>Profile Image URL</label>
                                <input className="input" value={formData.profileImage || ''} onChange={e => setFormData(p => ({ ...p, profileImage: e.target.value }))} placeholder="https://..." />
                            </div>
                        </div>
                        <div className="profile-edit-footer">
                            <button className="btn btn-ghost" onClick={handleCancel}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}><Save size={14} /> Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Stat Card Component ───
function StatCard({ icon, label, value, sublabel, color }) {
    return (
        <div className="profile-stat-card">
            <div className="profile-stat-icon" style={{ color, background: `${color}15` }}>{icon}</div>
            <div className="profile-stat-info">
                <div className="profile-stat-label">{label}</div>
                <div className="profile-stat-value">{value}</div>
                <div className="profile-stat-sublabel">{sublabel}</div>
            </div>
        </div>
    );
}

// ─── Milestone Component ───
function MilestoneItem({ icon, label, current, target }) {
    const pct = Math.min(100, Math.round((current / target) * 100));
    const achieved = current >= target;
    return (
        <div className={`milestone-item ${achieved ? 'achieved' : ''}`}>
            <div className="milestone-icon">{icon}</div>
            <div className="milestone-info">
                <div className="milestone-label">{label}</div>
                <div className="milestone-bar">
                    <div className="milestone-fill" style={{ width: `${pct}%` }} />
                </div>
            </div>
            <div className="milestone-status">
                {achieved ? <CheckCircle size={16} color="var(--success)" /> : <span className="milestone-pct">{pct}%</span>}
            </div>
        </div>
    );
}
