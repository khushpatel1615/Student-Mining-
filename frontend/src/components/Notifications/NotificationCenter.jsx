import { API_BASE } from '../../config';
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './NotificationCenter.css'



// Icons
const BellIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
)

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)

const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
)

function NotificationCenter({ isOpen, onClose }) {
    const { token } = useAuth()
    const navigate = useNavigate()
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            fetchNotifications()
        }
    }, [isOpen])

    // Poll for new notifications every 30 seconds
    useEffect(() => {
        fetchUnreadCount()
        const interval = setInterval(fetchUnreadCount, 30000)
        return () => clearInterval(interval)
    }, [])

    const fetchNotifications = async () => {
        setLoading(true)
        try {
            const response = await fetch(`${API_BASE}/notifications.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()

            if (data.success) {
                setNotifications(data.data.notifications)
                setUnreadCount(data.data.unread_count)
            }
        } catch (err) {
            console.error('Error fetching notifications:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchUnreadCount = async () => {
        try {
            const response = await fetch(`${API_BASE}/notifications.php?unread=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()

            if (data.success) {
                setUnreadCount(data.data.unread_count)
            }
        } catch (err) {
            console.error('Error fetching unread count:', err)
        }
    }

    const markAsRead = async (notificationId) => {
        try {
            await fetch(`${API_BASE}/notifications.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'mark_read',
                    notification_id: notificationId
                })
            })
            fetchNotifications()
        } catch (err) {
            console.error('Error marking as read:', err)
        }
    }

    const markAllAsRead = async () => {
        try {
            await fetch(`${API_BASE}/notifications.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'mark_read'
                })
            })
            fetchNotifications()
        } catch (err) {
            console.error('Error marking all as read:', err)
        }
    }

    const deleteNotification = async (notificationId) => {
        try {
            await fetch(`${API_BASE}/notifications.php?id=${notificationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            fetchNotifications()
        } catch (err) {
            console.error('Error deleting notification:', err)
        }
    }

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id)
        }
        if (notification.link) {
            navigate(notification.link)
            onClose()
        }
    }

    const getNotificationIcon = (type) => {
        const icons = {
            assignment: 'ASG',
            exam: 'EXAM',
            grade: 'GRADE',
            attendance: 'ATT',
            warning: 'WARN',
            success: 'OK',
            info: 'INFO'
        }
        return icons[type] || 'INFO'
    }

    const getTimeAgo = (dateStr) => {
        const date = new Date(dateStr)
        const now = new Date()
        const seconds = Math.floor((now - date) / 1000)

        if (seconds < 60) return 'Just now'
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
        return date.toLocaleDateString()
    }

    if (!isOpen) return null

    return (
        <>
            <div className="notification-overlay" onClick={onClose} />
            <div className="notification-panel">
                <div className="notification-header">
                    <div className="header-title">
                        <BellIcon />
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="unread-badge">{unreadCount}</span>
                        )}
                    </div>
                    <div className="header-actions">
                        {unreadCount > 0 && (
                            <button className="btn-mark-all" onClick={markAllAsRead}>
                                <CheckIcon /> Mark all read
                            </button>
                        )}
                        <button className="btn-close" onClick={onClose}>x</button>
                    </div>
                </div>

                <div className="notification-list">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">None</div>
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="notification-icon">
                                    {getNotificationIcon(notification.type)}
                                </div>
                                <div className="notification-content">
                                    <div className="notification-title">{notification.title}</div>
                                    <div className="notification-message">{notification.message}</div>
                                    <div className="notification-time">{getTimeAgo(notification.created_at)}</div>
                                </div>
                                <div className="notification-actions">
                                    {!notification.is_read && (
                                        <button
                                            className="btn-icon"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                markAsRead(notification.id)
                                            }}
                                            title="Mark as read"
                                        >
                                            <CheckIcon />
                                        </button>
                                    )}
                                    <button
                                        className="btn-icon"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            deleteNotification(notification.id)
                                        }}
                                        title="Delete"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    )
}

export default NotificationCenter



