import React from 'react'
import {
    Lightbulb,
    CheckCircle,
    ArrowRight,
    AlertTriangle,
    Award,
    Info
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const DashboardInsights = ({ alerts }) => {
    const navigate = useNavigate()

    const getIconForType = (type) => {
        switch (type) {
            case 'warning': return AlertTriangle
            case 'success': return Award
            case 'info': return Lightbulb
            default: return Info
        }
    }

    return (
        <div className="info-card alerts-card">
            <div className="card-header">
                <h3><Lightbulb size={18} /> Insights & Alerts</h3>
            </div>
            <div className="card-body">
                {alerts.length === 0 ? (
                    <div className="empty-state">
                        <CheckCircle size={32} />
                        <p>All systems running smoothly</p>
                    </div>
                ) : (
                    <div className="alerts-list">
                        {alerts.map(alert => {
                            const Icon = getIconForType(alert.type)
                            return (
                                <div key={alert.id} className={`alert-item ${alert.type}`}>
                                    <div className="alert-icon">
                                        <Icon size={18} />
                                    </div>
                                    <div className="alert-content">
                                        <h4>{alert.title}</h4>
                                        <p>{alert.description}</p>
                                    </div>
                                    <button
                                        className="alert-action"
                                        onClick={() => navigate(alert.actionPath)}
                                    >
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default DashboardInsights
