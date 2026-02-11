/**
 * ============================================================================
 * LEARNING BEHAVIOR ANALYSIS DASHBOARD
 * ============================================================================
 */

import React, { useState } from 'react';
import {
    AlertTriangle, Users, TrendingDown, Search, RefreshCw,
    AlertCircle, Loader2, Database, WifiOff, Zap, Activity,
    ChevronLeft, ChevronRight, X
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useLearningBehaviorData } from '../../hooks/useLearningBehaviorData';
import './LearningBehaviorDashboard.css';

// Sub-components
import StatCard from './components/StatCard';
import StudentRow from './components/StudentRow';
import RiskProfileModal from './components/RiskProfileModal';
import InterventionModal from './components/InterventionModal';

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
export function LearningBehaviorDashboard() {
    const { token } = useAuth();
    const showDevTools = import.meta?.env?.DEV;

    const {
        students,
        loading,
        refreshing,
        error,
        errorDetails,
        setupMessage,
        summary,
        pagination,
        setPagination,
        filter,
        handleFilterChange,
        searchTerm,
        setSearchTerm,
        programs,
        selectedProgram,
        handleProgramChange,
        handleRefresh
    } = useLearningBehaviorData(token);

    // UI State for Modals
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showInterventionForm, setShowInterventionForm] = useState(false);

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
                        onChange={(e) => handleProgramChange(e.target.value)}
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
                                Run Setup Script →
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
                                        onViewDetails={() => setSelectedStudent(student)}
                                        onCreateIntervention={() => {
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
                <RiskProfileModal
                    student={selectedStudent}
                    token={token}
                    onClose={() => setSelectedStudent(null)}
                    onIntervene={() => setShowInterventionForm(true)}
                />
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
                        handleRefresh(); // Refresh data to update interventions count
                    }}
                />
            )}
        </div>
    );
}

export default LearningBehaviorDashboard;
