import { API_BASE } from '../../config';
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import './AssignmentManagement.css'



// Icons
const PlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
)

const EyeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
)

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
)

const EditIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
)

const TrashIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
)

function AssignmentManagement() {
    const { token } = useAuth()
    const [assignments, setAssignments] = useState([])
    const [subjects, setSubjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [selectedSubject, setSelectedSubject] = useState('')
    const [formData, setFormData] = useState({
        subject_id: '',
        title: '',
        description: '',
        due_date: '',
        max_marks: 100
    })

    // Submissions View
    const [viewingSubmissions, setViewingSubmissions] = useState(null)
    const [submissions, setSubmissions] = useState([])

    useEffect(() => {
        fetchSubjects()
        fetchAssignments()
    }, [])

    const fetchSubjects = async () => {
        try {
            const response = await fetch(`${API_BASE}/subjects.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setSubjects(data.data)
            }
        } catch (err) {
            console.error('Failed to fetch subjects:', err)
        }
    }

    const fetchAssignments = async () => {
        try {
            setLoading(true)
            const url = selectedSubject
                ? `${API_BASE}/assignments.php?subject_id=${selectedSubject}`
                : `${API_BASE}/assignments.php`

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setAssignments(data.data)
            }
        } catch (err) {
            setError('Failed to fetch assignments')
        } finally {
            setLoading(false)
        }
    }

    const fetchSubmissions = async (id) => {
        try {
            const response = await fetch(`${API_BASE}/submissions.php?action=list&assignment_id=${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setSubmissions(data.data)
                setViewingSubmissions(id)
            } else {
                setError(data.error || 'Failed to load submissions')
            }
        } catch (err) {
            setError('Failed to load submissions')
        }
    }

    useEffect(() => {
        fetchAssignments()
    }, [selectedSubject])

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const url = `${API_BASE}/assignments.php`
            const method = editingId ? 'PUT' : 'POST'
            const body = editingId ? { ...formData, id: editingId } : formData

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            })

            const data = await response.json()
            if (data.success) {
                setShowModal(false)
                setEditingId(null)
                setFormData({
                    subject_id: '',
                    title: '',
                    description: '',
                    due_date: '',
                    max_marks: 100
                })
                fetchAssignments()
            } else {
                setError(data.error || 'Failed to save assignment')
            }
        } catch (err) {
            setError('Failed to save assignment')
        }
    }

    const handleEdit = (assignment) => {
        setFormData({
            subject_id: assignment.subject_id,
            title: assignment.title,
            description: assignment.description,
            due_date: assignment.due_date.slice(0, 16),
            max_marks: assignment.max_marks
        })
        setEditingId(assignment.id)
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this assignment?')) return

        try {
            const response = await fetch(`${API_BASE}/assignments.php?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                fetchAssignments()
            }
        } catch (err) {
            setError('Failed to delete assignment')
        }
    }

    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const isOverdue = (dueDate) => {
        return new Date(dueDate) < new Date()
    }

    return (
        <div className="assignment-management">
            <div className="assignment-header">
                <h2>Assignment Management</h2>
                <div className="header-actions">
                    <select
                        className="filter-select"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                    >
                        <option value="">All Subjects</option>
                        {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                    </select>
                    <button className="btn-add" onClick={() => setShowModal(true)}>
                        <PlusIcon />
                        Create Assignment
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">{error}</div>
            )}

            {loading ? (
                <div className="loading">Loading assignments...</div>
            ) : assignments.length === 0 ? (
                <div className="empty-state">
                    <p>No assignments found. Create your first assignment!</p>
                </div>
            ) : (
                <div className="assignments-grid">
                    {assignments.map(assignment => (
                        <div key={assignment.id} className="assignment-card">
                            <div className="assignment-card-header">
                                <div>
                                    <h3>{assignment.title}</h3>
                                    <span className="subject-badge">{assignment.subject_code}</span>
                                </div>
                                <div className="card-actions">
                                    <button onClick={() => fetchSubmissions(assignment.id)} title="View Submissions">
                                        <EyeIcon />
                                    </button>
                                    <button onClick={() => handleEdit(assignment)} title="Edit">
                                        <EditIcon />
                                    </button>
                                    <button onClick={() => handleDelete(assignment.id)} title="Delete" className="delete-btn">
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                            <p className="assignment-description">{assignment.description}</p>
                            <div className="assignment-meta">
                                <div className="meta-item">
                                    <span className="meta-label">Due Date:</span>
                                    <span className={`meta-value ${isOverdue(assignment.due_date) ? 'overdue' : ''}`}>
                                        {formatDate(assignment.due_date)}
                                    </span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Max Marks:</span>
                                    <span className="meta-value">{assignment.max_marks}</span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Submissions:</span>
                                    <span className="meta-value">{assignment.submission_count || 0}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingId ? 'Edit Assignment' : 'Create Assignment'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-group">
                                <label>Subject *</label>
                                <select
                                    value={formData.subject_id}
                                    onChange={e => setFormData({ ...formData, subject_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows="4"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Due Date *</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.due_date}
                                        onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Max Marks *</label>
                                    <input
                                        type="number"
                                        value={formData.max_marks}
                                        onChange={e => setFormData({ ...formData, max_marks: parseInt(e.target.value) })}
                                        required
                                        min="1"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingId ? 'Update' : 'Create'} Assignment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Submissions Modal */}
            {viewingSubmissions && (
                <div className="modal-overlay" onClick={() => setViewingSubmissions(null)}>
                    <div className="modal-content" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Submissions: {assignments.find(a => a.id === viewingSubmissions)?.title}</h3>
                            <button className="modal-close" onClick={() => setViewingSubmissions(null)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="modal-body">
                            {submissions.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'gray', padding: '2rem' }}>No submissions yet.</p>
                            ) : (
                                <table className="submissions-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
                                            <th style={{ padding: '0.5rem' }}>Student</th>
                                            <th style={{ padding: '0.5rem' }}>ID</th>
                                            <th style={{ padding: '0.5rem' }}>Submitted</th>
                                            <th style={{ padding: '0.5rem' }}>File</th>
                                            <th style={{ padding: '0.5rem' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissions.map(sub => (
                                            <tr key={sub.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                                <td style={{ padding: '0.75rem 0.5rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                                                            {sub.full_name?.charAt(0)}
                                                        </div>
                                                        {sub.full_name}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{sub.student_code || sub.student_id}</td>
                                                <td style={{ padding: '0.5rem' }}>{formatDate(sub.submitted_at)}</td>
                                                <td style={{ padding: '0.5rem' }}>
                                                    {sub.file_path ? (
                                                        <a href={`http://localhost/StudentDataMining/backend/uploads/${sub.file_path}`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none' }}>
                                                            View File
                                                        </a>
                                                    ) : '-'}
                                                </td>
                                                <td style={{ padding: '0.5rem' }}>
                                                    <span className={`badge ${sub.status === 'late' ? 'urgent' : 'success'}`} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                        {sub.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AssignmentManagement



