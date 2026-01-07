import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
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

    return (
        <div className="main-layout">
            <Sidebar
                role={role}
                onLogout={onLogout}
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
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
                    onMobileMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
        </div>
    );
};

export default MainLayout;
