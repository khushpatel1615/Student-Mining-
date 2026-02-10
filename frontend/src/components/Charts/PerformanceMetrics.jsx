import GPATrendChart from './GPATrendChart'
import SubjectPerformanceRadar from './SubjectPerformanceRadar'
import GradeDistribution from './GradeDistribution'
import './PerformanceMetrics.css'

const PerformanceMetrics = ({ studentData = {} }) => {
    const data = studentData && typeof studentData === 'object' ? studentData : {}
    const quickStats = data.quickStats || {}
    const insights = Array.isArray(data.insights) ? data.insights : []
    const averageScore = quickStats.averageScore ?? 0
    const highestGrade = quickStats.highestGrade ?? 'N/A'
    const avgAttendance = quickStats.avgAttendance ?? quickStats.lowestAttendance ?? 0
    const subjectsCompleted = quickStats.subjectsCompleted ?? 0

    return (
        <div className="performance-metrics">
            <div className="metrics-header">
                <h2 className="metrics-title">Performance Analytics</h2>
            </div>

            {/* Quick Stats Row */}
            <div className="stat-cards-row">
                <div className="stat-card-mini">
                    <div className="stat-icon">AVG</div>
                    <span className="stat-value">{averageScore}%</span>
                    <span className="stat-label">Average Score</span>
                </div>
                <div className="stat-card-mini">
                    <div className="stat-icon">TOP</div>
                    <span className="stat-value">{highestGrade}</span>
                    <span className="stat-label">Highest Grade</span>
                </div>
                <div className="stat-card-mini">
                    <div className="stat-icon">ATT</div>
                    <span className="stat-value">{avgAttendance}%</span>
                    <span className="stat-label">Avg Attendance</span>
                </div>
                <div className="stat-card-mini">
                    <div className="stat-icon">SUBJ</div>
                    <span className="stat-value">{subjectsCompleted}</span>
                    <span className="stat-label">Subjects</span>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="analytics-grid">
                <GPATrendChart data={data.gpaTrend || []} />
                <GradeDistribution grades={data.gradeDistribution || {}} />
            </div>

            <div className="analytics-grid">
                <SubjectPerformanceRadar subjects={data.subjectPerformance || []} />
                <div className="chart-container">
                    <div className="chart-header">
                        <h3 className="chart-title">Insights & Recommendations</h3>
                        <span className="chart-subtitle">AI-powered suggestions</span>
                    </div>
                    {insights.length === 0 ? (
                        <div className="chart-empty" style={{ minHeight: '220px' }}>
                            <p className="chart-empty-text">No insights available yet.</p>
                        </div>
                    ) : (
                        <div className="insights-list">
                            {insights.map((insight, index) => {
                                const tone = insight.tone || insight.type || 'info'
                                return (
                                    <div key={`${tone}-${index}`} className={`insight-item ${tone}`}>
                                        {insight.icon && <span className="insight-icon">{insight.icon}</span>}
                                        <div className="insight-content">
                                            <strong>{insight.title || 'Insight'}</strong>
                                            <p>{insight.message || ''}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PerformanceMetrics
