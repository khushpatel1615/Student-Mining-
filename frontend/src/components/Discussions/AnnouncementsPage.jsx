import { useState, useEffect } from 'react'
import { Bell, Pin, Eye, ArrowLeft, Clock, Megaphone } from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuth } from '../../context/AuthContext'
import { API_BASE } from '../../config';
import './DiscussionForum.css'



function AnnouncementsPage() {
    const { token, user } = useAuth()
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)

    useEffect(() => {
        fetchAnnouncements()
    }, [])

    const fetchAnnouncements = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/discussions.php?action=list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) {
                // Filter to show only announcements
                const announcementPosts = data.data.filter(d => d.category === 'announcement')
                setAnnouncements(announcementPosts)
            }
        } catch (err) {
            toast.error('Failed to load announcements')
        } finally {
            setLoading(false)
        }
    }

    const viewAnnouncement = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/discussions.php?action=view&id=${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) setSelectedAnnouncement(data.data)
        } catch (err) {
            toast.error('Failed to load announcement')
        }
    }

    const formatTime = (date) => {
        const d = new Date(date)
        const now = new Date()
        const diff = (now - d) / 1000
        if (diff < 60) return 'Just now'
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const formatFullDate = (date) => {
        const d = new Date(date)
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (selectedAnnouncement) {
        return (
            <div className="discussion-view announcement-view">
                <button className="btn-back" onClick={() => setSelectedAnnouncement(null)}>
                    <ArrowLeft size={18} /> Back to Announcements
                </button>
                <div className="discussion-detail announcement-detail">
                    <div className="discussion-header">
                        <div className="category-badge announcement-badge">
                            <Megaphone size={14} />
                            Announcement
                        </div>
                        {selectedAnnouncement.is_pinned && <span className="pinned">Pinned</span>}
                    </div>
                    <h2>{selectedAnnouncement.title}</h2>
                    <div className="post-meta">
                        <div className="author">
                            <div className="avatar">{selectedAnnouncement.author_name?.[0] || '?'}</div>
                            <div className="author-info">
                                <span className="author-name">{selectedAnnouncement.author_name}</span>
                                <span className="author-role">System Administrator</span>
                            </div>
                        </div>
                        <div className="meta-right">
                            <span className="time"><Clock size={14} /> {formatFullDate(selectedAnnouncement.created_at)}</span>
                            <span className="views"><Eye size={14} /> {selectedAnnouncement.views} views</span>
                        </div>
                    </div>
                    <div className="post-content announcement-content">
                        {selectedAnnouncement.content}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="discussion-forum announcements-page">
            <div className="forum-header announcements-header">
                <div>
                    <h2><Bell size={24} /> Announcements</h2>
                    <p>Stay updated with important notices and updates from administration</p>
                </div>
            </div>

            {loading ? (
                <div className="loading">Loading announcements...</div>
            ) : announcements.length === 0 ? (
                <div className="empty-state">
                    <Bell size={48} />
                    <h3>No announcements yet</h3>
                    <p>Check back later for important updates</p>
                </div>
            ) : (
                <div className="discussions-list announcements-list">
                    {announcements.map(a => (
                        <div
                            key={a.id}
                            className={`discussion-card announcement-card ${a.is_pinned ? 'pinned' : ''}`}
                            onClick={() => viewAnnouncement(a.id)}
                        >
                            {a.is_pinned && <div className="pin-badge">PIN</div>}
                            <div className="card-icon">
                                <Megaphone size={24} />
                            </div>
                            <div className="card-main">
                                <h4>{a.title}</h4>
                                <p className="announcement-preview">
                                    {a.content?.substring(0, 120)}
                                    {a.content?.length > 120 ? '...' : ''}
                                </p>
                                <div className="card-meta">
                                    <span className="author">{a.author_name}</span>
                                    <span className="dot">*</span>
                                    <span>{formatTime(a.created_at)}</span>
                                </div>
                            </div>
                            <div className="card-stats">
                                <div className="stat"><Eye size={16} />{a.views || 0}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default AnnouncementsPage



