import React from 'react';
import { MessageSquare, CheckCircle, Award, BookOpen, Clock } from 'lucide-react';

const ActivityFeed = () => {
    const activities = [
        {
            id: 1,
            type: 'grade',
            icon: Award,
            title: 'Grade Posted: Data Mining',
            desc: 'You received an A on your Midterm Project.',
            time: '2 hours ago',
            color: '#8b5cf6',
            bg: '#f3e8ff'
        },
        {
            id: 2,
            type: 'attendance',
            icon: CheckCircle,
            title: 'Attendance Marked',
            desc: 'Present for Web Development by Prof. Smith',
            time: '5 hours ago',
            color: '#22c55e',
            bg: '#dcfce7'
        },
        {
            id: 3,
            type: 'assignment',
            icon: BookOpen,
            title: 'Assignment Due Soon',
            desc: 'Database Design is due tomorrow at 11:59 PM.',
            time: '1 day ago',
            color: '#f97316',
            bg: '#ffedd5'
        },
        {
            id: 4,
            type: 'announcement',
            icon: MessageSquare,
            title: 'New Announcement',
            desc: 'Campus closed on Friday for maintenance.',
            time: '2 days ago',
            color: '#3b82f6',
            bg: '#dbeafe'
        }
    ];

    return (
        <div className="card h-full">
            <h3>
                <Clock size={20} className="text-primary" style={{ marginRight: '0.5rem', color: '#6366f1' }} />
                Recent Activity
            </h3>
            <div className="activity-timeline" style={{ position: 'relative', paddingLeft: '1rem' }}>
                {/* Vertical Line */}
                <div style={{ position: 'absolute', left: '23px', top: '10px', bottom: '10px', width: '2px', background: '#f3f4f6' }}></div>

                {activities.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.id} className="timeline-item" style={{ position: 'relative', display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="timeline-icon" style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: item.bg,
                                color: item.color,
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
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#1f2937' }}>{item.title}</h4>
                                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{item.time}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.4 }}>{item.desc}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ActivityFeed;
