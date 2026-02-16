import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import {
    LayoutDashboard, CheckSquare, BookOpen, FileText, TrendingUp,
    ChevronLeft, ChevronRight, Zap, User
} from 'lucide-react';
import { useState } from 'react';
import './Sidebar.css';

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/daily-tasks', label: 'Daily Tasks', icon: CheckSquare },
    { path: '/courses', label: 'Courses', icon: BookOpen },
    { path: '/research', label: 'Research', icon: FileText },
    { path: '/trending', label: 'Trending', icon: TrendingUp },
    { path: '/profile', label: 'Profile', icon: User },
];

export default function Sidebar() {
    const { user } = useAuth();
    const { streak } = useData();
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-inner">
                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="logo-icon">
                        <Zap size={22} />
                    </div>
                    {!collapsed && (
                        <div className="logo-text">
                            <span className="logo-name">TenX</span>
                            <span className="logo-sub">Learning OS</span>
                        </div>
                    )}
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

                    {/* User Info */}
                    {!collapsed && user && (
                        <div className="sidebar-user">
                            <div className="user-avatar">{user.username[0].toUpperCase()}</div>
                            <span className="user-name">{user.username}</span>
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
