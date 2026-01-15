import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import MainLayout from '../components/Layout/MainLayout'
import { useAuth } from '../context/AuthContext'
import StudentAnalyticsDashboard from '../components/Analytics/StudentAnalyticsDashboard'
import CalendarManagement from '../components/CalendarManagement/CalendarManagement'
import { CircularProgress } from '../components/CircularProgress'
import GradesTab from '../components/Student/Grades/GradesTab'
import StudentProfile from '../components/Student/Profile/StudentProfile'
import StudentSkills from '../components/Student/Skills/StudentSkills'

import StudentCareer from '../components/Student/Career/StudentCareer'
import StudentAttendance from '../components/Student/Attendance/StudentAttendance'
import StudentAssignments from '../components/Student/Assignments/StudentAssignments'
import StudentExams from '../components/Student/Exams/StudentExams'
import CourseRecommendations from '../components/Student/Recommendations/CourseRecommendations'
import SmartStudyPlanner from '../components/Student/StudyPlanner/SmartStudyPlanner'
import PerformanceTrends from '../components/Student/Performance/PerformanceTrends'
import SubmissionHistory from '../components/Student/Submissions/SubmissionHistory'
import SubjectDifficulty from '../components/Student/Difficulty/SubjectDifficulty'
import AchievementBadges from '../components/Student/Badges/AchievementBadges'
import ReportGenerator from '../components/Reports/ReportGenerator'
import DiscussionForum from '../components/Discussions/DiscussionForum'
import CourseReviews from '../components/Reviews/CourseReviews'
import VideoLectures from '../components/VideoLectures/VideoLectures'
import './StudentDashboard.css'
import {
    BookOpen,
    Clock,
    GraduationCap,
    Award,
    TrendingUp,
    TrendingDown,
    Calendar as CalendarIcon,
    AlertCircle,
    CheckCircle,
    XCircle,
    Wifi,
    Fingerprint,
    QrCode
} from 'lucide-react'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

const StudentDashboard = () => {
    const { user, token, logout } = useAuth()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    // Use URL params for tabs like Admin
    const activeTab = searchParams.get('tab') || 'overview'
    const setActiveTab = (tab) => setSearchParams({ tab })

    const [refreshing, setRefreshing] = useState(false)
    const [lastUpdated, setLastUpdated] = useState(new Date())

    // Notifications State
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [showNotifications, setShowNotifications] = useState(false)

    // WiFi/QR Attendance State
    const [sessionCode, setSessionCode] = useState('')
    const [markingStatus, setMarkingStatus] = useState({ state: 'idle', message: '' })
    const [isAutoMarking, setIsAutoMarking] = useState(false)

    // Dashboard Data
    const [dashboardData, setDashboardData] = useState({
        gpa: 0,
        attendance: 0,
        credits: 0,
        courses: [],
        upcoming_assignments: []
    })

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

    const fetchDashboardData = useCallback(async () => {
        setRefreshing(true)
        try {
            const dashRes = await fetch(`${API_BASE}/student_dashboard.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dashData = await dashRes.json();

            const calRes = await fetch(`${API_BASE}/calendar.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const calData = await calRes.json();

            if (dashData.success) {
                const summary = dashData.data.summary;
                const subjects = dashData.data.subjects;

                let upcoming = [];
                if (calData.success) {
                    const today = new Date();
                    upcoming = calData.data.filter(ev => {
                        const evDate = new Date(ev.event_date);
                        const diffTime = evDate - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays >= 0 && diffDays <= 14;
                    }).sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
                        .slice(0, 5);
                }

                const courses = subjects.map(sub => ({
                    id: sub.subject.id,
                    name: sub.subject.name,
                    code: sub.subject.code,
                    grade: sub.grade_letter || 'N/A',
                    progress: sub.status === 'completed' ? 100 : (sub.attendance.percentage || 0),
                    attendance: sub.attendance,
                    overall_score: sub.overall_grade,
                    credits: sub.subject.credits,
                    components: sub.components
                }));

                setDashboardData({
                    gpa: summary.gpa,
                    attendance: summary.overall_attendance,
                    credits: summary.earned_credits,
                    total_credits: summary.total_credits,
                    courses: courses,
                    upcoming_assignments: upcoming.map(ev => ({
                        id: ev.id,
                        title: ev.title,
                        due: new Date(ev.event_date).toLocaleDateString(),
                        status: ev.type,
                        days_left: Math.ceil((new Date(ev.event_date) - new Date()) / (1000 * 60 * 60 * 24))
                    }))
                })
            }

            await fetchNotifications()
            setLastUpdated(new Date())
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setRefreshing(false)
        }
    }, [token, fetchNotifications])

    const handleMarkSelfAttendance = useCallback(async (code) => {
        const finalCode = code || sessionCode;
        if (!finalCode || finalCode.length !== 6) return

        setMarkingStatus({ state: 'loading', message: code ? 'Auto-verifying WiFi network...' : 'Verifying network & scanning...' })
        try {
            const response = await fetch(`${API_BASE}/attendance.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'mark_self',
                    session_code: finalCode
                })
            })
            const data = await response.json()
            if (data.success) {
                setMarkingStatus({ state: 'success', message: data.message })
                setSessionCode('')
                // Remove param from URL
                if (searchParams.has('attendance_code')) {
                    searchParams.delete('attendance_code')
                    setSearchParams(searchParams)
                }
                setTimeout(() => {
                    fetchDashboardData()
                    setMarkingStatus({ state: 'idle', message: '' })
                    setIsAutoMarking(false)
                }, 3000)
            } else {
                setMarkingStatus({ state: 'error', message: data.error })
                setIsAutoMarking(false)
            }
        } catch (err) {
            setMarkingStatus({ state: 'error', message: 'Connection failed' })
            setIsAutoMarking(false)
        }
    }, [token, sessionCode, fetchDashboardData, searchParams, setSearchParams])

    useEffect(() => {
        fetchDashboardData()

        // Handle QR Scan via URL param
        const scanCode = searchParams.get('attendance_code')
        if (scanCode && scanCode.length === 6) {
            setSessionCode(scanCode)
            setIsAutoMarking(true)
            handleMarkSelfAttendance(scanCode)
        }
    }, [fetchDashboardData, searchParams, handleMarkSelfAttendance])

    // Stats Cards Component
    const StatsCards = () => {
        const containerVariants = {
            hidden: { opacity: 0 },
            visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
            }
        }

        const cardVariants = {
            hidden: { opacity: 0, y: 20 },
            visible: {
                opacity: 1,
                y: 0,
                transition: { type: 'spring', stiffness: 100, damping: 15 }
            }
        }

        const cards = [
            {
                title: 'Current GPA',
                value: dashboardData.gpa,
                subtitle: 'Cumulative Grade Point',
                icon: GraduationCap,
                gradient: 'gradient-purple',
                progress: (dashboardData.gpa / 4.0) * 100,
                trend: 'Latest Semester',
                trendUp: true
            },
            {
                title: 'Attendance',
                value: `${dashboardData.attendance}%`,
                subtitle: 'Overall Attendance',
                icon: Clock,
                gradient: 'gradient-green',
                progress: dashboardData.attendance,
                trend: dashboardData.attendance >= 75 ? 'Good Standing' : 'Warning',
                trendUp: dashboardData.attendance >= 75
            },
            {
                title: 'Credits Earned',
                value: dashboardData.credits,
                subtitle: `Total Earned`,
                icon: Award,
                gradient: 'gradient-blue',
                progress: (dashboardData.credits / (dashboardData.total_credits || 120)) * 100,
                trend: 'Academic Progress',
                trendUp: true
            },
            {
                title: 'Pending Tasks',
                value: dashboardData.upcoming_assignments.length,
                subtitle: 'Next 14 Days',
                icon: AlertCircle,
                gradient: 'gradient-orange',
                progress: 100 - (dashboardData.upcoming_assignments.length * 10),
                trend: dashboardData.upcoming_assignments.length > 3 ? 'Heavy Workload' : 'Manageable',
                trendUp: dashboardData.upcoming_assignments.length <= 3
            }
        ]

        const getProgressColor = (gradient) => {
            switch (gradient) {
                case 'gradient-purple': return '#6366f1'
                case 'gradient-blue': return '#3b82f6'
                case 'gradient-green': return '#22c55e'
                case 'gradient-orange': return '#f97316'
                default: return '#6366f1'
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
                            className="stat-card"
                            variants={cardVariants}
                            whileHover={{
                                y: -6,
                                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
                                transition: { duration: 0.2 }
                            }}
                        >
                            <div className="stat-progress-ring">
                                <CircularProgress
                                    value={card.progress || 0}
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
                                    {card.trend && (
                                        <span className={`stat-trend ${card.trendUp ? 'positive' : 'negative'}`}>
                                            {card.trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                            <span className="trend-text">{card.trend}</span>
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

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good Morning'
        if (hour < 17) return 'Good Afternoon'
        return 'Good Evening'
    }

    return (
        <MainLayout
            role="student"
            lastUpdated={lastUpdated}
            onRefresh={fetchDashboardData}
            refreshing={refreshing}
            notifications={notifications}
            unreadCount={unreadCount}
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            onMarkAsRead={markAsRead}
            onLogout={logout}
        >
            <div className="dashboard-content">
                {/* Welcome Banner */}
                <div className="welcome-banner">
                    <div className="welcome-content">
                        <h1>{getGreeting()}, {user?.full_name}! 👋</h1>
                        <p>Here's your academic summary for the semester.</p>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {activeTab === 'overview' && (
                        <>
                            <div className="top-row-flex" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <StatsCards />

                                {/* QR Attendance Panel */}
                                <motion.div
                                    className={`smart-attendance-card ${isAutoMarking ? 'auto-marking' : ''}`}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                    <div className="card-header">
                                        <div className="icon-wrapper">
                                            {isAutoMarking ? <QrCode size={20} className="pulse-icon" /> : <Wifi size={20} />}
                                        </div>
                                        <div>
                                            <h4>{isAutoMarking ? 'QR Scan Detected' : 'Smart Attendance'}</h4>
                                            <p>{isAutoMarking ? 'Verifying location...' : 'Mark presence via QR/WiFi'}</p>
                                        </div>
                                    </div>

                                    <div className="card-body">
                                        {!isAutoMarking && (
                                            <div className="code-input-wrapper">
                                                <input
                                                    type="text"
                                                    placeholder="Enter Code"
                                                    maxLength={6}
                                                    value={sessionCode}
                                                    onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                                                    className="session-code-input"
                                                />
                                                <Fingerprint className="input-icon" size={18} />
                                            </div>
                                        )}

                                        <button
                                            className="btn-mark-attendance"
                                            disabled={(!isAutoMarking && sessionCode.length !== 6) || markingStatus.state === 'loading'}
                                            onClick={() => handleMarkSelfAttendance()}
                                        >
                                            {markingStatus.state === 'loading' ? 'Verifying...' : 'Submit Attendance'}
                                        </button>

                                        <AnimatePresence>
                                            {markingStatus.message && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`status-message ${markingStatus.state}`}
                                                >
                                                    {markingStatus.state === 'error' ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                                                    {markingStatus.message}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <div className="card-footer">
                                        <small><AlertCircle size={12} /> Same-WiFi restricted</small>
                                    </div>
                                </motion.div>
                            </div>

                            <div className="content-grid">
                                <div className="card">
                                    <h3>
                                        <BookOpen size={20} className="text-primary" />
                                        Current Courses
                                    </h3>
                                    <div className="list-container">
                                        {dashboardData.courses.length === 0 ? (
                                            <div className="text-center p-4 text-gray-500">No active courses found.</div>
                                        ) : (
                                            dashboardData.courses.map(course => (
                                                <div key={course.id} className="list-item">
                                                    <div className="item-info">
                                                        <div className="item-title">{course.name}</div>
                                                        <div className="item-meta">
                                                            <span>Attendance: {course.attendance?.percentage || 0}%</span>
                                                        </div>
                                                    </div>
                                                    <div className={`badge ${course.grade === 'F' ? 'urgent' : 'pending'}`}>
                                                        Grade: {course.grade}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="card">
                                    <h3>
                                        <AlertCircle size={20} className="text-primary" />
                                        Upcoming Events & Assignments
                                    </h3>
                                    <div className="list-container">
                                        {dashboardData.upcoming_assignments.length === 0 ? (
                                            <div className="text-center p-4 text-gray-500">No upcoming items.</div>
                                        ) : (
                                            dashboardData.upcoming_assignments.map(item => (
                                                <div key={item.id} className="list-item">
                                                    <div className="item-info">
                                                        <div className="item-title">{item.title}</div>
                                                        <div className="item-meta">Due: {item.due}</div>
                                                    </div>
                                                    <div className={`badge ${item.days_left <= 3 ? 'urgent' : 'pending'}`}>
                                                        {item.days_left} days left
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'analytics' && (
                        <StudentAnalyticsDashboard studentData={dashboardData} />
                    )}

                    {activeTab === 'skills' && (
                        <StudentSkills />
                    )}



                    {activeTab === 'career' && (
                        <StudentCareer />
                    )}

                    {activeTab === 'recommendations' && (
                        <div className="card">
                            <CourseRecommendations />
                        </div>
                    )}

                    {activeTab === 'study-planner' && (
                        <div className="card">
                            <SmartStudyPlanner />
                        </div>
                    )}

                    {activeTab === 'performance' && (
                        <div className="card">
                            <PerformanceTrends />
                        </div>
                    )}

                    {activeTab === 'submissions' && (
                        <div className="card">
                            <SubmissionHistory />
                        </div>
                    )}

                    {activeTab === 'difficulty' && (
                        <div className="card">
                            <SubjectDifficulty />
                        </div>
                    )}

                    {activeTab === 'badges' && (
                        <div className="card">
                            <AchievementBadges />
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <StudentProfile />
                    )}

                    {activeTab === 'attendance' && (
                        <div className="card">
                            <StudentAttendance />
                        </div>
                    )}

                    {activeTab === 'grades' && (
                        <div className="card">
                            <GradesTab />
                        </div>
                    )}

                    {activeTab === 'assignments' && (
                        <div className="card">
                            <StudentAssignments />
                        </div>
                    )}

                    {activeTab === 'exams' && (
                        <div className="card">
                            <StudentExams />
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="card">
                            <ReportGenerator />
                        </div>
                    )}

                    {activeTab === 'discussions' && (
                        <div className="card">
                            <DiscussionForum />
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <div className="card">
                            <CourseReviews />
                        </div>
                    )}

                    {activeTab === 'videos' && (
                        <div className="card">
                            <VideoLectures />
                        </div>
                    )}

                    {(activeTab === 'schedule' || activeTab === 'calendar') && (
                        <div className="card">
                            <CalendarManagement role="student" />
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    )
}

export default StudentDashboard