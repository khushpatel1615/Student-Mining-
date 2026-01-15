import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { MessageSquare, Plus, Send, Pin, Trash2, Eye, ArrowLeft, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import './DiscussionForum.css'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function DiscussionForum({ subjectId = null }) {
    const { token, user } = useAuth()
    const [discussions, setDiscussions] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedDiscussion, setSelectedDiscussion] = useState(null)
    const [showNewForm, setShowNewForm] = useState(false)
    const [newPost, setNewPost] = useState({ title: '', content: '', category: 'general' })
    const [newReply, setNewReply] = useState('')

    useEffect(() => {
        fetchDiscussions()
    }, [subjectId])

    const fetchDiscussions = async () => {
        setLoading(true)
        try {
            const url = subjectId
                ? `${API_BASE}/discussions.php?action=list&subject_id=${subjectId}`
                : `${API_BASE}/discussions.php?action=list`
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
            const data = await res.json()
            if (data.success) setDiscussions(data.data)
        } catch (err) {
            toast.error('Failed to load discussions')
        } finally {
            setLoading(false)
        }
    }

    const viewDiscussion = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/discussions.php?action=view&id=${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) setSelectedDiscussion(data.data)
        } catch (err) {
            toast.error('Failed to load discussion')
        }
    }

    const createDiscussion = async () => {
        if (!newPost.title.trim() || !newPost.content.trim()) {
            toast.error('Title and content required')
            return
        }
        try {
            const res = await fetch(`${API_BASE}/discussions.php`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', subject_id: subjectId, ...newPost })
            })
            const data = await res.json()
            if (data.success) {
                toast.success('Discussion created!')
                setShowNewForm(false)
                setNewPost({ title: '', content: '', category: 'general' })
                fetchDiscussions()
            }
        } catch (err) {
            toast.error('Failed to create discussion')
        }
    }

    const addReply = async () => {
        if (!newReply.trim()) return
        try {
            const res = await fetch(`${API_BASE}/discussions.php`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reply', discussion_id: selectedDiscussion.id, content: newReply })
            })
            const data = await res.json()
            if (data.success) {
                toast.success('Reply added!')
                setNewReply('')
                viewDiscussion(selectedDiscussion.id)
            }
        } catch (err) {
            toast.error('Failed to add reply')
        }
    }

    const togglePin = async (id) => {
        try {
            await fetch(`${API_BASE}/discussions.php`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'pin', id })
            })
            fetchDiscussions()
        } catch (err) { }
    }

    const deleteDiscussion = async (id) => {
        if (!confirm('Delete this discussion?')) return
        try {
            await fetch(`${API_BASE}/discussions.php`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            toast.success('Deleted')
            setSelectedDiscussion(null)
            fetchDiscussions()
        } catch (err) { }
    }

    const getCategoryColor = (cat) => {
        const colors = { general: '#6366f1', question: '#22c55e', announcement: '#f59e0b', help: '#ec4899' }
        return colors[cat] || colors.general
    }

    const formatTime = (date) => {
        const d = new Date(date)
        const now = new Date()
        const diff = (now - d) / 1000
        if (diff < 60) return 'Just now'
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
        return d.toLocaleDateString()
    }

    if (selectedDiscussion) {
        return (
            <div className="discussion-view">
                <button className="btn-back" onClick={() => setSelectedDiscussion(null)}>
                    <ArrowLeft size={18} /> Back to Discussions
                </button>
                <div className="discussion-detail">
                    <div className="discussion-header">
                        <div className="category-badge" style={{ background: getCategoryColor(selectedDiscussion.category) }}>
                            {selectedDiscussion.category}
                        </div>
                        {selectedDiscussion.is_pinned && <span className="pinned">📌 Pinned</span>}
                    </div>
                    <h2>{selectedDiscussion.title}</h2>
                    <div className="post-meta">
                        <div className="author">
                            <div className="avatar">{selectedDiscussion.author_name?.[0] || '?'}</div>
                            <span>{selectedDiscussion.author_name}</span>
                        </div>
                        <span className="time"><Clock size={14} /> {formatTime(selectedDiscussion.created_at)}</span>
                        <span className="views"><Eye size={14} /> {selectedDiscussion.views} views</span>
                    </div>
                    <div className="post-content">{selectedDiscussion.content}</div>

                    {(user.role === 'admin' || user.role === 'teacher') && (
                        <div className="post-actions">
                            <button onClick={() => togglePin(selectedDiscussion.id)}><Pin size={16} /> {selectedDiscussion.is_pinned ? 'Unpin' : 'Pin'}</button>
                            <button className="danger" onClick={() => deleteDiscussion(selectedDiscussion.id)}><Trash2 size={16} /> Delete</button>
                        </div>
                    )}
                </div>

                <div className="replies-section">
                    <h3>💬 Replies ({selectedDiscussion.replies?.length || 0})</h3>
                    {selectedDiscussion.replies?.map(reply => (
                        <div key={reply.id} className="reply-card">
                            <div className="reply-header">
                                <div className="author">
                                    <div className="avatar small">{reply.author_name?.[0]}</div>
                                    <span>{reply.author_name}</span>
                                </div>
                                <span className="time">{formatTime(reply.created_at)}</span>
                            </div>
                            <div className="reply-content">{reply.content}</div>
                        </div>
                    ))}

                    <div className="reply-form">
                        <textarea
                            placeholder="Write a reply..."
                            value={newReply}
                            onChange={(e) => setNewReply(e.target.value)}
                        />
                        <button className="btn-reply" onClick={addReply}><Send size={16} /> Reply</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="discussion-forum">
            <div className="forum-header">
                <div>
                    <h2><MessageSquare size={24} /> Discussion Forum</h2>
                    <p>Ask questions, share ideas, and collaborate with peers</p>
                </div>
                <button className="btn-new" onClick={() => setShowNewForm(true)}>
                    <Plus size={18} /> New Discussion
                </button>
            </div>

            {showNewForm && (
                <div className="modal-overlay" onClick={() => setShowNewForm(false)}>
                    <div className="new-form" onClick={e => e.stopPropagation()}>
                        <h3>Start a Discussion</h3>
                        <select value={newPost.category} onChange={e => setNewPost({ ...newPost, category: e.target.value })}>
                            <option value="general">General</option>
                            <option value="question">Question</option>
                            <option value="help">Help Needed</option>
                            <option value="announcement">Announcement</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Discussion title..."
                            value={newPost.title}
                            onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                        />
                        <textarea
                            placeholder="What's on your mind?"
                            value={newPost.content}
                            onChange={e => setNewPost({ ...newPost, content: e.target.value })}
                        />
                        <div className="form-actions">
                            <button className="btn-cancel" onClick={() => setShowNewForm(false)}>Cancel</button>
                            <button className="btn-submit" onClick={createDiscussion}>Post Discussion</button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="loading">Loading discussions...</div>
            ) : discussions.length === 0 ? (
                <div className="empty-state">
                    <MessageSquare size={48} />
                    <p>No discussions yet. Start one!</p>
                </div>
            ) : (
                <div className="discussions-list">
                    {discussions.map(d => (
                        <div key={d.id} className={`discussion-card ${d.is_pinned ? 'pinned' : ''}`} onClick={() => viewDiscussion(d.id)}>
                            {d.is_pinned && <div className="pin-badge">📌</div>}
                            <div className="card-main">
                                <div className="category-badge" style={{ background: getCategoryColor(d.category) }}>{d.category}</div>
                                <h4>{d.title}</h4>
                                <div className="card-meta">
                                    <span className="author">{d.author_name}</span>
                                    <span className="dot">•</span>
                                    <span>{formatTime(d.created_at)}</span>
                                    {d.subject_name && <><span className="dot">•</span><span className="subject">{d.subject_name}</span></>}
                                </div>
                            </div>
                            <div className="card-stats">
                                <div className="stat"><MessageSquare size={16} />{d.reply_count || 0}</div>
                                <div className="stat"><Eye size={16} />{d.views || 0}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default DiscussionForum
