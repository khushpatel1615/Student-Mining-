import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import './ExamManagement.css'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

// Icons (reusing from Assignment Management)
const PlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)

const EditIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
)

const TrashIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
)

function ExamManagement() {
    const { token } = useAuth()
    const [exams, setExams] = useState([])
    const [subjects, setSubjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [selectedSubject, setSelectedSubject] = useState('')
    const [formData, setFormData] = useState({
        subject_id: '',
        title: '',
        exam_type: 'midterm',
        exam_date: '',
        duration_minutes: 120,
        max_marks: 100
    })

    useEffect(() => {
        fetchSubjects()
        fetchExams()
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

    const fetchExams = async () => {
        try {
            setLoading(true)
            const url = selectedSubject
                ? `${API_BASE}/exams.php?subject_id=${selectedSubject}`
                : `${API_BASE}/exams.php`

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setExams(data.data)
            }
        } catch (err) {
            setError('Failed to fetch exams')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchExams()
    }, [selectedSubject])

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const url = `${API_BASE}/exams.php`
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
                    exam_type: 'midterm',
                    exam_date: '',
                    duration_minutes: 120,
                    max_marks: 100
                })
                fetchExams()
            } else {
                setError(data.error || 'Failed to save exam')
            }
        } catch (err) {
            setError('Failed to save exam')
        }
    }

    const handleEdit = (exam) => {
        setFormData({
            subject_id: exam.subject_id,
            title: exam.title,
            exam_type: exam.exam_type,
            exam_date: exam.exam_date.slice(0, 16),
            duration_minutes: exam.duration_minutes,
            max_marks: exam.max_marks
        })
        setEditingId(exam.id)
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this exam?')) return

        try {
            const response = await fetch(`${API_BASE}/exams.php?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                fetchExams()
            }
        } catch (err) {
            setError('Failed to delete exam')
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

    const getExamTypeColor = (type) => {
        const colors = {
            quiz: '#3b82f6',
            midterm: '#f59e0b',
            final: '#ef4444',
            practical: '#10b981',
            other: '#6366f1'
        }
        return colors[type] || colors.other
    }

    return (
        <div className="exam-management">
            <div className="exam-header">
                <h2>Exam Management</h2>
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
                        Create Exam
                    </button>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading">Loading exams...</div>
            ) : exams.length === 0 ? (
                <div className="empty-state">
                    <p>No exams found. Create your first exam!</p>
                </div>
            ) : (
                <div className="exams-grid">
                    {exams.map(exam => (
                        <div key={exam.id} className="exam-card">
                            <div className="exam-card-header">
                                <div>
                                    <h3>{exam.title}</h3>
                                    <div className="exam-badges">
                                        <span className="subject-badge">{exam.subject_code}</span>
                                        <span
                                            className="exam-type-badge"
                                            style={{ backgroundColor: getExamTypeColor(exam.exam_type) }}
                                        >
                                            {exam.exam_type}
                                        </span>
                                    </div>
                                </div>
                                <div className="card-actions">
                                    <button onClick={() => handleEdit(exam)} title="Edit">
                                        <EditIcon />
                                    </button>
                                    <button onClick={() => handleDelete(exam.id)} title="Delete" className="delete-btn">
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                            <div className="exam-meta">
                                <div className="meta-item">
                                    <span className="meta-label">Date:</span>
                                    <span className="meta-value">{formatDate(exam.exam_date)}</span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Duration:</span>
                                    <span className="meta-value">{exam.duration_minutes} min</span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Max Marks:</span>
                                    <span className="meta-value">{exam.max_marks}</span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Results:</span>
                                    <span className="meta-value">{exam.result_count || 0}</span>
                                </div>
                                {exam.average_marks && (
                                    <div className="meta-item">
                                        <span className="meta-label">Average:</span>
                                        <span className="meta-value">{parseFloat(exam.average_marks).toFixed(1)}</span>
                                    </div>
                                )}
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
                            <h3>{editingId ? 'Edit Exam' : 'Create Exam'}</h3>
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
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Exam Type *</label>
                                    <select
                                        value={formData.exam_type}
                                        onChange={e => setFormData({ ...formData, exam_type: e.target.value })}
                                        required
                                    >
                                        <option value="quiz">Quiz</option>
                                        <option value="midterm">Midterm</option>
                                        <option value="final">Final</option>
                                        <option value="practical">Practical</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Exam Date *</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.exam_date}
                                        onChange={e => setFormData({ ...formData, exam_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Duration (minutes) *</label>
                                    <input
                                        type="number"
                                        value={formData.duration_minutes}
                                        onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                        required
                                        min="1"
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
                                    {editingId ? 'Update' : 'Create'} Exam
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ExamManagement
