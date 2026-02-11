import React from 'react'
import { Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const DashboardEvents = ({ events }) => {
    const navigate = useNavigate()

    const getEventTypeColor = (type) => {
        const colors = {
            exam: '#ef4444',
            deadline: '#f59e0b',
            holiday: '#10b981',
            event: '#6366f1',
            assignment: '#8b5cf6'
        }
        return colors[type] || '#6366f1'
    }

    return (
        <div className="info-card events-card">
            <div className="card-header">
                <h3><Calendar size={18} /> Upcoming Events</h3>
                <button
                    className="view-all-btn"
                    onClick={() => navigate('/admin/dashboard?tab=calendar')}
                >
                    View All
                </button>
            </div>
            <div className="card-body">
                {events.length === 0 ? (
                    <div className="empty-state">
                        <Calendar size={32} />
                        <p>No upcoming events</p>
                    </div>
                ) : (
                    <div className="events-list">
                        {events.map(event => (
                            <div key={event.id} className="event-item">
                                <div
                                    className="event-indicator"
                                    style={{ backgroundColor: getEventTypeColor(event.type) }}
                                ></div>
                                <div className="event-content">
                                    <h4>{event.title}</h4>
                                    <span className="event-date">
                                        {new Date(event.event_date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                                <span className={`event-type type-${event.type}`}>
                                    {event.type}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default DashboardEvents
