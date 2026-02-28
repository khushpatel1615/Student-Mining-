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

    ChevronDown
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
import QuickActions from '../components/Student/Overview/QuickActions'
import ActivityFeed from '../components/Student/Overview/ActivityFeed'
import './StudentDashboard.css'

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
    const [dashboardError, setDashboardError] = useState('')




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
        const { data, error } = await fetchStudentNotifications(10)
        if (error) {
            console.error('Failed to fetch notifications:', error)
            return
        }

        setNotifications(data?.notifications || [])
        setUnreadCount(data?.unread_count || 0)
    }, [])

    // Mark as read
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

    // Fetch dashboard data on mount and when token/user become available
    useEffect(() => {
        if (token && user) {
            fetchDashboardData()
        }
    }, [token, user, fetchDashboardData])



    const getProgressColor = (gradient) => {
        switch (gradient) {
            case 'gradient-purple': return '#6366f1'
            case 'gradient-blue': return '#3b82f6'
            case 'gradient-green': return '#22c55e'
            case 'gradient-orange': return '#f97316'
            default: return '#6366f1'
        }
    }

    // Stats Cards Logic has been moved inline into the main render for better semester integration

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
    const semesterStats = selectedSemester ? (() => {
        // Standardized GPA mappings (must match backend gpa_helpers.php)
        const pctToGPA10 = (pct) => {
            if (pct >= 90) return 10.0;
            if (pct >= 80) return 9.0;
            if (pct >= 70) return 8.0;
            if (pct >= 60) return 7.0;
            if (pct >= 50) return 6.0;
            if (pct >= 40) return 5.0;
            return 0.0;
        };
        const pctToGPA4 = (pct) => {
            if (pct >= 90) return 4.0;
            if (pct >= 80) return 3.7;
            if (pct >= 70) return 3.3;
            if (pct >= 60) return 3.0;
            if (pct >= 50) return 2.0;
            if (pct >= 40) return 1.0;
            return 0.0;
        };

        let gpa10Points = 0, gpa4Points = 0, totalCredits = 0;
        filteredCourses.forEach(c => {
            const score = parseFloat(c.overall_score) || 0;
            const credits = parseInt(c.credits) || 3;
            if (score > 0) {
                gpa10Points += pctToGPA10(score) * credits;
                gpa4Points += pctToGPA4(score) * credits;
                totalCredits += credits;
            }
        });

        return {
            gpa10: totalCredits > 0 ? Number((gpa10Points / totalCredits).toFixed(2)) : 0,
            gpa4: totalCredits > 0 ? Number((gpa4Points / totalCredits).toFixed(2)) : 0,
            attendance: filteredCourses.length > 0
                ? Math.round(filteredCourses.reduce((sum, c) => sum + (c.attendance?.percentage || 0), 0) / filteredCourses.length)
                : 0,
            credits: filteredCourses.reduce((sum, c) => sum + (parseInt(c.credits) || 0), 0)
        };
    })() : {
        gpa10: Number(dashboardData.gpa || 0),
        gpa4: Number(dashboardData.gpa_4 || 0),
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
                {activeTab === 'overview' && (
                    <div className="welcome-banner">
                        <div className="welcome-content">
                            <div className="welcome-text">
                                <h1>
                                    {getGreeting()}, <span style={{ whiteSpace: 'nowrap' }}>{user?.full_name}!</span>
                                    <span style={{ display: 'inline-block', marginLeft: '8px' }}>Hi</span>
                                </h1>
                                <p>Here's your academic summary{selectedSemester ? ` for Semester ${selectedSemester}` : ' for the semester'}.</p>
                            </div>
                            {availableSemesters.length > 0 && (
                                <div className="semester-selector">
                                    <label htmlFor="semester-select" style={{ color: '#374151', fontWeight: 600 }}>View Semester:</label>
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
                )}

                {/* Tab Content */}
                <div className="tab-content">
                    {dashboardError && (
                        <div className="card" style={{ borderLeft: '4px solid #ef4444', marginBottom: '1rem' }}>
                            <p style={{ margin: 0, color: '#991b1b', fontWeight: 500 }}>
                                {dashboardError}
                            </p>
                        </div>
                    )}

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
                                            value: semesterStats.gpa10,
                                            subtitle: `Scale 10.0`,
                                            icon: GraduationCap,
                                            gradient: 'gradient-purple',
                                            progress: (semesterStats.gpa10 / 10.0) * 100,
                                            trend: selectedSemester ? (semesterStats.gpa10 >= 6.0 ? 'On Track' : 'Needs Improvement') : dashboardData.gpa_text,
                                            trendUp: semesterStats.gpa10 >= 6.0
                                        },
                                        {
                                            title: 'GPA (4.0)',
                                            value: semesterStats.gpa4,
                                            subtitle: 'US Standard',
                                            icon: TrendingUp,
                                            gradient: 'gradient-green',
                                            progress: (semesterStats.gpa4 / 4.0) * 100,
                                            trend: 'On Track',
                                            trendUp: true
                                        },
                                        {
                                            title: 'Credits',
                                            value: semesterStats.credits,
                                            subtitle: selectedSemester ? `This Semester` : 'Total Earned',
                                            icon: Award,
                                            gradient: 'gradient-blue',
                                            progress: selectedSemester
                                                ? (semesterStats.credits > 0 ? 100 : 0)
                                                : (dashboardData.credits / (dashboardData.total_credits || 1)) * 100,
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
                                <ActivityFeed activities={notifications} />
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
                                                                {item.status === 'exam' ? 'Exam' :
                                                                    item.status === 'assignment' ? 'Assignment' :
                                                                        item.status === 'holiday' ? 'Holiday' : 'Event'}
                                                            </span>
                                                        </div>
                                                        <div className="item-meta">Due: {item.due}</div>
                                                    </div>
                                                    <div className={`badge urgency-badge ${item.days_left === 0 ? 'critical' :
                                                        item.days_left <= 3 ? 'urgent' :
                                                            item.days_left <= 7 ? 'warning' : 'pending'
                                                        }`}>
                                                        {item.days_left === 0 ? 'Today!' :
                                                            item.days_left === 1 ? 'Tomorrow' :
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

                    {activeTab === 'analytics' && (
                        <Analytics />
                    )}

                    {activeTab === 'skills-map' && (
                        <div className="card">
                            <SkillsMap />
                        </div>
                    )}

                    {activeTab === 'career-fit' && (
                        <div className="card">
                            <CareerFit />
                        </div>
                    )}

                    {activeTab === 'course-picks' && (
                        <div className="card">
                            <CoursePicks />
                        </div>
                    )}

                    {activeTab === 'study-planner' && (
                        <div className="card">
                            <StudyPlanner />
                        </div>
                    )}

                    {activeTab === 'performance' && (
                        <div className="card">
                            <Performance />
                        </div>
                    )}

                    {activeTab === 'submissions' && (
                        <div className="card">
                            <Submissions />
                        </div>
                    )}

                    {activeTab === 'difficulty' && (
                        <div className="card">
                            <Difficulty />
                        </div>
                    )}

                    {activeTab === 'badges' && (
                        <div className="card">
                            <Badges />
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    )
}

export default StudentDashboard
