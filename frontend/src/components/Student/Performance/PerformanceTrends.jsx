import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import './PerformanceTrends.css'
import toast from 'react-hot-toast'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

// Icons
const TrendingUpIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </svg>
)

const TrendingDownIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
        <polyline points="17 18 23 18 23 12" />
    </svg>
)

const MinusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
)

function PerformanceTrends() {
    const { token } = useAuth()
    const [loading, setLoading] = useState(true)
    const [trends, setTrends] = useState([])
    const [overall, setOverall] = useState(null)
    const [selectedSubject, setSelectedSubject] = useState(null)

    useEffect(() => {
        fetchTrends()
    }, [])

    const fetchTrends = async () => {
        setLoading(true)
        try {
            const response = await fetch(`${API_BASE}/performance_trends.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()

            if (data.success) {
                setTrends(data.data.trends)
                setOverall(data.data.overall)
            } else {
                toast.error(data.error || 'Failed to load trends')
            }
        } catch (err) {
            console.error('Error fetching trends:', err)
            toast.error('Error connecting to server')
        } finally {
            setLoading(false)
        }
    }

    const getTrendIcon = (trend) => {
        if (trend === 'improving') return <TrendingUpIcon />
        if (trend === 'declining') return <TrendingDownIcon />
        return <MinusIcon />
    }

    const getTrendClass = (trend) => {
        if (trend === 'improving') return 'trend-improving'
        if (trend === 'declining') return 'trend-declining'
        return 'trend-stable'
    }

    const getRiskClass = (risk) => {
        return `risk-${risk}`
    }

    const getGradeColor = (grade) => {
        if (grade >= 80) return '#22c55e'
        if (grade >= 60) return '#3b82f6'
        if (grade >= 50) return '#f59e0b'
        return '#ef4444'
    }

    return (
        <div className="performance-trends">
            <div className="trends-header">
                <div>
                    <h2>Performance Trends & Predictions</h2>
                    <p className="subtitle">Track your progress and predict final grades</p>
                </div>
                <button className="btn-refresh" onClick={fetchTrends} disabled={loading}>
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Analyzing performance...</p>
                </div>
            ) : (
                <>
                    {/* Overall Stats */}
                    {overall && (
                        <div className="overall-stats">
                            <div className="stat-card primary">
                                <div className="stat-value">{overall.overall_gpa}</div>
                                <div className="stat-label">Overall GPA</div>
                                <div className="stat-sub">{overall.overall_percentage}%</div>
                            </div>
                            <div className="stat-card success">
                                <div className="stat-value">{overall.improving_subjects}</div>
                                <div className="stat-label">Improving</div>
                                <div className="stat-sub">Subjects</div>
                            </div>
                            <div className="stat-card warning">
                                <div className="stat-value">{overall.declining_subjects}</div>
                                <div className="stat-label">Declining</div>
                                <div className="stat-sub">Subjects</div>
                            </div>
                            <div className="stat-card danger">
                                <div className="stat-value">{overall.subjects_at_risk}</div>
                                <div className="stat-label">At Risk</div>
                                <div className="stat-sub">Need attention</div>
                            </div>
                        </div>
                    )}

                    {/* Subject Trends */}
                    <div className="subjects-grid">
                        {trends.map((subject) => (
                            <div
                                key={subject.id}
                                className={`subject-card ${getRiskClass(subject.risk_level)}`}
                                onClick={() => setSelectedSubject(subject)}
                            >
                                <div className="subject-header">
                                    <div>
                                        <div className="subject-code">{subject.code}</div>
                                        <div className="subject-name">{subject.name}</div>
                                    </div>
                                    <div className={`trend-badge ${getTrendClass(subject.trend)}`}>
                                        {getTrendIcon(subject.trend)}
                                        <span>{subject.trend}</span>
                                    </div>
                                </div>

                                <div className="grade-display">
                                    <div className="current-grade">
                                        <span className="grade-value" style={{ color: getGradeColor(subject.current_grade) }}>
                                            {subject.current_grade}%
                                        </span>
                                        <span className="grade-label">Current</span>
                                    </div>
                                    <div className="predicted-grade">
                                        <span className="grade-value">{subject.predicted_final}%</span>
                                        <span className="grade-label">Predicted</span>
                                    </div>
                                </div>

                                {/* Mini Chart */}
                                <div className="mini-chart">
                                    {subject.timeline.map((point, index) => (
                                        <div
                                            key={index}
                                            className="chart-bar"
                                            style={{
                                                height: `${point.grade}%`,
                                                backgroundColor: getGradeColor(point.grade)
                                            }}
                                            title={`${point.component}: ${point.grade}%`}
                                        />
                                    ))}
                                </div>

                                <div className="subject-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Avg:</span>
                                        <span className="stat-value">{subject.average_grade}%</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Range:</span>
                                        <span className="stat-value">{subject.min_grade}% - {subject.max_grade}%</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Assessments:</span>
                                        <span className="stat-value">{subject.total_assessments}</span>
                                    </div>
                                </div>

                                {subject.risk_level !== 'low' && (
                                    <div className="risk-alert">
                                        ⚠️ {subject.risk_level === 'high' ? 'High Risk' : 'Medium Risk'} - Needs attention
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Detailed Modal */}
                    {selectedSubject && (
                        <div className="modal-overlay" onClick={() => setSelectedSubject(null)}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <div>
                                        <h3>{selectedSubject.name}</h3>
                                        <p>{selectedSubject.code}</p>
                                    </div>
                                    <button className="btn-close" onClick={() => setSelectedSubject(null)}>×</button>
                                </div>

                                <div className="modal-body">
                                    <div className="target-grades">
                                        <h4>What You Need for Target Grades</h4>
                                        <div className="targets-grid">
                                            {selectedSubject.target_calculations.map((target, index) => (
                                                <div key={index} className={`target-card ${target.achievable ? '' : 'unachievable'}`}>
                                                    <div className="target-grade">{target.letter}</div>
                                                    <div className="target-info">
                                                        <div>Target: {target.target}%</div>
                                                        <div className="needed">
                                                            Need avg: <strong>{target.needed_average}%</strong>
                                                        </div>
                                                        {!target.achievable && (
                                                            <div className="impossible">Not achievable</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="timeline-section">
                                        <h4>Grade Timeline</h4>
                                        <div className="timeline-list">
                                            {selectedSubject.timeline.map((point, index) => (
                                                <div key={index} className="timeline-item">
                                                    <div className="timeline-date">{new Date(point.date).toLocaleDateString()}</div>
                                                    <div className="timeline-component">{point.component}</div>
                                                    <div className="timeline-grade" style={{ color: getGradeColor(point.grade) }}>
                                                        {point.grade}%
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default PerformanceTrends
