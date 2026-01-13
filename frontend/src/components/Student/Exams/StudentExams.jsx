import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import './StudentExams.css'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function StudentExams() {
    const { token } = useAuth()
    const [exams, setExams] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // all, upcoming, completed

    useEffect(() => {
        fetchExams()
    }, [])

    const fetchExams = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE}/exams.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setExams(data.data)
            }
        } catch (err) {
            console.error('Failed to fetch exams:', err)
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

    const isPast = (examDate) => {
        return new Date(examDate) < new Date()
    }

    const getDaysUntil = (examDate) => {
        const now = new Date()
        const exam = new Date(examDate)
        const diffTime = exam - now
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 0) return 'Completed'
        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Tomorrow'
        return `In ${diffDays} days`
    }

    const getStatusBadge = (exam) => {
        if (exam.my_result) {
            return <span className="status-badge graded">Graded</span>
        }
        if (isPast(exam.start_datetime)) {
            return <span className="status-badge completed">Completed</span>
        }
        return <span className="status-badge upcoming">Upcoming</span>
    }

    const getGradePercentage = (obtained, total) => {
        return ((obtained / total) * 100).toFixed(1)
    }

    const filteredExams = exams.filter(e => {
        if (filter === 'all') return true
        if (filter === 'upcoming') return !isPast(e.start_datetime)
        if (filter === 'completed') return isPast(e.start_datetime)
        return true
    })

    return (
        <div className="student-exams">
            <div className="exams-header">
                <h2>My Exams</h2>
                <div className="filter-tabs">
                    <button
                        className={filter === 'all' ? 'active' : ''}
                        onClick={() => setFilter('all')}
                    >
                        All ({exams.length})
                    </button>
                    <button
                        className={filter === 'upcoming' ? 'active' : ''}
                        onClick={() => setFilter('upcoming')}
                    >
                        Upcoming
                    </button>
                    <button
                        className={filter === 'completed' ? 'active' : ''}
                        onClick={() => setFilter('completed')}
                    >
                        Completed
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading">Loading exams...</div>
            ) : filteredExams.length === 0 ? (
                <div className="empty-state">
                    <p>No exams found</p>
                </div>
            ) : (
                <div className="exams-grid">
                    {filteredExams.map(exam => (
                        <div key={exam.id} className="exam-card">
                            <div className="exam-header">
                                <div>
                                    <h3>{exam.title}</h3>
                                    <p className="exam-subject">{exam.subject_name} ({exam.subject_code})</p>
                                </div>
                                {getStatusBadge(exam)}
                            </div>

                            <div className="exam-details">
                                <div className="detail-row">
                                    <span className="detail-label">📅 Date:</span>
                                    <span className="detail-value">{formatDate(exam.start_datetime)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">⏱️ Duration:</span>
                                    <span className="detail-value">{exam.duration_minutes} minutes</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">📊 Total Marks:</span>
                                    <span className="detail-value">{exam.total_marks}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">⏳ Status:</span>
                                    <span className="detail-value">{getDaysUntil(exam.start_datetime)}</span>
                                </div>
                            </div>

                            {exam.my_result && (
                                <div className="exam-result">
                                    <div className="result-score">
                                        <span className="score-label">Your Score:</span>
                                        <span className="score-value">
                                            {exam.my_result.marks_obtained}/{exam.total_marks}
                                        </span>
                                        <span className="score-percentage">
                                            ({getGradePercentage(exam.my_result.marks_obtained, exam.total_marks)}%)
                                        </span>
                                    </div>
                                    {exam.my_result.remarks && (
                                        <div className="result-remarks">
                                            <strong>Remarks:</strong> {exam.my_result.remarks}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default StudentExams
