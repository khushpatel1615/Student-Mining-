import React from 'react';
import { MessageSquare, CheckCircle, Award, BookOpen, Clock, Bell, AlertTriangle } from 'lucide-react';

const ActivityFeed = ({ activities = [] }) => {
    const feed = Array.isArray(activities) ? activities : [];

    const iconMap = {
        grade: { icon: Award, color: '#8b5cf6', bg: '#f3e8ff' },
        attendance: { icon: CheckCircle, color: '#22c55e', bg: '#dcfce7' },
        assignment: { icon: BookOpen, color: '#f97316', bg: '#ffedd5' },
        announcement: { icon: MessageSquare, color: '#3b82f6', bg: '#dbeafe' },
        exam: { icon: AlertTriangle, color: '#ef4444', bg: '#fee2e2' },
        system: { icon: Bell, color: '#6366f1', bg: '#e0e7ff' }
    };

    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return 'Just now';
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return 'Just now';
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    return (
        <div className="card h-full">
            <h3>
                <Clock size={20} className="text-primary" style={{ marginRight: '0.5rem', color: '#6366f1' }} />
                Recent Activity
            </h3>
            <div className="activity-timeline" style={{ position: 'relative', paddingLeft: '1rem' }}>
                {/* Vertical Line */}
                <div style={{ position: 'absolute', left: '23px', top: '10px', bottom: '10px', width: '2px', background: '#f3f4f6' }}></div>

                {feed.length === 0 ? (
                    <div className="timeline-item" style={{ padding: '0.75rem 0' }}>
                        <div style={{ marginLeft: '3rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                            No recent activity yet.
                        </div>
                    </div>
                ) : (
                    feed.map((item) => {
                        const type = item.type || 'system';
                        const style = iconMap[type] || iconMap.system;
                        const Icon = style.icon;
                        const title = item.title || item.message || 'Update';
                        const desc = item.message || item.description || '';
                    return (
                        <div key={item.id} className="timeline-item" style={{ position: 'relative', display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="timeline-icon" style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: style.bg,
                                color: style.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                zIndex: 1,
                                border: '2px solid white'
                            }}>
                                <Icon size={16} />
                            </div>
                            <div className="timeline-content" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#1f2937' }}>{title}</h4>
                                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatTimeAgo(item.created_at || item.timestamp)}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.4 }}>{desc}</p>
                            </div>
                        </div>
                    );
                    })
                )}
            </div>
        </div>
    );
};

export default ActivityFeed;
