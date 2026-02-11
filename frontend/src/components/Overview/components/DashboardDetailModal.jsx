import React from 'react'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import { useNavigate } from 'react-router-dom'
import {
    X,
    CheckCircle,
    AlertTriangle,
    Zap,
    Activity
} from 'lucide-react'
import { safeToFixed } from '../../../utils/formatters'
import { getGPATrendChart, getPerformanceChart, getAttendanceChart } from '../../../utils/chartHelpers'

const DashboardDetailModal = ({
    type,
    onClose,
    systemStats,
    performanceData,
    semesterTrends,
    atRiskStudents
}) => {
    const navigate = useNavigate()

    return (
        <div className="detail-modal-overlay" onClick={onClose}>
            <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="detail-modal-header">
                    <h2>
                        {type === 'gpa' && 'GPA Analytics'}
                        {type === 'attendance' && 'Attendance Analysis'}
                        {type === 'at-risk' && 'At-Risk Students'}
                        {type === 'engagement' && 'Engagement Metrics'}
                    </h2>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="detail-modal-body">
                    {/* GPA Modal Content */}
                    {type === 'gpa' && (
                        <div className="gpa-detail-content">
                            <div className="detail-stats-row">
                                <div className="detail-stat-card">
                                    <span className="detail-stat-value">{safeToFixed(systemStats.averageGPA, 2)}</span>
                                    <span className="detail-stat-label">Overall GPA</span>
                                </div>
                                <div className="detail-stat-card">
                                    <span className="detail-stat-value">{safeToFixed(systemStats.passRate, 1)}%</span>
                                    <span className="detail-stat-label">Pass Rate</span>
                                </div>
                                <div className="detail-stat-card">
                                    <span className="detail-stat-value">{performanceData?.excellent || 0}</span>
                                    <span className="detail-stat-label">Excellent Students</span>
                                </div>
                            </div>
                            <div className="detail-charts-grid">
                                <div className="detail-chart-card">
                                    <h4>GPA Trend Over Semesters</h4>
                                    <div className="detail-chart-body">
                                        {getGPATrendChart(semesterTrends) && (
                                            <Line
                                                data={getGPATrendChart(semesterTrends)}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: { legend: { display: false } },
                                                    scales: {
                                                        y: { min: 0, max: 4 },
                                                        x: { grid: { display: false } }
                                                    }
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="detail-chart-card">
                                    <h4>Performance Distribution</h4>
                                    <div className="detail-chart-body doughnut">
                                        {getPerformanceChart(performanceData) && (
                                            <Doughnut
                                                data={getPerformanceChart(performanceData)}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: {
                                                        legend: {
                                                            position: 'bottom',
                                                            labels: { padding: 15, usePointStyle: true }
                                                        }
                                                    }
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Attendance Modal Content */}
                    {type === 'attendance' && (
                        <div className="attendance-detail-content">
                            <div className="detail-stats-row">
                                <div className="detail-stat-card">
                                    <span className="detail-stat-value">{systemStats.attendanceRate}%</span>
                                    <span className="detail-stat-label">Overall Rate</span>
                                </div>
                                <div className="detail-stat-card">
                                    <span className="detail-stat-value">95%</span>
                                    <span className="detail-stat-label">Best Day (Wed)</span>
                                </div>
                                <div className="detail-stat-card">
                                    <span className="detail-stat-value">85%</span>
                                    <span className="detail-stat-label">Lowest Day (Fri)</span>
                                </div>
                            </div>
                            <div className="detail-chart-full">
                                <h4>Weekly Attendance Pattern</h4>
                                <div className="detail-chart-body-large">
                                    <Bar
                                        data={getAttendanceChart()}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } },
                                            scales: {
                                                y: { min: 0, max: 100 },
                                                x: { grid: { display: false } }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="attendance-insights">
                                <div className="insight-item positive">
                                    <CheckCircle size={18} />
                                    <span>Attendance is up 2.3% compared to last week</span>
                                </div>
                                <div className="insight-item warning">
                                    <AlertTriangle size={18} />
                                    <span>Friday attendance needs improvement</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* At-Risk Students Modal Content */}
                    {type === 'at-risk' && (
                        <div className="at-risk-detail-content">
                            <div className="detail-stats-row">
                                <div className="detail-stat-card warning">
                                    <span className="detail-stat-value">{atRiskStudents.length}</span>
                                    <span className="detail-stat-label">Total At-Risk</span>
                                </div>
                                <div className="detail-stat-card">
                                    <span className="detail-stat-value">&lt; 2.0</span>
                                    <span className="detail-stat-label">GPA Threshold</span>
                                </div>
                                <div className="detail-stat-card success">
                                    <span className="detail-stat-value">{systemStats.totalStudents - atRiskStudents.length}</span>
                                    <span className="detail-stat-label">On Track</span>
                                </div>
                            </div>
                            <div className="at-risk-students-list">
                                <h4>Students Requiring Intervention</h4>
                                {atRiskStudents.length === 0 ? (
                                    <div className="empty-at-risk">
                                        <CheckCircle size={48} />
                                        <p>All students are performing well!</p>
                                    </div>
                                ) : (
                                    <div className="students-table">
                                        <div className="table-header">
                                            <span>Student Name</span>
                                            <span>GPA</span>
                                            <span>Status</span>
                                            <span>Action</span>
                                        </div>
                                        {atRiskStudents.map(student => (
                                            <div key={student.id} className="table-row">
                                                <span className="student-name">{student.name}</span>
                                                <span className={`gpa-value ${student.gpa < 1.5 ? 'critical' : 'warning'}`}>
                                                    {safeToFixed(student.gpa, 2)}
                                                </span>
                                                <span className={`status-badge ${student.tier?.replace('_', '-')}`}>
                                                    {student.tier?.replace('_', ' ')}
                                                </span>
                                                <button
                                                    className="action-btn"
                                                    onClick={() => {
                                                        onClose()
                                                        navigate(`/admin/student/${student.user_id || student.id}`)
                                                    }}
                                                >
                                                    View Profile
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Engagement Modal Content */}
                    {type === 'engagement' && (
                        <div className="engagement-detail-content">
                            <div className="detail-stats-row">
                                <div className="detail-stat-card">
                                    <span className="detail-stat-value">{systemStats.engagementScore}%</span>
                                    <span className="detail-stat-label">Overall Score</span>
                                </div>
                                <div className="detail-stat-card">
                                    <span className="detail-stat-value">85%</span>
                                    <span className="detail-stat-label">Active Users (30d)</span>
                                </div>
                                <div className="detail-stat-card">
                                    <span className="detail-stat-value">4.2</span>
                                    <span className="detail-stat-label">Avg Logins/Week</span>
                                </div>
                            </div>
                            <div className="detail-chart-full">
                                <h4>Login Activity (Last 7 Days)</h4>
                                <div className="detail-chart-body-large">
                                    <Bar
                                        data={{
                                            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                                            datasets: [{
                                                label: 'Logins',
                                                data: [245, 312, 289, 278, 256, 89, 42],
                                                backgroundColor: 'rgba(236, 72, 153, 0.8)',
                                                borderRadius: 8
                                            }]
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } },
                                            scales: {
                                                y: { min: 0 },
                                                x: { grid: { display: false } }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="engagement-insights">
                                <div className="insight-item positive">
                                    <Zap size={18} />
                                    <span>Peak activity on Tuesday with 312 logins</span>
                                </div>
                                <div className="insight-item neutral">
                                    <Activity size={18} />
                                    <span>Weekend activity is lower as expected</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default DashboardDetailModal
