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
            icon: '📝',
            title: 'Assignments',
            description: '3 pending',
            action: () => {
                toast('Assignments feature coming soon!', { icon: '📝' })
            },
            badge: 3,
            color: 'blue'
        },
        {
            icon: '📊',
            title: 'Grades',
            description: 'View all grades',
            action: () => navigate('/student/dashboard?tab=grades'),
            color: 'purple'
        },
        {
            icon: '📅',
            title: 'Attendance',
            description: 'View attendance',
            action: () => navigate('/student/dashboard?tab=attendance'),
            color: 'green'
        },
        {
            icon: '📄',
            title: 'Download Report',
            description: 'Get transcript',
            action: () => setActiveModal('report'),
            color: 'orange'
        },
        {
            icon: '📧',
            title: 'Contact Advisor',
            description: 'Get help',
            action: () => setActiveModal('contact'),
            color: 'indigo'
        },
        {
            icon: '📚',
            title: 'Resources',
            description: 'Study materials',
            action: () => {
                toast('Resources library coming soon!', { icon: '📚' })
            },
            color: 'teal'
        }
    ]

    const teacherActions = [
        {
            icon: '✏️',
            title: 'Quick Grade',
            description: 'Enter grades',
            action: () => setActiveModal('grade'),
            color: 'blue'
        },
        {
            icon: '✅',
            title: 'Mark Attendance',
            description: "Today's classes",
            action: () => setActiveModal('attendance'),
            color: 'green'
        },
        {
            icon: '📢',
            title: 'Post Announcement',
            description: 'Notify students',
            action: () => setActiveModal('announcement'),
            color: 'purple'
        },
        {
            icon: '📊',
            title: 'Class Analytics',
            description: 'Performance stats',
            action: () => navigate('/teacher/dashboard'),
            color: 'indigo'
        }
    ]

    const adminActions = [
        {
            icon: '👥',
            title: 'Student Enrollment',
            description: 'Manage students',
            action: () => navigate('/admin/dashboard?tab=students'),
            color: 'blue'
        },
        {
            icon: '👨‍🏫',
            title: 'Teacher Assignment',
            description: 'Assign courses',
            action: () => navigate('/admin/dashboard?tab=teachers'),
            color: 'green'
        },
        {
            icon: '📊',
            title: 'System Analytics',
            description: 'View reports',
            action: () => setActiveModal('report'),
            color: 'purple'
        },
        {
            icon: '📄',
            title: 'Generate Reports',
            description: 'Export data',
            action: () => setActiveModal('report'),
            color: 'orange'
        }
    ]

    const getActions = () => {
        switch (userRole) {
            case 'teacher':
                return teacherActions
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
                <h3>⚡ Quick Actions</h3>
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
