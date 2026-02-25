import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
    ChevronDown,
    Zap,
    Target,
    Flame
} from 'lucide-react'

import MainLayout from '../components/Layout/MainLayout'
import { useAuth } from '../context/AuthContext'
import CalendarManagement from '../components/CalendarManagement/CalendarManagement'
import { CircularProgress } from '../components/CircularProgress'
import GradesTab from '../components/Student/Grades/GradesTab'
import StudentProfile from '../components/Student/Profile/StudentProfile'
import StudentAssignments from '../components/Student/Assignments/StudentAssignments'
import StudentExams from '../components/Student/Exams/StudentExams'
import Analytics from '../components/Student/Analytics/StudentAnalyticsDashboard'
import SkillsMap from '../components/Student/SkillsMap/SkillsMap'
import CareerFit from '../components/Student/CareerFit/CareerFit'
import CoursePicks from '../components/Student/CoursePicks/CoursePicks'
import StudyPlanner from '../components/Student/StudyPlanner/StudyPlanner'
import Performance from '../components/Student/Performance/Performance'
import Submissions from '../components/Student/Submissions/Submissions'
import Difficulty from '../components/Student/Difficulty/Difficulty'
import Badges from '../components/Student/Badges/Badges'
import ReportGenerator from '../components/Reports/ReportGenerator'
import AnnouncementsPage from '../components/Discussions/AnnouncementsPage'
import StudentAttendance from '../components/Student/Attendance/StudentAttendance'
import QuickActionsRedesigned from '../components/Student/Overview/QuickActionsRedesigned'
import ActivityFeedRedesigned from '../components/Student/Overview/ActivityFeedRedesigned'
import './StudentDashboardRedesigned.css'

import {
    fetchDashboardData as fetchStudentDashboardData,
    fetchStudentCalendarEvents,
    fetchStudentNotifications,
    markStudentNotificationAsRead
} from '../services/studentService'

const StudentDashboard = () => {
    const { user, token, logout } = useAuth()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const activeTab = searchParams.get('tab') || 'overview'
    const setActiveTab = (tab) => setSearchParams({ tab })

    const [refreshing, setRefreshing] = useState(false)
    const [lastUpdated, setLastUpdated] = useState(new Date())

    const [selectedSemester, setSelectedSemester] = useState(null)
    const [availableSemesters, setAvailableSemesters] = useState([])

    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [showNotifications, setShowNotifications] = useState(false)
    const [dashboardError, setDashboardError] = useState('')

    const [dashboardData, setDashboardData] = useState({
        gpa: 0,
        attendance: 0,
        credits: 0,
        courses: [],
        upcoming_assignments: []
    })

    const fetchNotifications = useCallback(async () => {
        const { data, error } = await fetchStudentNotifications(10)
        if (error) {
            console.error('Failed to fetch notifications:', error)
            return
        }
        setNotifications(data?.notifications || [])
        setUnreadCount(data?.unread_count || 0)
    }, [])

    const markAsRead = async (id = null) => {
        const { error } = await markStudentNotificationAsRead(id)
        if (error) {
            console.error('Failed to mark notifications read:', error)
            return
        }
        fetchNotifications()
    }

    const fetchDashboardData = useCallback(async () => {
        if (!token || !user) return

        setRefreshing(true)
        setDashboardError('')

        try {
            const params = selectedSemester ? { semester: selectedSemester } : {}

            const [dashboardResult, calendarResult] = await Promise.all([
                fetchStudentDashboardData(params),
                fetchStudentCalendarEvents()
            ])

            if (dashboardResult.error) {
                throw new Error(dashboardResult.error)
            }

            const dashboardPayload = dashboardResult.data || {}
            const summary = dashboardPayload.summary || {}
            const subjects = Array.isArray(dashboardPayload.subjects) ? dashboardPayload.subjects : []

            const semesters = [...new Set(
                subjects
                    .map((subjectEntry) => subjectEntry?.subject?.semester)
                    .filter((semesterValue) => semesterValue !== null && semesterValue !== undefined)
            )].sort((a, b) => a - b)

            setAvailableSemesters(semesters)

            if (semesters.length > 0 && !selectedSemester) {
                const defaultSem = dashboardPayload.semester || semesters[0]
                setSelectedSemester(defaultSem)
            }

            let upcoming = []
            if (!calendarResult.error && Array.isArray(calendarResult.data)) {
                const today = new Date()
                upcoming = calendarResult.data
                    .filter((event) => {
                        const eventDate = new Date(event.event_date)
                        const diffTime = eventDate - today
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                        return diffDays >= 0 && diffDays <= 14
                    })
                    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
                    .slice(0, 5)
            }

            const courses = subjects
                .filter((subjectEntry) => subjectEntry && subjectEntry.subject)
                .map((subjectEntry) => ({
                    id: subjectEntry.subject.id,
                    name: subjectEntry.subject.name,
                    code: subjectEntry.subject.code,
                    grade: subjectEntry.grade_letter || 'N/A',
                    progress: subjectEntry.attendance?.percentage || 0,
                    attendance: subjectEntry.attendance,
                    overall_score: subjectEntry.overall_grade,
                    credits: subjectEntry.subject.credits,
                    components: subjectEntry.components,
                    semester: subjectEntry.subject.semester
                }))

            setDashboardData({
                gpa: summary.gpa || 0,
                gpa_4: summary.gpa_4 || 0,
                gpa_text: summary.gpa_text || 'N/A',
                attendance: summary.overall_attendance || 0,
                credits: summary.earned_credits || 0,
                total_credits: summary.total_credits || 0,
                courses,
                upcoming_assignments: upcoming.map((event) => ({
                    id: event.id,
                    title: event.title,
                    due: new Date(event.event_date).toLocaleDateString(),
                    status: event.type,
                    days_left: Math.ceil((new Date(event.event_date) - new Date()) / (1000 * 60 * 60 * 24))
                }))
            })

            await fetchNotifications()
            setLastUpdated(new Date())
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
            setDashboardError(error.message || 'Failed to load dashboard data')
        } finally {
            setRefreshing(false)
        }
    }, [token, user, selectedSemester, fetchNotifications])

    useEffect(() => {
        if (token && user) {
            fetchDashboardData()
        }
    }, [token, user, fetchDashboardData])

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good Morning'
        if (hour < 17) return 'Good Afternoon'
        return 'Good Evening'
    }

    const filteredCourses = selectedSemester
        ? dashboardData.courses.filter(c => c.semester === selectedSemester)
        : dashboardData.courses

    const semesterStats = selectedSemester ? (() => {
        const avgPercent = filteredCourses.length > 0
            ? (filteredCourses.reduce((sum, c) => sum + (parseFloat(c.overall_score) || 0), 0) / filteredCourses.length)
            : 0
        return {
            gpa10: Number((avgPercent / 10).toFixed(2)),
            gpa4: Number((avgPercent / 25).toFixed(2)),
            attendance: filteredCourses.length > 0
                ? Math.round(filteredCourses.reduce((sum, c) => sum + (c.attendance?.percentage || 0), 0) / filteredCourses.length)
                : 0,
            credits: filteredCourses.reduce((sum, c) => sum + (parseInt(c.credits) || 0), 0)
        }
    })() : {
        gpa10: Number(dashboardData.gpa || 0),
        gpa4: Number(dashboardData.gpa_4 || 0),
        attendance: dashboardData.attendance,
        credits: dashboardData.credits
    }

    const statCards = [
        {
            title: selectedSemester ? 'Semester GPA' : 'Current GPA',
            value: semesterStats.gpa10,
            subtitle: `Scale 10.0`,
            icon: GraduationCap,
            gradient: 'gradient-teal',
            colorAccent: '#14b8a6',
            colorAccentLight: '#ccfbf1',
            progress: (semesterStats.gpa10 / 10.0) * 100,
            trend: selectedSemester ? (semesterStats.gpa10 >= 6.0 ? 'On Track' : 'Needs Improvement') : dashboardData.gpa_text,
            trendUp: semesterStats.gpa10 >= 6.0,
            icon2: TrendingUp
        },
        {
            title: 'GPA (4.0)',
            value: semesterStats.gpa4,
            subtitle: 'US Standard',
            icon: TrendingUp,
            gradient: 'gradient-emerald',
            colorAccent: '#10b981',
            colorAccentLight: '#d1fae5',
            progress: (semesterStats.gpa4 / 4.0) * 100,
            trend: 'On Track',
            trendUp: true,
            icon2: Flame
        },
        {
            title: 'Credits',
            value: semesterStats.credits,
            subtitle: selectedSemester ? `This Semester` : 'Total Earned',
            icon: Award,
            gradient: 'gradient-cyan',
            colorAccent: '#06b6d4',
            colorAccentLight: '#cffafe',
            progress: selectedSemester
                ? (semesterStats.credits > 0 ? 100 : 0)
                : (dashboardData.credits / (dashboardData.total_credits || 1)) * 100,
            trend: 'Academic Progress',
            trendUp: true,
            icon2: Zap
        },
        {
            title: 'Pending Tasks',
            value: dashboardData.upcoming_assignments.length,
            subtitle: 'Next 14 Days',
            icon: AlertCircle,
            gradient: 'gradient-amber',
            colorAccent: '#f59e0b',
            colorAccentLight: '#fef3c7',
            progress: 100 - (dashboardData.upcoming_assignments.length * 10),
            trend: dashboardData.upcoming_assignments.length > 3 ? 'Heavy Workload' : 'Manageable',
            trendUp: dashboardData.upcoming_assignments.length <= 3,
            icon2: Target
        }
    ]

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
            <div className="dashboard-content-redesigned">
                {/* Welcome Banner */}
                {activeTab === 'overview' && (
                    <motion.div
                        className="welcome-banner-redesigned"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="banner-content">
                            <div className="welcome-section">
                                <motion.h1
                                    className="greeting-text"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.1, duration: 0.6 }}
                                >
                                    {getGreeting()}, <span className="name-highlight">{user?.full_name}</span>
                                </motion.h1>
                                <motion.p
                                    className="subtitle-text"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2, duration: 0.6 }}
                                >
                                    Your academic dashboard for {selectedSemester ? `Semester ${selectedSemester}` : 'this semester'}
                                </motion.p>
                            </div>
                            {availableSemesters.length > 0 && (
                                <motion.div
                                    className="semester-selector-redesigned"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3, duration: 0.6 }}
                                >
                                    <label htmlFor="semester-select">View Semester</label>
                                    <div className="select-wrapper-redesigned">
                                        <select
                                            id="semester-select"
                                            value={selectedSemester || ''}
                                            onChange={(e) => setSelectedSemester(Number(e.target.value))}
                                            className="semester-dropdown-redesigned"
                                        >
                                            {availableSemesters.map(sem => (
                                                <option key={sem} value={sem}>
                                                    Semester {sem}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={18} className="select-icon-redesigned" />
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Error Message */}
                <AnimatePresence>
                    {dashboardError && (
                        <motion.div
                            className="error-banner-redesigned"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <AlertCircle size={20} />
                            <p>{dashboardError}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tab Content */}
                <div className="tab-content-redesigned">
                    {activeTab === 'overview' && (
                        <>
                            {/* Stats Grid */}
                            <motion.div
                                className="stats-grid-redesigned"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2, staggerChildren: 0.1 }}
                            >
                                {statCards.map((card, index) => {
                                    const Icon = card.icon
                                    const Icon2 = card.icon2
                                    return (
                                        <motion.div
                                            key={index}
                                            className={`stat-card-redesigned ${card.gradient}`}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 + index * 0.1 }}
                                            whileHover={{ y: -8, transition: { duration: 0.3 } }}
                                        >
                                            <div className="stat-card-header">
                                                <div
                                                    className="stat-icon-circle"
                                                    style={{ backgroundColor: card.colorAccentLight, color: card.colorAccent }}
                                                >
                                                    <Icon size={24} />
                                                </div>
                                                <Icon2 className="stat-accent-icon" style={{ color: card.colorAccent }} size={18} />
                                            </div>
                                            <div className="stat-card-body">
                                                <h4 className="stat-title">{card.title}</h4>
                                                <div className="stat-value">{card.value}</div>
                                                <p className="stat-subtitle">{card.subtitle}</p>
                                                <div className="stat-progress-bar">
                                                    <div
                                                        className="progress-fill"
                                                        style={{
                                                            width: `${Math.min(card.progress, 100)}%`,
                                                            backgroundColor: card.colorAccent
                                                        }}
                                                    />
                                                </div>
                                                <div className="stat-footer">
                                                    <span className={`stat-trend ${card.trendUp ? 'positive' : 'negative'}`}>
                                                        {card.trend}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </motion.div>

                            {/* Activity & Quick Actions Row */}
                            <motion.div
                                className="content-grid-redesigned"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                <ActivityFeedRedesigned activities={notifications} />
                                <QuickActionsRedesigned setActiveTab={setActiveTab} />
                            </motion.div>

                            {/* Courses & Events Grid */}
                            <motion.div
                                className="content-grid-redesigned"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                            >
                                <div className="card-redesigned">
                                    <div className="card-header-redesigned">
                                        <BookOpen size={22} />
                                        <h3>Current Courses {selectedSemester && `(Semester ${selectedSemester})`}</h3>
                                    </div>
                                    <div className="courses-list">
                                        {filteredCourses.length === 0 ? (
                                            <div className="empty-state-redesigned">
                                                <BookOpen size={48} />
                                                <h4>No courses found</h4>
                                                <p>You don't have any courses {selectedSemester ? `in Semester ${selectedSemester}` : 'enrolled yet'}.</p>
                                            </div>
                                        ) : (
                                            filteredCourses.map((course, idx) => (
                                                <motion.div
                                                    key={course.id}
                                                    className="course-item-redesigned"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.7 + idx * 0.05 }}
                                                    whileHover={{ x: 4 }}
                                                >
                                                    <div className="course-info">
                                                        <div>
                                                            <h5>{course.name}</h5>
                                                            <p className="course-code">{course.code}</p>
                                                        </div>
                                                        <div className="course-stats">
                                                            <span className="attendance">📊 {course.attendance?.percentage || 0}%</span>
                                                        </div>
                                                    </div>
                                                    <div className={`grade-badge grade-${course.grade?.toLowerCase() || 'na'}`}>
                                                        {course.grade}
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="card-redesigned">
                                    <div className="card-header-redesigned">
                                        <Clock size={22} />
                                        <h3>Upcoming Events</h3>
                                    </div>
                                    <div className="events-list">
                                        {dashboardData.upcoming_assignments.length === 0 ? (
                                            <div className="empty-state-redesigned success">
                                                <CheckCircle size={48} />
                                                <h4>All caught up!</h4>
                                                <p>No upcoming events in the next 14 days.</p>
                                            </div>
                                        ) : (
                                            dashboardData.upcoming_assignments.map((event, idx) => (
                                                <motion.div
                                                    key={event.id}
                                                    className="event-item-redesigned"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.7 + idx * 0.05 }}
                                                    whileHover={{ x: 4 }}
                                                >
                                                    <div className="event-info">
                                                        <div>
                                                            <h5>{event.title}</h5>
                                                            <p className="event-date">Due: {event.due}</p>
                                                        </div>
                                                        <span className={`event-type ${event.status}`}>
                                                            {event.status === 'exam' ? 'Exam' :
                                                                event.status === 'assignment' ? 'Assignment' :
                                                                    event.status === 'holiday' ? 'Holiday' : 'Event'}
                                                        </span>
                                                    </div>
                                                    <div className={`days-badge days-${event.days_left === 0 ? 'critical' :
                                                        event.days_left <= 3 ? 'urgent' :
                                                            event.days_left <= 7 ? 'warning' : 'pending'
                                                        }`}>
                                                        {event.days_left === 0 ? 'Today!' :
                                                            event.days_left === 1 ? 'Tomorrow' :
                                                                `${event.days_left}d`}
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}

                    {activeTab === 'attendance' && (
                        <div className="card-redesigned">
                            <StudentAttendance />
                        </div>
                    )}

                    {activeTab === 'profile' && <StudentProfile />}
                    {activeTab === 'grades' && <div className="card-redesigned"><GradesTab selectedSemester={selectedSemester} /></div>}
                    {activeTab === 'assignments' && <div className="card-redesigned"><StudentAssignments /></div>}
                    {activeTab === 'exams' && <div className="card-redesigned"><StudentExams /></div>}
                    {activeTab === 'reports' && <div className="card-redesigned"><ReportGenerator /></div>}
                    {(activeTab === 'discussions' || activeTab === 'announcements') && <div className="card-redesigned"><AnnouncementsPage /></div>}
                    {(activeTab === 'schedule' || activeTab === 'calendar') && <div className="card-redesigned"><CalendarManagement role="student" /></div>}
                    {activeTab === 'analytics' && <Analytics />}
                    {activeTab === 'skills-map' && <div className="card-redesigned"><SkillsMap /></div>}
                    {activeTab === 'career-fit' && <div className="card-redesigned"><CareerFit /></div>}
                    {activeTab === 'course-picks' && <div className="card-redesigned"><CoursePicks /></div>}
                    {activeTab === 'study-planner' && <div className="card-redesigned"><StudyPlanner /></div>}
                    {activeTab === 'performance' && <div className="card-redesigned"><Performance /></div>}
                    {activeTab === 'submissions' && <div className="card-redesigned"><Submissions /></div>}
                    {activeTab === 'difficulty' && <div className="card-redesigned"><Difficulty /></div>}
                    {activeTab === 'badges' && <div className="card-redesigned"><Badges /></div>}
                </div>
            </div>
        </MainLayout>
    )
}

export default StudentDashboard
