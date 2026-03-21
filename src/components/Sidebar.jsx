import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import {
    LayoutDashboard, CheckSquare, BookOpen, FileText, TrendingUp,
    ChevronLeft, ChevronRight, User, Settings
} from 'lucide-react';
import { useState } from 'react';
import './Sidebar.css';

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/daily-tasks', label: 'Daily Tasks', icon: CheckSquare },
    { path: '/courses', label: 'Courses', icon: BookOpen },
    { path: '/research', label: 'Research', icon: FileText },
    { path: '/trending', label: 'Trending', icon: TrendingUp },
];

export default function Sidebar() {
    const { user } = useAuth();
    const { streak, profile } = useData();
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();

    const avatarUrl = profile?.profileImage || user?.profileImage;
    const displayName = profile?.displayName || user?.username || 'User';

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-inner">
                {/* Logo */}
                <Link to="/dashboard" className="sidebar-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <img src="/logo.png" alt="TENX Track Learning" className="sidebar-logo-img" />
                    {!collapsed && (
                        <div className="logo-text">
                            <span className="logo-name">TENX Track Learning</span>
                        </div>
                    )}
                </Link>

                {/* User Profile Section — below logo, above nav */}
                <div className="sidebar-profile-section">
                    <NavLink to="/profile" className="sidebar-profile-link" title={collapsed ? displayName : undefined}>
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="sidebar-profile-img" />
                        ) : (
                            <div className="user-avatar">{displayName[0].toUpperCase()}</div>
                        )}
                        {!collapsed && (
                            <div className="sidebar-profile-info">
                                <span className="sidebar-profile-name">{displayName}</span>
                                <span className="sidebar-profile-role">Learner</span>
                            </div>
                        )}
                        {!collapsed && <Settings size={14} className="sidebar-profile-gear" />}
                    </NavLink>
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `nav-item ${isActive ? 'active' : ''}`
                            }
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon size={20} />
                            {!collapsed && <span>{item.label}</span>}
                            {!collapsed && location.pathname === item.path && (
                                <div className="nav-indicator" />
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom */}
                <div className="sidebar-bottom">
                    {/* Streak */}
                    {streak.count > 0 && (
                        <div className="sidebar-streak" title={`${streak.count} day streak`}>
                            <span className="streak-fire">🔥</span>
                            {!collapsed && <span className="streak-count">{streak.count} day streak</span>}
                        </div>
                    )}

                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="sidebar-btn collapse-btn"
                        title={collapsed ? 'Expand' : 'Collapse'}
                    >
                        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                        {!collapsed && <span>Collapse</span>}
                    </button>
                </div>
            </div>
        </aside>
    );
}
