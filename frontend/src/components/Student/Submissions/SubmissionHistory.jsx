import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import './SubmissionHistory.css'
import toast from 'react-hot-toast'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function SubmissionHistory() {
    const { token } = useAuth()
    const [loading, setLoading] = useState(true)
    const [submissions, setSubmissions] = useState([])
    const [statistics, setStatistics] = useState(null)
    const [patterns, setPatterns] = useState(null)

    useEffect(() => {
        fetchSubmissionData()
    }, [])

    const fetchSubmissionData = async () => {
        setLoading(true)
        try {
            const response = await fetch(`${API_BASE}/submission_analytics.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()

            if (data.success) {
                setSubmissions(data.data.submissions)
                setStatistics(data.data.statistics)
                setPatterns(data.data.patterns)
            } else {
                toast.error(data.error || 'Failed to load submission data')
            }
        } catch (err) {
            console.error('Error fetching submission data:', err)
            toast.error('Error connecting to server')
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status) => {
        const badges = {
            on_time: { class: 'status-on-time', text: '✓ On Time', icon: '✓' },
            late: { class: 'status-late', text: '⚠ Late', icon: '⚠' },
            pending: { class: 'status-pending', text: '○ Pending', icon: '○' }
        }
        return badges[status] || badges.pending
    }

    const getProcrastinatorLevel = (score) => {
        if (score >= 70) return { level: 'High', class: 'high', emoji: '🔥' }
        if (score >= 40) return { level: 'Medium', class: 'medium', emoji: '⚡' }
        return { level: 'Low', class: 'low', emoji: '✨' }
    }

    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading submission history...</p>
            </div>
        )
    }

    return (
        <div className="submission-history">
            <div className="history-header">
                <h2>Assignment Submission History</h2>
                <p>Track your submission patterns and improve your punctuality</p>
            </div>

            {/* Statistics Cards */}
            {statistics && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">📝</div>
                        <div className="stat-info">
                            <div className="stat-value">{statistics.total_submissions}</div>
                            <div className="stat-label">Total Submissions</div>
                        </div>
                    </div>

                    <div className="stat-card success">
                        <div className="stat-icon">✓</div>
                        <div className="stat-info">
                            <div className="stat-value">{statistics.on_time_rate}%</div>
                            <div className="stat-label">On-Time Rate</div>
                            <div className="stat-sub">{statistics.on_time_count} on time</div>
                        </div>
                    </div>

                    <div className="stat-card warning">
                        <div className="stat-icon">⚠</div>
                        <div className="stat-info">
                            <div className="stat-value">{statistics.late_count}</div>
                            <div className="stat-label">Late Submissions</div>
                            {statistics.average_lateness_hours > 0 && (
                                <div className="stat-sub">Avg: {statistics.average_lateness_hours}h late</div>
                            )}
                        </div>
                    </div>

                    <div className="stat-card primary">
                        <div className="stat-icon">🎓</div>
                        <div className="stat-info">
                            <div className="stat-value">{statistics.average_grade}%</div>
                            <div className="stat-label">Average Grade</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Submission Patterns */}
            {patterns && (
                <div className="patterns-section">
                    <h3>Your Submission Patterns</h3>
                    <div className="patterns-grid">
                        <div className="pattern-card">
                            <div className="pattern-icon">📅</div>
                            <div className="pattern-info">
                                <div className="pattern-label">Most Common Day</div>
                                <div className="pattern-value">{patterns.most_common_day || 'N/A'}</div>
                            </div>
                        </div>

                        <div className="pattern-card">
                            <div className="pattern-icon">🕐</div>
                            <div className="pattern-info">
                                <div className="pattern-label">Most Common Time</div>
                                <div className="pattern-value">{patterns.most_common_time || 'N/A'}</div>
                            </div>
                        </div>

                        <div className="pattern-card">
                            <div className="pattern-icon">{patterns.early_bird ? '🌅' : '🌙'}</div>
                            <div className="pattern-info">
                                <div className="pattern-label">Submission Style</div>
                                <div className="pattern-value">
                                    {patterns.early_bird ? 'Early Bird' : 'Night Owl'}
                                </div>
                            </div>
                        </div>

                        <div className={`pattern-card procrastination ${getProcrastinatorLevel(patterns.procrastinator_score).class}`}>
                            <div className="pattern-icon">{getProcrastinatorLevel(patterns.procrastinator_score).emoji}</div>
                            <div className="pattern-info">
                                <div className="pattern-label">Procrastination Level</div>
                                <div className="pattern-value">
                                    {getProcrastinatorLevel(patterns.procrastinator_score).level}
                                </div>
                                <div className="pattern-sub">{patterns.procrastinator_score}% last-minute</div>
                            </div>
                        </div>
                    </div>

                    {/* Tips */}
                    {patterns.procrastinator_score > 50 && (
                        <div className="tips-box">
                            <h4>💡 Tips to Improve Your Punctuality</h4>
                            <ul>
                                <li>Set personal deadlines 24-48 hours before the actual due date</li>
                                <li>Break large assignments into smaller tasks</li>
                                <li>Use the Study Planner to schedule dedicated work time</li>
                                <li>Students who submit early score {Math.round(statistics.average_grade + 5)}% higher on average!</li>
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Submission Timeline */}
            <div className="timeline-section">
                <h3>Submission Timeline</h3>
                {submissions.length === 0 ? (
                    <div className="empty-state">
                        <p>No submissions yet</p>
                    </div>
                ) : (
                    <div className="timeline-list">
                        {submissions.map((sub) => {
                            const badge = getStatusBadge(sub.submission_status)
                            return (
                                <div key={sub.id} className={`timeline-item ${sub.submission_status}`}>
                                    <div className="timeline-date">
                                        {new Date(sub.submitted_at).toLocaleDateString()}
                                    </div>
                                    <div className="timeline-content">
                                        <div className="timeline-header">
                                            <div>
                                                <div className="timeline-title">{sub.assignment_title}</div>
                                                <div className="timeline-subject">{sub.subject_code}</div>
                                            </div>
                                            <span className={`status-badge ${badge.class}`}>
                                                {badge.text}
                                            </span>
                                        </div>
                                        <div className="timeline-meta">
                                            <span>Due: {new Date(sub.due_date).toLocaleDateString()}</span>
                                            {sub.grade !== null && (
                                                <span>Grade: {sub.grade}/{sub.total_marks}</span>
                                            )}
                                            {sub.hours_late > 0 && (
                                                <span className="late-indicator">
                                                    {Math.round(sub.hours_late)}h late
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default SubmissionHistory
