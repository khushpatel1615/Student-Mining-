/**
 * Learning Behavior Analysis Dashboard
 * Main dashboard component for viewing at-risk students and managing interventions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import {
    AlertTriangle, Users, TrendingDown, TrendingUp, Search, RefreshCw,
    Eye, MessageSquare, ChevronLeft, ChevronRight, X, Calendar, Clock,
    Activity, CheckCircle, XCircle, AlertCircle, Loader2
} from 'lucide-react';
import './LearningBehaviorDashboard.css';

export function LearningBehaviorDashboard() {
    const { token } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [summary, setSummary] = useState({ critical: 0, at_risk: 0, warning: 0, avg_engagement: 0 });
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showInterventionForm, setShowInterventionForm] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPagination(prev => ({ ...prev, page: 1 }));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchAtRiskStudents = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);

        try {
            const riskLevelParam = filter === 'all' ? '' : `&risk_level=${filter}`;
            const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
            const offset = (pagination.page - 1) * pagination.limit;

            const response = await fetch(
                `${API_BASE}/behavior/at_risk_students.php?limit=${pagination.limit}&offset=${offset}${riskLevelParam}${searchParam}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (!response.ok) throw new Error('Failed to fetch students');
            const data = await response.json();

            if (data.success) {
                setStudents(data.students || []);
                setSummary(data.summary || {});
                setPagination(prev => ({ ...prev, total: data.pagination?.total || 0 }));
            } else throw new Error(data.error || 'Unknown error');
        } catch (err) {
            console.error('Error fetching at-risk students:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, filter, debouncedSearch, pagination.page, pagination.limit]);

    useEffect(() => { fetchAtRiskStudents(); }, [fetchAtRiskStudents]);

    const handleRefresh = () => { setRefreshing(true); fetchAtRiskStudents(); };
    const handleFilterChange = (newFilter) => { setFilter(newFilter); setPagination(prev => ({ ...prev, page: 1 })); };

    const getRiskBadge = (riskLevel) => {
        const badges = {
            critical: { text: 'CRITICAL', className: 'risk-badge-critical' },
            at_risk: { text: 'AT RISK', className: 'risk-badge-at-risk' },
            warning: { text: 'WARNING', className: 'risk-badge-warning' },
            safe: { text: 'SAFE', className: 'risk-badge-safe' }
        };
        const badge = badges[riskLevel] || badges.safe;
        return <span className={`risk-badge ${badge.className}`}>{badge.text}</span>;
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div className="learning-behavior-dashboard">
            <div className="lbd-header">
                <div className="lbd-header-content">
                    <div className="lbd-header-text">
                        <h1>Learning Behavior Analysis</h1>
                        <p>Monitor student engagement and manage interventions</p>
                    </div>
                    <button className="lbd-refresh-btn" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw className={`icon ${refreshing ? 'spinning' : ''}`} size={18} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            <div className="lbd-summary-grid">
                <SummaryCard title="Critical" value={summary.critical} icon={<AlertTriangle size={24} />} color="critical" />
                <SummaryCard title="At Risk" value={summary.at_risk} icon={<TrendingDown size={24} />} color="at-risk" />
                <SummaryCard title="Warning" value={summary.warning} icon={<AlertCircle size={24} />} color="warning" />
                <SummaryCard title="Avg Engagement" value={`${summary.avg_engagement?.toFixed(1) || 0}%`} icon={<Activity size={24} />} color="info" />
            </div>

            <div className="lbd-filters">
                <div className="lbd-search-box">
                    <Search size={18} className="search-icon" />
                    <input type="text" placeholder="Search by name, email, or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    {searchTerm && <button className="clear-search" onClick={() => setSearchTerm('')}><X size={16} /></button>}
                </div>
                <div className="lbd-filter-pills">
                    {['all', 'critical', 'at_risk', 'warning'].map(level => (
                        <button key={level} onClick={() => handleFilterChange(level)} className={`filter-pill ${filter === level ? 'active' : ''}`}>
                            {level.replace('_', ' ').toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {error && <div className="lbd-error"><AlertTriangle size={20} /><span>{error}</span><button onClick={handleRefresh}>Retry</button></div>}

            {loading && !refreshing ? (
                <div className="lbd-loading"><Loader2 className="spinning" size={32} /><p>Loading students...</p></div>
            ) : students.length === 0 ? (
                <div className="lbd-empty"><Users size={48} /><h3>No students found</h3><p>{searchTerm ? 'Try adjusting your search criteria' : 'No at-risk students in the current period'}</p></div>
            ) : (
                <>
                    <div className="lbd-table-container">
                        <table className="lbd-table">
                            <thead><tr><th>Student</th><th>Risk Level</th><th>Risk Score</th><th>Engagement</th><th>On-Time Rate</th><th>Interventions</th><th>Actions</th></tr></thead>
                            <tbody>
                                {students.map(student => (
                                    <tr key={student.id} className={student.needs_attention ? 'needs-attention' : ''}>
                                        <td className="student-cell">
                                            <div className="student-info">
                                                <div className="student-avatar">{student.avatar_url ? <img src={student.avatar_url} alt="" /> : <span>{student.student_name?.charAt(0) || '?'}</span>}</div>
                                                <div className="student-details"><span className="student-name">{student.student_name}</span><span className="student-email">{student.email}</span></div>
                                            </div>
                                        </td>
                                        <td>{getRiskBadge(student.risk_level)}</td>
                                        <td><div className="risk-score-cell"><div className="mini-progress"><div className={`mini-progress-bar risk-${student.risk_level}`} style={{ width: `${Math.min(student.risk_score || 0, 100)}%` }} /></div><span className="score-value">{(student.risk_score || 0).toFixed(0)}%</span></div></td>
                                        <td><span className={`metric-value ${(student.overall_engagement_score || 0) < 50 ? 'low' : ''}`}>{(student.overall_engagement_score || 0).toFixed(1)}%</span></td>
                                        <td><span className={`metric-value ${(student.on_time_submission_rate || 0) < 70 ? 'low' : ''}`}>{(student.on_time_submission_rate || 0).toFixed(1)}%</span></td>
                                        <td><span className={`intervention-count ${student.open_interventions > 0 ? 'has-interventions' : ''}`}>{student.open_interventions || 0} open</span></td>
                                        <td><div className="action-buttons"><button className="action-btn view" onClick={() => setSelectedStudent(student)} title="View Profile"><Eye size={16} /></button><button className="action-btn intervene" onClick={() => { setSelectedStudent(student); setShowInterventionForm(true); }} title="Create Intervention"><MessageSquare size={16} /></button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="lbd-pagination">
                        <span className="pagination-info">Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</span>
                        <div className="pagination-buttons">
                            <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1} className="pagination-btn"><ChevronLeft size={18} />Previous</button>
                            <span className="page-indicator">Page {pagination.page} of {totalPages || 1}</span>
                            <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page >= totalPages} className="pagination-btn">Next<ChevronRight size={18} /></button>
                        </div>
                    </div>
                </>
            )}

            {selectedStudent && !showInterventionForm && <StudentBehaviorProfile student={selectedStudent} token={token} onClose={() => setSelectedStudent(null)} onIntervene={() => setShowInterventionForm(true)} />}
            {selectedStudent && showInterventionForm && <InterventionPanel studentId={selectedStudent.id} studentName={selectedStudent.student_name} riskScore={selectedStudent.risk_score} riskFactors={selectedStudent.risk_factors} token={token} onClose={() => { setShowInterventionForm(false); setSelectedStudent(null); }} onSuccess={() => { setShowInterventionForm(false); setSelectedStudent(null); fetchAtRiskStudents(); }} />}
        </div>
    );
}

function SummaryCard({ title, value, icon, color }) {
    return (
        <div className={`summary-card summary-${color}`}>
            <div className="summary-card-content">
                <div className="summary-card-icon">{icon}</div>
                <div className="summary-card-data"><span className="summary-card-title">{title}</span><span className="summary-card-value">{value}</span></div>
            </div>
        </div>
    );
}

function StudentBehaviorProfile({ student, token, onClose, onIntervene }) {
    const [patterns, setPatterns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPatterns = async () => {
            try {
                const response = await fetch(`${API_BASE}/behavior/patterns.php?user_id=${student.id}&weeks=8`, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await response.json();
                if (data.success) setPatterns(data.patterns || []);
            } catch (err) { console.error('Error fetching patterns:', err); }
            finally { setLoading(false); }
        };
        fetchPatterns();
    }, [student.id, token]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content profile-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2>{student.student_name}</h2><button className="modal-close" onClick={onClose}><X size={20} /></button></div>
                <div className="modal-body">
                    <div className="metrics-grid">
                        <div className="metric-box"><span className="metric-box-label">Risk Score</span><span className="metric-box-value">{(student.risk_score || 0).toFixed(1)}%</span></div>
                        <div className="metric-box"><span className="metric-box-label">Engagement</span><span className="metric-box-value">{(student.overall_engagement_score || 0).toFixed(1)}%</span></div>
                        <div className="metric-box"><span className="metric-box-label">On-Time Rate</span><span className="metric-box-value">{(student.on_time_submission_rate || 0).toFixed(1)}%</span></div>
                        <div className="metric-box"><span className="metric-box-label">Grade Trend</span><span className="metric-box-value">{student.grade_trend || 'N/A'}</span></div>
                    </div>
                    {student.risk_factors && Object.keys(student.risk_factors).length > 0 && (
                        <div className="risk-factors-section"><h3>Risk Factors</h3><div className="risk-factors-list">{Object.entries(student.risk_factors).filter(([, v]) => v).map(([factor]) => <span key={factor} className="risk-factor-tag">{factor.replace(/_/g, ' ')}</span>)}</div></div>
                    )}
                    <div className="behavior-trends-section"><h3>Behavior Trends</h3>
                        {loading ? <p>Loading...</p> : patterns.length === 0 ? <p>No data available</p> : (
                            <div className="patterns-timeline">{patterns.slice(0, 4).map((p, i) => <div key={i} className="pattern-week"><span className="week-date">Week of {new Date(p.week_start).toLocaleDateString()}</span><div className="pattern-metrics"><span>Logins: {p.total_logins}</span><span>Engagement: {(p.overall_engagement_score || 0).toFixed(0)}%</span><span>Days: {p.days_active}/7</span></div></div>)}</div>
                        )}
                    </div>
                </div>
                <div className="modal-footer"><button className="btn btn-primary" onClick={onIntervene}><MessageSquare size={18} />Create Intervention</button><button className="btn btn-secondary" onClick={onClose}>Close</button></div>
            </div>
        </div>
    );
}

function InterventionPanel({ studentId, studentName, riskScore, riskFactors, token, onClose, onSuccess }) {
    const [formData, setFormData] = useState({ student_id: studentId, intervention_type: 'email', title: '', description: '', notes: '', follow_up_date: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError(''); setSuccess('');
        try {
            const response = await fetch(`${API_BASE}/behavior/interventions.php`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ ...formData, triggered_by_risk_score: riskScore, risk_factors: riskFactors }) });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Failed');
            setSuccess('Intervention created!');
            setTimeout(onSuccess, 1500);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content intervention-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2>Create Intervention</h2><button className="modal-close" onClick={onClose}><X size={20} /></button></div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && <div className="alert alert-error"><XCircle size={18} />{error}</div>}
                        {success && <div className="alert alert-success"><CheckCircle size={18} />{success}</div>}
                        <div className="form-group"><label>Student</label><div className="form-static">{studentName}</div></div>
                        <div className="form-group"><label>Intervention Type</label><select value={formData.intervention_type} onChange={(e) => setFormData({ ...formData, intervention_type: e.target.value })}><option value="email">Email</option><option value="meeting">Meeting</option><option value="call">Phone Call</option><option value="warning">Academic Warning</option><option value="support_referral">Support Referral</option><option value="other">Other</option></select></div>
                        <div className="form-group"><label>Title *</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Low Engagement Alert" required /></div>
                        <div className="form-group"><label>Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="3" placeholder="What action will be taken?" /></div>
                        <div className="form-group"><label>Follow-up Date</label><input type="date" value={formData.follow_up_date} onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })} /></div>
                    </div>
                    <div className="modal-footer"><button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <><Loader2 className="spinning" size={18} />Creating...</> : <><CheckCircle size={18} />Create</>}</button><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button></div>
                </form>
            </div>
        </div>
    );
}

export default LearningBehaviorDashboard;
