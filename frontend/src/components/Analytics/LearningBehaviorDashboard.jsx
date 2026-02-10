/**
 * ============================================================================
 * LEARNING BEHAVIOR ANALYSIS DASHBOARD
 * ============================================================================
 * 
 * Modern, clean data table design for viewing at-risk students and managing interventions.
 * 
 * Features:
 * - Clean data table with proper columns
 * - Circular risk score indicators
 * - Color-coded risk badges
 * - Clear action buttons
 * - Responsive design
 * 
 * ============================================================================
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';
import {
    AlertTriangle, Users, TrendingDown, Search, RefreshCw,
    Eye, Flag, ChevronLeft, ChevronRight, X, Calendar,
    Activity, CheckCircle, XCircle, AlertCircle, Loader2,
    Database, WifiOff, MessageSquare, Zap, Clock
} from 'lucide-react';
import './LearningBehaviorDashboard.css';

// ============================================================================
// API CONFIGURATION
// ============================================================================
const API_BASE_URL = API_BASE;

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
export function LearningBehaviorDashboard() {
    const { token } = useAuth();
    const showDevTools = import.meta?.env?.DEV;
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [errorDetails, setErrorDetails] = useState(null);
    const [filter, setFilter] = useState('risky');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [summary, setSummary] = useState({ critical: 0, at_risk: 0, warning: 0, avg_engagement: 0 });
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showInterventionForm, setShowInterventionForm] = useState(false);
    const [setupMessage, setSetupMessage] = useState(null);
    const [programs, setPrograms] = useState([]);
    const [selectedProgram, setSelectedProgram] = useState('');
    const userSelectedFilterRef = useRef(false);
    const summaryRef = useRef(summary);

    const getAutoFilter = useCallback((nextSummary) => {
        const critical = Number(nextSummary?.critical || 0);
        const atRisk = Number(nextSummary?.at_risk || 0);
        const warning = Number(nextSummary?.warning || 0);

        if (critical > 0) return 'critical';
        if (atRisk > 0) return 'at_risk';
        if (warning > 0) return 'warning';
        return 'all';
    }, []);

    const getFilterCount = useCallback((key, nextSummary) => {
        const critical = Number(nextSummary?.critical || 0);
        const atRisk = Number(nextSummary?.at_risk || 0);
        const warning = Number(nextSummary?.warning || 0);
        const riskyTotal = critical + atRisk + warning;

        if (key === 'critical') return critical;
        if (key === 'at_risk') return atRisk;
        if (key === 'warning') return warning;
        if (key === 'risky') return riskyTotal;
        if (key === 'all') return riskyTotal;
        return riskyTotal;
    }, []);

    // Fetch programs
    useEffect(() => {
        const fetchPrograms = async () => {
            if (!token) return;
            try {
                const response = await fetch(`${API_BASE_URL}/programs.php`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    setPrograms(data.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch programs:', err);
            }
        };
        fetchPrograms();
    }, [token]);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPagination(prev => ({ ...prev, page: 1 }));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setFilter('risky');
    }, []);

    // Fetch at-risk students
    const fetchAtRiskStudents = useCallback(async () => {
        if (!token) {
            setError('Not authenticated. Please log in.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        setErrorDetails(null);
        setSetupMessage(null);

        const params = new URLSearchParams({
            limit: pagination.limit.toString(),
            offset: ((pagination.page - 1) * pagination.limit).toString()
        });

        if (filter !== 'all') {
            params.append('risk_level', filter);
        }

        if (selectedProgram) {
            params.append('program_id', selectedProgram);
        }

        if (debouncedSearch) {
            params.append('search', debouncedSearch);
        }

        const url = `${API_BASE_URL}/behavior/at_risk_students.php?${params.toString()}`;
        console.log('[LearningBehaviorDashboard] Fetching:', url);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            console.log('[LearningBehaviorDashboard] Response status:', response.status);

            if (!response.ok) {
                let errorMessage = 'Failed to fetch students';
                let details = { status: response.status, statusText: response.statusText };

                switch (response.status) {
                    case 401:
                        errorMessage = 'Authentication failed. Please log in again.';
                        break;
                    case 403:
                        errorMessage = 'Access denied. Admin or Teacher role required.';
                        break;
                    case 404:
                        errorMessage = 'API endpoint not found. Check server configuration.';
                        details.hint = 'Verify that the backend is running';
                        break;
                    case 500:
                        errorMessage = 'Server error. Check the PHP error logs.';
                        break;
                    default:
                        errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
                }

                try {
                    const errorData = await response.json();
                    if (errorData.error) errorMessage = errorData.error;
                    if (errorData.hint) details.hint = errorData.hint;
                } catch (parseErr) {
                    details.parseError = 'Response was not JSON';
                }

                console.error('[LearningBehaviorDashboard] Error:', errorMessage, details);
                setError(errorMessage);
                setErrorDetails(details);
                return;
            }

            const data = await response.json();
            console.log('[LearningBehaviorDashboard] Data received:', {
                success: data.success,
                studentCount: data.students?.length || 0,
                summary: data.summary
            });

            if (data.success) {
                setStudents(data.students || []);
                const nextSummary = data.summary || { critical: 0, at_risk: 0, warning: 0, avg_engagement: 0 };
                setSummary(nextSummary);
                setPagination(prev => ({ ...prev, total: data.pagination?.total || 0 }));
                summaryRef.current = nextSummary;

                if (data.message) {
                    setSetupMessage({
                        message: data.message,
                        setupUrl: data.setup_url
                    });
                }
            } else {
                throw new Error(data.error || 'Unknown error from API');
            }

        } catch (err) {
            console.error('[LearningBehaviorDashboard] Fetch error:', err);

            if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
                setError('Network Error: Cannot connect to the server');
                setErrorDetails({
                    type: 'NETWORK_ERROR',
                    hint: 'Check if Apache is running in XAMPP',
                    url: url
                });
            } else if (err.name === 'SyntaxError') {
                setError('Invalid response from server');
                setErrorDetails({
                    type: 'PARSE_ERROR',
                    hint: 'Server returned invalid JSON',
                    message: err.message
                });
            } else {
                setError(err.message || 'An unexpected error occurred');
                setErrorDetails({ type: 'UNKNOWN_ERROR', message: err.message });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, filter, debouncedSearch, pagination.page, pagination.limit, selectedProgram]);

    useEffect(() => { fetchAtRiskStudents(); }, [fetchAtRiskStudents]);

    useEffect(() => {
        const nextSummary = summaryRef.current;
        if (!nextSummary) return;

        const autoFilter = getAutoFilter(nextSummary);

        if (!userSelectedFilterRef.current && autoFilter !== filter) {
            setFilter(autoFilter);
            setPagination(prev => ({ ...prev, page: 1 }));
        }
    }, [filter, getAutoFilter, summary]);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const response = await fetch(`${API_BASE_URL}/behavior/refresh.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            // After re-calculation, fetch the fresh data
            await fetchAtRiskStudents();
        } catch (err) {
            console.error('Refresh failed:', err);
            setError('Failed to refresh data: ' + err.message);
            setRefreshing(false);
        }
    };
    const handleFilterChange = (newFilter) => {
        userSelectedFilterRef.current = true;
        setFilter(newFilter);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;

    // ========================================================================
    // RENDER
    // ========================================================================
    return (
        <div className="lba-dashboard">
            {/* Header */}
            <header className="lba-header">
                <div className="lba-header-left">
                    <div className="lba-header-icon">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h1>Learning Behavior Analysis</h1>
                        <p>Monitor student engagement patterns and manage interventions</p>
                    </div>
                </div>
                <button
                    className="lba-refresh-btn"
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    <RefreshCw className={refreshing ? 'spinning' : ''} size={18} />
                    {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
            </header>

            {/* Stats Cards */}
            <div className="lba-stats-grid">
                <StatCard
                    label="Critical"
                    value={summary.critical}
                    icon={<AlertTriangle size={20} />}
                    variant="critical"
                    subtitle="Immediate action needed"
                    onClick={() => handleFilterChange('critical')}
                    active={filter === 'critical'}
                />
                <StatCard
                    label="At Risk"
                    value={summary.at_risk}
                    icon={<TrendingDown size={20} />}
                    variant="at-risk"
                    subtitle="Needs monitoring"
                    onClick={() => handleFilterChange('at_risk')}
                    active={filter === 'at_risk'}
                />
                <StatCard
                    label="Warning"
                    value={summary.warning}
                    icon={<AlertCircle size={20} />}
                    variant="warning"
                    subtitle="Early signs detected"
                    onClick={() => handleFilterChange('warning')}
                    active={filter === 'warning'}
                />
                <StatCard
                    label="Avg Engagement"
                    value={`${(summary.avg_engagement || 0).toFixed(1)}%`}
                    icon={<Zap size={20} />}
                    variant="info"
                    subtitle="Across all students"
                />
            </div>

            {/* Filters & Search */}
            <div className="lba-controls">
                <div className="lba-search-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or student ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="lba-search-input"
                    />
                    {searchTerm && (
                        <button className="clear-btn" onClick={() => setSearchTerm('')}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="lba-filter-group">
                    <select
                        className="lba-program-select"
                        value={selectedProgram}
                        onChange={(e) => {
                            setSelectedProgram(e.target.value);
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                    >
                        <option value="">All Programs</option>
                        {programs.map(prog => (
                            <option key={prog.id} value={prog.id}>{prog.name}</option>
                        ))}
                    </select>
                </div>

                <div className="lba-filter-group">
                    {[
                        { key: 'risky', label: 'Needs Attention' },
                        { key: 'all', label: 'All Students' },
                        { key: 'critical', label: 'Critical' },
                        { key: 'at_risk', label: 'At Risk' },
                        { key: 'warning', label: 'Warning' }
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => handleFilterChange(key)}
                            className={`lba-filter-btn ${filter === key ? 'active' : ''}`}
                            style={key === 'risky' && filter === 'risky' ? { backgroundColor: '#dc2626', borderColor: '#dc2626', color: 'white' } : {}}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Setup Message */}
            {setupMessage && (
                <div className="lba-notice lba-notice-warning">
                    <Database size={20} />
                    <div className="notice-content">
                        <span>{setupMessage.message}</span>
                        {setupMessage.setupUrl && showDevTools && (
                            <a
                                href={`http://localhost/StudentDataMining${setupMessage.setupUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="notice-link"
                            >
                                Run Setup Script ->
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="lba-notice lba-notice-error">
                    {errorDetails?.type === 'NETWORK_ERROR' ? <WifiOff size={20} /> : <AlertTriangle size={20} />}
                    <div className="notice-content">
                        <strong>{error}</strong>
                        {errorDetails?.hint && <span>{errorDetails.hint}</span>}
                    </div>
                    <button onClick={handleRefresh} className="notice-retry-btn">Retry</button>
                </div>
            )}

            {/* Main Content */}
            {loading && !refreshing ? (
                <div className="lba-loading-state">
                    <Loader2 className="spinning" size={40} />
                    <p>Loading student data...</p>
                </div>
            ) : students.length === 0 && !error ? (
                <div className="lba-empty-state">
                    <div className="empty-icon">
                        <Users size={48} />
                    </div>
                    <h3>No Students Found</h3>
                    <p>{searchTerm ? 'Try adjusting your search criteria' : 'No at-risk students in the current period'}</p>
                    {!searchTerm && showDevTools && (
                        <a
                            href="http://localhost/StudentDataMining/backend/api/behavior/seed_mock_data.php"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="lba-seed-btn"
                        >
                            <Database size={18} />
                            Seed Mock Data for Testing
                        </a>
                    )}
                </div>
            ) : students.length > 0 && (
                <>
                    {/* Data Table */}
                    <div className="lba-table-wrapper">
                        <table className="lba-data-table">
                            <thead>
                                <tr>
                                    <th className="col-student">Student</th>
                                    <th className="col-status">Risk Status</th>
                                    <th className="col-score">Risk Score</th>
                                    <th className="col-engagement">Engagement</th>
                                    <th className="col-ontime">On-Time Rate</th>
                                    <th className="col-interventions">Interventions</th>
                                    <th className="col-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => (
                                    <StudentRow
                                        key={student.id}
                                        student={student}
                                        onViewDetails={() => {
                                            console.log('View clicked for:', student);
                                            setSelectedStudent(student);
                                        }}
                                        onCreateIntervention={() => {
                                            console.log('Intervene clicked for:', student);
                                            setSelectedStudent(student);
                                            setShowInterventionForm(true);
                                        }}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="lba-pagination">
                        <span className="pagination-info">
                            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                            {pagination.total} students
                        </span>
                        <div className="pagination-controls">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                disabled={pagination.page === 1}
                                className="pagination-btn"
                            >
                                <ChevronLeft size={18} />
                                Previous
                            </button>
                            <span className="pagination-current">
                                Page {pagination.page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                disabled={pagination.page >= totalPages}
                                className="pagination-btn"
                            >
                                Next
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Modals */}
            {selectedStudent && !showInterventionForm && (
                <div
                    className="modal-overlay"
                    onClick={() => setSelectedStudent(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: '24px',
                            border: '2px solid #000',
                            padding: '0',
                            maxWidth: '500px',
                            width: '100%',
                            maxHeight: '85vh',
                            overflow: 'hidden',
                            position: 'relative',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                        }}
                    >
                        {/* Header Background */}
                        <div style={{
                            background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                            padding: '32px 24px 24px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            position: 'relative'
                        }}>
                            <button
                                onClick={() => setSelectedStudent(null)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#64748b',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    zIndex: 10
                                }}
                                title="Close"
                            >
                                <X size={18} />
                            </button>

                            {/* Large Avatar */}
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                background: '#6366f1',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '32px',
                                fontWeight: '700',
                                marginBottom: '16px',
                                boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
                                border: '4px solid #fff'
                            }}>
                                {selectedStudent.student_name?.charAt(0) || 'S'}
                            </div>

                            <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', color: '#0f172a' }}>
                                {selectedStudent.student_name}
                            </h2>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ opacity: 0.7 }}>Email</span> {selectedStudent.email}
                            </p>
                        </div>

                        {/* Body Content */}
                        <div style={{ padding: '24px' }}>

                            {/* Stats Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '16px',
                                marginBottom: '24px'
                            }}>
                                {/* Risk Score Card */}
                                <div style={{
                                    padding: '16px',
                                    background: '#fef2f2',
                                    borderRadius: '16px',
                                    border: '1px solid #fee2e2'
                                }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Risk Score
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '2rem', fontWeight: '800', color: '#dc2626', lineHeight: 1 }}>
                                            {selectedStudent.risk_score || 0}
                                        </span>
                                        <span style={{ fontSize: '0.875rem', color: '#ef4444', paddingBottom: '4px' }}>/ 100</span>
                                    </div>
                                </div>

                                {/* Engagement Card */}
                                <div style={{
                                    padding: '16px',
                                    background: '#eff6ff',
                                    borderRadius: '16px',
                                    border: '1px solid #dbeafe'
                                }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Engagement
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '2rem', fontWeight: '800', color: '#2563eb', lineHeight: 1 }}>
                                            {(selectedStudent.overall_engagement_score || 0).toFixed(0)}
                                        </span>
                                        <span style={{ fontSize: '0.875rem', color: '#3b82f6', paddingBottom: '4px' }}>%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Risk Level</span>
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: '99px',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        background: selectedStudent.risk_level === 'critical' ? '#fef2f2' : '#fff7ed',
                                        color: selectedStudent.risk_level === 'critical' ? '#dc2626' : '#ea580c',
                                        border: `1px solid ${selectedStudent.risk_level === 'critical' ? '#fca5a5' : '#fdba74'}`
                                    }}>
                                        {(selectedStudent.risk_level || 'Unknown').toUpperCase()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Open Interventions</span>
                                    <span style={{ fontWeight: '600', color: '#0f172a' }}>{selectedStudent.open_interventions || 0} active</span>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                type="button"
                                onClick={() => setShowInterventionForm(true)}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: '#4f46e5',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '0.95rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
                                    transition: 'transform 0.1s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                Create Intervention Strategy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedStudent && showInterventionForm && (
                <InterventionModal
                    studentId={selectedStudent.id}
                    studentName={selectedStudent.student_name}
                    riskScore={selectedStudent.risk_score}
                    riskFactors={selectedStudent.risk_factors}
                    token={token}
                    onClose={() => {
                        setShowInterventionForm(false);
                        setSelectedStudent(null);
                    }}
                    onSuccess={() => {
                        setShowInterventionForm(false);
                        setSelectedStudent(null);
                        fetchAtRiskStudents();
                    }}
                />
            )}
        </div>
    );
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================
function StatCard({ label, value, icon, variant, subtitle, onClick, active }) {
    return (
        <div
            className={`lba-stat-card lba-stat-${variant} ${active ? 'active-stat' : ''} ${onClick ? 'clickable-stat' : ''}`}
            onClick={onClick}
        >
            <div className="stat-icon">{icon}</div>
            <div className="stat-content">
                <span className="stat-value">{value}</span>
                <span className="stat-label">{label}</span>
                {subtitle && <span className="stat-subtitle">{subtitle}</span>}
            </div>
        </div>
    );
}

// ============================================================================
// STUDENT ROW COMPONENT
// ============================================================================
function StudentRow({ student, onViewDetails, onCreateIntervention }) {
    const getRiskConfig = (level) => {
        const configs = {
            critical: { label: 'Critical', className: 'risk-critical', color: '#dc2626' },
            at_risk: { label: 'At Risk', className: 'risk-at-risk', color: '#ea580c' },
            warning: { label: 'Warning', className: 'risk-warning', color: '#d97706' },
            safe: { label: 'Safe', className: 'risk-safe', color: '#16a34a' }
        };
        return configs[level] || configs.safe;
    };

    const riskConfig = getRiskConfig(student.risk_level);
    const riskScore = student.risk_score || 0;
    const engagement = student.overall_engagement_score || 0;
    const onTimeRate = student.on_time_submission_rate || 0;

    return (
        <tr>
            {/* Student Info - Clean seamless layout */}
            <td className="col-student">
                <div className="lba-student-cell">
                    {/* Avatar Circle */}
                    <div className="lba-avatar">
                        {student.avatar_url ? (
                            <img src={student.avatar_url} alt="" />
                        ) : (
                            <span>{student.student_name?.charAt(0)?.toUpperCase() || '?'}</span>
                        )}
                    </div>
                    {/* Name and Email - no box, no border */}
                    <div className="lba-student-text">
                        <div className="lba-name">{student.student_name}</div>
                        <div className="lba-email">{student.email}</div>
                    </div>
                </div>
            </td>

            {/* Risk Status Badge */}
            <td className="col-status">
                <span className={`risk-badge ${riskConfig.className}`}>
                    {riskConfig.label}
                </span>
            </td>

            {/* Risk Score - Circular Progress */}
            <td className="col-score">
                <div className="score-circle-wrapper">
                    <CircularProgress
                        value={riskScore}
                        color={riskConfig.color}
                        size={44}
                    />
                </div>
            </td>

            {/* Engagement */}
            <td className="col-engagement">
                <span className={`metric-text ${engagement < 50 ? 'metric-low' : engagement >= 70 ? 'metric-good' : ''}`}>
                    {engagement.toFixed(1)}%
                </span>
            </td>

            {/* On-Time Rate */}
            <td className="col-ontime">
                <span className={`metric-text ${onTimeRate < 70 ? 'metric-low' : onTimeRate >= 85 ? 'metric-good' : ''}`}>
                    {onTimeRate.toFixed(1)}%
                </span>
            </td>

            {/* Interventions Count */}
            <td className="col-interventions">
                <span className={`intervention-badge ${student.open_interventions > 0 ? 'has-interventions' : ''}`}>
                    {student.open_interventions || 0} open
                </span>
            </td>

            {/* Action Buttons */}
            <td className="col-actions">
                <div className="action-buttons">
                    <button
                        type="button"
                        className="action-btn action-view"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onViewDetails();
                        }}
                        title="View Details"
                        aria-label="View student details"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        <span className="btn-label">View</span>
                    </button>
                    <button
                        type="button"
                        className="action-btn action-intervene"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onCreateIntervention();
                        }}
                        title="Create Intervention"
                        aria-label="Create intervention for student"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                            <line x1="4" y1="22" x2="4" y2="15"></line>
                        </svg>
                        <span className="btn-label">Intervene</span>
                    </button>
                </div>
            </td>
        </tr>
    );
}

// ============================================================================
// CIRCULAR PROGRESS COMPONENT
// ============================================================================
function CircularProgress({ value, color, size = 44 }) {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="circular-progress" style={{ width: size, height: size }}>
            <svg width={size} height={size}>
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
            </svg>
            <span className="progress-value" style={{ color }}>
                {Math.round(value)}
            </span>
        </div>
    );
}

// ============================================================================
// STUDENT PROFILE MODAL
// ============================================================================
function StudentProfileModal({ student, token, onClose, onIntervene }) {
    const [patterns, setPatterns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!student?.id) return;

        const fetchPatterns = async () => {
            try {
                const response = await fetch(
                    `${API_BASE_URL}/behavior/patterns.php?user_id=${student.id}&weeks=8`,
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

    // Safety check - must be after all hooks
    if (!student) {
        return null;
    }

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
}

// ============================================================================
// INTERVENTION MODAL
// ============================================================================
function InterventionModal({ studentId, studentName, riskScore, riskFactors, token, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        student_id: studentId,
        intervention_type: 'email',
        title: '',
        description: '',
        notes: '',
        follow_up_date: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`${API_BASE_URL}/behavior/interventions.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    triggered_by_risk_score: riskScore,
                    risk_factors: riskFactors
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to create intervention');
            }

            setSuccess('Intervention created successfully!');
            setTimeout(onSuccess, 1500);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
                className="modal-container modal-intervention"
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff',
                    borderRadius: '24px',
                    border: '2px solid #000',
                    padding: '0',
                    maxWidth: '500px',
                    width: '90%',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
            >
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(to right, #4f46e5, #6366f1)',
                    padding: '24px',
                    color: '#fff',
                    textAlign: 'center',
                    position: 'relative'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            transition: 'background 0.2s'
                        }}
                    >
                        <X size={18} />
                    </button>

                    <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', color: '#fff' }}>Create Intervention</h2>
                    <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>For {studentName}</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 90px)' }}>
                    <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                        {error && (
                            <div className="form-alert form-alert-error">
                                <XCircle size={18} />
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="form-alert form-alert-success">
                                <CheckCircle size={18} />
                                {success}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Intervention Type</label>
                            <select
                                value={formData.intervention_type}
                                onChange={(e) => setFormData({ ...formData, intervention_type: e.target.value })}
                            >
                                <option value="email">Email Outreach</option>
                                <option value="meeting">In-Person Meeting</option>
                                <option value="call">Phone Call</option>
                                <option value="warning">Academic Warning</option>
                                <option value="support_referral">Support Referral</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Title <span className="required">*</span></label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Low Engagement Follow-up"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows="3"
                                placeholder="Describe the intervention plan and goals..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Follow-up Date</label>
                            <input
                                type="date"
                                value={formData.follow_up_date}
                                onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="modal-footer" style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                        {/* Cancel button removed per request style matches */}
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="spinning" size={18} />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={18} />
                                    Confirm Intervention
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default LearningBehaviorDashboard;
