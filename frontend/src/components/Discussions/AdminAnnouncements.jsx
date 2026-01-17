import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Megaphone, Plus, Trash2, Pin, Eye, Clock, X, Edit } from 'lucide-react'
import toast from 'react-hot-toast'
import './DiscussionForum.css'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function AdminAnnouncements() {
    const { token } = useAuth()
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [showNewForm, setShowNewForm] = useState(false)
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')

    // Edit State
    const [isEditing, setIsEditing] = useState(false)
    const [editingId, setEditingId] = useState(null)

    // Target Audience State
    const [programs, setPrograms] = useState([])
    const [selectedProgram, setSelectedProgram] = useState('')
    const [selectedSemester, setSelectedSemester] = useState('')

    useEffect(() => {
        fetchAnnouncements()
        fetchPrograms()
    }, [])

    const fetchAnnouncements = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/discussions.php?action=list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) {
                // Backend already filters by category='announcement' for list action
                setAnnouncements(data.data)
            }
        } catch (err) {
            toast.error('Failed to load announcements')
        } finally {
            setLoading(false)
        }
    }

    const fetchPrograms = async () => {
        try {
            const res = await fetch(`${API_BASE}/programs.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) setPrograms(data.data)
        } catch (err) {
            console.error('Failed to load programs')
        }
    }

    const createAnnouncement = async () => {
        if (!title.trim() || !content.trim()) {
            toast.error('Title and content required')
            return
        }
        try {
            const body = {
                action: isEditing ? 'update' : 'create',
                title,
                content,
                category: 'announcement',
                program_id: selectedProgram || null,
                semester: selectedSemester || null
            }
            if (isEditing) body.id = editingId

            const res = await fetch(`${API_BASE}/discussions.php`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()
            if (data.success) {
                toast.success(isEditing ? 'Announcement updated!' : 'Announcement published!')
                setShowNewForm(false)
                resetForm()
                fetchAnnouncements()
            }
        } catch (err) {
            toast.error('Failed to save announcement')
        }
    }

    const resetForm = () => {
        setTitle('')
        setContent('')
        setSelectedProgram('')
        setSelectedSemester('')
        setIsEditing(false)
        setEditingId(null)
    }

    const handleEdit = (announcement) => {
        setTitle(announcement.title)
        setContent(announcement.content)
        // Handle potentially null/0 values
        setSelectedProgram(announcement.program_id ? announcement.program_id.toString() : '')
        setSelectedSemester(announcement.semester ? announcement.semester.toString() : '')
        setEditingId(announcement.id)
        setIsEditing(true)
        setShowNewForm(true)
    }

    const togglePin = async (id) => {
        try {
            await fetch(`${API_BASE}/discussions.php`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'pin', id })
            })
            fetchAnnouncements()
        } catch (err) { }
    }

    const deleteAnnouncement = async (id) => {
        if (!confirm('Delete this announcement?')) return
        try {
            await fetch(`${API_BASE}/discussions.php`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            toast.success('Deleted')
            fetchAnnouncements()
        } catch (err) { }
    }

    const formatTime = (date) => {
        const d = new Date(date)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const getSemesters = () => {
        if (!selectedProgram) return []
        const prog = programs.find(p => p.id == selectedProgram)
        if (!prog) return []
        return Array.from({ length: prog.total_semesters }, (_, i) => i + 1)
    }

    return (
        <div className="discussion-forum announcement-admin">
            <div className="forum-header">
                <div>
                    <h2><Megaphone size={24} /> Announcements</h2>
                    <p>Broadcast updates to students via Program or Semester targeting</p>
                </div>
                <button className="btn-new" onClick={() => { resetForm(); setShowNewForm(true); }}>
                    <Plus size={18} /> New Announcement
                </button>
            </div>

            {showNewForm && (
                <div className="modal-overlay" onClick={() => setShowNewForm(false)}>
                    <div className="new-form" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3>{isEditing ? 'Edit Announcement' : 'Compose Announcement'}</h3>
                            <button className="btn-icon" onClick={() => setShowNewForm(false)}><X size={20} /></button>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>Target Audience</label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <select
                                    className="filter-select"
                                    value={selectedProgram}
                                    onChange={e => { setSelectedProgram(e.target.value); setSelectedSemester(''); }}
                                    style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                                >
                                    <option value="">All Programs (Global)</option>
                                    {programs.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                                    ))}
                                </select>
                                <select
                                    className="filter-select"
                                    value={selectedSemester}
                                    onChange={e => setSelectedSemester(e.target.value)}
                                    disabled={!selectedProgram}
                                    style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                                >
                                    <option value="">All Semesters</option>
                                    {getSemesters().map(s => (
                                        <option key={s} value={s}>Semester {s}</option>
                                    ))}
                                </select>
                            </div>
                            <small style={{ color: '#6b7280', marginTop: '0.25rem', display: 'block' }}>
                                {!selectedProgram ? 'Announcement will be visible to ALL students.' :
                                    !selectedSemester ? `Visible to all students in ${programs.find(p => p.id == selectedProgram)?.code}.` :
                                        `Visible only to Semester ${selectedSemester} students in ${programs.find(p => p.id == selectedProgram)?.code}.`
                                }
                            </small>
                        </div>

                        <input
                            type="text"
                            placeholder="Announcement Subject..."
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            style={{ marginBottom: '1rem' }}
                        />
                        <textarea
                            placeholder="Type your message here..."
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            style={{ minHeight: '150px', marginBottom: '1rem' }}
                        />
                        <div className="form-actions">
                            <button className="btn-cancel" onClick={() => setShowNewForm(false)}>Cancel</button>
                            <button className="btn-submit" onClick={createAnnouncement}>
                                {isEditing ? 'Update' : 'Publish Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="loading">Loading...</div>
            ) : announcements.length === 0 ? (
                <div className="empty-state">
                    <Megaphone size={48} />
                    <p>No announcements published yet.</p>
                </div>
            ) : (
                <div className="discussions-list">
                    {announcements.map(a => (
                        <div key={a.id} className={`discussion-card ${a.is_pinned ? 'pinned' : ''}`}>
                            {a.is_pinned && <div className="pin-badge">📌</div>}
                            <div className="card-main">
                                <div className="category-badge announcement-badge" style={{ width: 'fit-content' }}>
                                    {a.program_id
                                        ? (a.semester
                                            ? `${programs.find(p => p.id == a.program_id)?.code || 'Program'} - Sem ${a.semester}`
                                            : `${programs.find(p => p.id == a.program_id)?.code || 'Program'}`)
                                        : 'Global Announcement'
                                    }
                                </div>
                                <h4>{a.title}</h4>
                                <p style={{ fontSize: '0.9rem', color: '#4b5563', margin: '0.5rem 0', lineHeight: '1.5' }}>
                                    {a.content}
                                </p>
                                <div className="card-meta">
                                    <span className="author">By {a.author_name}</span>
                                    <span className="dot">•</span>
                                    <span>{formatTime(a.created_at)}</span>
                                </div>
                            </div>
                            <div className="card-stats" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                                <div title="Views" className="stat"><Eye size={16} />{a.views || 0}</div>
                                <div className="actions" style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn-icon-small" onClick={(e) => { e.stopPropagation(); togglePin(a.id); }} title={a.is_pinned ? "Unpin" : "Pin"}>
                                        <Pin size={16} fill={a.is_pinned ? "currentColor" : "none"} />
                                    </button>
                                    <button className="btn-icon-small" onClick={(e) => { e.stopPropagation(); handleEdit(a); }} title="Edit">
                                        <Edit size={16} />
                                    </button>
                                    <button className="btn-icon-small danger" onClick={(e) => { e.stopPropagation(); deleteAnnouncement(a.id); }} title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default AdminAnnouncements
