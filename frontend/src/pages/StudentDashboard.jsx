import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import MainLayout from '../components/Layout/MainLayout'
import { useAuth } from '../context/AuthContext'

import CalendarManagement from '../components/CalendarManagement/CalendarManagement'
import { CircularProgress } from '../components/CircularProgress'
import GradesTab from '../components/Student/Grades/GradesTab'
import StudentProfile from '../components/Student/Profile/StudentProfile'
import StudentAssignments from '../components/Student/Assignments/StudentAssignments'
import StudentExams from '../components/Student/Exams/StudentExams'

import ReportGenerator from '../components/Reports/ReportGenerator'
import AnnouncementsPage from '../components/Discussions/AnnouncementsPage'
import StudentAttendance from '../components/Student/Attendance/StudentAttendance'
import QuickActions from '../components/Student/Overview/QuickActions'
import ActivityFeed from '../components/Student/Overview/ActivityFeed'
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

    ChevronDown
} from 'lucide-react'

import { API_BASE } from '../config'

const StudentDashboard = () => {
    const { user, token, logout } = useAuth()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    // Use URL params for tabs like Admin
    const activeTab = searchParams.get('tab') || 'overview'
    const setActiveTab = (tab) => setSearchParams({ tab })

    const [refreshing, setRefreshing] = useState(false)
    const [lastUpdated, setLastUpdated] = useState(new Date())

    // Semester Selection State
    const [selectedSemester, setSelectedSemester] = useState(null)
    const [availableSemesters, setAvailableSemesters] = useState([])

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
            // Include semester in query if selected
            const params = selectedSemester ? `?semester=${selectedSemester}` : '';
            const dashRes = await fetch(`${API_BASE}/student_dashboard.php${params}`, {
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

                // Extract available semesters logic improved by backend supporting full data
                // For now keep the frontend logic but ensure it uses the data from subjects
                const semesters = [...new Set(
                    subjects
                        .map(s => s.subject?.semester)
                        .filter(sem => sem != null)
                )].sort((a, b) => a - b);

                setAvailableSemesters(semesters);

                if (semesters.length > 0 && !selectedSemester) {
                    const defaultSem = dashData.data.semester || 1;
                    setSelectedSemester(defaultSem);
                }

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
                    progress: sub.attendance?.percentage || 0,
                    attendance: sub.attendance,
                    overall_score: sub.overall_grade,
                    credits: sub.subject.credits,
                    components: sub.components,
                    semester: sub.subject.semester
                }));

                setDashboardData({
                    gpa: summary.gpa,
                    gpa_4: summary.gpa_4,
                    gpa_text: summary.gpa_text,
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
    }, [token, fetchNotifications, selectedSemester, user])





    const getProgressColor = (gradient) => {
        switch (gradient) {
            case 'gradient-purple': return '#6366f1'
            case 'gradient-blue': return '#3b82f6'
            case 'gradient-green': return '#22c55e'
            case 'gradient-orange': return '#f97316'
            default: return '#6366f1'
        }
    }

    // Stats Cards Component (Legacy - using inline now but keeping structure)
    const StatsCards = () => {

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

    // Get semester-filtered courses and calculate semester-specific stats
    const filteredCourses = selectedSemester
        ? dashboardData.courses.filter(c => c.semester === selectedSemester)
        : dashboardData.courses;

    // Calculate semester-specific GPA and attendance
    const semesterStats = selectedSemester ? {
        gpa: filteredCourses.length > 0
            ? (filteredCourses.reduce((sum, c) => sum + (parseFloat(c.overall_score) || 0), 0) / filteredCourses.length / 25).toFixed(2)
            : 0,
        attendance: filteredCourses.length > 0
            ? Math.round(filteredCourses.reduce((sum, c) => sum + (c.attendance?.percentage || 0), 0) / filteredCourses.length)
            : 0,
        credits: filteredCourses.reduce((sum, c) => sum + (parseInt(c.credits) || 0), 0)
    } : {
        gpa: dashboardData.gpa,
        attendance: dashboardData.attendance,
        credits: dashboardData.credits
    };

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
                {/* Welcome Banner with Semester Selector */}
                <div className="welcome-banner">
                    <div className="welcome-content">
                        <div className="welcome-text">
                            <h1>{getGreeting()}, {user?.full_name}! 👋</h1>
                            <p>Here's your academic summary{selectedSemester ? ` for Semester ${selectedSemester}` : ' for the semester'}.</p>
                        </div>
                        {availableSemesters.length > 0 && (
                            <div className="semester-selector">
                                <label htmlFor="semester-select">View Semester:</label>
                                <div className="select-wrapper">
                                    <select
                                        id="semester-select"
                                        value={selectedSemester || ''}
                                        onChange={(e) => setSelectedSemester(Number(e.target.value))}
                                        className="semester-dropdown"
                                    >
                                        {availableSemesters.map(sem => (
                                            <option key={sem} value={sem}>
                                                Semester {sem}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={18} className="select-icon" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {activeTab === 'overview' && (
                        <>
                            <div className="top-row-flex" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2rem' }}>
                                {/* Stats Cards with Semester-Specific Data */}
                                <motion.div
                                    className="stats-grid"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ staggerChildren: 0.1 }}
                                >
                                    {[
                                        {
                                            title: selectedSemester ? 'Semester GPA' : 'Current GPA',
                                            value: dashboardData.gpa,
                                            subtitle: `Scale 10.0`,
                                            icon: GraduationCap,
                                            gradient: 'gradient-purple',
                                            progress: (dashboardData.gpa / 10.0) * 100,
                                            trend: dashboardData.gpa_text,
                                            trendUp: dashboardData.gpa >= 6.0
                                        },
                                        {
                                            title: 'GPA (4.0)',
                                            value: dashboardData.gpa_4,
                                            subtitle: 'US Standard',
                                            icon: TrendingUp,
                                            gradient: 'gradient-green',
                                            progress: (dashboardData.gpa_4 / 4.0) * 100,
                                            trend: 'On Track',
                                            trendUp: true
                                        },
                                        {
                                            title: 'Credits',
                                            value: dashboardData.credits,
                                            subtitle: selectedSemester ? `This Semester` : 'Total Earned',
                                            icon: Award,
                                            gradient: 'gradient-blue',
                                            progress: (dashboardData.credits / (dashboardData.total_credits || 1)) * 100,
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
                                    ].map((card, index) => {
                                        const Icon = card.icon
                                        return (
                                            <motion.div
                                                key={index}
                                                className="stat-card"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                whileHover={{
                                                    y: -8,
                                                    transition: { duration: 0.3 }
                                                }}
                                            >
                                                <div className="stat-progress-ring" style={{ marginBottom: '1rem', width: '56px', height: '56px', position: 'relative' }}>
                                                    <CircularProgress
                                                        value={card.progress || 0}
                                                        size={56}
                                                        strokeWidth={6}
                                                        color={getProgressColor(card.gradient)}
                                                        trailColor="rgba(0,0,0,0.05)"
                                                        showValue={false}
                                                    />
                                                    <div className={`stat-icon-inner ${card.gradient}`} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', borderRadius: '50%', padding: '8px' }}>
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
                                                                <span className="trend-text">{card.trend}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </motion.div>


                            </div>


                            {/* Quick Actions & Activity Feed Row */}
                            <div className="content-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: '2fr 1fr' }}>
                                <ActivityFeed />
                                <QuickActions setActiveTab={setActiveTab} />
                            </div>

                            <div className="content-grid">
                                <div className="card">
                                    <h3>
                                        <BookOpen size={20} className="text-primary" />
                                        Current Courses {selectedSemester && `(Semester ${selectedSemester})`}
                                    </h3>
                                    <div className="list-container">
                                        {filteredCourses.length === 0 ? (
                                            <div className="empty-state-modern">
                                                <div className="empty-illustration">
                                                    <BookOpen size={120} className="empty-icon-large" />
                                                </div>
                                                <h4>No courses found</h4>
                                                <p>You don't have any courses {selectedSemester ? `in Semester ${selectedSemester}` : 'enrolled yet'}.</p>
                                                <button className="cta-button primary-cta" onClick={() => setActiveTab('schedule')}>
                                                    View Course Catalog
                                                </button>
                                            </div>
                                        ) : (
                                            filteredCourses.map(course => (
                                                <div key={course.id} className="list-item">
                                                    <div className="item-info">
                                                        <div className="item-title">{course.name}</div>
                                                        <div className="item-meta">
                                                            <span>Attendance: {course.attendance?.percentage || 0}%</span>
                                                        </div>
                                                    </div>
                                                    <div className={`badge ${course.grade === 'F' ? 'urgent' : course.grade === 'A' || course.grade === 'A+' ? 'success' : 'pending'}`}>
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
                                            <div className="empty-state-modern">
                                                <div className="empty-illustration">
                                                    <CheckCircle size={120} className="empty-icon-large success-alpha" />
                                                </div>
                                                <h4>All caught up!</h4>
                                                <p>No upcoming events in the next 14 days.</p>
                                            </div>
                                        ) : (
                                            dashboardData.upcoming_assignments.map(item => (
                                                <div key={item.id} className="list-item event-item">
                                                    <div className="item-info">
                                                        <div className="item-title-row">
                                                            <span className="item-title">{item.title}</span>
                                                            <span className={`event-type-badge ${item.status}`}>
                                                                {item.status === 'exam' ? '📝 Exam' :
                                                                    item.status === 'assignment' ? '📄 Assignment' :
                                                                        item.status === 'holiday' ? '🎉 Holiday' : '📅 Event'}
                                                            </span>
                                                        </div>
                                                        <div className="item-meta">Due: {item.due}</div>
                                                    </div>
                                                    <div className={`badge urgency-badge ${item.days_left === 0 ? 'critical' :
                                                        item.days_left <= 3 ? 'urgent' :
                                                            item.days_left <= 7 ? 'warning' : 'pending'
                                                        }`}>
                                                        {item.days_left === 0 ? '🔥 Today!' :
                                                            item.days_left === 1 ? '⚠️ Tomorrow' :
                                                                `${item.days_left} days`}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}



                    {activeTab === 'attendance' && (
                        <div className="card card-padded-lg">
                            <StudentAttendance />
                        </div>
                    )}



                    {activeTab === 'profile' && (
                        <StudentProfile />
                    )}

                    {activeTab === 'grades' && (
                        <div className="card">
                            <GradesTab selectedSemester={selectedSemester} />
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

                    {(activeTab === 'discussions' || activeTab === 'announcements') && (
                        <div className="card">
                            <AnnouncementsPage />
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
