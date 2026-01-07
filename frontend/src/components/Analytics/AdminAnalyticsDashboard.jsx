import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Users, BookOpen, GraduationCap, TrendingUp, AlertCircle, FileText } from 'lucide-react'
import './AdminAnalytics.css'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function AdminAnalyticsDashboard() {
    const { token } = useAuth()
    const [analytics, setAnalytics] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        try {
            const response = await fetch(`${API_BASE}/analytics/admin.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()

            if (data.success) {
                setAnalytics(data.data)
            } else {
                setError(data.error || 'Failed to load analytics')
            }
        } catch (err) {
            setError('Failed to connect to server')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="admin-analytics-loading">
                <div className="loading-spinner"></div>
                <p>Loading system analytics...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="admin-analytics-error">
                <AlertCircle size={48} />
                <h3>Unable to Load Analytics</h3>
                <p>{error}</p>
                <button onClick={fetchAnalytics}>Try Again</button>
            </div>
        )
    }

    const { system_overview, performance_distribution, at_risk_students, program_analytics, subject_difficulty, semester_trends } = analytics

    // Performance Distribution Chart
    const distributionData = {
        labels: ['Excellent', 'Good', 'Average', 'Below Average', 'At Risk'],
        datasets: [{
            data: [
                performance_distribution.excellent,
                performance_distribution.good,
                performance_distribution.average,
                performance_distribution.below_average,
                performance_distribution.at_risk
            ],
            backgroundColor: [
                '#10b981',
                '#3b82f6',
                '#f59e0b',
                '#f97316',
                '#ef4444'
            ],
            borderWidth: 0
        }]
    }

    // Semester Trends Chart
    const trendsData = {
        labels: semester_trends.map(s => `Sem ${s.semester}`),
        datasets: [{
            label: 'Average GPA',
            data: semester_trends.map(s => s.average_gpa),
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
            borderRadius: 8
        }]
    }

    return (
        <div className="admin-analytics-dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>System Analytics</h1>
                    <p>Comprehensive overview of academic performance</p>
                </div>
            </div>

            {/* System Overview Cards */}
            <div className="overview-grid">
                <div className="overview-card students">
                    <div className="card-icon">
                        <Users size={32} />
                    </div>
                    <div className="card-content">
                        <h3>Total Students</h3>
                        <div className="metric-value">{system_overview.total_students}</div>
                        <div className="metric-subtext">Active enrollments</div>
                    </div>
                </div>

                <div className="overview-card programs">
                    <div className="card-icon">
                        <GraduationCap size={32} />
                    </div>
                    <div className="card-content">
                        <h3>Programs</h3>
                        <div className="metric-value">{system_overview.total_programs}</div>
                        <div className="metric-subtext">Degree programs</div>
                    </div>
                </div>

                <div className="overview-card subjects">
                    <div className="card-icon">
                        <BookOpen size={32} />
                    </div>
                    <div className="card-content">
                        <h3>Subjects</h3>
                        <div className="metric-value">{system_overview.total_subjects}</div>
                        <div className="metric-subtext">Total courses</div>
                    </div>
                </div>

                <div className="overview-card gpa">
                    <div className="card-icon">
                        <TrendingUp size={32} />
                    </div>
                    <div className="card-content">
                        <h3>System GPA</h3>
                        <div className="metric-value">{system_overview.system_gpa.toFixed(2)}</div>
                        <div className="metric-subtext">{system_overview.pass_rate.toFixed(1)}% pass rate</div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-section">
                <div className="chart-card">
                    <h3>Performance Distribution</h3>
                    <div className="chart-container">
                        <Doughnut data={distributionData} options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'right',
                                    labels: {
                                        padding: 20,
                                        font: { size: 14 }
                                    }
                                }
                            }
                        }} />
                    </div>
                </div>

                <div className="chart-card">
                    <h3>Semester GPA Trends</h3>
                    <div className="chart-container">
                        <Bar data={trendsData} options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false }
                            },
                            scales: {
                                y: {
                                    min: 0,
                                    max: 4,
                                    ticks: { stepSize: 1 }
                                }
                            }
                        }} />
                    </div>
                </div>
            </div>

            {/* At-Risk Students */}
            <div className="at-risk-section">
                <div className="section-header">
                    <AlertCircle size={24} />
                    <h3>Students Requiring Intervention</h3>
                    <span className="count-badge">{at_risk_students.length}</span>
                </div>
                <div className="students-list">
                    {at_risk_students.slice(0, 10).map(student => (
                        <div key={student.id} className="student-item">
                            <div className="student-info">
                                <h4>{student.name}</h4>
                                <span className="student-tier">{student.tier.replace('_', ' ')}</span>
                            </div>
                            <div className="student-gpa">
                                GPA: {student.gpa.toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Program Analytics */}
            <div className="program-section">
                <h3>Program Performance</h3>
                <div className="programs-grid">
                    {program_analytics.slice(0, 6).map(program => (
                        <div key={program.id} className="program-card">
                            <div className="program-header">
                                <h4>{program.name}</h4>
                                <span className="program-code">{program.code}</span>
                            </div>
                            <div className="program-stats">
                                <div className="stat">
                                    <span className="stat-label">Students</span>
                                    <span className="stat-value">{program.student_count}</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Avg GPA</span>
                                    <span className="stat-value">{program.average_gpa.toFixed(2)}</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Pass Rate</span>
                                    <span className="stat-value">{program.pass_rate.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Subject Difficulty */}
            <div className="subject-section">
                <h3>Hardest Subjects</h3>
                <div className="subjects-list">
                    {subject_difficulty.slice(0, 8).map(subject => (
                        <div key={subject.id} className="subject-item">
                            <div className="subject-info">
                                <h4>{subject.name}</h4>
                                <span className="subject-code">{subject.code}</span>
                            </div>
                            <div className="subject-stats">
                                <span className={`difficulty-badge ${subject.difficulty}`}>
                                    {subject.difficulty.replace('_', ' ')}
                                </span>
                                <span className="avg-grade">
                                    Avg: {subject.average_grade.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default AdminAnalyticsDashboard
