import GPATrendChart from './GPATrendChart'
import SubjectPerformanceRadar from './SubjectPerformanceRadar'
import GradeDistribution from './GradeDistribution'
import './PerformanceMetrics.css'

const PerformanceMetrics = ({ studentData = {} }) => {
    // Mock data structure
    const mockData = {
        gpaTrend: [
            { semester: 'Sem 1', gpa: 3.2 },
            { semester: 'Sem 2', gpa: 3.5 },
            { semester: 'Sem 3', gpa: 3.7 },
            { semester: 'Sem 4', gpa: 3.8 }
        ],
        subjectPerformance: [
            { name: 'Math', score: 85 },
            { name: 'Chemistry', score: 78 },
            { name: 'Web Dev', score: 92 },
            { name: 'Programming', score: 88 },
            { name: 'Electronics', score: 75 }
        ],
        gradeDistribution: {
            'A': 3,
            'B': 2,
            'C': 1,
            'D': 0,
            'F': 0
        },
        quickStats: {
            averageScore: 85,
            highestGrade: 'A',
            lowestAttendance: 85,
            subjectsCompleted: 6
        }
    }

    const data = Object.keys(studentData).length > 0 ? studentData : mockData

    return (
        <div className="performance-metrics">
            <div className="metrics-header">
                <h2 className="metrics-title">📊 Performance Analytics</h2>
            </div>

            {/* Quick Stats Row */}
            <div className="stat-cards-row">
                <div className="stat-card-mini">
                    <div className="stat-icon">📈</div>
                    <span className="stat-value">{data.quickStats?.averageScore || 0}%</span>
                    <span className="stat-label">Average Score</span>
                </div>
                <div className="stat-card-mini">
                    <div className="stat-icon">🏆</div>
                    <span className="stat-value">{data.quickStats?.highestGrade || 'N/A'}</span>
                    <span className="stat-label">Highest Grade</span>
                </div>
                <div className="stat-card-mini">
                    <div className="stat-icon">📅</div>
                    <span className="stat-value">{data.quickStats?.lowestAttendance || 0}%</span>
                    <span className="stat-label">Avg Attendance</span>
                </div>
                <div className="stat-card-mini">
                    <div className="stat-icon">✅</div>
                    <span className="stat-value">{data.quickStats?.subjectsCompleted || 0}</span>
                    <span className="stat-label">Subjects</span>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="analytics-grid">
                <GPATrendChart data={data.gpaTrend} />
                <GradeDistribution grades={data.gradeDistribution} />
            </div>

            <div className="analytics-grid">
                <SubjectPerformanceRadar subjects={data.subjectPerformance} />
                <div className="chart-container">
                    <div className="chart-header">
                        <h3 className="chart-title">💡 Insights & Recommendations</h3>
                        <span className="chart-subtitle">AI-powered suggestions</span>
                    </div>
                    <div className="insights-list">
                        <div className="insight-item success">
                            <span className="insight-icon">🎯</span>
                            <div className="insight-content">
                                <strong>Great Progress!</strong>
                                <p>Your GPA has increased by 0.6 points this year.</p>
                            </div>
                        </div>
                        <div className="insight-item warning">
                            <span className="insight-icon">⚠️</span>
                            <div className="insight-content">
                                <strong>Attendance Alert</strong>
                                <p>Attendance in Electronics is below 75%. Aim for 5 more classes.</p>
                            </div>
                        </div>
                        <div className="insight-item info">
                            <span className="insight-icon">📚</span>
                            <div className="insight-content">
                                <strong>Study Recommendation</strong>
                                <p>Focus on Chemistry - current score is 78%. Target: 85%+</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PerformanceMetrics
