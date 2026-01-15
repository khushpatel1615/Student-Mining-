import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import './CourseRecommendations.css'
import toast from 'react-hot-toast'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

// Icons
const SparklesIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4L18.4 5.6" />
    </svg>
)

const BookIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
)

const TrophyIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
)

const RefreshIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
)

function CourseRecommendations() {
    const { token } = useAuth()
    const [recommendations, setRecommendations] = useState([])
    const [loading, setLoading] = useState(true)
    const [meta, setMeta] = useState(null)

    useEffect(() => {
        fetchRecommendations()
    }, [])

    const fetchRecommendations = async () => {
        setLoading(true)
        try {
            const response = await fetch(`${API_BASE}/course_recommendations.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()

            if (data.success) {
                setRecommendations(data.data)
                setMeta(data.meta)
            } else {
                toast.error(data.error || 'Failed to load recommendations')
            }
        } catch (err) {
            console.error('Error fetching recommendations:', err)
            toast.error('Error connecting to server')
        } finally {
            setLoading(false)
        }
    }

    const getScoreColor = (score) => {
        if (score >= 80) return 'score-excellent'
        if (score >= 60) return 'score-good'
        if (score >= 40) return 'score-fair'
        return 'score-low'
    }

    const getDifficultyBadge = (difficulty) => {
        const badges = {
            'Beginner': 'difficulty-beginner',
            'Intermediate': 'difficulty-intermediate',
            'Advanced': 'difficulty-advanced'
        }
        return badges[difficulty] || 'difficulty-intermediate'
    }

    return (
        <div className="course-recommendations">
            <div className="recommendations-header">
                <div className="header-content">
                    <div className="header-icon">
                        <SparklesIcon />
                    </div>
                    <div>
                        <h2>Recommended Courses for You</h2>
                        <p className="subtitle">
                            AI-powered suggestions based on your performance and career goals
                            {meta && ` • GPA: ${meta.student_gpa}`}
                        </p>
                    </div>
                </div>
                <button className="btn-refresh" onClick={fetchRecommendations} disabled={loading}>
                    <RefreshIcon />
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Analyzing your profile...</p>
                </div>
            ) : recommendations.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <BookIcon />
                    </div>
                    <h3>No Recommendations Available</h3>
                    <p>Complete more courses to get personalized recommendations</p>
                </div>
            ) : (
                <>
                    <div className="recommendations-stats">
                        <div className="stat-item">
                            <span className="stat-label">Available Electives:</span>
                            <span className="stat-value">{meta?.total_available || 0}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Top Matches:</span>
                            <span className="stat-value">{recommendations.length}</span>
                        </div>
                    </div>

                    <div className="recommendations-grid">
                        {recommendations.map((course, index) => (
                            <div key={course.id} className="recommendation-card">
                                <div className="card-header">
                                    <div className="course-info">
                                        <div className="course-code">{course.code}</div>
                                        <h3 className="course-name">{course.name}</h3>
                                    </div>
                                    {index === 0 && (
                                        <div className="top-pick-badge">
                                            <TrophyIcon />
                                            Top Pick
                                        </div>
                                    )}
                                </div>

                                <div className="course-meta">
                                    <span className="meta-item">
                                        <strong>{course.credits}</strong> Credits
                                    </span>
                                    <span className="meta-divider">•</span>
                                    <span className="meta-item">
                                        Semester <strong>{course.semester}</strong>
                                    </span>
                                    <span className={`difficulty-badge ${getDifficultyBadge(course.difficulty)}`}>
                                        {course.difficulty}
                                    </span>
                                </div>

                                {course.description && (
                                    <p className="course-description">{course.description}</p>
                                )}

                                <div className="match-section">
                                    <div className="match-header">
                                        <span className="match-label">Match Score</span>
                                        <span className={`match-score ${getScoreColor(course.score)}`}>
                                            {course.score}%
                                        </span>
                                    </div>
                                    <div className="match-bar">
                                        <div
                                            className={`match-fill ${getScoreColor(course.score)}`}
                                            style={{ width: `${course.score}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="reasoning-section">
                                    <div className="reasoning-label">Why this course?</div>
                                    <p className="reasoning-text">{course.reasoning}</p>
                                </div>

                                {course.prerequisites && course.prerequisites.length > 0 && (
                                    <div className="prerequisites">
                                        <strong>Prerequisites:</strong> {course.prerequisites.join(', ')}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export default CourseRecommendations
