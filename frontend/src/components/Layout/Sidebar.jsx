import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    BarChart3,
    GraduationCap,
    Calendar,
    User,
    CalendarDays,
    LogOut,
    ChevronRight,
    Users,
    BookOpen,
    CheckSquare,
    ClipboardList,
    Layers,
    FileText,
    Settings
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ role = 'student', onLogout }) => {
    const { user } = useAuth();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || (role === 'admin' ? 'analytics' : 'overview');

    const studentMenuItems = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, tab: 'overview' },
        { id: 'analytics', label: 'Analytics', icon: BarChart3, tab: 'analytics' },
        { id: 'grades', label: 'Grades', icon: GraduationCap, tab: 'grades' },
        { id: 'attendance', label: 'Attendance', icon: Calendar, tab: 'attendance' },
        { id: 'profile', label: 'Profile', icon: User, tab: 'profile' },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays, tab: 'calendar' }
    ];

    const adminMenuItems = [
        { id: 'analytics', label: 'Overview', icon: LayoutDashboard, tab: 'analytics' },
        { id: 'students', label: 'Students', icon: Users, tab: 'students' },
        { id: 'programs', label: 'Programs', icon: Layers, tab: 'programs' },
        { id: 'subjects', label: 'Subjects', icon: BookOpen, tab: 'subjects' },
        { id: 'enrollments', label: 'Enrollments', icon: ClipboardList, tab: 'enrollments' },
        { id: 'grades', label: 'Grades', icon: GraduationCap, tab: 'grades' },
        { id: 'attendance', label: 'Attendance', icon: CheckSquare, tab: 'attendance' },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays, tab: 'calendar' }
    ];

    const menuItems = role === 'admin' ? adminMenuItems : studentMenuItems;

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="logo-icon">
                        <GraduationCap size={24} />
                    </div>
                    <span className="logo-text">EduPortal</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="nav-section">
                    <span className="nav-section-title">Main Menu</span>
                    <ul className="nav-list">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.tab;
                            return (
                                <li key={item.id}>
                                    <Link
                                        to={`?tab=${item.tab}`}
                                        className={`nav-item ${isActive ? 'active' : ''}`}
                                    >
                                        <Icon size={20} className="nav-icon" />
                                        <span className="nav-label">{item.label}</span>
                                        {isActive && <ChevronRight size={16} className="nav-indicator" />}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </nav>

            {/* User Profile Footer */}
            <div className="sidebar-footer">
                <div className="user-card">
                    <div className="user-avatar">
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} />
                        ) : (
                            <span>{getInitials(user?.full_name)}</span>
                        )}
                    </div>
                    <div className="user-info">
                        <span className="user-name">{user?.full_name || 'Student'}</span>
                        <span className="user-role">Student</span>
                    </div>
                    <button className="logout-btn" onClick={onLogout} title="Logout">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;