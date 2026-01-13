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
    ChevronsLeft,
    ChevronsRight,
    Users,
    BookOpen,
    CheckSquare,
    ClipboardList,
    Layers,
    Settings,
    Brain,
    Briefcase
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ role = 'student', onLogout, collapsed, mobileMenuOpen, onToggle = () => { } }) => {
    const { user } = useAuth();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'overview';

    const studentMenuItems = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, tab: 'overview' },
        { id: 'analytics', label: 'Analytics', icon: BarChart3, tab: 'analytics' },
        { id: 'skills', label: 'Skills Map', icon: Brain, tab: 'skills' },
        { id: 'career', label: 'Career Fit', icon: Briefcase, tab: 'career' },
        { id: 'grades', label: 'Grades', icon: GraduationCap, tab: 'grades' },
        { id: 'attendance', label: 'Attendance', icon: Calendar, tab: 'attendance' },
        { id: 'profile', label: 'Profile', icon: User, tab: 'profile' },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays, tab: 'calendar' }
    ];

    const adminMenuItems = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, tab: 'overview' },
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
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'open' : ''}`}>
            {/* Logo */}
            <div className="sidebar-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                flexDirection: collapsed ? 'column' : 'row',
                gap: collapsed ? '12px' : '0'
            }}>
                <div className="sidebar-logo" style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
                    <div className="logo-icon">
                        <GraduationCap size={24} />
                    </div>
                    {!collapsed && <span className="logo-text">EduPortal</span>}
                </div>

                <button
                    onClick={onToggle}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'}
                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                    {collapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="nav-section">
                    {!collapsed && <span className="nav-section-title">Main Menu</span>}
                    <ul className="nav-list" style={{ alignItems: collapsed ? 'center' : 'stretch' }}>
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.tab;
                            return (
                                <li key={item.id} style={{ width: collapsed ? 'auto' : '100%' }}>
                                    <Link
                                        to={`?tab=${item.tab}`}
                                        className={`nav-item ${isActive ? 'active' : ''}`}
                                        title={collapsed ? item.label : ''}
                                        style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '12px' : '12px 16px' }}
                                    >
                                        <Icon size={20} className="nav-icon" />
                                        {!collapsed && <span className="nav-label">{item.label}</span>}
                                        {!collapsed && isActive && <ChevronRight size={16} className="nav-indicator" />}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </nav>

            {/* User Profile Footer */}
            <div className="sidebar-footer">
                <div className="user-card" style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '8px' : 'var(--space-md)' }}>
                    <div className="user-avatar">
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} />
                        ) : (
                            <span>{getInitials(user?.full_name)}</span>
                        )}
                    </div>
                    {!collapsed && (
                        <div className="user-info">
                            <span className="user-name">{user?.full_name || 'Student'}</span>
                            <span className="user-role">Student</span>
                        </div>
                    )}
                    {!collapsed && (
                        <button className="logout-btn" onClick={onLogout} title="Logout">
                            <LogOut size={18} />
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;