import React, { useState, useEffect } from 'react';
import { X, Calendar, Flag, Loader2 } from 'lucide-react';
import CircularProgress from './CircularProgress';
import { API_BASE } from '../../../config';

const RiskProfileModal = ({ student, token, onClose, onIntervene }) => {
    const [patterns, setPatterns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!student?.id) return;

        const fetchPatterns = async () => {
            try {
                const response = await fetch(
                    `${API_BASE}/behavior/patterns.php?user_id=${student.id}&weeks=8`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                const data = await response.json();
                if (data.success) setPatterns(data.patterns || []);
            } catch (err) {
                console.error('Error fetching patterns:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPatterns();
    }, [student?.id, token]);

    const getRiskColor = (level) => {
        const colors = { critical: '#dc2626', at_risk: '#ea580c', warning: '#d97706', safe: '#16a34a' };
        return colors[level] || colors.safe;
    };

    if (!student) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container modal-profile" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title-group">
                        <h2>Student Profile</h2>
                        <p>{student.student_name}</p>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Key Metrics */}
                    <div className="profile-metrics">
                        <div className="profile-metric">
                            <CircularProgress
                                value={student.risk_score || 0}
                                color={getRiskColor(student.risk_level)}
                                size={64}
                            />
                            <span className="metric-label">Risk Score</span>
                        </div>
                        <div className="profile-metric-text">
                            <span className="metric-value">{(student.overall_engagement_score || 0).toFixed(1)}%</span>
                            <span className="metric-label">Engagement</span>
                        </div>
                        <div className="profile-metric-text">
                            <span className="metric-value">{(student.on_time_submission_rate || 0).toFixed(1)}%</span>
                            <span className="metric-label">On-Time Rate</span>
                        </div>
                        <div className="profile-metric-text">
                            <span className="metric-value">{student.grade_trend || 'N/A'}</span>
                            <span className="metric-label">Grade Trend</span>
                        </div>
                    </div>

                    {/* Risk Factors */}
                    {student.risk_factors && Object.keys(student.risk_factors).length > 0 && (
                        <div className="profile-section">
                            <h3>Risk Factors</h3>
                            <div className="risk-factors-grid">
                                {Object.entries(student.risk_factors)
                                    .filter(([, v]) => v)
                                    .map(([factor]) => (
                                        <span key={factor} className="risk-factor-chip">
                                            {factor.replace(/_/g, ' ')}
                                        </span>
                                    ))
                                }
                            </div>
                        </div>
                    )}

                    {/* Behavior History */}
                    <div className="profile-section">
                        <h3>Weekly Activity History</h3>
                        {loading ? (
                            <div className="profile-loading">
                                <Loader2 className="spinning" size={24} />
                            </div>
                        ) : patterns.length === 0 ? (
                            <p className="no-data">No historical data available</p>
                        ) : (
                            <div className="patterns-list">
                                {patterns.slice(0, 4).map((p, i) => (
                                    <div key={i} className="pattern-item">
                                        <div className="pattern-week">
                                            <Calendar size={14} />
                                            <span>Week of {new Date(p.week_start).toLocaleDateString()}</span>
                                        </div>
                                        <div className="pattern-stats">
                                            <span><strong>{p.total_logins}</strong> logins</span>
                                            <span><strong>{(p.overall_engagement_score || 0).toFixed(0)}%</strong> engagement</span>
                                            <span><strong>{p.days_active}/7</strong> days active</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                    <button className="btn-primary" onClick={onIntervene}>
                        <Flag size={18} />
                        Create Intervention
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RiskProfileModal;
