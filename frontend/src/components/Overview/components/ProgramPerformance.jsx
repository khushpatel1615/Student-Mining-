import React from 'react'
import { GraduationCap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ProgramPerformance = ({ programStats }) => {
    const navigate = useNavigate()

    return (
        <div className="programs-row">
            <div className="info-card programs-card">
                <div className="card-header">
                    <h3><GraduationCap size={18} /> Program Performance</h3>
                    <button
                        className="view-all-btn"
                        onClick={() => navigate('/admin/dashboard?tab=programs')}
                    >
                        View All
                    </button>
                </div>
                <div className="card-body">
                    {programStats.length === 0 ? (
                        <div className="empty-state">
                            <GraduationCap size={32} />
                            <p>No program analytics yet</p>
                        </div>
                    ) : (
                        <div className="programs-grid">
                            {programStats.slice(0, 4).map(program => (
                                <div key={program.id || program.name} className="program-stat-card">
                                    <div className="program-header">
                                        {program.code && <span className="program-code">{program.code}</span>}
                                        <span className="program-name">{program.name}</span>
                                    </div>
                                    <div className="program-metrics">
                                        <div className="metric">
                                            <span className="metric-value">{program.student_count}</span>
                                            <span className="metric-label">Students</span>
                                        </div>
                                        <div className="metric">
                                            <span className="metric-value">{Number(program.average_gpa || 0).toFixed(2)}</span>
                                            <span className="metric-label">Avg GPA</span>
                                        </div>
                                        <div className="metric">
                                            <span className={`metric-value ${program.pass_rate >= 80 ? 'good' : program.pass_rate >= 60 ? 'average' : 'poor'}`}>
                                                {Number(program.pass_rate || 0).toFixed(0)}%
                                            </span>
                                            <span className="metric-label">Pass Rate</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ProgramPerformance
