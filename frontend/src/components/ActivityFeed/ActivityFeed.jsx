import { formatDistanceToNow } from 'date-fns'
import './ActivityFeed.css'

const ActivityFeed = ({ activities = [] }) => {
    // Mock data if none provided
    const mockActivities = [
        {
            id: 1,
            type: 'grade',
            title: 'New Grade Posted',
            description: 'You received an A in Mathematics',
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
            icon: '🎓',
            isUnread: true
        },
        {
            id: 2,
            type: 'attendance',
            title: 'Attendance Updated',
            description: 'Marked present for Web Development',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            icon: '✅',
            isUnread: true
        },
        {
            id: 3,
            type: 'assignment',
            title: 'Assignment Due Soon',
            description: 'Database Project due in 2 days',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            icon: '📝',
            isUnread: false
        },
        {
            id: 4,
            type: 'system',
            title: 'System Update',
            description: 'Dashboard features have been updated',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
            icon: '🔄',
            isUnread: false
        },
        {
            id: 5,
            type: 'alert',
            title: 'Low Attendance Warning',
            description: 'Electronics attendance below 75%',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
            icon: '⚠️',
            isUnread: false
        }
    ]

    const feedData = activities.length > 0 ? activities : mockActivities

    return (
        <div className="activity-feed">
            <div className="feed-header">
                <h3>🔔 Recent Activity</h3>
                <span className="badge">{feedData.filter(a => a.isUnread).length} new</span>
            </div>

            <div className="feed-list">
                {feedData.map((activity) => (
                    <div
                        key={activity.id}
                        className={`feed-item ${activity.isUnread ? 'unread' : ''} type-${activity.type}`}
                    >
                        <div className="feed-icon-wrapper">
                            <span className="feed-icon">{activity.icon}</span>
                        </div>
                        <div className="feed-content">
                            <div className="feed-title-row">
                                <h4>{activity.title}</h4>
                                <span className="feed-time">
                                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                                </span>
                            </div>
                            <p>{activity.description}</p>
                        </div>
                        {activity.isUnread && <div className="unread-dot"></div>}
                    </div>
                ))}
            </div>

            <button className="view-all-activity">
                View All History
            </button>
        </div>
    )
}

export default ActivityFeed
