import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, AlertCircle, Award } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../config';
import './Analytics.css';

const Analytics = () => {
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [analyticsData, setAnalyticsData] = useState(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE}/analytics/features.php?action=profile&user_id=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setAnalyticsData(data.data);
            } else {
                throw new Error(data.error || 'Failed to fetch analytics');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="analytics-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analytics-container">
                <div className="error-state">
                    <AlertCircle size={48} />
                    <h3>Unable to load analytics</h3>
                    <p>{error}</p>
                    <button onClick={fetchAnalytics} className="btn-primary">Retry</button>
                </div>
            </div>
        );
    }

    const riskScore = analyticsData?.risk_score || 0;
    const riskLevel = analyticsData?.risk_level || 'Unknown';
    const attendanceScore = analyticsData?.attendance_score || 0;
    const gradeAvg = analyticsData?.grade_avg || 0;
    const engagementScore = analyticsData?.engagement_score || 0;

    return (
        <div className="analytics-container">
            <div className="analytics-header">
                <h2><BarChart3 size={24} /> My Analytics</h2>
                <p>Comprehensive overview of your academic performance</p>
            </div>

            <div className="analytics-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: riskLevel === 'At Risk' ? '#fee2e2' : '#dcfce7', color: riskLevel === 'At Risk' ? '#dc2626' : '#16a34a' }}>
                        {riskLevel === 'At Risk' ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Risk Level</div>
                        <div className="stat-value">{riskLevel}</div>
                        <div className="stat-meta">Score: {riskScore.toFixed(1)}/100</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
                        <BarChart3 size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Attendance</div>
                        <div className="stat-value">{attendanceScore.toFixed(1)}%</div>
                        <div className="stat-meta">{attendanceScore >= 75 ? 'Good standing' : 'Needs improvement'}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>
                        <Award size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Grade Average</div>
                        <div className="stat-value">{gradeAvg.toFixed(2)}</div>
                        <div className="stat-meta">Out of 4.0 scale</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#ffedd5', color: '#ea580c' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Engagement</div>
                        <div className="stat-value">{engagementScore.toFixed(1)}%</div>
                        <div className="stat-meta">Participation rate</div>
                    </div>
                </div>
            </div>

            {analyticsData?.risk_factors && analyticsData.risk_factors.length > 0 && (
                <div className="risk-factors-section">
                    <h3>⚠️ Areas for Improvement</h3>
                    <ul className="risk-factors-list">
                        {analyticsData.risk_factors.map((factor, index) => (
                            <li key={index}>{factor}</li>
                        ))}
                    </ul>
                </div>
            )}

            {(!analyticsData?.risk_factors || analyticsData.risk_factors.length === 0) && (
                <div className="success-message">
                    <Award size={48} style={{ color: '#16a34a' }} />
                    <h3>Great Performance!</h3>
                    <p>No risk factors identified. Keep up the excellent work!</p>
                </div>
            )}
        </div>
    );
};

export default Analytics;
