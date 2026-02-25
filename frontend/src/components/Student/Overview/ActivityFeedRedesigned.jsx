import React from 'react'
import { MessageSquare, CheckCircle, Award, BookOpen, Clock, Bell, AlertTriangle, Activity } from 'lucide-react'
import { motion } from 'framer-motion'

const ActivityFeedRedesigned = ({ activities = [] }) => {
    const feed = Array.isArray(activities) ? activities : []

    const iconMap = {
        grade: { icon: Award, color: '#8b5cf6', bg: '#ede9fe' },
        attendance: { icon: CheckCircle, color: '#10b981', bg: '#d1fae5' },
        assignment: { icon: BookOpen, color: '#f59e0b', bg: '#fef3c7' },
        announcement: { icon: MessageSquare, color: '#06b6d4', bg: '#cffafe' },
        exam: { icon: AlertTriangle, color: '#ef4444', bg: '#fee2e2' },
        system: { icon: Bell, color: '#6366f1', bg: '#e0e7ff' }
    }

    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return 'Just now'
        const date = new Date(dateStr)
        if (Number.isNaN(date.getTime())) return 'Just now'
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        return `${diffDays}d ago`
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
                delayChildren: 0.2
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: {
            opacity: 1,
            x: 0,
            transition: { duration: 0.3, ease: 'easeOut' }
        }
    }

    return (
        <div className="card-redesigned activity-feed-container">
            <div className="card-header-redesigned">
                <Activity size={22} />
                <h3>Recent Activity</h3>
            </div>

            <motion.div
                className="activity-timeline-redesigned"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {feed.length === 0 ? (
                    <motion.div
                        className="activity-empty-state"
                        variants={itemVariants}
                    >
                        <div className="empty-state-icon">
                            <Clock size={40} />
                        </div>
                        <p>No recent activity yet</p>
                        <span className="empty-hint">Check back soon for updates</span>
                    </motion.div>
                ) : (
                    feed.map((item, index) => {
                        const type = item.type || 'system'
                        const style = iconMap[type] || iconMap.system
                        const Icon = style.icon
                        const title = item.title || item.message || 'Update'
                        const desc = item.message || item.description || ''

                        return (
                            <motion.div
                                key={item.id || index}
                                className="activity-item-redesigned"
                                variants={itemVariants}
                                whileHover={{ x: 4 }}
                            >
                                <div className="activity-timeline-dot-line">
                                    <div
                                        className="timeline-dot"
                                        style={{ backgroundColor: style.color, boxShadow: `0 0 8px ${style.color}40` }}
                                    >
                                        <Icon size={14} color="white" />
                                    </div>
                                    {index < feed.length - 1 && <div className="timeline-line"></div>}
                                </div>

                                <div className="activity-content">
                                    <div className="activity-header">
                                        <h5 className="activity-title">{title}</h5>
                                        <span className="activity-time">{formatTimeAgo(item.created_at || item.timestamp)}</span>
                                    </div>
                                    {desc && <p className="activity-description">{desc}</p>}
                                    <div className="activity-type-badge" style={{ backgroundColor: style.bg, color: style.color }}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })
                )}
            </motion.div>
        </div>
    )
}

export default ActivityFeedRedesigned
