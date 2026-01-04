import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import './TeacherDashboard.css'
import QuickActionsPanel from '../components/QuickActions/QuickActionsPanel'
import ActivityFeed from '../components/ActivityFeed/ActivityFeed'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

// Icons
const MegaphoneIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M3 11l18-5v12L3 13v-2z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
)

const BookIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
)

const PlusIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" {...props}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
)

const EditIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" {...props}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
)

const TrashIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" {...props}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
)

const LogoutIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" {...props}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
)

function TeacherDashboard() {
    const navigate = useNavigate()
    const { user, token, logout } = useAuth()
    const { theme, toggleTheme } = useTheme()

    const [subjects, setSubjects] = useState([])
    const [selectedSubject, setSelectedSubject] = useState(null)
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({ title: '', content: '', is_pinned: false })
    const [file, setFile] = useState(null)
    const [editingId, setEditingId] = useState(null)

    // Mock Teacher Activities
    const teacherActivities = [
        {
            id: 1,
            type: 'submission',
            title: 'New Assignment Submission',
            description: '5 students submitted "Database Project"',
            timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
            icon: '📄',
            isUnread: true
        },
        {
            id: 2,
            type: 'alert',
            title: 'Attendance Alert',
            description: 'Attendance for "Web Dev" is below 80% today',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
            icon: '⚠️',
            isUnread: true
        },
        {
            id: 3,
            type: 'system',
            title: 'System Maintenance',
            description: 'Scheduled maintenance this weekend',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            icon: '🔧',
            isUnread: false
        }
    ]

    useEffect(() => {
        fetchAssignedSubjects()
    }, [])

    useEffect(() => {
        if (selectedSubject) {
            fetchAnnouncements(selectedSubject.id)
        }
    }, [selectedSubject])

    const fetchAssignedSubjects = async () => {
        try {
            const response = await fetch(`${API_BASE}/teachers.php?id=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success && data.data.assigned_subjects) {
                setSubjects(data.data.assigned_subjects)
                if (data.data.assigned_subjects.length > 0) {
                    setSelectedSubject(data.data.assigned_subjects[0])
                }
            }
        } catch (err) {
            console.error('Failed to fetch subjects:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchAnnouncements = async (subjectId) => {
        try {
            const response = await fetch(`${API_BASE}/announcements.php?subject_id=${subjectId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setAnnouncements(data.data)
            }
        } catch (err) {
            console.error('Failed to fetch announcements:', err)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.title.trim() || !formData.content.trim()) return

        try {
            const url = `${API_BASE}/announcements.php`
            const method = editingId ? 'PUT' : 'POST'

            let response;

            if (editingId) {
                // Editing existing announcement (JSON)
                const body = { id: editingId, ...formData }
                response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                })
            } else {
                // Creating new announcement (FormData)
                const data = new FormData()
                data.append('subject_id', selectedSubject.id)
                data.append('title', formData.title)
                data.append('content', formData.content)
                data.append('is_pinned', formData.is_pinned ? '1' : '0')
                if (file) {
                    data.append('attachment', file)
                }

                response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: data
                })
            }

            const data = await response.json()

            if (data.success) {
                setFormData({ title: '', content: '', is_pinned: false })
                setFile(null)
                setShowForm(false)
                setEditingId(null)
                fetchAnnouncements(selectedSubject.id)
            } else {
                alert(data.error || 'Failed to save announcement')
            }
        } catch (err) {
            alert('Failed to save announcement')
        }
    }

    const handleEdit = (announcement) => {
        setFormData({
            title: announcement.title,
            content: announcement.content,
            is_pinned: announcement.is_pinned
        })
        setEditingId(announcement.id)
        setShowForm(true)
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this announcement?')) return

        try {
            const response = await fetch(`${API_BASE}/announcements.php?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()

            if (data.success) {
                fetchAnnouncements(selectedSubject.id)
            } else {
                alert(data.error || 'Failed to delete announcement')
            }
        } catch (err) {
            alert('Failed to delete announcement')
        }
    }

    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div className={`teacher-dashboard ${theme}`}>
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
            </div>
        )
    }

    return (
        <div className={`teacher-dashboard-page teacher-dashboard ${theme}`}>
            {/* Header */}
            <header className="teacher-header">
                <h1>
                    <BookIcon />
                    Teacher Dashboard
                </h1>
                <div className="header-actions">
                    <span style={{ color: 'var(--text-secondary)' }}>Welcome, {user?.full_name}</span>
                    <button className="btn btn-secondary btn-sm" onClick={toggleTheme}>
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={logout}>
                        <LogoutIcon /> Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="teacher-main">
                {/* Sidebar - Subject List */}
                <aside className="subjects-sidebar">
                    <h2>My Subjects</h2>
                    {subjects.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            No subjects assigned yet. Contact admin.
                        </p>
                    ) : (
                        <div className="subject-list">
                            {subjects.map(subject => (
                                <div
                                    key={subject.id}
                                    className={`subject-item ${selectedSubject?.id === subject.id ? 'active' : ''}`}
                                    onClick={() => setSelectedSubject(subject)}
                                >
                                    <h3>{subject.name}</h3>
                                    <p>{subject.code} • Semester {subject.semester}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </aside>

                {/* Announcements Panel */}
                <section className="announcements-panel">
                    {selectedSubject ? (
                        <>
                            <div className="panel-header">
                                <h2>Announcements for {selectedSubject.name}</h2>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => {
                                        setFormData({ title: '', content: '', is_pinned: false })
                                        setFile(null)
                                        setEditingId(null)
                                        setShowForm(!showForm)
                                    }}
                                >
                                    <PlusIcon /> New Announcement
                                </button>
                            </div>

                            {/* Announcement Form */}
                            {showForm && (
                                <form className="announcement-form" onSubmit={handleSubmit}>
                                    <h3>
                                        <h3>
                                            <MegaphoneIcon width={24} height={24} />
                                            {editingId ? 'Edit Announcement' : 'Create Announcement'}
                                        </h3>
                                        {editingId ? 'Edit Announcement' : 'Create Announcement'}
                                    </h3>
                                    <div className="form-group">
                                        <label>Title</label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            placeholder="Announcement title..."
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Content</label>
                                        <textarea
                                            value={formData.content}
                                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                                            placeholder="Write your announcement here..."
                                            required
                                        />
                                    </div>

                                    {!editingId && (
                                        <div className="form-group">
                                            <label className="file-input-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                                Attach PDF Document
                                            </label>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={e => setFile(e.target.files[0])}
                                                className="file-input"
                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                                            />
                                            {file && <div style={{ fontSize: '0.85rem', color: 'var(--accent)', marginTop: '0.25rem' }}>{file.name}</div>}
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.is_pinned}
                                                onChange={e => setFormData({ ...formData, is_pinned: e.target.checked })}
                                            />
                                            Pin this announcement
                                        </label>
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            {editingId ? 'Update' : 'Post'} Announcement
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Announcements List */}
                            <div className="announcements-list">
                                {announcements.length === 0 ? (
                                    <div className="empty-state">
                                        <MegaphoneIcon />
                                        <p>No announcements yet. Create your first one!</p>
                                    </div>
                                ) : (
                                    announcements.map(announcement => (
                                        <div
                                            key={announcement.id}
                                            className={`announcement-card ${announcement.is_pinned ? 'pinned' : ''}`}
                                        >
                                            <div className="announcement-header">
                                                <div className="megaphone-icon">
                                                    <MegaphoneIcon />
                                                </div>
                                                <div className="announcement-meta">
                                                    <h4>{announcement.title}</h4>
                                                    <span className="date">{formatDate(announcement.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="announcement-content">
                                                {announcement.content.split('\n').map((para, i) => (
                                                    <p key={i}>{para}</p>
                                                ))}
                                            </div>
                                            <div className="announcement-actions">
                                                <button onClick={() => handleEdit(announcement)} title="Edit">
                                                    <EditIcon />
                                                </button>
                                                <button className="delete" onClick={() => handleDelete(announcement.id)} title="Delete">
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <BookIcon />
                            <p>Select a subject from the sidebar to manage announcements</p>
                        </div>
                    )}
                </section>

                {/* Right Sidebar - Quick Actions & Feed */}
                <aside className="teacher-right-sidebar">
                    <QuickActionsPanel userRole="teacher" />
                    <ActivityFeed activities={teacherActivities} />
                </aside>
            </main>
        </div>
    )
}

export default TeacherDashboard
