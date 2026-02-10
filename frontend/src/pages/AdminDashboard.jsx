import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Users,
    TrendingUp,
    AlertTriangle,
    Activity,
    TrendingDown,
    ChevronDown
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import LogoutModal from '../components/LogoutModal/LogoutModal'
import StudentManagement from '../components/StudentManagement/StudentManagement'
import ProgramManagement from '../components/ProgramManagement/ProgramManagement'
import SubjectManagement from '../components/SubjectManagement/SubjectManagement'
import EnrollmentManagement from '../components/EnrollmentManagement/EnrollmentManagement'
import GradeManagement from '../components/GradeManagement/GradeManagement'
import AdminAttendance from '../components/AttendanceManagement/AdminAttendance'
import CalendarManagement from '../components/CalendarManagement/CalendarManagement'
import AdminOverview from '../components/Overview/AdminOverview'
import CSVImport from '../components/Import/CSVImport'
import AssignmentManagement from '../components/AssignmentManagement/AssignmentManagement'
import ExamManagement from '../components/ExamManagement/ExamManagement'
import AdminAnnouncements from '../components/Discussions/AdminAnnouncements'
import VideoLectures from '../components/VideoLectures/VideoLectures'
import MainLayout from '../components/Layout/MainLayout'
import RiskCenter from '../components/Analytics/RiskCenter'
import LearningBehaviorDashboard from '../components/Analytics/LearningBehaviorDashboard'
import RiskAlertSettings from '../components/Analytics/RiskAlertSettings'
import InsightsDashboard from '../components/Analytics/InsightsDashboard'
import { CircularProgress } from '../components/CircularProgress'
import './AdminDashboard.css'

import { API_BASE } from '../config'


function AdminDashboard() {
    const { user, token, logout } = useAuth()
    const { theme } = useTheme()
    const [showLogoutModal, setShowLogoutModal] = useState(false)
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab = searchParams.get('tab') || 'overview'
    const setActiveTab = (tab) => setSearchParams({ tab })
    const [lastUpdated, setLastUpdated] = useState(null)
    const [showImportModal, setShowImportModal] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    // Dashboard stats
    const [stats, setStats] = useState({
        totalStudents: 0,
        classAverage: 0,
        atRiskCount: 0,
        engagementRate: 0
    })

    // Notifications State
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [showNotifications, setShowNotifications] = useState(false)

    // Fetch Notifications
    const fetchNotifications = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/notifications.php?limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setNotifications(data.data?.notifications || [])
                setUnreadCount(data.data?.unread_count || 0)
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err)
        }
    }, [token])

    // Mark as read
    const markAsRead = async (id = null) => {
        try {
            const body = id
                ? { action: 'mark_read', notification_id: id }
                : { action: 'mark_read' }
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

    // Fetch dashboard statistics
    const fetchStats = useCallback(async () => {
        setRefreshing(true)
        try {
            const studentsRes = await fetch(`${API_BASE}/students.php?limit=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const studentsData = await studentsRes.json()

            if (studentsData.success) {
                setStats({
                    totalStudents: studentsData.pagination?.total || 0,
                    classAverage: 78,
                    atRiskCount: Math.floor((studentsData.pagination?.total || 0) * 0.08),
                    engagementRate: 85
                })
                setLastUpdated(new Date())
            }

            await fetchNotifications()
        } catch (err) {
            console.error('Failed to fetch stats:', err)
        } finally {
            setRefreshing(false)
        }
    }, [token, fetchNotifications])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good Morning'
        if (hour < 17) return 'Good Afternoon'
        return 'Good Evening'
    }

    const confirmLogout = () => {
        setShowLogoutModal(false)
        logout()
    }

    // ========== COMPONENTS ==========

    // StatsCards component removed (unused)

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'overview':
                return <AdminOverview />
            case 'risk-center':
                return <RiskCenter />
            case 'behavior-analysis':
                return <LearningBehaviorDashboard />
            case 'insights':
                return <InsightsDashboard />

            case 'students':
                return <StudentManagement />
            case 'programs':
                return <ProgramManagement />
            case 'subjects':
                return <SubjectManagement />
            case 'enrollments':
                return <EnrollmentManagement />
            case 'grades':
                return <GradeManagement />
            case 'attendance':
                return <AdminAttendance />

            case 'assignments':
                return <AssignmentManagement />
            case 'exams':
                return <ExamManagement />
            case 'discussions':
            case 'announcements':
                return <AdminAnnouncements />
            case 'videos':
                return <VideoLectures />
            case 'calendar':
                return <CalendarManagement role="admin" />
            case 'risk-alerts':
                return <RiskAlertSettings />
            default:
                return <AdminOverview />
        }
    }

    return (
        <>
            <LogoutModal
                isOpen={showLogoutModal}
                onConfirm={confirmLogout}
                onCancel={() => setShowLogoutModal(false)}
            />

            {showImportModal && (
                <CSVImport
                    onClose={() => setShowImportModal(false)}
                    onSuccess={() => {
                        setShowImportModal(false)
                        fetchStats()
                    }}
                />
            )}

            <MainLayout
                role="admin"
                lastUpdated={lastUpdated}
                onRefresh={fetchStats}
                refreshing={refreshing}
                notifications={notifications}
                unreadCount={unreadCount}
                showNotifications={showNotifications}
                setShowNotifications={setShowNotifications}
                onMarkAsRead={markAsRead}
                onLogout={() => setShowLogoutModal(true)}
            >
                {/* Compact Welcome Banner - Only show on overview tab */}
                {activeTab === 'overview' && (
                    <div className="welcome-banner compact">
                        <div className="welcome-content">
                            <h1>{getGreeting()}, {user?.full_name || 'Administrator'}</h1>
                            <p>Welcome to the administration dashboard. Monitor and manage student performance.</p>
                        </div>
                    </div>
                )}

                {/* Stats Cards removed - AdminAnalyticsDashboard has its own overview cards */}

                {/* Main Content with Sidebar */}
                <div className="admin-layout">
                    <div className="admin-main">
                        {/* Content Card */}
                        <div className="content-card">
                            {renderActiveTab()}
                        </div>
                    </div>

                </div>
            </MainLayout>
        </>
    )
}

export default AdminDashboard

