import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Award, Target } from 'lucide-react'
import './AnalyticsDashboard.css'

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function StudentAnalyticsDashboard() {
    const { user, token } = useAuth()
    const [analytics, setAnalytics] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchAnalytics()
    }, [user.id])

    const fetchAnalytics = async () => {
        try {
            const response = await fetch(`${API_BASE}/analytics/student.php?student_id=${user.id}`, {
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
            <div className="analytics-loading">
                <div className="loading-spinner"></div>
                <p>Loading your analytics...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="analytics-error">
                <AlertTriangle size={48} />
                <h3>Unable to Load Analytics</h3>
                <p>{error}</p>
                <button onClick={fetchAnalytics}>Try Again</button>
            </div>
        )
    }

    const { performance_summary, subject_performance, semester_progression, at_risk_subjects, predictions, recommendations } = analytics

    // GPA Trend Chart Data
    const gpaTrendData = {
        labels: semester_progression.map(s => `Sem ${s.semester}`),
        datasets: [{
            label: 'GPA',
            data: semester_progression.map(s => s.gpa),
            borderColor: 'rgb(99, 102, 241)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8
        }]
    }

    // Performance Tier Colors
    const tierColors = {
        excellent: '#10b981',
        good: '#3b82f6',
        average: '#f59e0b',
        below_average: '#f97316',
        at_risk: '#ef4444'
    }

    const tierLabels = {
        excellent: 'Excellent',
        good: 'Good',
        average: 'Average',
        below_average: 'Below Average',
        at_risk: 'At Risk'
    }

    // Subject Performance Chart
    const subjectChartData = {
        labels: subject_performance.slice(0, 6).map(s => s.subject_name),
        datasets: [{
            label: 'Grade',
            data: subject_performance.slice(0, 6).map(s => s.grade),
            backgroundColor: subject_performance.slice(0, 6).map(s =>
                s.grade >= 85 ? '#10b981' : s.grade >= 70 ? '#3b82f6' : '#f97316'
            ),
            borderRadius: 8
        }]
    }

    return (
        <div className="student-analytics-dashboard">
            {/* Header Section */}
            <div className="dashboard-header">
                <div>
                    <h1>Your Academic Analytics</h1>
                    <p>Track your performance and get personalized insights</p>
                </div>
            </div>

            {/* Performance Summary Cards */}
            <div className="summary-grid">
                <div className="summary-card gpa-card">
                    <div className="card-icon">
                        <Award size={32} />
                    </div>
                    <div className="card-content">
                        <h3>Cumulative GPA</h3>
                        <div className="metric-value">{performance_summary.cumulative_gpa.toFixed(2)}</div>
                        <div className="metric-subtext">
                            <span className={`tier-badge ${performance_summary.performance_tier}`}>
                                {tierLabels[performance_summary.performance_tier]}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="summary-card semester-card">
                    <div className="card-icon">
                        <Target size={32} />
                    </div>
                    <div className="card-content">
                        <h3>Semester GPA</h3>
                        <div className="metric-value">{performance_summary.semester_gpa.toFixed(2)}</div>
                        <div className="metric-subtext">
                            {performance_summary.semester_gpa > performance_summary.cumulative_gpa ? (
                                <span className="trend-up">
                                    <TrendingUp size={16} /> Improving
                                </span>
                            ) : performance_summary.semester_gpa < performance_summary.cumulative_gpa ? (
                                <span className="trend-down">
                                    <TrendingDown size={16} /> Declining
                                </span>
                            ) : (
                                <span>Stable</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="summary-card percentile-card">
                    <div className="card-icon">
                        <TrendingUp size={32} />
                    </div>
                    <div className="card-content">
                        <h3>Class Rank</h3>
                        <div className="metric-value">{performance_summary.percentile_rank.toFixed(0)}%</div>
                        <div className="metric-subtext">
                            Top {(100 - performance_summary.percentile_rank).toFixed(0)}% of class
                        </div>
                    </div>
                </div>

                <div className="summary-card attendance-card">
                    <div className="card-icon">
                        <CheckCircle size={32} />
                    </div>
                    <div className="card-content">
                        <h3>Attendance</h3>
                        <div className="metric-value">{performance_summary.attendance_percentage.toFixed(1)}%</div>
                        <div className="metric-subtext">
                            {performance_summary.attendance_percentage >= 85 ? 'Excellent' :
                                performance_summary.attendance_percentage >= 75 ? 'Good' : 'Needs Improvement'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
                <div className="chart-card">
                    <h3>GPA Progression</h3>
                    <div className="chart-container">
                        <Line data={gpaTrendData} options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    padding: 12,
                                    borderRadius: 8
                                }
                            },
                            scales: {
                                y: {
                                    min: 0,
                                    max: 4,
                                    ticks: { stepSize: 1 },
                                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                                },
                                x: {
                                    grid: { display: false }
                                }
                            }
                        }} />
                    </div>
                </div>

                <div className="chart-card">
                    <h3>Subject Performance</h3>
                    <div className="chart-container">
                        <Bar data={subjectChartData} options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false }
                            },
                            scales: {
                                y: {
                                    min: 0,
                                    max: 100,
                                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                                },
                                x: {
                                    grid: { display: false }
                                }
                            }
                        }} />
                    </div>
                </div>
            </div>

            {/* At-Risk Subjects Alert */}
            {at_risk_subjects.length > 0 && (
                <div className="alert-card warning">
                    <div className="alert-header">
                        <AlertTriangle size={24} />
                        <h3>Subjects Needing Attention</h3>
                    </div>
                    <div className="at-risk-list">
                        {at_risk_subjects.map(subject => (
                            <div key={subject.subject_id} className="at-risk-item">
                                <div>
                                    <h4>{subject.subject_name}</h4>
                                    <p>Current Grade: {subject.current_grade.toFixed(1)}%</p>
                                </div>
                                <span className={`risk-badge ${subject.risk_level}`}>
                                    {subject.risk_level}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Predictions */}
            {predictions.gpa && (
                <div className="predictions-card">
                    <h3>Academic Predictions</h3>
                    <div className="prediction-item">
                        <div className="prediction-label">
                            <TrendingUp size={20} />
                            <span>Predicted Final GPA</span>
                        </div>
                        <div className="prediction-value">
                            {predictions.gpa.predicted_gpa.toFixed(2)}
                            <span className="confidence">
                                {predictions.gpa.confidence}% confidence
                            </span>
                        </div>
                    </div>

                    {predictions.target_gpa && (
                        <div className="prediction-item">
                            <div className="prediction-label">
                                <Target size={20} />
                                <span>To reach {predictions.target_gpa.target} GPA</span>
                            </div>
                            <div className="prediction-value">
                                Need {predictions.target_gpa.required_percentage.toFixed(1)}% average
                                <span className={`difficulty ${predictions.target_gpa.difficulty}`}>
                                    {predictions.target_gpa.achievable ? predictions.target_gpa.difficulty : 'Not achievable'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
                <div className="recommendations-section">
                    <h3>Personalized Recommendations</h3>
                    <div className="recommendations-grid">
                        {recommendations.map((rec, idx) => (
                            <div key={idx} className={`recommendation-card ${rec.priority}`}>
                                <h4>{rec.title}</h4>
                                <p>{rec.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default StudentAnalyticsDashboard
