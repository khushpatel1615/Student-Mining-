import React from 'react'
import {
    UserPlus,
    FileText,
    Mail,
    Download,
    Bell
} from 'lucide-react'

const DashboardQuickActions = ({ onAction, badgeCount }) => {
    return (
        <div className="quick-actions-section">
            <h3 className="section-title">Quick Actions</h3>
            <div className="quick-actions-grid">
                <button className="quick-action-btn" onClick={() => onAction('add-student')}>
                    <UserPlus size={20} />
                    <span>Add Student</span>
                </button>
                <button className="quick-action-btn" onClick={() => onAction('generate-report')}>
                    <FileText size={20} />
                    <span>Generate Report</span>
                </button>
                <button className="quick-action-btn" onClick={() => onAction('send-announcement')}>
                    <Mail size={20} />
                    <span>Send Announcement</span>
                </button>
                <button className="quick-action-btn" onClick={() => onAction('import-data')}>
                    <Download size={20} />
                    <span>Import Data</span>
                </button>
                <button className="quick-action-btn alert" onClick={() => onAction('view-alerts')}>
                    <Bell size={20} />
                    <span>View Alerts</span>
                    {badgeCount > 0 && (
                        <span className="action-badge">{badgeCount}</span>
                    )}
                </button>
            </div>
        </div>
    )
}

export default DashboardQuickActions
