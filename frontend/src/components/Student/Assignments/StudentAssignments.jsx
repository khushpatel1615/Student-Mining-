import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import './StudentAssignments.css'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function StudentAssignments() {
    const { token } = useAuth()
    const [assignments, setAssignments] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // all, pending, submitted, graded

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
        } finally {
            setLoading(false)
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
        if (filter === 'submitted') return a.my_submission && a.my_submission.status === 'submitted'
        if (filter === 'graded') return a.my_submission && a.my_submission.status === 'graded'
        return true
    })

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
                            {assignment.my_submission && assignment.my_submission.feedback && (
                                <div className="assignment-feedback">
                                    <strong>Feedback:</strong> {assignment.my_submission.feedback}
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
