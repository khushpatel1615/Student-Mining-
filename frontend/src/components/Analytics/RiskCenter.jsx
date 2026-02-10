import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    Star,
    Shield,
    TrendingDown,
    TrendingUp,
    User,
    RefreshCw,
    Search,
    ChevronRight,
    Activity,
    Clock,
    BookOpen,
    Eye,
    MessageSquare,
    MoreHorizontal,
    ChevronDown,
    Home,
    Zap,
    ArrowUpRight,
    ArrowDownRight,
    Users
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import './RiskCenter.css';



// Circular Progress Ring Component
const ScoreRing = ({ score, color }) => {
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="score-ring">
            <svg viewBox="0 0 48 48">
                <circle className="track" cx="24" cy="24" r={radius} />
                <circle
                    className="progress"
                    cx="24"
                    cy="24"
                    r={radius}
                    style={{
                        strokeDashoffset: offset,
                        stroke: color
                    }}
                />
            </svg>
            <span className="score-ring-value">{Math.round(score)}</span>
        </div>
    );
};

const RiskCenter = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('at_risk');
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);

    const fetchRiskData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `${API_BASE}/analytics/features.php?action=list&filter=${filter}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await response.json();
            if (data.success) {
                setStudents(data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch risk data:', err);
        } finally {
            setLoading(false);
        }
    }, [token, filter]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch(
                `${API_BASE}/analytics/features.php?action=stats`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    }, [token]);

    const recomputeFeatures = async () => {
        setRefreshing(true);
        try {
            const response = await fetch(`${API_BASE}/analytics/compute_features.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                console.error('Recompute failed:', result.error || response.statusText);
            }
            await fetchRiskData();
            await fetchStats();
        } catch (err) {
            console.error('Failed to recompute:', err);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRiskData();
        fetchStats();
    }, [fetchRiskData, fetchStats]);

    const filteredStudents = students.filter(s =>
        s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getInitials = (name) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Helper to format names to Sentence Case
    const toSentenceCase = (str) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    };

    const getScoreColor = (score) => {
        if (score >= 75) return '#22c55e';
        if (score >= 45) return '#f59e0b';
        return '#ef4444';
    };

    const handleViewStudent = (studentId) => {
        navigate(`/admin/student/${studentId}`);
    };

    const totalStudents = (stats?.risk_distribution?.['At Risk'] || 0) +
        (stats?.risk_distribution?.['Safe'] || 0) +
        (stats?.risk_distribution?.['Star'] || 0);

    // Helper to render metric with trend icon
    const MetricWithTrend = ({ value, threshold, showPercent = true }) => {
        const isLow = value < threshold;
        return (
            <div className="metric-cell">
                <span className="metric-value">
                    {Math.round(value || 0)}{showPercent ? '%' : ''}
                </span>
                {isLow && (
                    <span className="metric-trend-icon down">
                        <ArrowDownRight size={14} />
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="risk-center-pro">
            {/* Breadcrumbs */}
            <nav className="breadcrumbs">
                <a href="/admin/dashboard?tab=overview"><Home size={14} /> Dashboard</a>
                <ChevronRight size={14} />
                <span className="current">Risk Center</span>
            </nav>

            {/* Clean Header */}
            <header className="risk-header-pro">
                <div className="header-left">
                    <div className="header-icon">
                        <Zap size={22} />
                    </div>
                    <div>
                        <h1>Early Warning System</h1>
                        <p>Monitor at-risk students and take proactive interventions</p>
                    </div>
                </div>
                <button
                    className="refresh-btn-pro"
                    onClick={recomputeFeatures}
                    disabled={refreshing}
                >
                    <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
                    {refreshing ? 'Analyzing...' : 'Refresh Data'}
                </button>
            </header>

            {/* Modern Stats Cards */}
            <div className="stats-row">
                <div
                    className={`stat-card-pro critical ${filter === 'at_risk' ? 'active' : ''}`}
                    onClick={() => setFilter('at_risk')}
                >
                    <div className="stat-icon-pro">
                        <AlertTriangle size={22} />
                    </div>
                    <div className="stat-body">
                        <span className="stat-number">{stats?.risk_distribution?.['At Risk'] || 0}</span>
                        <span className="stat-label">At Risk</span>
                    </div>
                    <div className="stat-trend negative">
                        <ArrowUpRight size={14} />
                        <span>{stats?.risk_distribution?.['At Risk'] || 0} flagged</span>
                    </div>
                </div>

                <div
                    className={`stat-card-pro warning ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    <div className="stat-icon-pro">
                        <Users size={22} />
                    </div>
                    <div className="stat-body">
                        <span className="stat-number">{totalStudents}</span>
                        <span className="stat-label">All Students</span>
                    </div>
                    <div className="stat-trend neutral">
                        <span>Tracked</span>
                    </div>
                </div>

                <div
                    className={`stat-card-pro success ${filter === 'star' ? 'active' : ''}`}
                    onClick={() => setFilter('star')}
                >
                    <div className="stat-icon-pro">
                        <Star size={22} />
                    </div>
                    <div className="stat-body">
                        <span className="stat-number">{stats?.risk_distribution?.['Star'] || 0}</span>
                        <span className="stat-label">Star Performers</span>
                    </div>
                    <div className="stat-trend positive">
                        <ArrowUpRight size={14} />
                        <span>{stats?.risk_distribution?.['Star'] || 0} performing</span>
                    </div>
                </div>
            </div>

            {/* Table Toolbar with Segmented Tabs */}
            <div className="table-toolbar">
                <div className="toolbar-left">
                    <div className="filter-pills">
                        <button
                            className={`pill ${filter === 'at_risk' ? 'active' : ''}`}
                            onClick={() => setFilter('at_risk')}
                        >
                            At Risk ({stats?.risk_distribution?.['At Risk'] || 0})
                        </button>
                        <button
                            className={`pill ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            All Students ({totalStudents})
                        </button>
                        <button
                            className={`pill ${filter === 'star' ? 'active' : ''}`}
                            onClick={() => setFilter('star')}
                        >
                            Stars ({stats?.risk_distribution?.['Star'] || 0})
                        </button>
                    </div>
                </div>
                <div className="toolbar-right">
                    <div className="search-input">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="risk-table-pro">
                {loading ? (
                    <div className="table-loading">
                        <RefreshCw className="spinning" size={28} />
                        <span>Loading student data...</span>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="table-empty">
                        <Shield size={48} />
                        <h3>No Students Found</h3>
                        <p>{filter === 'at_risk' ? 'Great news! No students are currently at risk.' : 'No students match your criteria.'}</p>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th className="col-student">Student</th>
                                <th className="col-score">Score</th>
                                <th className="col-metric">Attendance</th>
                                <th className="col-metric">Grades</th>
                                <th className="col-metric">Engagement</th>
                                <th className="col-factors">Risk Factors</th>
                                <th className="col-actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((student, index) => {
                                const isExpanded = expandedRow === student.id;
                                const factors = student.risk_factors || [];
                                const scoreColor = getScoreColor(student.risk_score);

                                const colors = ['purple', 'blue', 'teal', 'rose', 'amber'];
                                const colorIndex = student.full_name.charCodeAt(0) % colors.length;
                                const avatarColor = colors[colorIndex];

                                return (
                                    <React.Fragment key={student.id}>
                                        <motion.tr
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.03 }}
                                            className={isExpanded ? 'expanded' : ''}
                                        >
                                            {/* Student */}
                                            <td className="col-student">
                                                <div className="student-profile-tile">
                                                    <div
                                                        className="circular-avatar"
                                                        data-color={avatarColor}
                                                        title={student.full_name}
                                                    >
                                                        {student.avatar_url ? (
                                                            <img src={student.avatar_url} alt={student.full_name} />
                                                        ) : (
                                                            <span>{getInitials(student.full_name)}</span>
                                                        )}
                                                    </div>
                                                    <div className="student-details-modern">
                                                        <span className="student-name-modern">{toSentenceCase(student.full_name)}</span>
                                                        <span className="student-email-modern">{student.email || student.student_id}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Score - Circular Ring */}
                                            <td className="col-score">
                                                <div className="score-cell">
                                                    <ScoreRing
                                                        score={student.risk_score || 0}
                                                        color={scoreColor}
                                                    />
                                                </div>
                                            </td>

                                            {/* Metrics with trend indicators */}
                                            <td className="col-metric">
                                                <MetricWithTrend
                                                    value={student.attendance_score}
                                                    threshold={75}
                                                />
                                            </td>
                                            <td className="col-metric">
                                                <MetricWithTrend
                                                    value={student.grade_avg}
                                                    threshold={50}
                                                />
                                            </td>
                                            <td className="col-metric">
                                                <MetricWithTrend
                                                    value={student.engagement_score}
                                                    threshold={40}
                                                />
                                            </td>

                                            {/* Risk Factors */}
                                            <td className="col-factors">
                                                <div className="factors-cell">
                                                    {factors.slice(0, 1).map((f, i) => (
                                                        <span key={i} className="factor-pill warning">{f}</span>
                                                    ))}
                                                    {factors.length > 1 && (
                                                        <button
                                                            className="more-btn"
                                                            onClick={() => setExpandedRow(isExpanded ? null : student.id)}
                                                            title={`${factors.length - 1} more factors`}
                                                        >
                                                            +{factors.length - 1}
                                                            <ChevronDown size={12} className={isExpanded ? 'rotated' : ''} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions - Ghost Button */}
                                            <td className="col-actions">
                                                <div className="actions-cell">
                                                    <button
                                                        className="action-primary"
                                                        onClick={() => handleViewStudent(student.id)}
                                                    >
                                                        <Eye size={14} />
                                                        View Profile
                                                    </button>
                                                    <button className="action-secondary" title="Contact Student">
                                                        <MessageSquare size={14} />
                                                    </button>
                                                    <button className="action-menu" title="More options">
                                                        <MoreHorizontal size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>

                                        {/* Expanded Row */}
                                        <AnimatePresence>
                                            {isExpanded && factors.length > 1 && (
                                                <motion.tr
                                                    className="expanded-row"
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                >
                                                    <td colSpan={7}>
                                                        <div className="expanded-content">
                                                            <strong>All Risk Factors</strong>
                                                            <div className="all-factors">
                                                                {factors.map((f, i) => (
                                                                    <span key={i} className="factor-pill warning">{f}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            )}
                                        </AnimatePresence>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer */}
            <div className="table-footer">
                <span>Showing {filteredStudents.length} of {totalStudents} students</span>
                <span className="last-updated">Live - Last analyzed: {new Date().toLocaleTimeString()}</span>
            </div>
        </div>
    );
};

export default RiskCenter;



