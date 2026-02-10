import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PostAnnouncementModal, QuickGradeModal, AttendanceModal, ContactAdvisorModal, ReportModal } from './QuickActionModals'
import './QuickActions.css'

const QuickActionsPanel = ({ userRole = 'student' }) => {
    const navigate = useNavigate()
    const [activeModal, setActiveModal] = useState(null)

    // Role-based actions
    const studentActions = [
        {
            icon: 'ASG',
            title: 'Assignments',
            description: '3 pending',
            action: () => {
                toast('Assignments feature coming soon!', { icon: 'ASG' })
            },
            badge: 3,
            color: 'blue'
        },
        {
            icon: 'GRADE',
            title: 'Grades',
            description: 'View all grades',
            action: () => navigate('/student/dashboard?tab=grades'),
            color: 'purple'
        },
        {
            icon: 'ATT',
            title: 'Attendance',
            description: 'View attendance',
            action: () => navigate('/student/dashboard?tab=attendance'),
            color: 'green'
        },
        {
            icon: 'RPT',
            title: 'Download Report',
            description: 'Get transcript',
            action: () => setActiveModal('report'),
            color: 'orange'
        },
        {
            icon: 'MSG',
            title: 'Contact Advisor',
            description: 'Get help',
            action: () => setActiveModal('contact'),
            color: 'indigo'
        },
        {
            icon: 'RES',
            title: 'Resources',
            description: 'Study materials',
            action: () => {
                toast('Resources library coming soon!', { icon: 'RES' })
            },
            color: 'teal'
        }
    ]

    const adminActions = [
        {
            icon: 'STU',
            title: 'Student Enrollment',
            description: 'Manage students',
            action: () => navigate('/admin/dashboard?tab=students'),
            color: 'blue'
        },
        {
            icon: 'CAT',
            title: 'Programs & Subjects',
            description: 'Manage catalog',
            action: () => navigate('/admin/dashboard?tab=subjects'),
            color: 'green'
        },
        {
            icon: 'GRADE',
            title: 'System Analytics',
            description: 'View reports',
            action: () => setActiveModal('report'),
            color: 'purple'
        },
        {
            icon: 'RPT',
            title: 'Generate Reports',
            description: 'Export data',
            action: () => setActiveModal('report'),
            color: 'orange'
        }
    ]

    const getActions = () => {
        switch (userRole) {
            case 'admin':
                return adminActions
            default:
                return studentActions
        }
    }

    const actions = getActions()

    const closeModal = () => setActiveModal(null)

    return (
        <div className="quick-actions-panel">
            <div className="quick-actions-header">
                <h3>Quick Actions</h3>
                <p>Shortcuts to common tasks</p>
            </div>
            <div className="quick-actions-grid">
                {actions.map((action, index) => (
                    <button
                        key={index}
                        className={`quick-action-card color-${action.color}`}
                        onClick={action.action}
                    >
                        {action.badge && (
                            <span className="action-badge">{action.badge}</span>
                        )}
                        <div className="action-icon">{action.icon}</div>
                        <div className="action-content">
                            <h4>{action.title}</h4>
                            <p>{action.description}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Modals */}
            <PostAnnouncementModal isOpen={activeModal === 'announcement'} onClose={closeModal} />
            <QuickGradeModal isOpen={activeModal === 'grade'} onClose={closeModal} />
            <AttendanceModal isOpen={activeModal === 'attendance'} onClose={closeModal} />
            <ContactAdvisorModal isOpen={activeModal === 'contact'} onClose={closeModal} />
            <ReportModal isOpen={activeModal === 'report'} onClose={closeModal} />
        </div>
    )
}

export default QuickActionsPanel


