import React from 'react';
import CircularProgress from './CircularProgress';
import { Eye, Flag } from 'lucide-react';

const StudentRow = ({ student, onViewDetails, onCreateIntervention }) => {
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
            <td className="col-student">
                <div className="lba-student-cell">
                    <div className="lba-avatar">
                        {student.avatar_url ? (
                            <img src={student.avatar_url} alt="" />
                        ) : (
                            <span>{student.student_name?.charAt(0)?.toUpperCase() || '?'}</span>
                        )}
                    </div>
                    <div className="lba-student-text">
                        <div className="lba-name">{student.student_name}</div>
                        <div className="lba-email">{student.email}</div>
                    </div>
                </div>
            </td>

            <td className="col-status">
                <span className={`risk-badge ${riskConfig.className}`}>
                    {riskConfig.label}
                </span>
            </td>

            <td className="col-score">
                <div className="score-circle-wrapper">
                    <CircularProgress
                        value={riskScore}
                        color={riskConfig.color}
                        size={44}
                    />
                </div>
            </td>

            <td className="col-engagement">
                <span className={`metric-text ${engagement < 50 ? 'metric-low' : engagement >= 70 ? 'metric-good' : ''}`}>
                    {engagement.toFixed(1)}%
                </span>
            </td>

            <td className="col-ontime">
                <span className={`metric-text ${onTimeRate < 70 ? 'metric-low' : onTimeRate >= 85 ? 'metric-good' : ''}`}>
                    {onTimeRate.toFixed(1)}%
                </span>
            </td>

            <td className="col-interventions">
                <span className={`intervention-badge ${student.open_interventions > 0 ? 'has-interventions' : ''}`}>
                    {student.open_interventions || 0} open
                </span>
            </td>

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
                    >
                        <Eye size={16} />
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
                    >
                        <Flag size={16} />
                        <span className="btn-label">Intervene</span>
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default StudentRow;
