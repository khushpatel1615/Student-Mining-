import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import MainLayout from '../components/Layout/MainLayout'
import { useAuth } from '../context/AuthContext'
import TeacherAssignments from '../components/Teacher/Assignments/TeacherAssignments'
import TeacherExams from '../components/Teacher/Exams/TeacherExams'
import TeacherGrades from '../components/Teacher/Grades/TeacherGrades'
import TeacherAttendance from '../components/Teacher/Attendance/TeacherAttendance'
import QRAttendanceGenerator from '../components/Teacher/Attendance/QRAttendanceGenerator'
import CalendarManagement from '../components/CalendarManagement/CalendarManagement'
import './TeacherDashboard.css'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

const TeacherDashboard = () => {
    const { user, token, logout } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab = searchParams.get('tab') || 'overview'
    const setActiveTab = (tab) => setSearchParams({ tab })

    const [refreshing, setRefreshing] = useState(false)
    const [lastUpdated, setLastUpdated] = useState(new Date())
    const [dashboardData, setDashboardData] = useState({
        subjects: [],
        totalStudents: 0,
        upcomingExams: [],
        pendingGrading: 0
    })

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        setRefreshing(true)
        try {
            // Fetch teacher's subjects
            const subjectsRes = await fetch(`${API_BASE}/teachers.php?action=my_subjects`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const subjectsData = await subjectsRes.json()

            if (subjectsData.success) {
                const subjects = subjectsData.data

                // Fetch stats for each subject
                const subjectsWithStats = await Promise.all(
                    subjects.map(async (subject) => {
                        const statsRes = await fetch(
                            `${API_BASE}/teachers.php?action=subject_stats&subject_id=${subject.id}`,
                            { headers: { 'Authorization': `Bearer ${token}` } }
                        )
                        const statsData = await statsRes.json()
                        return {
                            ...subject,
                            stats: statsData.success ? statsData.data : { total_students: 0, avg_attendance: 0 }
                        }
                    })
                )

                const totalStudents = subjectsWithStats.reduce((sum, s) => sum + (s.stats.total_students || 0), 0)

                setDashboardData({
                    subjects: subjectsWithStats,
                    totalStudents,
                    upcomingExams: [],
                    pendingGrading: 0
                })
            }

            setLastUpdated(new Date())
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setRefreshing(false)
        }
    }

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good Morning'
        if (hour < 17) return 'Good Afternoon'
        return 'Good Evening'
    }

    return (
        <MainLayout
            role="teacher"
            lastUpdated={lastUpdated}
            onRefresh={fetchDashboardData}
            refreshing={refreshing}
            onLogout={logout}
        >
            <div className="dashboard-content">
                {/* Welcome Banner */}
                <div className="welcome-banner">
                    <div className="welcome-content">
                        <h1>{getGreeting()}, {user?.full_name}! 👋</h1>
                        <p>Manage your classes, assignments, and student performance.</p>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {activeTab === 'overview' && (
                        <div className="overview-content">
                            {/* Stats Cards */}
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon subjects">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                        </svg>
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">My Subjects</span>
                                        <span className="stat-value">{dashboardData.subjects.length}</span>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon students">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                            <circle cx="9" cy="7" r="4" />
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                        </svg>
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">Total Students</span>
                                        <span className="stat-value">{dashboardData.totalStudents}</span>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon exams">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                            <line x1="16" y1="13" x2="8" y2="13" />
                                            <line x1="16" y1="17" x2="8" y2="17" />
                                            <polyline points="10 9 9 9 8 9" />
                                        </svg>
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">Upcoming Exams</span>
                                        <span className="stat-value">{dashboardData.upcomingExams.length}</span>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon pending">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">Pending Grading</span>
                                        <span className="stat-value">{dashboardData.pendingGrading}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Subjects List */}
                            <div className="card">
                                <h3>My Subjects</h3>
                                <div className="subjects-list">
                                    {dashboardData.subjects.length === 0 ? (
                                        <div className="empty-state">No subjects assigned</div>
                                    ) : (
                                        dashboardData.subjects.map(subject => (
                                            <div key={subject.id} className="subject-item">
                                                <div className="subject-info">
                                                    <h4>{subject.name}</h4>
                                                    <span className="subject-code">{subject.code}</span>
                                                </div>
                                                <div className="subject-stats">
                                                    <div className="stat-item">
                                                        <span className="label">Students:</span>
                                                        <span className="value">{subject.stats.total_students}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="label">Avg Attendance:</span>
                                                        <span className="value">{subject.stats.avg_attendance}%</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="label">Credits:</span>
                                                        <span className="value">{subject.credits}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'assignments' && (
                        <div className="card">
                            <TeacherAssignments />
                        </div>
                    )}

                    {activeTab === 'exams' && (
                        <div className="card">
                            <TeacherExams />
                        </div>
                    )}

                    {activeTab === 'grades' && (
                        <div className="card">
                            <TeacherGrades />
                        </div>
                    )}

                    {activeTab === 'attendance' && (
                        <div className="card">
                            <TeacherAttendance />
                        </div>
                    )}

                    {activeTab === 'qr-attendance' && (
                        <div className="card">
                            <QRAttendanceGenerator />
                        </div>
                    )}

                    {activeTab === 'calendar' && (
                        <div className="card">
                            <CalendarManagement />
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    )
}

export default TeacherDashboard
