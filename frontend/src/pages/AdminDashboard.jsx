import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
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
import {
    Users,
    TrendingUp,
    AlertTriangle,
    Activity,
    TrendingDown,
    ChevronDown
} from 'lucide-react'
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

    // Stats Cards Component
    const StatsCards = () => {
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

        const cards = [
            {
                title: 'Total Students',
                value: stats.totalStudents,
                subtitle: 'Active Students',
                icon: Users,
                gradient: 'gradient-purple',
                progress: (stats.totalStudents / 100) * 100,
                trend: '+2 this month',
                trendUp: true
            },
            {
                title: 'Class Average',
                value: `${stats.classAverage}%`,
                subtitle: 'Overall Performance',
                icon: TrendingUp,
                gradient: 'gradient-green',
                progress: stats.classAverage,
                trend: '+3% improvement',
                trendUp: true
            },
            {
                title: 'At-Risk Students',
                value: stats.atRiskCount,
                subtitle: stats.atRiskCount === 0 ? 'Good Standing' : 'Needs Attention',
                icon: AlertTriangle,
                gradient: stats.atRiskCount > 0 ? 'gradient-orange' : 'gradient-green',
                progress: (stats.atRiskCount / stats.totalStudents) * 100,
                trend: stats.atRiskCount > 0 ? 'Monitor closely' : 'All students on track',
                trendUp: stats.atRiskCount === 0
            },
            {
                title: 'Engagement Rate',
                value: `${stats.engagementRate}%`,
                subtitle: 'System Activity',
                icon: Activity,
                gradient: 'gradient-blue',
                progress: stats.engagementRate,
                trend: '+5% from last week',
                trendUp: true
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
                                    value={card.progress}
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

