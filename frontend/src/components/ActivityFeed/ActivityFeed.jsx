import { formatDistanceToNow } from 'date-fns'
import './ActivityFeed.css'

const ActivityFeed = ({ activities = [] }) => {
    const feedData = Array.isArray(activities) ? activities : []

    return (
        <div className="activity-feed">
            <div className="feed-header">
                <h3>Recent Activity</h3>
                <span className="badge">{feedData.filter(a => a.isUnread).length} new</span>
            </div>

            <div className="feed-list">
                {feedData.length === 0 ? (
                    <div className="feed-empty">
                        <p>No recent activity.</p>
                    </div>
                ) : (
                    feedData.map((activity) => {
                        const timeValue = activity.timestamp instanceof Date
                            ? activity.timestamp
                            : new Date(activity.timestamp)
                        const isValidTime = !Number.isNaN(timeValue.getTime())
                        return (
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
                                            {isValidTime ? formatDistanceToNow(timeValue, { addSuffix: true }) : '--'}
                                        </span>
                                    </div>
                                    <p>{activity.description}</p>
                                </div>
                                {activity.isUnread && <div className="unread-dot"></div>}
                            </div>
                        )
                    })
                )}
            </div>

            <button className="view-all-activity">
                View All History
            </button>
        </div>
    )
}

export default ActivityFeed
