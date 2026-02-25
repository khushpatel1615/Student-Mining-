import { useState, useEffect } from 'react'
import { Upload, FileText, CheckCircle, Clock, AlertCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuth } from '../../../context/AuthContext'
import { API_BASE } from '../../../config';
import './StudentAssignments.css'



function StudentAssignments() {
    const { token } = useAuth()
    const [assignments, setAssignments] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // all, pending, submitted, graded
    const [uploadingId, setUploadingId] = useState(null)
    const [selectedFile, setSelectedFile] = useState({})

    useEffect(() => {
        fetchAssignments()
    }, [])

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
            toast.error('Failed to load assignments')
        } finally {
            setLoading(false)
        }
    }

    const handleFileSelect = (assignmentId, file) => {
        // Validate file
        const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'zip', 'rar', 'jpg', 'jpeg', 'png']
        const maxSize = 10 * 1024 * 1024 // 10MB

        const fileExt = file.name.split('.').pop().toLowerCase()

        if (!allowedTypes.includes(fileExt)) {
            toast.error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`)
            return
        }

        if (file.size > maxSize) {
            toast.error('File too large. Maximum size: 10MB')
            return
        }

        setSelectedFile({ ...selectedFile, [assignmentId]: file })
    }

    const handleSubmit = async (assignmentId) => {
        const file = selectedFile[assignmentId]

        if (!file) {
            toast.error('Please select a file to upload')
            return
        }

        try {
            setUploadingId(assignmentId)

            const formData = new FormData()
            formData.append('assignment_id', assignmentId)
            formData.append('file', file)

            const response = await fetch(`${API_BASE}/submissions.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            const data = await response.json()

            if (data.success) {
                toast.success(data.status === 'late' ? 'Submitted (Late)' : 'Assignment submitted successfully!')
                setSelectedFile({ ...selectedFile, [assignmentId]: null })
                fetchAssignments() // Refresh to show submission
            } else {
                toast.error(data.error || 'Failed to submit assignment')
            }
        } catch (err) {
            console.error('Submission error:', err)
            toast.error('Failed to submit assignment')
        } finally {
            setUploadingId(null)
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

    const getDaysUntilDue = (dueDate) => {
        const now = new Date()
        const due = new Date(dueDate)
        const diffTime = due - now
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 0) return 'Overdue'
        if (diffDays === 0) return 'Due today'
        if (diffDays === 1) return 'Due tomorrow'
        return `${diffDays} days left`
    }

    const getStatusBadge = (assignment) => {
        if (assignment.my_submission) {
            if (assignment.my_submission.status === 'graded') {
                return <span className="status-badge graded">Graded</span>
            }
            if (assignment.my_submission.status === 'late') {
                return <span className="status-badge late">Submitted (Late)</span>
            }
            return <span className="status-badge submitted">Submitted</span>
        }
        if (isOverdue(assignment.due_date)) {
            return <span className="status-badge overdue">Overdue</span>
        }
        return <span className="status-badge pending">Pending</span>
    }

    const filteredAssignments = assignments.filter(a => {
        if (filter === 'all') return true
        if (filter === 'pending') return !a.my_submission && !isOverdue(a.due_date)
        if (filter === 'submitted') return a.my_submission && a.my_submission.status !== 'graded'
        if (filter === 'graded') return a.my_submission && a.my_submission.status === 'graded'
        return true
    })

    const canSubmit = (assignment) => {
        // Can submit if not overdue OR if already submitted (resubmission before due date)
        return !isOverdue(assignment.due_date)
    }

    return (
        <div className="student-assignments">
            <div className="assignments-header">
                <h2>My Assignments</h2>
                <div className="filter-tabs">
                    <button
                        className={filter === 'all' ? 'active' : ''}
                        onClick={() => setFilter('all')}
                    >
                        All ({assignments.length})
                    </button>
                    <button
                        className={filter === 'pending' ? 'active' : ''}
                        onClick={() => setFilter('pending')}
                    >
                        Pending
                    </button>
                    <button
                        className={filter === 'submitted' ? 'active' : ''}
                        onClick={() => setFilter('submitted')}
                    >
                        Submitted
                    </button>
                    <button
                        className={filter === 'graded' ? 'active' : ''}
                        onClick={() => setFilter('graded')}
                    >
                        Graded
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading">Loading assignments...</div>
            ) : filteredAssignments.length === 0 ? (
                <div className="empty-state">
                    <p>No assignments found</p>
                </div>
            ) : (
                <div className="assignments-list">
                    {filteredAssignments.map(assignment => (
                        <div key={assignment.id} className="assignment-item">
                            <div className="assignment-main">
                                <div className="assignment-info">
                                    <div className="assignment-title-row">
                                        <h3>{assignment.title}</h3>
                                        {getStatusBadge(assignment)}
                                    </div>
                                    <p className="assignment-subject">{assignment.subject_name} ({assignment.subject_code})</p>
                                    <p className="assignment-description">{assignment.description}</p>
                                </div>
                                <div className="assignment-meta">
                                    <div className="meta-row">
                                        <span className="meta-label">Due Date:</span>
                                        <span className={`meta-value ${isOverdue(assignment.due_date) ? 'overdue' : ''}`}>
                                            {formatDate(assignment.due_date)}
                                        </span>
                                    </div>
                                    <div className="meta-row">
                                        <span className="meta-label">Time Left:</span>
                                        <span className="meta-value">{getDaysUntilDue(assignment.due_date)}</span>
                                    </div>
                                    <div className="meta-row">
                                        <span className="meta-label">Total Points:</span>
                                        <span className="meta-value">{assignment.total_points}</span>
                                    </div>
                                    {assignment.my_submission && assignment.my_submission.status === 'graded' && (
                                        <div className="meta-row">
                                            <span className="meta-label">Your Score:</span>
                                            <span className="meta-value score">
                                                {assignment.my_submission.marks_obtained}/{assignment.total_points}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Submission Section */}
                            {canSubmit(assignment) && (
                                <div className="submission-section">
                                    <h4>
                                        <Upload size={18} />
                                        {assignment.my_submission ? 'Resubmit Assignment' : 'Submit Assignment'}
                                    </h4>

                                    {assignment.my_submission && (
                                        <div className="current-submission">
                                            <CheckCircle size={16} className="check-icon" />
                                            <span>Current submission: {assignment.my_submission.file_name}</span>
                                            <span className="submission-date">
                                                Submitted {new Date(assignment.my_submission.submitted_at).toLocaleString()}
                                            </span>
                                        </div>
                                    )}

                                    <div className="file-upload-area">
                                        <input
                                            type="file"
                                            id={`file-${assignment.id}`}
                                            onChange={(e) => handleFileSelect(assignment.id, e.target.files[0])}
                                            accept=".pdf,.doc,.docx,.txt,.zip,.rar,.jpg,.jpeg,.png"
                                            style={{ display: 'none' }}
                                        />
                                        <label htmlFor={`file-${assignment.id}`} className="file-select-btn">
                                            <FileText size={18} />
                                            Choose File
                                        </label>

                                        {selectedFile[assignment.id] && (
                                            <div className="selected-file">
                                                <FileText size={16} />
                                                <span>{selectedFile[assignment.id].name}</span>
                                                <button
                                                    className="remove-file"
                                                    onClick={() => setSelectedFile({ ...selectedFile, [assignment.id]: null })}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            className="submit-btn"
                                            onClick={() => handleSubmit(assignment.id)}
                                            disabled={!selectedFile[assignment.id] || uploadingId === assignment.id}
                                        >
                                            {uploadingId === assignment.id ? (
                                                <>
                                                    <Clock size={16} className="spin" />
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={16} />
                                                    {assignment.my_submission ? 'Resubmit' : 'Submit'}
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <p className="upload-hint">
                                        Allowed: PDF, DOC, DOCX, TXT, ZIP, RAR, JPG, PNG (Max: 10MB)
                                        {assignment.my_submission && <br />}
                                        {assignment.my_submission && <strong>Note: Uploading a new file will replace your previous submission</strong>}
                                    </p>
                                </div>
                            )}

                            {/* Feedback Section */}
                            {assignment.my_submission && assignment.my_submission.feedback && (
                                <div className="assignment-feedback">
                                    <strong>Feedback:</strong> {assignment.my_submission.feedback}
                                </div>
                            )}

                            {/* Overdue Notice */}
                            {isOverdue(assignment.due_date) && !assignment.my_submission && (
                                <div className="overdue-notice">
                                    <AlertCircle size={18} />
                                    <span>This assignment is overdue. Submissions are no longer accepted.</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default StudentAssignments



