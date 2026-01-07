import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import MainLayout from '../components/Layout/MainLayout'
import { useAuth } from '../context/AuthContext'
import StudentAnalyticsDashboard from '../components/Analytics/StudentAnalyticsDashboard'
import CalendarManagement from '../components/CalendarManagement/CalendarManagement'
import { CircularProgress } from '../components/CircularProgress'
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
    XCircle
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
            // 1. Fetch Dashboard Overview (GPA, Subjects, etc.)
            const dashRes = await fetch(`${API_BASE}/student_dashboard.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dashData = await dashRes.json();

            // 2. Fetch Calendar Events for "Upcoming Assignments"
            const calRes = await fetch(`${API_BASE}/calendar.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const calData = await calRes.json();

            if (dashData.success) {
                const summary = dashData.data.summary;
                const subjects = dashData.data.subjects;

                // Process Calendar Data for Upcoming Assignments (next 7 days)
                let upcoming = [];
                if (calData.success) {
                    const today = new Date();
                    upcoming = calData.data.filter(ev => {
                        const evDate = new Date(ev.event_date);
                        const diffTime = evDate - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        // Show items from today and future (up to 14 days?)
                        return diffDays >= 0 && diffDays <= 14;
                    }).sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
                        .slice(0, 5); // Take top 5
                }

                // Construct Courses Array
                const courses = subjects.map(sub => ({
                    id: sub.subject.id,
                    name: sub.subject.name,
                    code: sub.subject.code,
                    grade: sub.grade_letter || 'N/A',
                    progress: sub.status === 'completed' ? 100 : (sub.attendance.percentage || 0), // Use attendance or semester progress
                    attendance: sub.attendance,
                    overall_score: sub.overall_grade,
                    credits: sub.subject.credits,
                    components: sub.components
                }));

                setDashboardData({
                    gpa: summary.gpa,
                    attendance: summary.overall_attendance,
                    credits: summary.earned_credits,
                    total_credits: summary.total_credits, // if needed
                    courses: courses,
                    upcoming_assignments: upcoming.map(ev => ({
                        id: ev.id,
                        title: ev.title,
                        due: new Date(ev.event_date).toLocaleDateString(),
                        status: ev.type, // 'assignment', 'exam', etc.
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

    useEffect(() => {
        fetchDashboardData()
    }, [fetchDashboardData])

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
                progress: (dashboardData.gpa / 4.0) * 100, // Assuming 4.0 scale, adjust if 10.0
                trend: 'Latest Semester', // Could calculate diff if available
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
                        <h1>{getGreeting()}, {user?.full_name?.split(' ')[0]}! 👋</h1>
                        <p>Here's your academic summary for the semester.</p>
                    </div>
                </div>

                {/* Main Tabs */}
                <div className="dashboard-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                        onClick={() => setActiveTab('analytics')}
                    >
                        Analytics
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'grades' ? 'active' : ''}`}
                        onClick={() => setActiveTab('grades')}
                    >
                        Grades
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
                        onClick={() => setActiveTab('schedule')}
                    >
                        Schedule
                    </button>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {activeTab === 'overview' && (
                        <>
                            <StatsCards />

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

                    {activeTab === 'grades' && (
                        <div className="card">
                            <h3>My Grades Detail</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                                            <th style={{ padding: '12px' }}>Subject</th>
                                            <th style={{ padding: '12px' }}>Code</th>
                                            <th style={{ padding: '12px' }}>Credits</th>
                                            <th style={{ padding: '12px' }}>Attendance</th>
                                            <th style={{ padding: '12px' }}>Final Grade</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardData.courses.map(course => (
                                            <tr key={course.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                                <td style={{ padding: '12px', fontWeight: '500' }}>{course.name}</td>
                                                <td style={{ padding: '12px', color: '#666' }}>{course.code}</td>
                                                <td style={{ padding: '12px' }}>{course.credits}</td>
                                                <td style={{ padding: '12px' }}>
                                                    <span style={{
                                                        color: course.attendance?.percentage < 75 ? 'red' : 'green',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {course.attendance?.percentage}%
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    <span className="badge pending" style={{ fontSize: '0.9rem' }}>
                                                        {course.grade}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'schedule' && (
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