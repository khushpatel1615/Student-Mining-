import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationCenter from '../Notifications/NotificationCenter';
import './MainLayout.css';

const MainLayout = ({
    children,
    role = 'student',
    lastUpdated,
    onRefresh,
    refreshing,
    notifications,
    unreadCount,
    showNotifications,
    setShowNotifications,
    onMarkAsRead,
    onLogout
}) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const handleToggleSidebar = () => {
        if (window.innerWidth <= 768) {
            setMobileMenuOpen(!mobileMenuOpen);
        } else {
            setCollapsed(!collapsed);
        }
    };

    return (
        <div className={`main-layout ${collapsed ? 'collapsed' : ''}`}>
            <Sidebar
                role={role}
                onLogout={onLogout}
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                collapsed={collapsed}
                onToggle={handleToggleSidebar}
            />

            <div className="layout-content">
                <Header
                    lastUpdated={lastUpdated}
                    onRefresh={onRefresh}
                    refreshing={refreshing}
                    notifications={notifications}
                    unreadCount={unreadCount}
                    showNotifications={showNotifications}
                    setShowNotifications={setShowNotifications}
                    onMarkAsRead={onMarkAsRead}
                    onMobileMenuClick={handleToggleSidebar} // Reusing this prop name for generic toggle
                />

                <main className="main-content">
                    <div className="content-container">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div
                    className="mobile-overlay"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Notification Center */}
            <NotificationCenter
                isOpen={showNotifications}
                onClose={() => setShowNotifications?.(false)}
            />
        </div>
    );
};

export default MainLayout;
