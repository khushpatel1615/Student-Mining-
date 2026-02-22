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
import LogoutModal from '../components/ui/LogoutModal'
import StudentManagement from '../components/StudentManagement/StudentManagement'
import ProgramManagement from '../components/ProgramManagement/ProgramManagement'
import SubjectManagement from '../components/SubjectManagement/SubjectManagement'
import EnrollmentManagement from '../components/enrollment/EnrollmentManagement'
import GradeManagement from '../components/GradeManagement/GradeManagement'
import AdminAttendance from '../components/AttendanceManagement/AdminAttendance'
import CalendarManagement from '../components/CalendarManagement/CalendarManagement'
import AdminOverview from '../components/Overview/AdminOverview'
import CSVImport from '../components/Import/CSVImport'
import AssignmentManagement from '../components/AssignmentManagement/AssignmentManagement'
import ExamManagement from '../components/ExamManagement/ExamManagement'
import AdminAnnouncements from '../components/Discussions/AdminAnnouncements'
import VideoLectures from '../components/VideoLectures/VideoLectures'
import MainLayout from '../components/layout/MainLayout'
import RiskCenter from '../components/Analytics/RiskCenter'
import LearningBehaviorDashboard from '../components/Analytics/LearningBehaviorDashboard'
import RiskAlertSettings from '../components/Analytics/RiskAlertSettings'
import InsightsDashboard from '../components/Analytics/InsightsDashboard'
import { CircularProgress } from '../components/CircularProgress'
import './AdminDashboard.css'

import * as notificationService from '../services/notificationService'
import * as studentService from '../services/studentService'

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
        const { data, error } = await notificationService.fetchNotifications(10);
        if (data) {
            setNotifications(data.notifications || []);
            setUnreadCount(data.unread_count || 0);
        } else if (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }, [])

    // Mark as read
    const markAsRead = async (id = null) => {
        const { error } = await notificationService.markAsRead(id);
        if (!error) {
            fetchNotifications();
        } else {
            console.error('Failed to mark notifications read:', error);
        }
    }

    // Fetch dashboard statistics
    const fetchStats = useCallback(async () => {
        setRefreshing(true)
        const { pagination, error } = await studentService.fetchStudents({ limit: 1 });

        if (pagination) {
            setStats({
                totalStudents: pagination.total || 0,
                classAverage: 78,
                atRiskCount: Math.floor((pagination.total || 0) * 0.08),
                engagementRate: 85
            })
            setLastUpdated(new Date())
        } else if (error) {
            console.error('Failed to fetch stats:', error);
        }

        await fetchNotifications()
        setRefreshing(false)
    }, [fetchNotifications])

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
