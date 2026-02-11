import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Calendar,
    RefreshCw
} from 'lucide-react'
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

import { useAdminDashboardData } from '../../hooks/useAdminDashboardData'
import './AdminOverview.css'

// Sub-components
import DashboardKPIs from './components/DashboardKPIs'
import DashboardQuickActions from './components/DashboardQuickActions'
import DashboardCharts from './components/DashboardCharts'
import DashboardInsights from './components/DashboardInsights'
import DashboardEvents from './components/DashboardEvents'
import DashboardActivity from './components/DashboardActivity'
import ProgramPerformance from './components/ProgramPerformance'
import DashboardDetailModal from './components/DashboardDetailModal'
import StudentProfileModal from './components/StudentProfileModal'

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

function AdminOverview() {
    const navigate = useNavigate()
    const {
        loading,
        refreshing,
        systemStats,
        upcomingEvents,
        recentActivity,
        alerts,
        atRiskStudents,
        performanceData,
        semesterTrends,
        programStats,
        fetchDashboardData
    } = useAdminDashboardData()

    // Detail Modal State
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [detailModalType, setDetailModalType] = useState(null) // 'students', 'gpa', 'attendance', 'at-risk', 'engagement'

    // Student Profile Modal State
    const [showStudentProfile, setShowStudentProfile] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState(null)

    // Date Info
    const today = new Date()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const currentDay = dayNames[today.getDay()]
    const currentDate = `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`

    // Handlers
    const handleKPIClick = (type) => {
        if (type === 'students') navigate('/admin/dashboard?tab=students')
        else if (type === 'programs') navigate('/admin/dashboard?tab=programs')
        else {
            setDetailModalType(type)
            setShowDetailModal(true)
        }
    }

    const handleQuickAction = (action) => {
        switch (action) {
            case 'add-student':
                navigate('/admin/dashboard?tab=students&action=add')
                break
            case 'generate-report':
                navigate('/admin/dashboard?tab=analytics')
                break
            case 'send-announcement':
                navigate('/admin/dashboard?tab=calendar')
                break
            case 'import-data':
                navigate('/admin/dashboard?tab=students&action=import')
                break
            case 'view-alerts':
                navigate('/admin/dashboard?tab=students') // Generally alerts direct to students or we can show modal
                break
            default:
                break
        }
    }

    const openStudentProfile = (student) => {
        setSelectedStudent(student)
        setShowStudentProfile(true)
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
            <DashboardKPIs
                systemStats={systemStats}
                onKPIClick={handleKPIClick}
            />

            {/* Quick Actions */}
            <DashboardQuickActions
                onAction={handleQuickAction}
                badgeCount={systemStats.atRiskCount}
            />

            {/* Main Content Grid */}
            <div className="dashboard-grid">
                {/* Charts Section */}
                <DashboardCharts
                    semesterTrends={semesterTrends}
                    performanceData={performanceData}
                />

                {/* Info Row: Insights, Events, Activity */}
                <div className="info-row">
                    <DashboardInsights alerts={alerts} />
                    <DashboardEvents events={upcomingEvents} />
                    <DashboardActivity activities={recentActivity} />
                </div>

                {/* Program Performance */}
                <ProgramPerformance programStats={programStats} />
            </div>

            {/* Modals */}
            {showDetailModal && (
                <DashboardDetailModal
                    type={detailModalType}
                    onClose={() => {
                        setShowDetailModal(false)
                        setDetailModalType(null)
                    }}
                    systemStats={systemStats}
                    performanceData={performanceData}
                    semesterTrends={semesterTrends}
                    atRiskStudents={atRiskStudents}
                />
            )}

            {showStudentProfile && selectedStudent && (
                <StudentProfileModal
                    student={selectedStudent}
                    onClose={() => {
                        setShowStudentProfile(false)
                        setSelectedStudent(null)
                    }}
                />
            )}
        </div>
    )
}

export default AdminOverview
