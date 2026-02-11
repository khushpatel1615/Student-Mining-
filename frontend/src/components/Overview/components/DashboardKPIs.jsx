import React from 'react'
import {
    Users,
    TrendingUp,
    AlertTriangle,
    GraduationCap,
    Activity,
    BookOpen,
    CheckCircle,
    AlertCircle,
    Zap
} from 'lucide-react'

const safeToFixed = (value, decimals = 2) => {
    const num = Number(value)
    return isNaN(num) ? (0).toFixed(decimals) : num.toFixed(decimals)
}

const DashboardKPIs = ({ systemStats, onKPIClick }) => {
    return (
        <div className="kpi-grid">
            <div className="kpi-card students clickable" onClick={() => onKPIClick('students')}>
                <div className="kpi-icon">
                    <Users size={24} />
                </div>
                <div className="kpi-content">
                    <span className="kpi-label">Total Students</span>
                    <span className="kpi-value">{systemStats.totalStudents}</span>
                    <div className="kpi-trend neutral">
                        <Users size={14} />
                        <span>{systemStats.totalTeachers} teachers</span>
                    </div>
                </div>
            </div>

            <div className="kpi-card gpa clickable" onClick={() => onKPIClick('gpa')}>
                <div className="kpi-icon">
                    <TrendingUp size={24} />
                </div>
                <div className="kpi-content">
                    <span className="kpi-label">Average GPA</span>
                    <span className="kpi-value">{safeToFixed(systemStats.averageGPA, 2)}</span>
                    <div className={`kpi-trend ${systemStats.passRate >= 60 ? 'positive' : 'negative'}`}>
                        {systemStats.passRate >= 60 ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                        <span>{safeToFixed(systemStats.passRate, 1)}% pass rate</span>
                    </div>
                </div>
            </div>

            <div className="kpi-card at-risk clickable" onClick={() => onKPIClick('at-risk')}>
                <div className="kpi-icon">
                    <AlertTriangle size={24} />
                </div>
                <div className="kpi-content">
                    <span className="kpi-label">At-Risk Students</span>
                    <span className="kpi-value">{systemStats.atRiskCount}</span>
                    <div className={`kpi-trend ${systemStats.atRiskCount > 0 ? 'negative' : 'positive'}`}>
                        {systemStats.atRiskCount > 0 ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                        <span>{systemStats.atRiskCount > 0 ? 'Needs attention' : 'All on track'}</span>
                    </div>
                </div>
            </div>

            <div className="kpi-card programs clickable" onClick={() => onKPIClick('programs')}>
                <div className="kpi-icon">
                    <GraduationCap size={24} />
                </div>
                <div className="kpi-content">
                    <span className="kpi-label">Programs</span>
                    <span className="kpi-value">{systemStats.totalPrograms}</span>
                    <div className="kpi-trend neutral">
                        <BookOpen size={14} />
                        <span>{systemStats.totalSubjects} subjects</span>
                    </div>
                </div>
            </div>

            <div className="kpi-card engagement clickable" onClick={() => onKPIClick('engagement')}>
                <div className="kpi-icon">
                    <Activity size={24} />
                </div>
                <div className="kpi-content">
                    <span className="kpi-label">Engagement Score</span>
                    <span className="kpi-value">{systemStats.engagementScore}%</span>
                    <div className={`kpi-trend ${systemStats.engagementScore >= 70 ? 'positive' : systemStats.engagementScore >= 40 ? 'neutral' : 'negative'}`}>
                        <Zap size={14} />
                        <span>
                            {systemStats.engagementScore >= 70
                                ? 'High activity'
                                : systemStats.engagementScore >= 40
                                    ? 'Moderate activity'
                                    : 'Low activity'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DashboardKPIs
