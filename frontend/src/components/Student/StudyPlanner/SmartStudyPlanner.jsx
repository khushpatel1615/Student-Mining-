import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import './SmartStudyPlanner.css'
import toast from 'react-hot-toast'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

// Icons
const CalendarIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
)

const ClockIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
)

const AlertIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
)

const BookIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
)

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)

function SmartStudyPlanner() {
    const { token } = useAuth()
    const [loading, setLoading] = useState(true)
    const [studyPlan, setStudyPlan] = useState([])
    const [summary, setSummary] = useState(null)
    const [upcomingDeadlines, setUpcomingDeadlines] = useState([])
    const [weakSubjects, setWeakSubjects] = useState([])

    useEffect(() => {
        fetchStudyPlan()
    }, [])

    const fetchStudyPlan = async () => {
        setLoading(true)
        try {
            const response = await fetch(`${API_BASE}/study_planner.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()

            if (data.success) {
                setStudyPlan(data.data.study_plan)
                setSummary(data.data.summary)

                // Combine assignments and exams for deadline list
                const deadlines = [
                    ...data.data.upcoming_assignments.map(a => ({ ...a, type: 'assignment', date: a.due_date })),
                    ...data.data.upcoming_exams.map(e => ({ ...e, type: 'exam', date: e.exam_date }))
                ].sort((a, b) => new Date(a.date) - new Date(b.date))

                setUpcomingDeadlines(deadlines)
                setWeakSubjects(data.data.weak_subjects)
            } else {
                toast.error(data.error || 'Failed to load study plan')
            }
        } catch (err) {
            console.error('Error fetching study plan:', err)
            toast.error('Error connecting to server')
        } finally {
            setLoading(false)
        }
    }

    const getUrgencyClass = (urgency) => {
        return `urgency-${urgency}`
    }

    const getDaysUntilText = (days) => {
        if (days === 0) return 'Today'
        if (days === 1) return 'Tomorrow'
        return `In ${days} days`
    }

    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    return (
        <div className="smart-study-planner">
            <div className="planner-header">
                <div className="header-content">
                    <div className="header-icon">
                        <CalendarIcon />
                    </div>
                    <div>
                        <h2>Smart Study Planner</h2>
                        <p className="subtitle">AI-generated study schedule based on your deadlines and performance</p>
                    </div>
                </div>
                <button className="btn-refresh" onClick={fetchStudyPlan} disabled={loading}>
                    Refresh Plan
                </button>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Analyzing your schedule...</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    {summary && (
                        <div className="summary-grid">
                            <div className="summary-card">
                                <div className="summary-icon deadlines">📅</div>
                                <div className="summary-info">
                                    <div className="summary-value">{summary.total_deadlines}</div>
                                    <div className="summary-label">Upcoming Deadlines</div>
                                </div>
                            </div>
                            <div className="summary-card">
                                <div className="summary-icon assignments">📝</div>
                                <div className="summary-info">
                                    <div className="summary-value">{summary.assignments_pending}</div>
                                    <div className="summary-label">Pending Assignments</div>
                                </div>
                            </div>
                            <div className="summary-card">
                                <div className="summary-icon exams">📊</div>
                                <div className="summary-info">
                                    <div className="summary-value">{summary.exams_upcoming}</div>
                                    <div className="summary-label">Upcoming Exams</div>
                                </div>
                            </div>
                            <div className="summary-card">
                                <div className="summary-icon weak">⚠️</div>
                                <div className="summary-info">
                                    <div className="summary-value">{summary.subjects_need_attention}</div>
                                    <div className="summary-label">Need Attention</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="planner-content">
                        {/* Weekly Study Plan */}
                        <div className="study-schedule">
                            <h3>Your 7-Day Study Schedule</h3>
                            <div className="schedule-grid">
                                {studyPlan.map((day, index) => (
                                    <div key={index} className={`day-card ${day.blocks.length === 0 ? 'empty-day' : ''}`}>
                                        <div className="day-header">
                                            <div className="day-name">{day.day}</div>
                                            <div className="day-date">{formatDate(day.date)}</div>
                                        </div>

                                        {day.blocks.length > 0 ? (
                                            <div className="study-blocks">
                                                {day.blocks.map((block, blockIndex) => (
                                                    <div key={blockIndex} className={`study-block ${getUrgencyClass(block.urgency)}`}>
                                                        <div className="block-header">
                                                            <span className="block-time">
                                                                <ClockIcon /> {block.time_slot}
                                                            </span>
                                                            {block.urgency === 'high' && (
                                                                <span className="urgency-badge">
                                                                    <AlertIcon /> Urgent
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="block-subject">{block.subject_code}</div>
                                                        <div className="block-task">{block.task}</div>
                                                        <div className="block-meta">
                                                            <span className="duration">{block.duration} min</span>
                                                            {block.days_until !== undefined && (
                                                                <span className="deadline-info">
                                                                    {getDaysUntilText(block.days_until)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="no-blocks">
                                                <CheckIcon />
                                                <span>Free day</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="planner-sidebar">
                            {/* Upcoming Deadlines */}
                            <div className="sidebar-section">
                                <h4>Upcoming Deadlines</h4>
                                {upcomingDeadlines.length > 0 ? (
                                    <div className="deadline-list">
                                        {upcomingDeadlines.map((item, index) => (
                                            <div key={index} className="deadline-item">
                                                <div className={`deadline-icon ${item.type}`}>
                                                    {item.type === 'exam' ? '📊' : '📝'}
                                                </div>
                                                <div className="deadline-info">
                                                    <div className="deadline-title">{item.title}</div>
                                                    <div className="deadline-subject">{item.subject_name}</div>
                                                    <div className="deadline-date">{formatDate(item.date)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-list">No upcoming deadlines</div>
                                )}
                            </div>

                            {/* Weak Subjects */}
                            {weakSubjects.length > 0 && (
                                <div className="sidebar-section">
                                    <h4>Subjects Need Attention</h4>
                                    <div className="weak-subjects-list">
                                        {weakSubjects.map((subject, index) => (
                                            <div key={index} className="weak-subject-item">
                                                <BookIcon />
                                                <div>
                                                    <div className="subject-name">{subject.subject_name}</div>
                                                    <div className="subject-reason">
                                                        {subject.reason === 'low_performance' ? 'Low grades' : 'Low attendance'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default SmartStudyPlanner
