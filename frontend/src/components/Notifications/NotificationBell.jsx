import { useState, useEffect } from 'react'

import apiClient from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext'
import './NotificationBell.css'

function NotificationBell({ onClick }) {
    const { token } = useAuth()
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        fetchUnreadCount()
        const interval = setInterval(fetchUnreadCount, 30000)
        return () => clearInterval(interval)
    }, [])

    const fetchUnreadCount = async () => {
        try {
            const data = await apiClient.get('/notifications.php', { unread: true });
            if (data.success) {
                setUnreadCount(data.data.unread_count)
            }
        } catch {
            // Non-critical polling failure
        }
    }

    return (
        <button className="notification-bell" onClick={onClick}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
        </button>
    )
}

export default NotificationBell
