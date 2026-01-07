import React from 'react';
import { Bell, Sun, Moon, RefreshCw, Search, Menu } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import './Header.css';

const Header = ({
    lastUpdated,
    onRefresh,
    refreshing,
    notifications = [],
    unreadCount = 0,
    showNotifications,
    setShowNotifications,
    onMarkAsRead,
    onMobileMenuClick
}) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="main-header">
            <div className="header-left">
                <button className="mobile-menu-btn" onClick={onMobileMenuClick}>
                    <Menu size={24} />
                </button>
                <div className="search-container">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search courses, grades..."
                        className="search-input"
                    />
                    <kbd className="search-shortcut">⌘K</kbd>
                </div>
            </div>

            <div className="header-right">
                {lastUpdated && (
                    <span className="last-updated">
                        Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}

                <button
                    className={`header-btn refresh-btn ${refreshing ? 'spinning' : ''}`}
                    onClick={onRefresh}
                    disabled={refreshing}
                    title="Refresh data"
                >
                    <RefreshCw size={18} />
                </button>

                {/* Notifications */}
                <div className="notification-wrapper">
                    <button
                        className="header-btn notification-btn"
                        onClick={() => setShowNotifications?.(!showNotifications)}
                    >
                        <Bell size={18} />
                        {unreadCount > 0 && (
                            <span className="notification-badge">{unreadCount}</span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="notification-dropdown">
                            <div className="dropdown-header">
                                <h4>Notifications</h4>
                                <button
                                    className="mark-all-btn"
                                    onClick={() => onMarkAsRead?.(null)}
                                >
                                    Mark all read
                                </button>
                            </div>
                            <div className="notification-list">
                                {notifications.length === 0 ? (
                                    <div className="no-notifications">
                                        <Bell size={24} />
                                        <p>No notifications</p>
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <div
                                            key={n.id}
                                            className={`notification-item ${n.is_read ? 'read' : 'unread'}`}
                                        >
                                            <div className="notification-content">
                                                <h5>{n.title}</h5>
                                                <p>{n.message}</p>
                                                <span className="notification-time">
                                                    {new Date(n.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <button
                    className="header-btn theme-btn"
                    onClick={toggleTheme}
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
        </header>
    );
};

export default Header;