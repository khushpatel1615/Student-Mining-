import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import './TeacherAssignments.css'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

// Icons
const PlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
)

function TeacherAssignments() {
    const { token } = useAuth()
    const [assignments, setAssignments] = useState([])
    const [subjects, setSubjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedAssignment, setSelectedAssignment] = useState(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showGradingModal, setShowGradingModal] = useState(false)
    const [submissions, setSubmissions] = useState([])
    const [formData, setFormData] = useState({
        subject_id: '',
        title: '',
        description: '',
        due_date: '',
        max_marks: 100
    })
    const [gradingData, setGradingData] = useState({
        submission_id: '',
        marks_obtained: '',
        feedback: ''
    })

    useEffect(() => {
        fetchSubjects()
        fetchAssignments()
    }, [])

    const fetchSubjects = async () => {
        try {
            const response = await fetch(`${API_BASE}/teachers.php?action=my_subjects`, {
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
            const response = await fetch(`${API_BASE}/assignments.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setAssignments(data.data)
            }
        } catch (err) {
            console.error('Failed to fetch assignments:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchSubmissions = async (assignmentId) => {
        try {
            const response = await fetch(`${API_BASE}/assignments.php?id=${assignmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success && data.data.submissions) {
                setSubmissions(data.data.submissions)
            }
        } catch (err) {
            console.error('Failed to fetch submissions:', err)
        }
    }

    const handleCreateAssignment = async (e) => {
        e.preventDefault()
        try {
            const response = await fetch(`${API_BASE}/assignments.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })
            const data = await response.json()
            if (data.success) {
                setShowCreateModal(false)
                setFormData({
                    subject_id: '',
                    title: '',
                    description: '',
                    due_date: '',
                    max_marks: 100
                })
                fetchAssignments()
            }
        } catch (err) {
            console.error('Failed to create assignment:', err)
        }
    }

    const handleGradeSubmission = async (e) => {
        e.preventDefault()
        try {
            const response = await fetch(`${API_BASE}/assignments.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(gradingData)
            })
            const data = await response.json()
            if (data.success) {
                setShowGradingModal(false)
                setGradingData({ submission_id: '', marks_obtained: '', feedback: '' })
                if (selectedAssignment) {
                    fetchSubmissions(selectedAssignment.id)
                }
            }
        } catch (err) {
            console.error('Failed to grade submission:', err)
        }
    }

    const viewSubmissions = (assignment) => {
        setSelectedAssignment(assignment)
        fetchSubmissions(assignment.id)
    }

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="teacher-assignments">
            <div className="assignments-header">
                <h2>My Assignments</h2>
                <button className="btn-create" onClick={() => setShowCreateModal(true)}>
                    <PlusIcon />
                    Create Assignment
                </button>
            </div>

            {loading ? (
                <div className="loading">Loading...</div>
            ) : selectedAssignment ? (
                <div className="submissions-view">
                    <div className="submissions-header">
                        <div>
                            <button className="btn-back" onClick={() => setSelectedAssignment(null)}>
                                ← Back to Assignments
                            </button>
                            <h3>{selectedAssignment.title}</h3>
                            <p className="subject-name">{selectedAssignment.subject_name}</p>
                        </div>
                        <div className="assignment-stats">
                            <div className="stat">
                                <span className="stat-value">{submissions.length}</span>
                                <span className="stat-label">Submissions</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">
                                    {submissions.filter(s => s.status === 'graded').length}
                                </span>
                                <span className="stat-label">Graded</span>
                            </div>
                        </div>
                    </div>

                    <div className="submissions-list">
                        {submissions.length === 0 ? (
                            <div className="empty-state">No submissions yet</div>
                        ) : (
                            submissions.map(sub => (
                                <div key={sub.id} className="submission-card">
                                    <div className="submission-info">
                                        <h4>{sub.student_name}</h4>
                                        <p className="student-id">{sub.student_id}</p>
                                        <p className="submission-text">{sub.submission_text}</p>
                                        <span className="submission-date">
                                            Submitted: {formatDate(sub.submitted_at)}
                                        </span>
                                    </div>
                                    <div className="submission-actions">
                                        {sub.status === 'graded' ? (
                                            <div className="graded-info">
                                                <span className="grade-badge">
                                                    {sub.marks_obtained}/{selectedAssignment.total_points}
                                                </span>
                                                {sub.feedback && <p className="feedback">{sub.feedback}</p>}
                                            </div>
                                        ) : (
                                            <button
                                                className="btn-grade"
                                                onClick={() => {
                                                    setGradingData({
                                                        submission_id: sub.id,
                                                        marks_obtained: '',
                                                        feedback: ''
                                                    })
                                                    setShowGradingModal(true)
                                                }}
                                            >
                                                <CheckIcon />
                                                Grade
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <div className="assignments-grid">
                    {assignments.map(assignment => (
                        <div key={assignment.id} className="assignment-card">
                            <div className="card-header">
                                <h3>{assignment.title}</h3>
                                <span className="subject-badge">{assignment.subject_code}</span>
                            </div>
                            <p className="description">{assignment.description}</p>
                            <div className="card-meta">
                                <div className="meta-item">
                                    <span className="label">Due:</span>
                                    <span className="value">{formatDate(assignment.due_date)}</span>
                                </div>
                                <div className="meta-item">
                                    <span className="label">Points:</span>
                                    <span className="value">{assignment.total_points}</span>
                                </div>
                            </div>
                            <button
                                className="btn-view-submissions"
                                onClick={() => viewSubmissions(assignment)}
                            >
                                View Submissions ({assignment.submission_count || 0})
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Assignment Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create Assignment</h3>
                            <button onClick={() => setShowCreateModal(false)}><CloseIcon /></button>
                        </div>
                        <form onSubmit={handleCreateAssignment}>
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
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Grading Modal */}
            {showGradingModal && (
                <div className="modal-overlay" onClick={() => setShowGradingModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Grade Submission</h3>
                            <button onClick={() => setShowGradingModal(false)}><CloseIcon /></button>
                        </div>
                        <form onSubmit={handleGradeSubmission}>
                            <div className="form-group">
                                <label>Marks Obtained (out of {selectedAssignment?.total_points}) *</label>
                                <input
                                    type="number"
                                    value={gradingData.marks_obtained}
                                    onChange={e => setGradingData({ ...gradingData, marks_obtained: e.target.value })}
                                    max={selectedAssignment?.total_points}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Feedback</label>
                                <textarea
                                    value={gradingData.feedback}
                                    onChange={e => setGradingData({ ...gradingData, feedback: e.target.value })}
                                    rows="4"
                                    placeholder="Provide feedback to the student..."
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowGradingModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">Submit Grade</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default TeacherAssignments
