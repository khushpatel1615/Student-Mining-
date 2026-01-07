import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useCountUp } from '../hooks/useCountUp'
import LogoutModal from '../components/LogoutModal/LogoutModal'
import SkeletonCard from '../components/SkeletonCard/SkeletonCard'
import EmptyState from '../components/EmptyState/EmptyState'
import PerformanceMetrics from '../components/Charts/PerformanceMetrics'
import QuickActionsPanel from '../components/QuickActions/QuickActionsPanel'
import { ActivityFeed } from '../components/ActivityFeed'
import MainLayout from '../components/Layout/MainLayout'
import { CircularProgress } from '../components/CircularProgress'
import {
    TrendingUp,
    BookOpen,
    Calendar,
    Users,
    ChevronDown,
    ArrowRight,
    AlertTriangle,
    GraduationCap,
    Award,
    Clock
} from 'lucide-react'
import './StudentDashboard.css'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function StudentDashboard() {
    const { user, token, logout } = useAuth()
    const { theme } = useTheme()
    const navigate = useNavigate()
    const [showLogoutModal, setShowLogoutModal] = useState(false)
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab = searchParams.get('tab') || 'overview'
    const setActiveTab = (tab) => setSearchParams({ tab })
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
            fetchNotifications()
        } catch (err) {
            console.error('Failed to mark notifications read:', err)
        }
    }

    // Dynamic data fetching
    const fetchDashboardData = useCallback(async (showRefreshIndicator = true) => {
        if (showRefreshIndicator) setRefreshing(true)
        try {
            const semesterQuery = selectedSemester ? `?semester=${selectedSemester}` : ''
            const [dashboardRes, , calendarRes] = await Promise.all([
                fetch(`${API_BASE}/student_dashboard.php${semesterQuery}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetchNotifications(),
                fetch(`${API_BASE}/calendar.php`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ])

            const data = await dashboardRes.json()
            if (data.success) {
                setDashboardData(data.data)
                setLastUpdated(new Date())
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

    useEffect(() => {
        fetchDashboardData(false)
    }, [fetchDashboardData])

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

    // ========== COMPONENTS ==========

    // Not Enrolled View
    const NotEnrolledView = () => (
        <div className="not-enrolled-container">
            <div className="not-enrolled-card">
                <div className="not-enrolled-icon">
                    <GraduationCap size={48} />
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

    // Summary Cards Component
    const SummaryCards = () => {
        const gpaValue = useCountUp((dashboardData?.summary?.gpa || 0) * 100, 1500)
        const attendanceValue = useCountUp(dashboardData?.summary?.overall_attendance || 0, 1200)
        const subjectsValue = useCountUp(dashboardData?.summary?.subjects_enrolled || 0, 800)

        const cards = [
            {
                title: 'Current GPA',
                value: (gpaValue / 100).toFixed(2),
                subtitle: dashboardData?.summary?.gpa_grade || 'N/A',
                icon: TrendingUp,
                gradient: 'gradient-purple'
            },
            {
                title: 'Credits',
                value: `${dashboardData?.summary?.earned_credits || 0}/${dashboardData?.summary?.total_credits || 0}`,
                subtitle: 'Earned / Enrolled',
                icon: BookOpen,
                gradient: 'gradient-blue'
            },
            {
                title: 'Attendance',
                value: `${attendanceValue}%`,
                subtitle: dashboardData?.summary?.attendance_status === 'good' ? 'On Track' : 'Needs Attention',
                icon: Calendar,
                gradient: dashboardData?.summary?.attendance_status === 'warning' ? 'gradient-orange' : 'gradient-green',
                warning: dashboardData?.summary?.attendance_status === 'warning'
            },
            {
                title: 'Subjects',
                value: subjectsValue,
                subtitle: 'This Semester',
                icon: Users,
                gradient: 'gradient-pink'
            }
        ]

        const containerVariants = {
            hidden: { opacity: 0 },
            visible: {
                opacity: 1,
                transition: {
                    staggerChildren: 0.1
                }
            }
        }

        const cardVariants = {
            hidden: { opacity: 0, y: 20 },
            visible: {
                opacity: 1,
                y: 0,
                transition: {
                    type: 'spring',
                    stiffness: 100,
                    damping: 15
                }
            }
        }

        const getProgressColor = (gradient) => {
            switch (gradient) {
                case 'gradient-purple': return '#6366f1'
                case 'gradient-blue': return '#3b82f6'
                case 'gradient-green': return '#22c55e'
                case 'gradient-orange': return '#f97316'
                case 'gradient-pink': return '#ec4899'
                default: return '#6366f1'
            }
        }

        const getProgressValue = (card, index) => {
            switch (index) {
                case 0: return (dashboardData?.summary?.gpa || 0) / 10 * 100 // GPA out of 10
                case 1: return ((dashboardData?.summary?.earned_credits || 0) / (dashboardData?.summary?.total_credits || 1)) * 100
                case 2: return dashboardData?.summary?.overall_attendance || 0
                case 3: return ((subjectsValue / 8) * 100) // Assuming max 8 subjects
                default: return 50
            }
        }

        return (
            <motion.div
                className="stats-grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {cards.map((card, index) => {
                    const Icon = card.icon
                    return (
                        <motion.div
                            key={index}
                            className={`stat-card ${card.warning ? 'warning' : ''}`}
                            variants={cardVariants}
                            whileHover={{
                                y: -6,
                                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
                                transition: { duration: 0.2 }
                            }}
                        >
                            <div className="stat-progress-ring">
                                <CircularProgress
                                    value={getProgressValue(card, index)}
                                    size={56}
                                    strokeWidth={6}
                                    color={getProgressColor(card.gradient)}
                                    trailColor="rgba(0,0,0,0.05)"
                                    showValue={false}
                                />
                                <div className={`stat-icon-inner ${card.gradient}`}>
                                    <Icon size={20} />
                                </div>
                            </div>
                            <div className="stat-content">
                                <span className="stat-title">{card.title}</span>
                                <span className="stat-value">{card.value}</span>
                                <div className="stat-footer">
                                    <span className="stat-subtitle">{card.subtitle}</span>
                                    {index === 0 && (
                                        <span className="stat-trend positive">
                                            <TrendingUp size={12} /> +0.5
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </motion.div>
        )
    }

    // Subject Card Component
    const SubjectCard = ({ item, index }) => {
        const getSubjectEmoji = (name, type) => {
            if (name.includes('Math')) return '📐'
            if (name.includes('Chemistry')) return '🧪'
            if (name.includes('Web')) return '🌐'
            if (name.includes('Programming') || name.includes('Computer')) return '💻'
            if (name.includes('Electric')) return '⚡'
            if (type === 'Core') return '🎯'
            return '📚'
        }

        const getGradeColor = (grade) => {
            if (!grade) return 'gray'
            if (grade.startsWith('A')) return 'green'
            if (grade.startsWith('B')) return 'blue'
            if (grade.startsWith('C')) return 'yellow'
            if (grade.startsWith('D')) return 'orange'
            return 'red'
        }

        return (
            <div
                className="subject-card"
                onClick={() => navigate(`/student/subject/${item.subject.id}`)}
            >
                <div className="subject-card-header">
                    <div className="subject-emoji">
                        {getSubjectEmoji(item.subject.name, item.subject.subject_type)}
                    </div>
                    <span className={`status-badge ${item.status}`}>
                        {item.status === 'active' ? 'Active' : item.status}
                    </span>
                </div>

                <div className="subject-card-body">
                    <h3 className="subject-name">{item.subject.name}</h3>
                    <span className="subject-code">{item.subject.code}</span>

                    <div className="subject-stats">
                        <div className="subject-stat">
                            <span className="subject-stat-label">Credits</span>
                            <span className="subject-stat-value">{item.subject.credits}</span>
                        </div>
                        <div className="subject-stat">
                            <span className="subject-stat-label">Attendance</span>
                            <span className={`subject-stat-value ${item.attendance?.warning ? 'warning' : ''}`}>
                                {item.attendance?.percentage || 0}%
                            </span>
                        </div>
                        <div className="subject-stat">
                            <span className="subject-stat-label">Grade</span>
                            <span className={`subject-stat-value grade-${getGradeColor(item.grade_letter)}`}>
                                {item.grade_letter || '-'}
                            </span>
                        </div>
                    </div>

                    <div className="subject-progress">
                        <div className="progress-bar">
                            <div
                                className={`progress-fill grade-${getGradeColor(item.grade_letter)}`}
                                style={{ width: `${item.overall_grade || 0}%` }}
                            />
                        </div>
                        <span className="progress-label">{item.overall_grade || 0}% Overall</span>
                    </div>
                </div>

                <div className="subject-card-footer">
                    <span>View Details</span>
                    <ArrowRight size={16} />
                </div>
            </div>
        )
    }

    // Overview View
    const OverviewView = () => (
        <div className="overview-layout">
            <div className="overview-main">
                <SummaryCards />

                <div className="section-header">
                    <div>
                        <h2 className="section-title">{dashboardData?.program?.name}</h2>
                        <p className="section-subtitle">Semester {dashboardData?.semester} Courses</p>
                    </div>
                </div>

                {loading ? (
                    <div className="subjects-grid">
                        {[...Array(6)].map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                ) : dashboardData?.subjects?.length > 0 ? (
                    <div className="subjects-grid">
                        {dashboardData.subjects.map((item, index) => (
                            <SubjectCard key={index} item={item} index={index} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon="📚"
                        title="No Subjects Enrolled"
                        description="You haven't been enrolled in any subjects this semester."
                    />
                )}
            </div>
        </div>
    )

    // Analytics View
    const AnalyticsView = () => (
        <div className="analytics-view">
            <PerformanceMetrics studentData={dashboardData} />
        </div>
    )

    // Grades View
    const GradesView = () => (
        <div className="grades-view">
            <div className="section-header">
                <h2 className="section-title">Grade Report</h2>
                <div className="gpa-badge">
                    <Award size={18} />
                    <span>CGPA: {dashboardData?.summary?.gpa || '0.00'}</span>
                </div>
            </div>

            <p className="section-description">
                Click on a subject to view detailed grade breakdown and professor feedback.
            </p>

            <div className="grades-grid">
                {dashboardData?.subjects?.map((item, index) => (
                    <div
                        key={index}
                        className="grade-card"
                        onClick={() => navigate(`/student/subject/${item.subject.id}`)}
                    >
                        <div className="grade-card-left">
                            <div className="grade-icon">
                                {item.subject.subject_type === 'Core' ? '💻' : '📖'}
                            </div>
                            <div className="grade-info">
                                <h3>{item.subject.name}</h3>
                                <span className="subject-code">{item.subject.code}</span>
                            </div>
                        </div>
                        <div className="grade-card-right">
                            <div className={`grade-letter grade-${item.grade_letter?.toLowerCase() || 'none'}`}>
                                {item.grade_letter || '-'}
                            </div>
                            <span className="grade-percent">
                                {item.overall_grade ? `${item.overall_grade}%` : 'Not graded'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    // Attendance View
    const AttendanceView = () => (
        <div className="attendance-view">
            <div className="section-header">
                <h2 className="section-title">Attendance Report</h2>
                <div className={`attendance-badge ${dashboardData?.summary?.attendance_status}`}>
                    <Clock size={18} />
                    <span>Overall: {dashboardData?.summary?.overall_attendance || 0}%</span>
                </div>
            </div>

            {dashboardData?.summary?.attendance_status === 'warning' && (
                <div className="warning-banner">
                    <AlertTriangle size={20} />
                    <span>Your attendance is below 75%. Please improve to avoid penalties.</span>
                </div>
            )}

            <div className="attendance-grid">
                {dashboardData?.subjects?.map((item, index) => (
                    <div key={index} className={`attendance-card ${item.attendance?.warning ? 'warning' : ''}`}>
                        <div className="attendance-card-header">
                            <h3>{item.subject.name}</h3>
                            <span className={`attendance-percent ${item.attendance?.warning ? 'warning' : 'good'}`}>
                                {item.attendance?.percentage || 0}%
                            </span>
                        </div>

                        <div className="attendance-bar">
                            <div
                                className={`attendance-fill ${item.attendance?.warning ? 'warning' : ''}`}
                                style={{ width: `${item.attendance?.percentage || 0}%` }}
                            />
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
                        </div>

                        <div className="total-classes">
                            Total: {item.attendance?.total_classes || 0} classes
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    // Calendar View
    const CalendarView = () => {
        const getEventColor = (type) => {
            switch (type) {
                case 'exam': return '#ef4444'
                case 'holiday': return '#10b981'
                case 'deadline': return '#f59e0b'
                default: return '#6366f1'
            }
        }

        if (calendarEvents.length === 0) {
            return (
                <EmptyState
                    icon="📅"
                    title="No Upcoming Events"
                    description="Check back later for updates."
                />
            )
        }

        return (
            <div className="calendar-view">
                <h2 className="section-title">Academic Calendar</h2>
                <div className="events-grid">
                    {calendarEvents.map(event => (
                        <div key={event.id} className="event-card">
                            <div
                                className="event-date"
                                style={{ background: getEventColor(event.type) }}
                            >
                                <span className="event-day">
                                    {new Date(event.event_date).getDate()}
                                </span>
                                <span className="event-month">
                                    {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}
                                </span>
                            </div>
                            <div className="event-info">
                                <h3>{event.title}</h3>
                                <p>{event.description}</p>
                                <span
                                    className="event-type"
                                    style={{ color: getEventColor(event.type) }}
                                >
                                    {event.type.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // Profile View
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
                setUpdateStatus({ type: 'error', message: 'Passwords do not match' })
                return
            }

            setIsSaving(true)
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
                    setUpdateStatus({ type: 'success', message: 'Password changed!' })
                    setShowPasswordChange(false)
                    setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
                } else {
                    setUpdateStatus({ type: 'error', message: result.error || 'Failed to change password' })
                }
            } catch (err) {
                setUpdateStatus({ type: 'error', message: 'Network error' })
            } finally {
                setIsSaving(false)
            }
        }

        return (
            <div className="profile-view">
                <div className="profile-header-card">
                    <div className="profile-avatar-large">
                        {dashboardData?.student?.avatar_url ? (
                            <img src={`http://localhost/StudentDataMining${dashboardData.student.avatar_url}`} alt="Profile" />
                        ) : (
                            <span>{(dashboardData?.student?.name || user?.full_name)?.charAt(0)}</span>
                        )}
                    </div>
                    <div className="profile-main-info">
                        <h2>{dashboardData?.student?.name || user?.full_name}</h2>
                        <span className="role-badge">Student</span>
                        <p className="email">{dashboardData?.student?.email || user?.email}</p>
                        <div className="profile-actions">
                            <button className="btn-secondary" onClick={() => setIsEditing(!isEditing)}>
                                Edit Profile
                            </button>
                            <button className="btn-secondary" onClick={() => setShowPasswordChange(!showPasswordChange)}>
                                Change Password
                            </button>
                        </div>
                    </div>
                </div>

                {updateStatus.message && (
                    <div className={`message-banner ${updateStatus.type}`}>
                        {updateStatus.message}
                    </div>
                )}

                {isEditing && (
                    <form onSubmit={handleProfileUpdate} className="profile-edit-form card">
                        <h3>Edit Profile</h3>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                value={profileForm.full_name}
                                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {showPasswordChange && (
                    <form onSubmit={handlePasswordChange} className="password-form card">
                        <h3>Change Password</h3>
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
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirm Password</label>
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
                        <label>Current Semester</label>
                        <p>Semester {dashboardData?.semester || 'N/A'}</p>
                    </div>
                    <div className="detail-card">
                        <label>Enrollment Date</label>
                        <p>{formatDate(dashboardData?.student?.enrollment_date)}</p>
                    </div>
                </div>

                <div className="academic-summary card">
                    <h3>Academic Summary</h3>
                    <div className="academic-stats">
                        <div className="academic-stat">
                            <span className="stat-number">{dashboardData?.summary?.gpa || '0.00'}</span>
                            <span className="stat-label">Current GPA</span>
                        </div>
                        <div className="academic-stat">
                            <span className="stat-number">{dashboardData?.summary?.subjects_enrolled || 0}</span>
                            <span className="stat-label">Subjects</span>
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

    // Render content based on active tab
    const renderContent = () => {
        if (loading) {
            return <div className="loading-spinner">Loading your dashboard...</div>
        }

        if (!dashboardData?.enrolled) {
            return <NotEnrolledView />
        }

        switch (activeTab) {
            case 'analytics':
                return <AnalyticsView />
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

            <MainLayout
                role="student"
                lastUpdated={lastUpdated}
                onRefresh={handleRefresh}
                refreshing={refreshing}
                notifications={notifications}
                unreadCount={unreadCount}
                showNotifications={showNotifications}
                setShowNotifications={setShowNotifications}
                onMarkAsRead={markAsRead}
                onLogout={() => setShowLogoutModal(true)}
            >
                {/* Welcome Banner */}
                <div className="welcome-banner">
                    <div className="welcome-content">
                        <h1>{getGreeting()}, {user?.full_name?.split(' ')[0]}! 🚀</h1>
                        <p>Track your academic progress and stay on top of your courses.</p>
                    </div>
                    <div className="semester-selector">
                        <select
                            value={selectedSemester || dashboardData?.semester || ''}
                            onChange={(e) => setSelectedSemester(Number(e.target.value))}
                        >
                            {[...Array(dashboardData?.student?.current_semester || dashboardData?.semester || 1)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                            ))}
                        </select>
                        <ChevronDown size={18} className="select-icon" />
                    </div>
                </div>

                {/* Main Content */}
                <div className="dashboard-content">
                    {renderContent()}
                </div>
            </MainLayout>
        </>
    )
}

export default StudentDashboard
