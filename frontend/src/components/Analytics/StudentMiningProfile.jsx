import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    User,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Star,
    Shield,
    Clock,
    BookOpen,
    Activity,
    Calendar,
    CheckCircle,
    XCircle,
    RefreshCw,
    Zap
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import './StudentMiningProfile.css';



const StudentMiningProfile = ({ studentId }) => {
    const { token } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        if (!studentId) return;
        setLoading(true);
        try {
            const response = await fetch(
                `${API_BASE}/analytics/features.php?action=profile&user_id=${studentId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await response.json();
            if (data.success) {
                setProfile(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch mining profile:', err);
        } finally {
            setLoading(false);
        }
    }, [token, studentId]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const getRiskBadge = (level) => {
        switch (level) {
            case 'At Risk':
                return <span className="profile-badge critical"><AlertTriangle size={14} /> At Risk</span>;
            case 'Star':
                return <span className="profile-badge star"><Star size={14} /> Star Performer</span>;
            default:
                return <span className="profile-badge safe"><Shield size={14} /> Safe</span>;
        }
    };

    const getScoreColor = (score) => {
        if (score >= 75) return '#22c55e';
        if (score >= 45) return '#f59e0b';
        return '#ef4444';
    };

    const getTrendIcon = (trend) => {
        if (trend === 'improving') return <TrendingUp size={16} className="trend-up" />;
        if (trend === 'declining') return <TrendingDown size={16} className="trend-down" />;
        return <span className="trend-stable">-</span>;
    };

    if (loading) {
        return (
            <div className="mining-loading">
                <RefreshCw className="spin" size={24} />
                <span>Loading mining profile...</span>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="mining-empty">
                <Zap size={32} />
                <p>No mining data available for this student yet.</p>
                <small>Run analytics computation to generate the profile.</small>
            </div>
        );
    }

    const features = profile.features || {};
    const attendance = features.attendance || {};
    const performance = features.performance || {};
    const engagement = features.engagement || {};
    const completion = features.completion || {};

    return (
        <div className="student-mining-profile">
            {/* Header */}
            <div className="mining-header">
                <div className="mining-student-info">
                    <div className="mining-avatar">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="" />
                        ) : (
                            <User size={28} />
                        )}
                    </div>
                    <div>
                        <h3>{profile.full_name}</h3>
                        <span>{profile.student_id}</span>
                    </div>
                </div>
                <div className="mining-score-display">
                    <div
                        className="score-circle"
                        style={{
                            '--score-color': getScoreColor(profile.risk_score),
                            '--score-pct': `${profile.risk_score || 0}%`
                        }}
                    >
                        <span className="score-value">{Math.round(profile.risk_score || 0)}</span>
                    </div>
                    {getRiskBadge(profile.risk_level)}
                </div>
            </div>

            {/* Risk Factors */}
            {profile.risk_factors && profile.risk_factors.length > 0 && (
                <div className="mining-section risk-factors-section">
                    <h4><AlertTriangle size={18} /> Risk Factors</h4>
                    <div className="risk-factors-list">
                        {profile.risk_factors.map((factor, i) => (
                            <span key={i} className="risk-factor-tag">{factor}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Feature Cards */}
            <div className="mining-features-grid">
                {/* Attendance */}
                <motion.div
                    className="feature-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="feature-header">
                        <Clock size={20} />
                        <span>Attendance</span>
                    </div>
                    <div className="feature-value">{attendance.percentage || 0}%</div>
                    <div className="feature-details">
                        <div className="detail-row">
                            <span>Trend</span>
                            <span className="detail-value">{getTrendIcon(attendance.trend)} {attendance.trend || 'stable'}</span>
                        </div>
                        <div className="detail-row">
                            <span>Sessions</span>
                            <span className="detail-value">{attendance.sessions_present || 0} / {attendance.sessions_total || 0}</span>
                        </div>
                        <div className="detail-row">
                            <span>Absence Streak</span>
                            <span className={`detail-value ${attendance.consecutive_absences >= 3 ? 'warning' : ''}`}>
                                {attendance.consecutive_absences || 0} days
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Performance */}
                <motion.div
                    className="feature-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="feature-header">
                        <BookOpen size={20} />
                        <span>Performance</span>
                    </div>
                    <div className="feature-value">{performance.avg_grade_current || 0}%</div>
                    <div className="feature-details">
                        <div className="detail-row">
                            <span>Trend</span>
                            <span className="detail-value">{getTrendIcon(performance.grade_trend)} {performance.grade_trend || 'stable'}</span>
                        </div>
                        <div className="detail-row">
                            <span>Last 3 Avg</span>
                            <span className="detail-value">{performance.last_3_avg || 0}%</span>
                        </div>
                        <div className="detail-row">
                            <span>Consistency</span>
                            <span className={`detail-value ${performance.volatility === 'inconsistent' ? 'warning' : ''}`}>
                                {performance.volatility === 'inconsistent' ? 'Inconsistent' : 'Stable'}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Engagement */}
                <motion.div
                    className="feature-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="feature-header">
                        <Activity size={20} />
                        <span>Engagement</span>
                    </div>
                    <div className="feature-value">{profile.engagement_score || 0}%</div>
                    <div className="feature-details">
                        <div className="detail-row">
                            <span>Logins (7d)</span>
                            <span className="detail-value">{engagement.logins_last_7d || 0}</span>
                        </div>
                        <div className="detail-row">
                            <span>Logins (14d)</span>
                            <span className="detail-value">{engagement.logins_last_14d || 0}</span>
                        </div>
                        <div className="detail-row">
                            <span>Last Active</span>
                            <span className={`detail-value ${engagement.days_since_login > 7 ? 'warning' : ''}`}>
                                {engagement.days_since_login < 999 ? `${engagement.days_since_login} days ago` : 'Unknown'}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Completion */}
                <motion.div
                    className="feature-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="feature-header">
                        <CheckCircle size={20} />
                        <span>Completion</span>
                    </div>
                    <div className="feature-value">{completion.submission_rate || 0}%</div>
                    <div className="feature-details">
                        <div className="detail-row">
                            <span>Missing</span>
                            <span className={`detail-value ${completion.missing_assessments > 2 ? 'warning' : ''}`}>
                                {completion.missing_assessments || 0} assessments
                            </span>
                        </div>
                        <div className="detail-row">
                            <span>Late Submissions</span>
                            <span className={`detail-value ${completion.late_submissions > 2 ? 'warning' : ''}`}>
                                {completion.late_submissions || 0}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Recommended Actions */}
            <div className="mining-section recommendations-section">
                <h4><Zap size={18} /> Recommended Actions</h4>
                <div className="recommendations-list">
                    {profile.risk_level === 'At Risk' && (
                        <>
                            {attendance.percentage < 75 && (
                                <div className="recommendation-item">
                                    <Clock size={16} />
                                    <span>Schedule attendance counseling session</span>
                                </div>
                            )}
                            {performance.grade_trend === 'declining' && (
                                <div className="recommendation-item">
                                    <BookOpen size={16} />
                                    <span>Assign peer tutor for struggling subjects</span>
                                </div>
                            )}
                            {engagement.days_since_login > 7 && (
                                <div className="recommendation-item">
                                    <Activity size={16} />
                                    <span>Send engagement reminder email</span>
                                </div>
                            )}
                            {completion.missing_assessments > 2 && (
                                <div className="recommendation-item">
                                    <XCircle size={16} />
                                    <span>Deadline intervention required</span>
                                </div>
                            )}
                        </>
                    )}
                    {profile.risk_level === 'Star' && (
                        <div className="recommendation-item success">
                            <Star size={16} />
                            <span>Consider for academic excellence recognition</span>
                        </div>
                    )}
                    {profile.risk_level === 'Safe' && (
                        <div className="recommendation-item neutral">
                            <Shield size={16} />
                            <span>Continue regular monitoring</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="mining-footer">
                <small>Last updated: {profile.updated_at ? new Date(profile.updated_at).toLocaleString() : 'N/A'}</small>
            </div>
        </div>
    );
};

export default StudentMiningProfile;



