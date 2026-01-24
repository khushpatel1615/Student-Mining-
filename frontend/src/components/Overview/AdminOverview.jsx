import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js'
import {
    Users,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Calendar,
    Clock,
    Activity,
    BookOpen,
    GraduationCap,
    UserPlus,
    FileText,
    Mail,
    Download,
    Bell,
    CheckCircle,
    XCircle,
    ArrowRight,
    Zap,
    Award,
    Target,
    BarChart3,
    PieChart,
    Lightbulb,
    AlertCircle,
    RefreshCw,
    X
} from 'lucide-react'
import './AdminOverview.css'

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

// Safe number formatter to prevent crashes on undefined/null/NaN values
const safeToFixed = (value, decimals = 2) => {
    const num = Number(value)
    return isNaN(num) ? (0).toFixed(decimals) : num.toFixed(decimals)
}

function AdminOverview() {
    const { token } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    // Dashboard Data States
    const [systemStats, setSystemStats] = useState({
        totalStudents: 0,
        totalTeachers: 0,
        totalPrograms: 0,
        totalSubjects: 0,
        averageGPA: 0,
        attendanceRate: 0,
        atRiskCount: 0,
        engagementScore: 0,
        passRate: 0,
        pendingActions: 0
    })

    const [upcomingEvents, setUpcomingEvents] = useState([])
    const [recentActivity, setRecentActivity] = useState([])
    const [alerts, setAlerts] = useState([])
    const [topStudents, setTopStudents] = useState([])
    const [atRiskStudents, setAtRiskStudents] = useState([])
    const [performanceData, setPerformanceData] = useState(null)
    const [attendanceData, setAttendanceData] = useState(null)
    const [semesterTrends, setSemesterTrends] = useState([])
    const [programStats, setProgramStats] = useState([])

    // Detail Modal State
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [detailModalType, setDetailModalType] = useState(null) // 'students', 'gpa', 'attendance', 'at-risk', 'engagement'

    // Student Profile Modal State
    const [showStudentProfile, setShowStudentProfile] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [showMeetingForm, setShowMeetingForm] = useState(false)
    const [meetingData, setMeetingData] = useState({
        title: '',
        date: '',
        time: '',
        duration: '30',
        message: ''
    })
    const [sendingMeeting, setSendingMeeting] = useState(false)

    // Get current date info
    const today = new Date()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December']
    const currentDay = dayNames[today.getDay()]
    const currentDate = `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`

    // Fetch all dashboard data
    const fetchDashboardData = useCallback(async () => {
        setRefreshing(true)
        try {
            // Fetch analytics data
            const analyticsRes = await fetch(`${API_BASE}/analytics/admin.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const analyticsData = await analyticsRes.json()

            if (analyticsData.success) {
                const {
                    system_overview = {},
                    performance_distribution = {}, // Default to object
                    at_risk_students = [],
                    program_analytics = [],
                    semester_trends = []
                } = analyticsData.data || {}

                setSystemStats(prev => ({
                    ...prev,
                    totalStudents: system_overview?.total_students || 0,
                    totalPrograms: system_overview?.total_programs || 0,
                    totalSubjects: system_overview?.total_subjects || 0,
                    totalTeachers: system_overview?.total_teachers || 0,
                    averageGPA: Number(system_overview?.system_gpa || 0),
                    passRate: Number(system_overview?.pass_rate || 0),
                    atRiskCount: at_risk_students?.length || 0,
                    engagementScore: Number(system_overview?.engagement_score || 0),
                    pendingActions: Number(system_overview?.pending_actions || 0)
                }))

                setPerformanceData(performance_distribution)
                setSemesterTrends(semester_trends || [])
                setProgramStats(program_analytics || [])
                setTopStudents(at_risk_students?.slice(0, 5) || [])
                setAtRiskStudents(at_risk_students || [])
            }

            // Fetch calendar events (with error handling to prevent crash)
            try {
                const eventsRes = await fetch(`${API_BASE}/calendar.php`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const eventsData = await eventsRes.json()
                if (eventsData.success && Array.isArray(eventsData.data)) {
                    // Get upcoming events (next 7 days)
                    const upcoming = eventsData.data
                        .filter(e => e && new Date(e.event_date) >= today)
                        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
                        .slice(0, 5)
                    setUpcomingEvents(upcoming)
                }
            } catch (calendarErr) {
                console.error('Calendar API error (non-critical):', calendarErr)
                // Set empty events if calendar fails - don't crash the whole dashboard
                setUpcomingEvents([])
            }

            // Fetch recent notifications/activity
            const notifRes = await fetch(`${API_BASE}/notifications.php?limit=8`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const notifData = await notifRes.json()
            if (notifData.success) {
                setRecentActivity(Array.isArray(notifData.data) ? notifData.data : [])
            }

            // Calculate additional stats (ensure numbers)
            // Ensure averageGPA is a number 
            setSystemStats(prev => ({
                ...prev,
                averageGPA: Number(prev.averageGPA || 0)
            }))

            // Generate insights/alerts safely
            if (analyticsData.data) {
                generateAlerts(analyticsData.data)
            }

        } catch (err) {
            console.error('Failed to fetch dashboard data:', err)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [token])

    // Generate smart alerts based on data
    const generateAlerts = (data) => {
        const newAlerts = []

        try {
            if (data?.at_risk_students?.length > 0) {
                newAlerts.push({
                    id: 1,
                    type: 'warning',
                    icon: AlertTriangle,
                    title: `${data.at_risk_students.length} students need attention`,
                    description: 'Students with GPA below 2.0 require intervention',
                    action: 'View Students',
                    actionPath: '/admin/dashboard?tab=students'
                })
            }

            if (data?.subject_difficulty?.length > 0) {
                const hardestSubject = data.subject_difficulty[0]
                const avgGrade = Number(hardestSubject?.average_grade || 0)
                newAlerts.push({
                    id: 2,
                    type: 'info',
                    icon: Lightbulb,
                    title: `${hardestSubject?.name || 'Subject'} has lowest average`,
                    description: `Average grade: ${avgGrade.toFixed(1)}% - Consider additional support`,
                    action: 'View Subject',
                    actionPath: '/admin/dashboard?tab=subjects'
                })
            }

            if (data?.program_analytics?.length > 0) {
                const topProgram = data.program_analytics.reduce((a, b) =>
                    Number(a?.pass_rate || 0) > Number(b?.pass_rate || 0) ? a : b
                    , data.program_analytics[0])

                if (topProgram) {
                    const passRate = Number(topProgram.pass_rate || 0)
                    newAlerts.push({
                        id: 3,
                        type: 'success',
                        icon: Award,
                        title: `${topProgram.name || 'Program'} leads with ${passRate.toFixed(1)}% pass rate`,
                        description: 'Best performing program this semester',
                        action: 'View Analytics',
                        actionPath: '/admin/dashboard?tab=analytics'
                    })
                }
            }
        } catch (e) {
            console.error("Error generating alerts:", e)
        }

        setAlerts(newAlerts)
    }

    useEffect(() => {
        fetchDashboardData()
    }, [fetchDashboardData])

    // Chart configurations
    const getGPATrendChart = () => {
        if (!semesterTrends.length) return null
        return {
            labels: semesterTrends.map(s => `Sem ${s.semester}`),
            datasets: [{
                label: 'Average GPA',
                data: semesterTrends.map(s => s.average_gpa),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        }
    }

    const getPerformanceChart = () => {
        if (!performanceData) return null
        return {
            labels: ['Excellent', 'Good', 'Average', 'Below Avg', 'At Risk'],
            datasets: [{
                data: [
                    performanceData.excellent || 0,
                    performanceData.good || 0,
                    performanceData.average || 0,
                    performanceData.below_average || 0,
                    performanceData.at_risk || 0
                ],
                backgroundColor: [
                    '#10b981',
                    '#3b82f6',
                    '#f59e0b',
                    '#f97316',
                    '#ef4444'
                ],
                borderWidth: 0,
                cutout: '70%'
            }]
        }
    }



    // Quick Actions Handler
    const handleQuickAction = (action) => {
        switch (action) {
            case 'add-student':
                navigate('/admin/dashboard?tab=students&action=add')
                break
            case 'generate-report':
                navigate('/admin/dashboard?tab=analytics')
                break
            case 'send-announcement':
                // navigate('/admin/dashboard?tab=calendar')
                // Better to go to notifications if it exists, but calendar is where we create events/announcements
                navigate('/admin/dashboard?tab=calendar')
                break
            case 'import-data':
                // Redirect to students page with import action
                navigate('/admin/dashboard?tab=students&action=import')
                break
            case 'view-alerts':
                navigate('/admin/dashboard?tab=students')
                break
            default:
                break
        }
    }

    // KPI Card Click Handler
    const handleKPIClick = (type) => {
        switch (type) {
            case 'students':
                navigate('/admin/dashboard?tab=students')
                break
            case 'gpa':
                setDetailModalType('gpa')
                setShowDetailModal(true)
                break

            case 'at-risk':
                setDetailModalType('at-risk')
                setShowDetailModal(true)
                break
            case 'programs':
                navigate('/admin/dashboard?tab=programs')
                break
            case 'engagement':
                setDetailModalType('engagement')
                setShowDetailModal(true)
                break
            default:
                break
        }
    }

    const closeDetailModal = () => {
        setShowDetailModal(false)
        setDetailModalType(null)
    }

    // Open student profile
    const openStudentProfile = (student) => {
        setSelectedStudent(student)
        setShowStudentProfile(true)
        setShowMeetingForm(false)
        setMeetingData({
            title: `Meeting with ${student.name}`,
            date: '',
            time: '',
            duration: '30',
            message: ''
        })
    }

    const closeStudentProfile = () => {
        setShowStudentProfile(false)
        setSelectedStudent(null)
        setShowMeetingForm(false)
    }

    // Handle meeting scheduling
    const handleScheduleMeeting = async (e) => {
        e.preventDefault()
        if (!selectedStudent) return

        setSendingMeeting(true)
        try {
            // Try to create calendar event (optional - don't fail if this doesn't work)
            try {
                await fetch(`${API_BASE}/calendar.php`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: meetingData.title,
                        description: meetingData.message || `Meeting scheduled with ${selectedStudent.name}`,
                        event_date: meetingData.date,
                        type: 'event',
                        target_audience: 'students'
                    })
                })
            } catch (calErr) {
                console.log('Calendar event creation optional, continuing...', calErr)
            }

            // Send notification to the student - this is the main feature
            const notifResponse = await fetch(`${API_BASE}/notifications.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: selectedStudent.user_id || selectedStudent.id,
                    title: 'Meeting Request',
                    message: `Admin has scheduled a meeting: "${meetingData.title}" on ${new Date(meetingData.date).toLocaleDateString()} at ${meetingData.time}. Duration: ${meetingData.duration} mins. ${meetingData.message ? `Note: ${meetingData.message}` : ''} Please confirm or suggest a different time.`,
                    type: 'meeting_request'
                })
            })

            const notifData = await notifResponse.json()

            if (notifData.success) {
                alert(`Meeting request sent to ${selectedStudent.name}! They will receive a notification to accept or suggest a new time.`)
                setShowMeetingForm(false)
                setMeetingData({
                    title: '',
                    date: '',
                    time: '',
                    duration: '30',
                    message: ''
                })
            } else {
                console.error('Notification error:', notifData)
                alert(notifData.error || 'Failed to send meeting request. Please check if the student exists.')
            }
        } catch (err) {
            console.error('Error scheduling meeting:', err)
            alert('Failed to schedule meeting. Network error - please check your connection.')
        } finally {
            setSendingMeeting(false)
        }
    }

    // Format time ago
    const formatTimeAgo = (dateStr) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        return `${diffDays}d ago`
    }

    // Get event type color
    const getEventTypeColor = (type) => {
        const colors = {
            exam: '#ef4444',
            deadline: '#f59e0b',
            holiday: '#10b981',
            event: '#6366f1',
            assignment: '#8b5cf6'
        }
        return colors[type] || '#6366f1'
    }

    if (loading) {
        return (
            <div className="overview-loading">
                <div className="loading-spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        )
    }

    return (
        <div className="admin-overview">
            {/* Executive Summary Header */}
            <div className="executive-summary">
                <div className="summary-left">
                    <div className="date-display">
                        <Calendar size={20} />
                        <div>
                            <span className="day-name">{currentDay}</span>
                            <span className="full-date">{currentDate}</span>
                        </div>
                    </div>
                    <div className="system-status">
                        <span className="status-dot online"></span>
                        <span>System Online</span>
                    </div>
                </div>
                <div className="summary-right">
                    <button
                        className="refresh-btn"
                        onClick={fetchDashboardData}
                        disabled={refreshing}
                    >
                        <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
                        {refreshing ? 'Refreshing...' : 'Refresh Data'}
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="kpi-grid">
                <div className="kpi-card students clickable" onClick={() => handleKPIClick('students')}>
                    <div className="kpi-icon">
                        <Users size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Total Students</span>
                        <span className="kpi-value">{systemStats.totalStudents}</span>
                        <div className="kpi-trend positive">
                            <TrendingUp size={14} />
                            <span>+12 this semester</span>
                        </div>
                    </div>
                </div>

                <div className="kpi-card gpa clickable" onClick={() => handleKPIClick('gpa')}>
                    <div className="kpi-icon">
                        <TrendingUp size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Average GPA</span>
                        <span className="kpi-value">{safeToFixed(systemStats.averageGPA, 2)}</span>
                        <div className="kpi-trend positive">
                            <TrendingUp size={14} />
                            <span>+0.15 improvement</span>
                        </div>
                    </div>
                </div>



                <div className="kpi-card at-risk clickable" onClick={() => handleKPIClick('at-risk')}>
                    <div className="kpi-icon">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">At-Risk Students</span>
                        <span className="kpi-value">{systemStats.atRiskCount}</span>
                        <div className={`kpi-trend ${systemStats.atRiskCount > 0 ? 'negative' : 'positive'}`}>
                            {systemStats.atRiskCount > 0 ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                            <span>{systemStats.atRiskCount > 0 ? 'Needs attention' : 'All on track'}</span>
                        </div>
                    </div>
                </div>

                <div className="kpi-card programs clickable" onClick={() => handleKPIClick('programs')}>
                    <div className="kpi-icon">
                        <GraduationCap size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Programs</span>
                        <span className="kpi-value">{systemStats.totalPrograms}</span>
                        <div className="kpi-trend neutral">
                            <BookOpen size={14} />
                            <span>{systemStats.totalSubjects} subjects</span>
                        </div>
                    </div>
                </div>

                <div className="kpi-card engagement clickable" onClick={() => handleKPIClick('engagement')}>
                    <div className="kpi-icon">
                        <Activity size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Engagement Score</span>
                        <span className="kpi-value">{systemStats.engagementScore}%</span>
                        <div className="kpi-trend positive">
                            <Zap size={14} />
                            <span>High activity</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions-section">
                <h3 className="section-title">Quick Actions</h3>
                <div className="quick-actions-grid">
                    <button className="quick-action-btn" onClick={() => handleQuickAction('add-student')}>
                        <UserPlus size={20} />
                        <span>Add Student</span>
                    </button>
                    <button className="quick-action-btn" onClick={() => handleQuickAction('generate-report')}>
                        <FileText size={20} />
                        <span>Generate Report</span>
                    </button>
                    <button className="quick-action-btn" onClick={() => handleQuickAction('send-announcement')}>
                        <Mail size={20} />
                        <span>Send Announcement</span>
                    </button>
                    <button className="quick-action-btn" onClick={() => handleQuickAction('import-data')}>
                        <Download size={20} />
                        <span>Import Data</span>
                    </button>
                    <button className="quick-action-btn alert" onClick={() => handleQuickAction('view-alerts')}>
                        <Bell size={20} />
                        <span>View Alerts</span>
                        {systemStats.atRiskCount > 0 && (
                            <span className="action-badge">{systemStats.atRiskCount}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-grid">
                {/* Charts Section */}
                <div className="charts-row">
                    {/* GPA Trend Chart */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3><BarChart3 size={18} /> GPA Trend</h3>
                            <span className="chart-subtitle">Last 8 semesters</span>
                        </div>
                        <div className="chart-body">
                            {getGPATrendChart() && (
                                <Line
                                    data={getGPATrendChart()}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false }
                                        },
                                        scales: {
                                            y: {
                                                min: 0,
                                                max: 4,
                                                grid: { color: 'rgba(0,0,0,0.05)' }
                                            },
                                            x: {
                                                grid: { display: false }
                                            }
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Performance Distribution */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3><PieChart size={18} /> Performance Distribution</h3>
                            <span className="chart-subtitle">Student grades breakdown</span>
                        </div>
                        <div className="chart-body doughnut-chart">
                            {getPerformanceChart() && (
                                <Doughnut
                                    data={getPerformanceChart()}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                position: 'right',
                                                labels: {
                                                    padding: 15,
                                                    usePointStyle: true,
                                                    font: { size: 12 }
                                                }
                                            }
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </div>


                </div>

                {/* Lower Section - 3 Columns */}
                <div className="info-row">
                    {/* Alerts & Insights */}
                    <div className="info-card alerts-card">
                        <div className="card-header">
                            <h3><Lightbulb size={18} /> Insights & Alerts</h3>
                        </div>
                        <div className="card-body">
                            {alerts.length === 0 ? (
                                <div className="empty-state">
                                    <CheckCircle size={32} />
                                    <p>All systems running smoothly</p>
                                </div>
                            ) : (
                                <div className="alerts-list">
                                    {alerts.map(alert => {
                                        const Icon = alert.icon
                                        return (
                                            <div key={alert.id} className={`alert-item ${alert.type}`}>
                                                <div className="alert-icon">
                                                    <Icon size={18} />
                                                </div>
                                                <div className="alert-content">
                                                    <h4>{alert.title}</h4>
                                                    <p>{alert.description}</p>
                                                </div>
                                                <button
                                                    className="alert-action"
                                                    onClick={() => navigate(alert.actionPath)}
                                                >
                                                    <ArrowRight size={16} />
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upcoming Events */}
                    <div className="info-card events-card">
                        <div className="card-header">
                            <h3><Calendar size={18} /> Upcoming Events</h3>
                            <button
                                className="view-all-btn"
                                onClick={() => navigate('/admin/dashboard?tab=calendar')}
                            >
                                View All
                            </button>
                        </div>
                        <div className="card-body">
                            {upcomingEvents.length === 0 ? (
                                <div className="empty-state">
                                    <Calendar size={32} />
                                    <p>No upcoming events</p>
                                </div>
                            ) : (
                                <div className="events-list">
                                    {upcomingEvents.map(event => (
                                        <div key={event.id} className="event-item">
                                            <div
                                                className="event-indicator"
                                                style={{ backgroundColor: getEventTypeColor(event.type) }}
                                            ></div>
                                            <div className="event-content">
                                                <h4>{event.title}</h4>
                                                <span className="event-date">
                                                    {new Date(event.event_date).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                            <span className={`event-type type-${event.type}`}>
                                                {event.type}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="info-card activity-card">
                        <div className="card-header">
                            <h3><Activity size={18} /> Recent Activity</h3>
                        </div>
                        <div className="card-body">
                            {recentActivity.length === 0 ? (
                                <div className="empty-state">
                                    <Activity size={32} />
                                    <p>No recent activity</p>
                                </div>
                            ) : (
                                <div className="activity-list">
                                    {recentActivity.slice(0, 6).map(activity => (
                                        <div key={activity.id} className="activity-item">
                                            <div className="activity-icon">
                                                <Bell size={14} />
                                            </div>
                                            <div className="activity-content">
                                                <p>{activity.message || activity.title}</p>
                                                <span className="activity-time">
                                                    {formatTimeAgo(activity.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Program Performance Row */}
                <div className="programs-row">
                    <div className="info-card programs-card">
                        <div className="card-header">
                            <h3><GraduationCap size={18} /> Program Performance</h3>
                            <button
                                className="view-all-btn"
                                onClick={() => navigate('/admin/dashboard?tab=programs')}
                            >
                                View All
                            </button>
                        </div>
                        <div className="card-body">
                            <div className="programs-grid">
                                {programStats.slice(0, 4).map(program => (
                                    <div key={program.id} className="program-stat-card">
                                        <div className="program-header">
                                            <span className="program-code">{program.code}</span>
                                            <span className="program-name">{program.name}</span>
                                        </div>
                                        <div className="program-metrics">
                                            <div className="metric">
                                                <span className="metric-value">{program.student_count}</span>
                                                <span className="metric-label">Students</span>
                                            </div>
                                            <div className="metric">
                                                <span className="metric-value">{program.average_gpa?.toFixed(2) || 'N/A'}</span>
                                                <span className="metric-label">Avg GPA</span>
                                            </div>
                                            <div className="metric">
                                                <span className={`metric-value ${program.pass_rate >= 80 ? 'good' : program.pass_rate >= 60 ? 'average' : 'poor'}`}>
                                                    {program.pass_rate?.toFixed(0) || 0}%
                                                </span>
                                                <span className="metric-label">Pass Rate</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detail Modals */}
            {showDetailModal && (
                <div className="detail-modal-overlay" onClick={closeDetailModal}>
                    <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="detail-modal-header">
                            <h2>
                                {detailModalType === 'gpa' && 'GPA Analytics'}
                                {detailModalType === 'attendance' && 'Attendance Analysis'}
                                {detailModalType === 'at-risk' && 'At-Risk Students'}
                                {detailModalType === 'engagement' && 'Engagement Metrics'}
                            </h2>
                            <button className="modal-close-btn" onClick={closeDetailModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="detail-modal-body">
                            {/* GPA Modal Content */}
                            {detailModalType === 'gpa' && (
                                <div className="gpa-detail-content">
                                    <div className="detail-stats-row">
                                        <div className="detail-stat-card">
                                            <span className="detail-stat-value">{safeToFixed(systemStats.averageGPA, 2)}</span>
                                            <span className="detail-stat-label">Overall GPA</span>
                                        </div>
                                        <div className="detail-stat-card">
                                            <span className="detail-stat-value">{safeToFixed(systemStats.passRate, 1)}%</span>
                                            <span className="detail-stat-label">Pass Rate</span>
                                        </div>
                                        <div className="detail-stat-card">
                                            <span className="detail-stat-value">{performanceData?.excellent || 0}</span>
                                            <span className="detail-stat-label">Excellent Students</span>
                                        </div>
                                    </div>
                                    <div className="detail-charts-grid">
                                        <div className="detail-chart-card">
                                            <h4>GPA Trend Over Semesters</h4>
                                            <div className="detail-chart-body">
                                                {getGPATrendChart() && (
                                                    <Line
                                                        data={getGPATrendChart()}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            plugins: { legend: { display: false } },
                                                            scales: {
                                                                y: { min: 0, max: 4 },
                                                                x: { grid: { display: false } }
                                                            }
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <div className="detail-chart-card">
                                            <h4>Performance Distribution</h4>
                                            <div className="detail-chart-body doughnut">
                                                {getPerformanceChart() && (
                                                    <Doughnut
                                                        data={getPerformanceChart()}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            plugins: {
                                                                legend: {
                                                                    position: 'bottom',
                                                                    labels: { padding: 15, usePointStyle: true }
                                                                }
                                                            }
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Attendance Modal Content */}
                            {detailModalType === 'attendance' && (
                                <div className="attendance-detail-content">
                                    <div className="detail-stats-row">
                                        <div className="detail-stat-card">
                                            <span className="detail-stat-value">{systemStats.attendanceRate}%</span>
                                            <span className="detail-stat-label">Overall Rate</span>
                                        </div>
                                        <div className="detail-stat-card">
                                            <span className="detail-stat-value">95%</span>
                                            <span className="detail-stat-label">Best Day (Wed)</span>
                                        </div>
                                        <div className="detail-stat-card">
                                            <span className="detail-stat-value">85%</span>
                                            <span className="detail-stat-label">Lowest Day (Fri)</span>
                                        </div>
                                    </div>
                                    <div className="detail-chart-full">
                                        <h4>Weekly Attendance Pattern</h4>
                                        <div className="detail-chart-body-large">
                                            <Bar
                                                data={getAttendanceChart()}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: { legend: { display: false } },
                                                    scales: {
                                                        y: { min: 0, max: 100 },
                                                        x: { grid: { display: false } }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="attendance-insights">
                                        <div className="insight-item positive">
                                            <CheckCircle size={18} />
                                            <span>Attendance is up 2.3% compared to last week</span>
                                        </div>
                                        <div className="insight-item warning">
                                            <AlertTriangle size={18} />
                                            <span>Friday attendance needs improvement</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* At-Risk Students Modal Content */}
                            {detailModalType === 'at-risk' && (
                                <div className="at-risk-detail-content">
                                    <div className="detail-stats-row">
                                        <div className="detail-stat-card warning">
                                            <span className="detail-stat-value">{atRiskStudents.length}</span>
                                            <span className="detail-stat-label">Total At-Risk</span>
                                        </div>
                                        <div className="detail-stat-card">
                                            <span className="detail-stat-value">&lt; 2.0</span>
                                            <span className="detail-stat-label">GPA Threshold</span>
                                        </div>
                                        <div className="detail-stat-card success">
                                            <span className="detail-stat-value">{systemStats.totalStudents - atRiskStudents.length}</span>
                                            <span className="detail-stat-label">On Track</span>
                                        </div>
                                    </div>
                                    <div className="at-risk-students-list">
                                        <h4>Students Requiring Intervention</h4>
                                        {atRiskStudents.length === 0 ? (
                                            <div className="empty-at-risk">
                                                <CheckCircle size={48} />
                                                <p>All students are performing well!</p>
                                            </div>
                                        ) : (
                                            <div className="students-table">
                                                <div className="table-header">
                                                    <span>Student Name</span>
                                                    <span>GPA</span>
                                                    <span>Status</span>
                                                    <span>Action</span>
                                                </div>
                                                {atRiskStudents.map(student => (
                                                    <div key={student.id} className="table-row">
                                                        <span className="student-name">{student.name}</span>
                                                        <span className={`gpa-value ${student.gpa < 1.5 ? 'critical' : 'warning'}`}>
                                                            {safeToFixed(student.gpa, 2)}
                                                        </span>
                                                        <span className={`status-badge ${student.tier?.replace('_', '-')}`}>
                                                            {student.tier?.replace('_', ' ')}
                                                        </span>
                                                        <button
                                                            className="action-btn"
                                                            onClick={() => {
                                                                closeDetailModal()
                                                                navigate(`/admin/student/${student.user_id || student.id}`)
                                                            }}
                                                        >
                                                            View Profile
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Engagement Modal Content */}
                            {detailModalType === 'engagement' && (
                                <div className="engagement-detail-content">
                                    <div className="detail-stats-row">
                                        <div className="detail-stat-card">
                                            <span className="detail-stat-value">{systemStats.engagementScore}%</span>
                                            <span className="detail-stat-label">Overall Score</span>
                                        </div>
                                        <div className="detail-stat-card">
                                            <span className="detail-stat-value">85%</span>
                                            <span className="detail-stat-label">Active Users (30d)</span>
                                        </div>
                                        <div className="detail-stat-card">
                                            <span className="detail-stat-value">4.2</span>
                                            <span className="detail-stat-label">Avg Logins/Week</span>
                                        </div>
                                    </div>
                                    <div className="detail-chart-full">
                                        <h4>Login Activity (Last 7 Days)</h4>
                                        <div className="detail-chart-body-large">
                                            <Bar
                                                data={{
                                                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                                                    datasets: [{
                                                        label: 'Logins',
                                                        data: [245, 312, 289, 278, 256, 89, 42],
                                                        backgroundColor: 'rgba(236, 72, 153, 0.8)',
                                                        borderRadius: 8
                                                    }]
                                                }}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: { legend: { display: false } },
                                                    scales: {
                                                        y: { min: 0 },
                                                        x: { grid: { display: false } }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="engagement-insights">
                                        <div className="insight-item positive">
                                            <Zap size={18} />
                                            <span>Peak activity on Tuesday with 312 logins</span>
                                        </div>
                                        <div className="insight-item neutral">
                                            <Activity size={18} />
                                            <span>Weekend activity is lower as expected</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Student Profile Modal */}
            {showStudentProfile && selectedStudent && (
                <div className="detail-modal-overlay" onClick={closeStudentProfile}>
                    <div className="detail-modal student-profile-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="detail-modal-header">
                            <h2>Student Profile</h2>
                            <button className="modal-close-btn" onClick={closeStudentProfile}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="detail-modal-body">
                            {/* Student Info */}
                            <div className="student-profile-header">
                                <div className="student-avatar-large">
                                    {selectedStudent.name?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="student-info-main">
                                    <h3>{selectedStudent.name}</h3>
                                    <p className="student-email">{selectedStudent.email || 'No email available'}</p>
                                    <div className="student-badges">
                                        <span className={`status-badge ${selectedStudent.gpa < 1.5 ? 'critical' : selectedStudent.gpa < 2.0 ? 'at-risk' : 'good'}`}>
                                            GPA: {selectedStudent.gpa?.toFixed(2) || 'N/A'}
                                        </span>
                                        <span className={`status-badge ${selectedStudent.tier?.replace('_', '-')}`}>
                                            {selectedStudent.tier?.replace('_', ' ') || 'Student'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Academic Summary */}
                            <div className="profile-section">
                                <h4>Academic Summary</h4>
                                <div className="profile-stats-grid">
                                    <div className="profile-stat">
                                        <span className="stat-value">{selectedStudent.gpa?.toFixed(2) || 'N/A'}</span>
                                        <span className="stat-label">Current GPA</span>
                                    </div>
                                    <div className="profile-stat">
                                        <span className="stat-value">{selectedStudent.tier?.replace('_', ' ') || 'N/A'}</span>
                                        <span className="stat-label">Performance Tier</span>
                                    </div>
                                    <div className="profile-stat">
                                        <span className="stat-value warning">{selectedStudent.gpa < 2.0 ? 'Yes' : 'No'}</span>
                                        <span className="stat-label">Needs Attention</span>
                                    </div>
                                </div>
                            </div>

                            {/* Schedule Meeting Section */}
                            <div className="profile-section meeting-section">
                                <div className="section-header">
                                    <h4><Calendar size={18} /> Schedule a Meeting</h4>
                                    {!showMeetingForm && (
                                        <button
                                            className="btn-schedule-meeting"
                                            onClick={() => setShowMeetingForm(true)}
                                        >
                                            <Calendar size={16} />
                                            Schedule Meeting
                                        </button>
                                    )}
                                </div>

                                {showMeetingForm && (
                                    <form className="meeting-form" onSubmit={handleScheduleMeeting}>
                                        <div className="form-group">
                                            <label>Meeting Title</label>
                                            <input
                                                type="text"
                                                value={meetingData.title}
                                                onChange={(e) => setMeetingData({ ...meetingData, title: e.target.value })}
                                                placeholder="e.g., Academic Performance Review"
                                                required
                                            />
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Date</label>
                                                <input
                                                    type="date"
                                                    value={meetingData.date}
                                                    onChange={(e) => setMeetingData({ ...meetingData, date: e.target.value })}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Time</label>
                                                <input
                                                    type="time"
                                                    value={meetingData.time}
                                                    onChange={(e) => setMeetingData({ ...meetingData, time: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Duration</label>
                                                <select
                                                    value={meetingData.duration}
                                                    onChange={(e) => setMeetingData({ ...meetingData, duration: e.target.value })}
                                                >
                                                    <option value="15">15 mins</option>
                                                    <option value="30">30 mins</option>
                                                    <option value="45">45 mins</option>
                                                    <option value="60">1 hour</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Message (Optional)</label>
                                            <textarea
                                                value={meetingData.message}
                                                onChange={(e) => setMeetingData({ ...meetingData, message: e.target.value })}
                                                placeholder="Add a note about the meeting purpose..."
                                                rows={3}
                                            />
                                        </div>
                                        <div className="meeting-actions">
                                            <button
                                                type="button"
                                                className="btn-cancel"
                                                onClick={() => setShowMeetingForm(false)}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn-send-meeting"
                                                disabled={sendingMeeting}
                                            >
                                                {sendingMeeting ? 'Sending...' : 'Send Meeting Request'}
                                            </button>
                                        </div>
                                        <p className="meeting-note">
                                            <AlertCircle size={14} />
                                            The student will receive a notification and can accept or suggest a different time.
                                        </p>
                                    </form>
                                )}
                            </div>

                            {/* Quick Actions */}
                            <div className="profile-actions">
                                <button
                                    className="btn-primary-action"
                                    onClick={() => {
                                        closeStudentProfile()
                                        closeDetailModal()
                                        navigate('/admin/dashboard?tab=students')
                                    }}
                                >
                                    <Users size={16} />
                                    View Full Profile
                                </button>
                                <button
                                    className="btn-secondary-action"
                                    onClick={() => {
                                        closeStudentProfile()
                                        closeDetailModal()
                                        // Build URL with all filter params
                                        let url = `/admin/dashboard?tab=grades&student_name=${encodeURIComponent(selectedStudent.name || selectedStudent.full_name)}`
                                        if (selectedStudent.program_id) url += `&program_id=${selectedStudent.program_id}`
                                        // Show all semesters history (empty semester param means All Semesters)
                                        url += '&semester=&subject=all'
                                        navigate(url)
                                    }}
                                >
                                    <GraduationCap size={16} />
                                    View Grades
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminOverview
