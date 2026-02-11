import React from 'react'
import { Activity, Bell } from 'lucide-react'
import { formatTimeAgo } from '../../../utils/formatters'

const DashboardActivity = ({ activities }) => {
    return (
        <div className="info-card activity-card">
            <div className="card-header">
                <h3><Activity size={18} /> Recent Activity</h3>
            </div>
            <div className="card-body">
                {activities.length === 0 ? (
                    <div className="empty-state">
                        <Activity size={32} />
                        <p>No recent activity</p>
                    </div>
                ) : (
                    <div className="activity-list">
                        {activities.slice(0, 6).map(activity => (
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
    )
}

export default DashboardActivity
