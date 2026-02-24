import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import {
    Edit3, Moon, Sun, Palette, LogOut, Award, Zap,
    BookOpen, FileText, CheckCircle, Clock, Flame, Target,
    Shield, TrendingUp, Calendar, X, Lock, Star, Trophy,
    Rocket, Crown, Brain, Coffee, Gift, Sparkles, Medal
} from 'lucide-react';
import './Profile.css';

// ─── Progressive Milestones System ───
// 10 tiers of milestones, each harder than the last
const MILESTONE_TIERS = [
    // Tier 1: Getting Started
    [
        { key: 'task_first', icon: <CheckCircle size={18} />, label: 'First Step', desc: 'Complete your first task', check: (s) => s.tasksCompleted >= 1 },
        { key: 'course_first', icon: <BookOpen size={18} />, label: 'Student', desc: 'Start your first course', check: (s) => s.courses >= 1 },
        { key: 'study_1h', icon: <Clock size={18} />, label: '60 Minutes', desc: 'Study for 1 hour total', check: (s) => s.studyHours >= 1 },
        { key: 'streak_3', icon: <Flame size={18} />, label: 'Warm Up', desc: 'Maintain a 3-day streak', check: (s) => s.streak >= 3 },
        { key: 'task_5', icon: <Target size={18} />, label: 'Getting Going', desc: 'Complete 5 tasks', check: (s) => s.tasksCompleted >= 5 },
        { key: 'topic_first', icon: <Sparkles size={18} />, label: 'Explorer', desc: 'Complete a course topic', check: (s) => s.topicsCompleted >= 1 },
        { key: 'paper_first', icon: <FileText size={18} />, label: 'Reader', desc: 'Add your first research paper', check: (s) => s.papers >= 1 },
        { key: 'study_5h', icon: <Coffee size={18} />, label: 'Dedicated', desc: 'Study for 5 hours total', check: (s) => s.studyHours >= 5 },
        { key: 'task_10', icon: <Star size={18} />, label: 'Ten Down', desc: 'Complete 10 tasks', check: (s) => s.tasksCompleted >= 10 },
        { key: 'streak_7', icon: <Zap size={18} />, label: 'Week Warrior', desc: 'Maintain a 7-day streak', check: (s) => s.streak >= 7 },
    ],
    // Tier 2: Building Momentum
    [
        { key: 'task_25', icon: <Target size={18} />, label: '25 Tasks', desc: 'Complete 25 tasks', check: (s) => s.tasksCompleted >= 25 },
        { key: 'course_3', icon: <BookOpen size={18} />, label: 'Multi-Learner', desc: 'Start 3 courses', check: (s) => s.courses >= 3 },
        { key: 'study_10h', icon: <Clock size={18} />, label: '10 Hours', desc: 'Study for 10 hours total', check: (s) => s.studyHours >= 10 },
        { key: 'streak_14', icon: <Flame size={18} />, label: 'Two Weeks', desc: 'Maintain a 14-day streak', check: (s) => s.streak >= 14 },
        { key: 'topic_5', icon: <Brain size={18} />, label: 'Deep Diver', desc: 'Complete 5 course topics', check: (s) => s.topicsCompleted >= 5 },
        { key: 'paper_3', icon: <FileText size={18} />, label: 'Scholar', desc: 'Track 3 research papers', check: (s) => s.papers >= 3 },
        { key: 'task_50', icon: <Star size={18} />, label: 'Fifty Strong', desc: 'Complete 50 tasks', check: (s) => s.tasksCompleted >= 50 },
        { key: 'study_25h', icon: <Coffee size={18} />, label: '25 Hours', desc: 'Study for 25 hours', check: (s) => s.studyHours >= 25 },
        { key: 'course_5', icon: <BookOpen size={18} />, label: 'Course Collector', desc: 'Start 5 courses', check: (s) => s.courses >= 5 },
        { key: 'topic_10', icon: <Trophy size={18} />, label: '10 Topics Done', desc: 'Complete 10 course topics', check: (s) => s.topicsCompleted >= 10 },
    ],
    // Tier 3: Gaining Expertise
    [
        { key: 'task_100', icon: <Target size={18} />, label: 'Centurion', desc: 'Complete 100 tasks', check: (s) => s.tasksCompleted >= 100 },
        { key: 'streak_30', icon: <Flame size={18} />, label: 'Month Master', desc: 'Maintain a 30-day streak', check: (s) => s.streak >= 30 },
        { key: 'study_50h', icon: <Clock size={18} />, label: '50 Hours', desc: 'Study for 50 hours', check: (s) => s.studyHours >= 50 },
        { key: 'paper_5', icon: <FileText size={18} />, label: 'Researcher', desc: 'Track 5 research papers', check: (s) => s.papers >= 5 },
        { key: 'course_10', icon: <BookOpen size={18} />, label: 'Curriculum King', desc: 'Start 10 courses', check: (s) => s.courses >= 10 },
        { key: 'topic_25', icon: <Brain size={18} />, label: '25 Topics', desc: 'Complete 25 course topics', check: (s) => s.topicsCompleted >= 25 },
        { key: 'task_200', icon: <Star size={18} />, label: 'Task Machine', desc: 'Complete 200 tasks', check: (s) => s.tasksCompleted >= 200 },
        { key: 'study_100h', icon: <Coffee size={18} />, label: '100 Hours', desc: 'Study for 100 hours', check: (s) => s.studyHours >= 100 },
        { key: 'streak_60', icon: <Zap size={18} />, label: '60 Day Streak', desc: 'Maintain a 60-day streak', check: (s) => s.streak >= 60 },
        { key: 'paper_10', icon: <FileText size={18} />, label: '10 Papers', desc: 'Track 10 research papers', check: (s) => s.papers >= 10 },
    ],
    // Tier 4: Expert Level
    [
        { key: 'task_500', icon: <Crown size={18} />, label: '500 Tasks', desc: 'Complete 500 tasks', check: (s) => s.tasksCompleted >= 500 },
        { key: 'streak_90', icon: <Flame size={18} />, label: '90 Day Streak', desc: '3-month streak!', check: (s) => s.streak >= 90 },
        { key: 'study_250h', icon: <Clock size={18} />, label: '250 Hours', desc: 'Study for 250 hours', check: (s) => s.studyHours >= 250 },
        { key: 'topic_50', icon: <Trophy size={18} />, label: '50 Topics', desc: 'Complete 50 topics', check: (s) => s.topicsCompleted >= 50 },
        { key: 'course_20', icon: <BookOpen size={18} />, label: '20 Courses', desc: 'Start 20 courses', check: (s) => s.courses >= 20 },
        { key: 'paper_25', icon: <FileText size={18} />, label: '25 Papers', desc: 'Track 25 research papers', check: (s) => s.papers >= 25 },
        { key: 'task_1000', icon: <Medal size={18} />, label: '1000 Tasks', desc: 'Complete 1000 tasks!', check: (s) => s.tasksCompleted >= 1000 },
        { key: 'study_500h', icon: <Rocket size={18} />, label: '500 Hours', desc: 'Study for 500 hours', check: (s) => s.studyHours >= 500 },
        { key: 'streak_180', icon: <Gift size={18} />, label: '180 Day Streak', desc: '6-month streak!', check: (s) => s.streak >= 180 },
        { key: 'topic_100', icon: <Crown size={18} />, label: '100 Topics', desc: 'Complete 100 topics', check: (s) => s.topicsCompleted >= 100 },
    ],
    // Tier 5: Legendary
    [
        { key: 'streak_365', icon: <Crown size={18} />, label: 'Year Streak', desc: 'Maintain a 365-day streak!', check: (s) => s.streak >= 365 },
        { key: 'task_2500', icon: <Medal size={18} />, label: '2500 Tasks', desc: 'Complete 2500 tasks', check: (s) => s.tasksCompleted >= 2500 },
        { key: 'study_1000h', icon: <Rocket size={18} />, label: '1000 Hours', desc: 'Study for 1000 hours', check: (s) => s.studyHours >= 1000 },
        { key: 'topic_250', icon: <Trophy size={18} />, label: '250 Topics', desc: 'Complete 250 topics', check: (s) => s.topicsCompleted >= 250 },
        { key: 'paper_50', icon: <FileText size={18} />, label: '50 Papers', desc: 'Track 50 research papers', check: (s) => s.papers >= 50 },
        { key: 'course_50', icon: <BookOpen size={18} />, label: '50 Courses', desc: 'Start 50 courses', check: (s) => s.courses >= 50 },
        { key: 'task_5000', icon: <Crown size={18} />, label: '5000 Tasks', desc: 'Complete 5000 tasks!', check: (s) => s.tasksCompleted >= 5000 },
        { key: 'study_2500h', icon: <Star size={18} />, label: '2500 Hours', desc: '2500 hours of study!', check: (s) => s.studyHours >= 2500 },
        { key: 'topic_500', icon: <Brain size={18} />, label: '500 Topics', desc: 'Complete 500 topics', check: (s) => s.topicsCompleted >= 500 },
        { key: 'paper_100', icon: <Medal size={18} />, label: '100 Papers', desc: 'Track 100 research papers', check: (s) => s.papers >= 100 },
    ],
];

const TIER_NAMES = ['🌱 Getting Started', '🔥 Building Momentum', '⚡ Gaining Expertise', '👑 Expert Level', '🏆 Legendary'];

export default function Profile() {
    const { user, logout, updateUser, updatePassword } = useAuth();
    const {
        dailyTasks, courses, completedPapers,
        totalStudyMinutes, totalCurriculumItems, completedCurriculumItems,
        streak, profile, updateProfile,
    } = useData();
    const { theme, setTheme, accentColor, setAccentColor, accentColors } = useTheme();

    const [editModal, setEditModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
    const [editData, setEditData] = useState({
        displayName: profile?.displayName || user?.username || '',
        bio: profile?.bio || '',
        profileImage: profile?.profileImage || '',
    });

    const handleSaveProfile = () => {
        updateProfile(editData);
        if (updateUser) {
            updateUser({ username: editData.displayName, profileImage: editData.profileImage });
        }
        setEditModal(false);
    };

    const handleUpdatePassword = async () => {
        setPasswordMsg({ type: '', text: '' });
        if (passwordData.newPassword.length < 6) {
            setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        const res = await updatePassword(passwordData.newPassword);
        if (res.success) {
            setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } else {
            setPasswordMsg({ type: 'error', text: res.error || 'Failed to update password' });
        }
    };

    // ─── Stats ───
    const completedTasks = dailyTasks.filter(t => t.completed).length;
    const totalCourses = courses.length;
    const studyHours = Math.round(totalStudyMinutes / 60);

    // Count completed topics
    let topicsCompleted = 0;
    courses.forEach(c => c.topics?.forEach(t => {
        if (t.completed) topicsCompleted++;
        t.subtopics?.forEach(s => { if (s.completed) topicsCompleted++; });
    }));

    const stats = {
        tasksCompleted: completedTasks,
        courses: totalCourses,
        studyHours,
        streak: streak.count,
        papers: completedPapers || 0,
        topicsCompleted,
    };

    // ─── Determine current milestone tier ───
    // Show the first tier that has at least one unachieved milestone
    // If all milestones in a tier are achieved, show the next tier
    let currentTierIdx = 0;
    for (let i = 0; i < MILESTONE_TIERS.length; i++) {
        const allDone = MILESTONE_TIERS[i].every(m => m.check(stats));
        if (allDone && i < MILESTONE_TIERS.length - 1) {
            currentTierIdx = i + 1;
        } else {
            currentTierIdx = i;
            break;
        }
    }

    const currentMilestones = MILESTONE_TIERS[currentTierIdx];
    const achievedCount = currentMilestones.filter(m => m.check(stats)).length;
    const totalMilestones = currentMilestones.length;

    return (
        <div className="profile-page">
            {/* ═══ Hero Banner ═══ */}
            <div className="profile-hero">
                <div className="profile-bg-pattern"></div>
                <div className="profile-info-row">
                    <div className="profile-avatar-wrapper">
                        {editData.profileImage || profile?.profileImage ? (
                            <img src={editData.profileImage || profile?.profileImage} alt="" className="profile-avatar-img" />
                        ) : (
                            <div className="profile-avatar-placeholder">{(profile?.displayName || user?.username || 'U')[0].toUpperCase()}</div>
                        )}
                        <button className="profile-edit-btn" onClick={() => setEditModal(true)}><Edit3 size={14} /></button>
                    </div>
                    <div className="profile-text">
                        <h1 className="profile-name">{profile?.displayName || user?.username}</h1>
                        <p className="profile-bio">{profile?.bio || 'Add a bio to your profile'}</p>
                        <div className="profile-join-date"><Calendar size={12} /> Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</div>
                    </div>
                </div>

                <div className="profile-stats-grid">
                    <div className="profile-stat-card">
                        <div className="profile-stat-icon" style={{ background: 'rgba(99, 102, 241, 0.12)' }}><CheckCircle size={22} color="#6366f1" /></div>
                        <div className="profile-stat-value">{completedTasks}</div>
                        <div className="profile-stat-label">Tasks Done</div>
                    </div>
                    <div className="profile-stat-card">
                        <div className="profile-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)' }}><Clock size={22} color="#10b981" /></div>
                        <div className="profile-stat-value">{studyHours}h</div>
                        <div className="profile-stat-label">Study Time</div>
                    </div>
                    <div className="profile-stat-card">
                        <div className="profile-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.12)' }}><BookOpen size={22} color="#3b82f6" /></div>
                        <div className="profile-stat-value">{totalCourses}</div>
                        <div className="profile-stat-label">Courses</div>
                    </div>
                    <div className="profile-stat-card">
                        <div className="profile-stat-icon" style={{ background: 'rgba(236, 72, 153, 0.12)' }}><FileText size={22} color="#ec4899" /></div>
                        <div className="profile-stat-value">{stats.papers}</div>
                        <div className="profile-stat-label">Papers</div>
                    </div>
                    <div className="profile-stat-card">
                        <div className="profile-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)' }}><Flame size={22} color="#f59e0b" /></div>
                        <div className="profile-stat-value">{streak.count}</div>
                        <div className="profile-stat-label">Day Streak</div>
                    </div>
                    <div className="profile-stat-card">
                        <div className="profile-stat-icon" style={{ background: 'rgba(168, 85, 247, 0.12)' }}><TrendingUp size={22} color="#a78bfa" /></div>
                        <div className="profile-stat-value">{totalCurriculumItems > 0 ? Math.round((completedCurriculumItems / totalCurriculumItems) * 100) : 0}%</div>
                        <div className="profile-stat-label">Progress</div>
                    </div>
                </div>
            </div>

            {/* ═══ Two Column Layout ═══ */}
            <div className="profile-two-col">
                {/* Left: Milestones */}
                <div className="card profile-milestones-card">
                    <div className="profile-milestone-header">
                        <h3 className="section-title"><Award size={18} /> {TIER_NAMES[currentTierIdx]}</h3>
                        <div className="profile-milestone-progress">
                            <span className="profile-milestone-count">{achievedCount}/{totalMilestones}</span>
                            <div className="profile-milestone-bar">
                                <div className="profile-milestone-bar-fill" style={{ width: `${(achievedCount / totalMilestones) * 100}%` }} />
                            </div>
                            {currentTierIdx > 0 && <span className="profile-milestone-tier">Tier {currentTierIdx + 1}/{MILESTONE_TIERS.length}</span>}
                        </div>
                    </div>
                    <div className="profile-milestones-grid">
                        {currentMilestones.map((m, i) => {
                            const achieved = m.check(stats);
                            return (
                                <div key={m.key} className={`profile-milestone ${achieved ? 'achieved' : ''}`}>
                                    <div className="profile-milestone-icon">{m.icon}</div>
                                    <div className="profile-milestone-info">
                                        <span className="profile-milestone-label">{m.label}</span>
                                        <span className="profile-milestone-desc">{m.desc}</span>
                                    </div>
                                    {achieved && <CheckCircle size={16} className="profile-milestone-check" />}
                                </div>
                            );
                        })}
                    </div>
                    {currentTierIdx > 0 && (
                        <p className="profile-milestone-note">🎉 Previous {currentTierIdx} tier{currentTierIdx > 1 ? 's' : ''} completed! Keep going!</p>
                    )}
                </div>

                {/* Right: Appearance & Account */}
                <div className="profile-right-col">
                    {/* Appearance */}
                    <div className="card profile-appearance-card">
                        <h3 className="section-title"><Palette size={18} /> Appearance</h3>

                        <div className="profile-theme-toggle">
                            <label>Theme</label>
                            <div className="profile-theme-options">
                                <button className={`profile-theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
                                    <Moon size={16} /> Dark
                                </button>
                                <button className={`profile-theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
                                    <Sun size={16} /> Light
                                </button>
                            </div>
                        </div>

                        <div className="profile-accent-section">
                            <label>Accent Color</label>
                            <div className="profile-accent-grid">
                                {accentColors.map(c => (
                                    <button
                                        key={c.value}
                                        className={`profile-accent-btn ${accentColor === c.value ? 'active' : ''}`}
                                        style={{ '--ac': c.value }}
                                        onClick={() => setAccentColor(c.value)}
                                        title={c.name}
                                    >
                                        <div className="profile-accent-swatch" />
                                        {accentColor === c.value && <CheckCircle size={12} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Account */}
                    <div className="card profile-account-card">
                        <h3 className="section-title"><Shield size={18} /> Account</h3>
                        <div className="profile-account-info">
                            <div className="profile-account-row">
                                <span className="profile-account-label">Username</span>
                                <span className="profile-account-value">{user?.username || '—'}</span>
                            </div>
                            <div className="profile-account-row">
                                <span className="profile-account-label">Email</span>
                                <span className="profile-account-value">{user?.email || '—'}</span>
                            </div>
                            <div className="profile-account-row">
                                <span className="profile-account-label">Member since</span>
                                <span className="profile-account-value">
                                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>

                        {/* Change Password */}
                        <div className="profile-pw-section">
                            <h4 className="profile-pw-title"><Lock size={14} /> Change Password</h4>
                            {passwordMsg.text && <div className={`profile-msg ${passwordMsg.type}`}>{passwordMsg.text}</div>}
                            <div className="profile-pw-inputs">
                                <input
                                    type="password" className="input input-sm" placeholder="New Password"
                                    value={passwordData.newPassword} onChange={e => setPasswordData(d => ({ ...d, newPassword: e.target.value }))}
                                />
                                <input
                                    type="password" className="input input-sm" placeholder="Confirm Password"
                                    value={passwordData.confirmPassword} onChange={e => setPasswordData(d => ({ ...d, confirmPassword: e.target.value }))}
                                />
                                <button className="btn btn-primary btn-sm" onClick={handleUpdatePassword}>Update</button>
                            </div>
                        </div>

                        <button className="btn btn-danger btn-sm profile-logout-btn" onClick={logout}>
                            <LogOut size={14} /> Sign Out
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editModal && (
                <div className="modal-backdrop" onClick={() => setEditModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><Edit3 size={18} /> Edit Profile</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setEditModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="input-group">
                                <label>Display Name</label>
                                <input className="input" value={editData.displayName} onChange={e => setEditData({ ...editData, displayName: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label>Image URL</label>
                                <input className="input" value={editData.profileImage} onChange={e => setEditData({ ...editData, profileImage: e.target.value })} placeholder="https://..." />
                            </div>
                            <div className="input-group">
                                <label>Bio</label>
                                <textarea className="textarea" value={editData.bio} onChange={e => setEditData({ ...editData, bio: e.target.value })} rows={3} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setEditModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveProfile}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
