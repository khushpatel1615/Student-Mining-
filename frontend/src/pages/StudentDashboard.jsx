import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import LogoutModal from '../components/LogoutModal/LogoutModal'
import './Dashboard.css'
import './StudentDashboard.css'

// Icons
const BookIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
)

const BellIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
)

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)

const ChartIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
)

const UserIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
)

const GraduationIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
)

const ClipboardIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M9 14l2 2 4-4" />
    </svg>
)

const CalendarIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
)

const RefreshIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
)

const LogoutIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
)

const SunIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
const MoonIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>

const WarningIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
)

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function StudentDashboard() {
    const { user, token, logout } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const [showLogoutModal, setShowLogoutModal] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')
    const [dashboardData, setDashboardData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [lastUpdated, setLastUpdated] = useState(null)

    // Notifications State
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [showNotifications, setShowNotifications] = useState(false)

    // Semester State
    const [selectedSemester, setSelectedSemester] = useState(null)

    // Calendar State
    const [calendarEvents, setCalendarEvents] = useState([])

    // Fetch Notifications
    const fetchNotifications = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/notifications.php?limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setNotifications(data.data)
                setUnreadCount(data.unread_count)
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err)
        }
    }, [token])

    // Mark as read
    const markAsRead = async (id = null) => {
        try {
            const body = id ? { id } : { mark_all_read: true }
            await fetch(`${API_BASE}/notifications.php`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            })
            // Refresh local state
            fetchNotifications()
        } catch (err) {
            console.error('Failed to mark notifications read:', err)
        }
    }

    // Dynamic data fetching - can be called anytime to refresh
    const fetchDashboardData = useCallback(async (showRefreshIndicator = true) => {
        if (showRefreshIndicator) setRefreshing(true)
        try {
            const semesterQuery = selectedSemester ? `?semester=${selectedSemester}` : ''

            // Parallel fetch
            const [dashboardRes, calendarRes] = await Promise.all([
                fetch(`${API_BASE}/student_dashboard.php${semesterQuery}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetchNotifications(), // Fetch notifications too
                fetch(`${API_BASE}/calendar.php`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ])

            const data = await dashboardRes.json()
            if (data.success) {
                setDashboardData(data.data)
                setLastUpdated(new Date())
                // Set initial selected semester if not set
                if (!selectedSemester && data.data.student.current_semester) {
                    // actually better to keep it null to mean "current", or set it?
                    // data.data.semester is returned.
                }
            }

            const calendarData = await calendarRes.json()
            if (calendarData.success) {
                setCalendarEvents(calendarData.data)
            }
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [token, fetchNotifications, selectedSemester])

    // Initial load
    useEffect(() => {
        fetchDashboardData(false)
    }, [fetchDashboardData])

    // Auto-refresh every 30 seconds for real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            fetchDashboardData(false)
        }, 30000)
        return () => clearInterval(interval)
    }, [fetchDashboardData])

    const handleRefresh = () => {
        fetchDashboardData(true)
    }

    const confirmLogout = () => {
        setShowLogoutModal(false)
        logout()
    }

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good Morning'
        if (hour < 17) return 'Good Afternoon'
        return 'Good Evening'
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    // Not Enrolled State
    const NotEnrolledView = () => (
        <div className="not-enrolled-state">
            <div className="not-enrolled-card">
                <div className="not-enrolled-icon">
                    <GraduationIcon />
                </div>
                <h2>Not Yet Enrolled</h2>
                <p>You are not currently enrolled in any program. Please contact the administration to complete your enrollment.</p>
                <div className="student-info-mini">
                    <p><strong>Name:</strong> {dashboardData?.student?.name}</p>
                    <p><strong>Email:</strong> {dashboardData?.student?.email}</p>
                    {dashboardData?.student?.student_id && (
                        <p><strong>Student ID:</strong> {dashboardData?.student?.student_id}</p>
                    )}
                </div>
            </div>
        </div>
    )

    // Academic Summary Cards
    const SummaryCards = () => (
        <div className="summary-cards-grid">
            <div className="summary-card gpa-card">
                <div className="summary-icon"><ChartIcon /></div>
                <div className="summary-content">
                    <span className="summary-label">Current GPA</span>
                    <span className="summary-value">{dashboardData?.summary?.gpa || '0.00'}</span>
                    <span className="summary-subtitle">{dashboardData?.summary?.gpa_grade || 'N/A'}</span>
                </div>
            </div>
            <div className="summary-card credits-card">
                <div className="summary-icon"><BookIcon /></div>
                <div className="summary-content">
                    <span className="summary-label">Credits</span>
                    <span className="summary-value">{dashboardData?.summary?.earned_credits || 0} / {dashboardData?.summary?.total_credits || 0}</span>
                    <span className="summary-subtitle">Earned / Enrolled</span>
                </div>
            </div>
            <div className={`summary-card attendance-card ${dashboardData?.summary?.attendance_status}`}>
                <div className="summary-icon"><CalendarIcon /></div>
                <div className="summary-content">
                    <span className="summary-label">Attendance</span>
                    <span className="summary-value">{dashboardData?.summary?.overall_attendance || 0}%</span>
                    <span className="summary-subtitle">{dashboardData?.summary?.attendance_status === 'good' ? 'On Track' : 'Needs Attention'}</span>
                </div>
            </div>
            <div className="summary-card subjects-card">
                <div className="summary-icon"><ClipboardIcon /></div>
                <div className="summary-content">
                    <span className="summary-label">Subjects</span>
                    <span className="summary-value">{dashboardData?.summary?.subjects_enrolled || 0}</span>
                    <span className="summary-subtitle">This Semester</span>
                </div>
            </div>
        </div>
    )

    // Overview Tab
    const OverviewView = () => (
        <div className="overview-view">
            <div className="overview-fixed-header">
                <SummaryCards />

                <div className="section-header">
                    <h2>{dashboardData?.program?.name} - Semester {dashboardData?.semester}</h2>
                    <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshIcon className={refreshing ? 'spinning' : ''} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            <div className="scrollable-content">
                {dashboardData?.subjects?.length > 0 ? (
                    <div className="subjects-grid">
                        {dashboardData.subjects.map((item, index) => (
                            <div
                                key={index}
                                className={`subject-card clickable color-${index % 6}`}
                                onClick={() => navigate(`/student/subject/${item.subject.id}`)}
                            >
                                <div className="subject-card-gradient"></div>
                                <div className="subject-card-content">
                                    <div className="subject-card-icon-wrapper">
                                        <span className="subject-card-icon">
                                            {item.subject.name.includes('Math') ? '📐' :
                                                item.subject.name.includes('Chemistry') ? '🧪' :
                                                    item.subject.name.includes('Web') ? '🌐' :
                                                        item.subject.name.includes('Programming') || item.subject.name.includes('Computer') ? '💻' :
                                                            item.subject.name.includes('Electric') ? '⚡' :
                                                                item.subject.subject_type === 'Core' ? '🎯' : '📚'}
                                        </span>
                                    </div>
                                    <div className="subject-card-body">
                                        <div className="subject-header">
                                            <div>
                                                <h3>{item.subject.name}</h3>
                                                <span className="subject-code">{item.subject.code}</span>
                                            </div>
                                            <span className={`status-pill ${item.status}`}>
                                                {item.status === 'not_enrolled' ? 'Not Enrolled' : item.status}
                                            </span>
                                        </div>

                                        <div className="subject-metrics">
                                            <div className="metric">
                                                <span className="label">Credits</span>
                                                <span className="value">{item.subject.credits}</span>
                                            </div>
                                            <div className="metric">
                                                <span className="label">Attendance</span>
                                                <span className={`value ${item.attendance?.warning ? 'warning' : 'good'}`}>
                                                    {item.attendance?.percentage || 0}%
                                                </span>
                                            </div>
                                            <div className="metric">
                                                <span className="label">Grade</span>
                                                <span className={`value grade grade-${item.grade_letter || 'none'}`}>
                                                    {item.grade_letter || '-'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="evaluations-preview">
                                            <div className={`progress-bar-container grade-bar-${item.grade_letter || 'none'}`}>
                                                <div
                                                    className="progress-bar-fill"
                                                    style={{ width: `${item.overall_grade || 0}%` }}
                                                />
                                            </div>
                                            <span className="progress-label">{item.overall_grade || 0}% Overall</span>
                                        </div>
                                    </div>
                                    <div className="view-course-hint">
                                        Click to view course details →
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>No subjects found for this semester.</p>
                    </div>
                )}
            </div>
        </div>
    )

    // Courses Tab
    const CoursesView = () => (
        <div className="courses-view">
            <div className="section-header">
                <h2>My Courses - Semester {dashboardData?.semester}</h2>
                <span className="course-count">{dashboardData?.subjects?.length || 0} Subjects</span>
            </div>

            <div className="courses-list">
                {dashboardData?.subjects?.map((item, index) => (
                    <div key={index} className="course-item">
                        <div className="course-main">
                            <div className="course-icon">
                                <BookIcon />
                            </div>
                            <div className="course-details">
                                <h3>{item.subject.name}</h3>
                                <div className="course-meta">
                                    <span className="code">{item.subject.code}</span>
                                    <span className="type">{item.subject.subject_type}</span>
                                    <span className="credits">{item.subject.credits} Credits</span>
                                </div>
                            </div>
                            <div className="course-status">
                                <span className={`status-badge ${item.status}`}>
                                    {item.status === 'not_enrolled' ? 'Not Enrolled' : item.status}
                                </span>
                            </div>
                        </div>
                        <div className="course-stats">
                            <div className="stat">
                                <span className="stat-label">Grade</span>
                                <span className="stat-value">{item.grade_letter || '-'}</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Score</span>
                                <span className="stat-value">{item.overall_grade ? `${item.overall_grade}%` : '-'}</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Attendance</span>
                                <span className={`stat-value ${item.attendance?.warning ? 'warning' : ''}`}>
                                    {item.attendance?.percentage || 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    // Grades Tab - Shows subject cards to navigate to detailed grades
    const GradesView = () => (
        <div className="grades-view">
            <div className="section-header">
                <h2>Grade Report</h2>
                <div className="gpa-display">
                    <span className="gpa-label">CGPA:</span>
                    <span className="gpa-value">{dashboardData?.summary?.gpa || '0.00'}</span>
                </div>
            </div>

            <p className="section-description">Click on a subject to view detailed grade breakdown and professor feedback.</p>

            <div className="grades-subjects-grid">
                {dashboardData?.subjects?.map((item, index) => (
                    <div
                        key={index}
                        className="grade-subject-card clickable"
                        onClick={() => navigate(`/student/subject/${item.subject.id}`)}
                    >
                        <div className="grade-subject-icon">
                            {item.subject.subject_type === 'Core' ? '💻' : '📖'}
                        </div>
                        <div className="grade-subject-info">
                            <h3>{item.subject.name}</h3>
                            <span className="subject-code">{item.subject.code}</span>
                        </div>
                        <div className="grade-subject-score">
                            <div className="grade-letter-badge">
                                {item.grade_letter || '-'}
                            </div>
                            <span className="grade-percent">
                                {item.overall_grade ? `${item.overall_grade}%` : 'Not graded'}
                            </span>
                        </div>
                        <div className="grade-progress-bar">
                            <div
                                className="grade-progress-fill"
                                style={{ width: `${item.overall_grade || 0}%` }}
                            />
                        </div>
                        <div className="view-grades-hint">
                            View detailed grades →
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    // Attendance Tab
    const AttendanceView = () => (
        <div className="attendance-view">
            <div className="section-header">
                <h2>Attendance Report</h2>
                <div className={`overall-attendance-badge ${dashboardData?.summary?.attendance_status}`}>
                    <span>Overall: {dashboardData?.summary?.overall_attendance || 0}%</span>
                </div>
            </div>

            {dashboardData?.summary?.attendance_status === 'warning' && (
                <div className="attendance-warning-banner">
                    <WarningIcon />
                    <span>Your attendance is below 75%. Please improve your attendance to avoid academic penalties.</span>
                </div>
            )}

            <div className="attendance-grid">
                {dashboardData?.subjects?.map((item, index) => (
                    <div key={index} className={`attendance-card ${item.attendance?.warning ? 'warning' : ''}`}>
                        <div className="attendance-header">
                            <h3>{item.subject.name}</h3>
                            <span className={`attendance-percentage ${item.attendance?.warning ? 'warning' : 'good'}`}>
                                {item.attendance?.percentage || 0}%
                            </span>
                        </div>

                        <div className="attendance-progress">
                            <div className="attendance-bar">
                                <div
                                    className={`attendance-bar-fill ${item.attendance?.warning ? 'warning' : ''}`}
                                    style={{ width: `${item.attendance?.percentage || 0}%` }}
                                />
                            </div>
                        </div>

                        <div className="attendance-breakdown">
                            <div className="breakdown-item present">
                                <span className="count">{item.attendance?.present || 0}</span>
                                <span className="label">Present</span>
                            </div>
                            <div className="breakdown-item absent">
                                <span className="count">{item.attendance?.absent || 0}</span>
                                <span className="label">Absent</span>
                            </div>
                            <div className="breakdown-item late">
                                <span className="count">{item.attendance?.late || 0}</span>
                                <span className="label">Late</span>
                            </div>
                            <div className="breakdown-item optional">
                                <span className="count">{item.attendance?.optional || 0}</span>
                                <span className="label">Optional</span>
                            </div>
                        </div>

                        <div className="total-classes">
                            Total Classes: {item.attendance?.total_classes || 0}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    // Profile Tab
    // Calendar Component
    const CalendarView = () => {
        if (calendarEvents.length === 0) {
            return (
                <div className="empty-state">
                    <h3>No upcoming events</h3>
                    <p>Check back later for updates.</p>
                </div>
            )
        }

        const getEventColor = (type) => {
            switch (type) {
                case 'exam': return '#ef4444'; // red
                case 'holiday': return '#10b981'; // green
                case 'deadline': return '#f59e0b'; // amber
                default: return '#6366f1'; // indigo
            }
        }

        return (
            <div className="calendar-container">
                <h2 className="section-title">Academic Calendar</h2>
                <div className="events-grid">
                    {calendarEvents.map(event => (
                        <div key={event.id} className="event-card">
                            <div className="event-date-badge" style={{ backgroundColor: getEventColor(event.type) }}>
                                <span className="day">{new Date(event.event_date).getDate()}</span>
                                <span className="month">{new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                            </div>
                            <div className="event-details">
                                <h3>{event.title}</h3>
                                <p className="event-desc">{event.description}</p>
                                <span className="event-type-pill" style={{ color: getEventColor(event.type), borderColor: getEventColor(event.type) }}>
                                    {event.type.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const ProfileView = () => {
        const [isEditing, setIsEditing] = useState(false)
        const [showPasswordChange, setShowPasswordChange] = useState(false)
        const [profileForm, setProfileForm] = useState({
            full_name: dashboardData?.student?.name || user?.full_name || ''
        })
        const [passwordForm, setPasswordForm] = useState({
            current_password: '',
            new_password: '',
            confirm_password: ''
        })
        const [updateStatus, setUpdateStatus] = useState({ type: '', message: '' })
        const [isSaving, setIsSaving] = useState(false)

        const handleProfileUpdate = async (e) => {
            e.preventDefault()
            setIsSaving(true)
            setUpdateStatus({ type: '', message: '' })

            try {
                const response = await fetch(`${API_BASE}/profile.php`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(profileForm)
                })
                const result = await response.json()

                if (result.success) {
                    setUpdateStatus({ type: 'success', message: 'Profile updated successfully!' })
                    setIsEditing(false)
                    // Refresh data
                    fetchDashboardData()
                } else {
                    setUpdateStatus({ type: 'error', message: result.error || 'Failed to update profile' })
                }
            } catch (err) {
                setUpdateStatus({ type: 'error', message: 'Network error. Please try again.' })
            } finally {
                setIsSaving(false)
            }
        }

        const handlePasswordChange = async (e) => {
            e.preventDefault()
            if (passwordForm.new_password !== passwordForm.confirm_password) {
                setUpdateStatus({ type: 'error', message: 'New passwords do not match' })
                return
            }

            setIsSaving(true)
            setUpdateStatus({ type: '', message: '' })

            try {
                const response = await fetch(`${API_BASE}/profile.php`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        current_password: passwordForm.current_password,
                        new_password: passwordForm.new_password
                    })
                })
                const result = await response.json()

                if (result.success) {
                    setUpdateStatus({ type: 'success', message: 'Password changed successfully!' })
                    setShowPasswordChange(false)
                    setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
                } else {
                    setUpdateStatus({ type: 'error', message: result.error || 'Failed to change password' })
                }
            } catch (err) {
                setUpdateStatus({ type: 'error', message: 'Network error. Please try again.' })
            } finally {
                setIsSaving(false)
            }
        }

        const handleAvatarUpload = async (e) => {
            const file = e.target.files[0]
            if (!file) return

            // Preview
            const reader = new FileReader()
            reader.onloadend = () => {
                // Ideally set a preview state, but for now we'll upload directly then refresh
            }
            reader.readAsDataURL(file)

            const formData = new FormData()
            formData.append('avatar', file)

            setIsSaving(true)
            setUpdateStatus({ type: '', message: '' })

            try {
                const response = await fetch(`${API_BASE}/profile.php`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                        // No Content-Type header needed for FormData; browser sets it with boundary
                    },
                    body: formData
                })
                const result = await response.json()

                if (result.success) {
                    setUpdateStatus({ type: 'success', message: 'Avatar updated successfully!' })
                    fetchDashboardData()
                } else {
                    setUpdateStatus({ type: 'error', message: result.error || 'Failed to update avatar' })
                }
            } catch (err) {
                setUpdateStatus({ type: 'error', message: 'Network error during upload' })
            } finally {
                setIsSaving(false)
            }
        }

        return (
            <div className="profile-view">
                <div className="profile-header-card">
                    <div className="profile-avatar-large-wrapper">
                        <div className="profile-avatar-large">
                            {dashboardData?.student?.avatar_url ? (
                                <img
                                    src={`http://localhost/StudentDataMining${dashboardData.student.avatar_url}`}
                                    alt="Profile"
                                    className="avatar-img"
                                    onError={(e) => e.target.style.display = 'none'}
                                />
                            ) : (
                                dashboardData?.student?.name?.charAt(0) || user?.full_name?.charAt(0)
                            )}
                        </div>
                        {isEditing && (
                            <label className="avatar-upload-btn">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    style={{ display: 'none' }}
                                />
                                📷
                            </label>
                        )}
                    </div>
                    <div className="profile-info">
                        {!isEditing ? (
                            <>
                                <h2>{dashboardData?.student?.name || user?.full_name}</h2>
                                <p className="role-badge">Student</p>
                                <p className="email-text">{dashboardData?.student?.email || user?.email}</p>
                                <div className="profile-actions">
                                    <button className="btn-secondary btn-sm" onClick={() => setIsEditing(true)}>
                                        Edit Profile
                                    </button>
                                    <button className="btn-secondary btn-sm" onClick={() => setShowPasswordChange(!showPasswordChange)}>
                                        Change Password
                                    </button>
                                </div>
                            </>
                        ) : (
                            <form onSubmit={handleProfileUpdate} className="profile-edit-form">
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        value={profileForm.full_name}
                                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                                        required
                                        minLength="2"
                                    />
                                </div>
                                <div className="edit-actions">
                                    <button type="submit" className="btn-primary" disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {updateStatus.message && (
                    <div className={`message-banner ${updateStatus.type}`}>
                        {updateStatus.message}
                    </div>
                )}

                {showPasswordChange && (
                    <div className="password-change-section card">
                        <h3>Change Password</h3>
                        <form onSubmit={handlePasswordChange} className="password-form">
                            <div className="form-group">
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    value={passwordForm.current_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    value={passwordForm.new_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                                    required
                                    minLength="6"
                                />
                            </div>
                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwordForm.confirm_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-primary" disabled={isSaving}>
                                    {isSaving ? 'Updating...' : 'Update Password'}
                                </button>
                                <button type="button" className="btn-secondary" onClick={() => setShowPasswordChange(false)}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="profile-details-grid">
                    <div className="detail-card">
                        <label>Student ID</label>
                        <p>{dashboardData?.student?.student_id || 'N/A'}</p>
                    </div>
                    <div className="detail-card">
                        <label>Program</label>
                        <p>{dashboardData?.program?.name || 'Not Enrolled'}</p>
                    </div>
                    <div className="detail-card">
                        <label>Program Code</label>
                        <p>{dashboardData?.program?.code || 'N/A'}</p>
                    </div>
                    <div className="detail-card">
                        <label>Current Semester</label>
                        <p>{dashboardData?.semester ? `Semester ${dashboardData.semester}` : 'N/A'}</p>
                    </div>
                    <div className="detail-card">
                        <label>Program Duration</label>
                        <p>{dashboardData?.program?.duration ? `${dashboardData.program.duration} Years` : 'N/A'}</p>
                    </div>
                    <div className="detail-card">
                        <label>Enrollment Date</label>
                        <p>{formatDate(dashboardData?.student?.enrollment_date)}</p>
                    </div>
                </div>

                <div className="academic-summary-section">
                    <h3>Academic Summary</h3>
                    <div className="academic-stats">
                        <div className="academic-stat">
                            <span className="stat-number">{dashboardData?.summary?.gpa || '0.00'}</span>
                            <span className="stat-label">Current GPA</span>
                        </div>
                        <div className="academic-stat">
                            <span className="stat-number">{dashboardData?.summary?.subjects_enrolled || 0}</span>
                            <span className="stat-label">Enrolled Subjects</span>
                        </div>
                        <div className="academic-stat">
                            <span className="stat-number">{dashboardData?.summary?.earned_credits || 0}</span>
                            <span className="stat-label">Credits Earned</span>
                        </div>
                        <div className="academic-stat">
                            <span className="stat-number">{dashboardData?.summary?.overall_attendance || 0}%</span>
                            <span className="stat-label">Attendance</span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Render content based on enrollment status
    const renderContent = () => {
        if (loading) {
            return <div className="loading-spinner">Loading your dashboard...</div>
        }

        if (!dashboardData?.enrolled) {
            return <NotEnrolledView />
        }

        switch (activeTab) {
            case 'grades':
                return <GradesView />
            case 'attendance':
                return <AttendanceView />
            case 'profile':
                return <ProfileView />
            case 'calendar':
                return <CalendarView />
            default:
                return <OverviewView />
        }
    }

    return (
        <>
            <LogoutModal
                isOpen={showLogoutModal}
                onConfirm={confirmLogout}
                onCancel={() => setShowLogoutModal(false)}
            />
            <div className="dashboard">
                <nav className="dashboard-nav">
                    <div className="dashboard-nav-brand">
                        <div className="dashboard-nav-logo">
                            <BookIcon />
                        </div>
                        <span className="dashboard-nav-title">Student Portal</span>
                    </div>

                    <div className="dashboard-nav-actions">
                        {lastUpdated && (
                            <span className="last-updated">
                                Updated: {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}

                        {/* Notifications Bell */}
                        <div className="notification-wrapper">
                            <button
                                className="icon-btn notification-btn"
                                onClick={() => setShowNotifications(!showNotifications)}
                            >
                                <BellIcon />
                                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                            </button>

                            {showNotifications && (
                                <div className="notification-dropdown">
                                    <div className="notification-header">
                                        <h3>Notifications</h3>
                                        <button className="mark-read-btn" onClick={() => markAsRead(null)}>
                                            Mark all read
                                        </button>
                                    </div>
                                    <div className="notification-list">
                                        {notifications.length === 0 ? (
                                            <div className="no-notifications">No notifications</div>
                                        ) : (
                                            notifications.map(n => (
                                                <div key={n.id} className={`notification-item ${n.is_read ? 'read' : 'unread'}`}>
                                                    <div className="notification-content">
                                                        <h4>{n.title}</h4>
                                                        <p>{n.message}</p>
                                                        <span className="notification-time">
                                                            {new Date(n.created_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    {!n.is_read && (
                                                        <button
                                                            className="mark-read-icon"
                                                            title="Mark as read"
                                                            onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                                                        >
                                                            <CheckIcon />
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button className="icon-btn" onClick={toggleTheme}>
                            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                        </button>
                        <div className="dashboard-nav-user" onClick={() => setActiveTab('profile')}>
                            <div className="dashboard-nav-avatar">
                                {user?.full_name?.charAt(0)}
                            </div>
                            <span className="dashboard-nav-name">{user?.full_name}</span>
                        </div>
                        <button className="icon-btn logout-btn" onClick={() => setShowLogoutModal(true)}>
                            <LogoutIcon />
                        </button>
                    </div>
                </nav>

                <main className="dashboard-main">
                    <section className="dashboard-welcome">
                        <h1>{getGreeting()}, {user?.full_name?.split(' ')[0]}! 🚀</h1>
                        <div className="semester-selector-container">
                            <p>Track your academic progress for</p>
                            <select
                                className="semester-select"
                                value={selectedSemester || dashboardData?.semester || ''}
                                onChange={(e) => setSelectedSemester(Number(e.target.value))}
                            >
                                {[...Array(dashboardData?.student?.current_semester || dashboardData?.semester || 1)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                                ))}
                            </select>
                        </div>
                    </section>

                    {/* Tab Navigation */}
                    {dashboardData?.enrolled && (
                        <div className="student-tabs">
                            <button
                                className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                                onClick={() => setActiveTab('overview')}
                            >
                                <ChartIcon /> Overview
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'grades' ? 'active' : ''}`}
                                onClick={() => setActiveTab('grades')}
                            >
                                <ClipboardIcon /> Grades
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
                                onClick={() => setActiveTab('attendance')}
                            >
                                <CalendarIcon /> Attendance
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                                onClick={() => setActiveTab('profile')}
                            >
                                <UserIcon /> Profile
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
                                onClick={() => setActiveTab('calendar')}
                            >
                                Calendar
                            </button>
                        </div>
                    )}

                    <div className="dashboard-content-area">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </>
    )
}

export default StudentDashboard
