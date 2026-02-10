import { API_BASE } from '../../config';
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import './ExamManagement.css'



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
    const [deleteConfirmation, setDeleteConfirmation] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const [selectedSubject, setSelectedSubject] = useState('')
    const [selectedSemester, setSelectedSemester] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState('date_desc')
    const [formData, setFormData] = useState({
        subject_id: '',
        semester: '',
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
            const params = new URLSearchParams()
            if (selectedSubject) params.append('subject_id', selectedSubject)
            if (selectedSemester) params.append('semester', selectedSemester)
            const url = params.toString()
                ? `${API_BASE}/exams.php?${params.toString()}`
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
    }, [selectedSubject, selectedSemester])

    useEffect(() => {
        // Reset subject when semester changes to avoid mismatch
        setSelectedSubject('')
    }, [selectedSemester])

    useEffect(() => {
        // Keep subject in sync when semester changes in form
        if (!formData.semester) return
        const subject = subjects.find(s => String(s.id) === String(formData.subject_id))
        if (subject && String(subject.semester) !== String(formData.semester)) {
            setFormData(prev => ({ ...prev, subject_id: '' }))
        }
    }, [formData.semester, formData.subject_id, subjects])

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
                    semester: '',
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
        const subject = subjects.find(s => String(s.id) === String(exam.subject_id))
        const examSemester = subject?.semester ? String(subject.semester) : ''
        setFormData({
            subject_id: exam.subject_id,
            semester: examSemester,
            title: exam.title,
            exam_type: exam.exam_type,
            exam_date: (exam.start_datetime || '').slice(0, 16),
            duration_minutes: exam.duration_minutes,
            max_marks: exam.total_marks ?? exam.max_marks
        })
        setEditingId(exam.id)
        setShowModal(true)
    }

    const handleDelete = (exam) => {
        setDeleteConfirmation(exam)
    }

    const confirmDelete = async () => {
        if (!deleteConfirmation) return

        try {
            const response = await fetch(`${API_BASE}/exams.php?id=${deleteConfirmation.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setDeleteConfirmation(null)
                fetchExams()
            } else {
                setError(data.error || 'Failed to delete exam')
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

    const filteredExams = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        let list = [...exams]
        if (q) {
            list = list.filter(e => {
                const title = (e.title || '').toLowerCase()
                const subject = (e.subject_name || '').toLowerCase()
                const code = (e.subject_code || '').toLowerCase()
                return title.includes(q) || subject.includes(q) || code.includes(q)
            })
        }
        switch (sortBy) {
            case 'date_asc':
                list.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
                break
            case 'title_asc':
                list.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
                break
            case 'title_desc':
                list.sort((a, b) => (b.title || '').localeCompare(a.title || ''))
                break
            case 'marks_desc':
                list.sort((a, b) => (b.total_marks || b.max_marks || 0) - (a.total_marks || a.max_marks || 0))
                break
            default:
                list.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime))
        }
        return list
    }, [exams, searchQuery, sortBy])

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
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                    >
                        <option value="">All Semesters</option>
                        {[...new Set(subjects.map(s => s.semester))].sort((a, b) => a - b).map(sem => (
                            <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                    </select>
                    <select
                        className="filter-select"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                    >
                        <option value="">All Subjects</option>
                        {subjects
                            .filter(s => !selectedSemester || String(s.semester) === String(selectedSemester))
                            .map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                    </select>
                    <input
                        className="search-input"
                        placeholder="Search exams, subjects, codes"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <select
                        className="filter-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="date_desc">Newest First</option>
                        <option value="date_asc">Oldest First</option>
                        <option value="title_asc">Title A-Z</option>
                        <option value="title_desc">Title Z-A</option>
                        <option value="marks_desc">Max Marks (High)</option>
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
            ) : filteredExams.length === 0 ? (
                <div className="empty-state">
                    <p>No exams found for the current filters.</p>
                </div>
            ) : (
                <>
                    <div className="exam-stats">
                        <div><strong>{filteredExams.length}</strong> exams</div>
                        <div>Showing {selectedSemester ? `Semester ${selectedSemester}` : 'All Semesters'}</div>
                        <div>{selectedSubject ? 'Filtered by subject' : 'All subjects'}</div>
                    </div>
                    <div className="exams-grid">
                        {filteredExams.map(exam => (
                        <div key={exam.id} className="exam-card">
                            <div className="exam-card-header">
                                <div>
                                    <h3>{exam.title}</h3>
                                    <div className="exam-badges">
                                        <span className="subject-badge">{exam.subject_code}</span>
                                        {exam.subject_semester && (
                                            <span className="semester-badge">{exam.subject_semester}</span>
                                        )}
                                        {exam.exam_type && (
                                            <span
                                                className="exam-type-badge"
                                                style={{ backgroundColor: getExamTypeColor(exam.exam_type) }}
                                            >
                                                {exam.exam_type}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="card-actions">
                                    <button onClick={() => handleEdit(exam)} title="Edit">
                                        <EditIcon />
                                    </button>
                                    <button onClick={() => handleDelete(exam)} title="Delete" className="delete-btn">
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                            <div className="exam-meta">
                                <div className="meta-item">
                                    <span className="meta-label">Date:</span>
                                    <span className="meta-value">{formatDate(exam.start_datetime)}</span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Duration:</span>
                                    <span className="meta-value">{exam.duration_minutes} min</span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Max Marks:</span>
                                    <span className="meta-value">{exam.total_marks ?? exam.max_marks}</span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Submitted Results:</span>
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
                </>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmation && (
                <div className="modal-overlay" onClick={() => setDeleteConfirmation(null)}>
                    <div className="modal-content delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Delete Exam</h3>
                            <button className="modal-close" onClick={() => setDeleteConfirmation(null)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete the exam <strong>{deleteConfirmation.title}</strong>?</p>
                            <p className="warning-text">This action cannot be undone. All associated results and student grades will be permanently removed.</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn-secondary" onClick={() => setDeleteConfirmation(null)}>
                                Cancel
                            </button>
                            <button type="button" className="btn-danger" onClick={confirmDelete}>
                                Delete Exam
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit/Create Modal */}
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
                                <label>Semester *</label>
                                <select
                                    value={formData.semester}
                                    onChange={e => setFormData({ ...formData, semester: e.target.value, subject_id: '' })}
                                    required
                                >
                                    <option value="">Select Semester</option>
                                    {[...new Set(subjects.map(s => s.semester))].sort((a, b) => a - b).map(sem => (
                                        <option key={sem} value={sem}>Semester {sem}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Subject *</label>
                                <select
                                    value={formData.subject_id}
                                    onChange={e => setFormData({ ...formData, subject_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Subject</option>
                                    {subjects
                                        .filter(s => !formData.semester || String(s.semester) === String(formData.semester))
                                        .map(s => (
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



