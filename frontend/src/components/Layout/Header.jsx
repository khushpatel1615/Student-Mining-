import React, { useState, useEffect } from 'react';
import { Bell, Sun, Moon, RefreshCw, Menu, ZoomIn, ZoomOut, Maximize, Minimize } from 'lucide-react';

import { useTheme } from '../../context/ThemeContext';
import './Header.css';

const Header = ({
    lastUpdated,
    onRefresh,
    refreshing,
    onMobileMenuClick
}) => {
    const { theme, toggleTheme, zoomIn, zoomOut, zoom } = useTheme();
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, []);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    };

    return (
        <header className="main-header">
            <div className="header-left">
                <button className="mobile-menu-btn" onClick={onMobileMenuClick}>
                    <Menu size={24} />
                </button>
            </div>

            <div className="header-right">
                {lastUpdated && (
                    <span className="last-updated">
                        Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}

                {/* First Button: Fullscreen */}
                <button
                    className="header-btn glass-btn"
                    onClick={toggleFullScreen}
                    title="Toggle Fullscreen"
                >
                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>

                {/* Zoom Controls (Instead of Notification) */}
                <div className="zoom-controls">
                    <button
                        className="header-btn glass-btn"
                        onClick={zoomOut}
                        title={`Zoom Out (${Math.round(zoom * 100)}%)`}
                    >
                        <ZoomOut size={18} />
                    </button>
                    <button
                        className="header-btn glass-btn"
                        onClick={zoomIn}
                        title={`Zoom In (${Math.round(zoom * 100)}%)`}
                    >
                        <ZoomIn size={18} />
                    </button>
                </div>

                <button
                    className="header-btn theme-btn glass-btn"
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