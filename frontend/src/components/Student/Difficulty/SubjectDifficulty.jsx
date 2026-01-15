import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import './SubjectDifficulty.css'
import toast from 'react-hot-toast'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function SubjectDifficulty() {
    const { token } = useAuth()
    const [loading, setLoading] = useState(true)
    const [rankings, setRankings] = useState([])

    useEffect(() => {
        fetchRankings()
    }, [])

    const fetchRankings = async () => {
        setLoading(true)
        try {
            const response = await fetch(`${API_BASE}/subject_difficulty.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()

            if (data.success) {
                setRankings(data.data)
            } else {
                toast.error(data.error || 'Failed to load rankings')
            }
        } catch (err) {
            console.error('Error fetching rankings:', err)
            toast.error('Error connecting to server')
        } finally {
            setLoading(false)
        }
    }

    const getDifficultyClass = (level) => {
        const classes = {
            'Very Hard': 'difficulty-very-hard',
            'Hard': 'difficulty-hard',
            'Medium': 'difficulty-medium',
            'Easy': 'difficulty-easy'
        }
        return classes[level] || 'difficulty-medium'
    }

    const getDifficultyEmoji = (level) => {
        const emojis = {
            'Very Hard': '🔥',
            'Hard': '⚡',
            'Medium': '📚',
            'Easy': '✨'
        }
        return emojis[level] || '📚'
    }

    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
                <p>Analyzing subject difficulty...</p>
            </div>
        )
    }

    return (
        <div className="subject-difficulty">
            <div className="difficulty-header">
                <h2>Subject Difficulty Rankings</h2>
                <p>Based on class average grades, pass rates, and student performance</p>
            </div>

            {rankings.length === 0 ? (
                <div className="empty-state">
                    <p>No subject data available</p>
                </div>
            ) : (
                <div className="rankings-list">
                    {rankings.map((subject) => (
                        <div key={subject.id} className={`ranking-card ${getDifficultyClass(subject.difficulty_level)}`}>
                            <div className="ranking-header">
                                <div className="rank-badge">#{subject.rank}</div>
                                <div className="subject-info">
                                    <div className="subject-code">{subject.code}</div>
                                    <div className="subject-name">{subject.name}</div>
                                    <div className="subject-meta">{subject.credits} Credits</div>
                                </div>
                                <div className={`difficulty-badge ${getDifficultyClass(subject.difficulty_level)}`}>
                                    <span className="difficulty-emoji">{getDifficultyEmoji(subject.difficulty_level)}</span>
                                    <span className="difficulty-text">{subject.difficulty_level}</span>
                                </div>
                            </div>

                            <div className="difficulty-score-bar">
                                <div className="score-label">Difficulty Score</div>
                                <div className="score-bar">
                                    <div
                                        className={`score-fill ${getDifficultyClass(subject.difficulty_level)}`}
                                        style={{ width: `${subject.difficulty_score}%` }}
                                    ></div>
                                </div>
                                <div className="score-value">{subject.difficulty_score}/100</div>
                            </div>

                            <div className="stats-grid">
                                <div className="stat-item">
                                    <div className="stat-icon">👥</div>
                                    <div className="stat-info">
                                        <div className="stat-value">{subject.statistics.total_students}</div>
                                        <div className="stat-label">Students</div>
                                    </div>
                                </div>

                                <div className="stat-item">
                                    <div className="stat-icon">📊</div>
                                    <div className="stat-info">
                                        <div className="stat-value">{subject.statistics.average_grade}%</div>
                                        <div className="stat-label">Avg Grade</div>
                                    </div>
                                </div>

                                <div className="stat-item">
                                    <div className="stat-icon">✓</div>
                                    <div className="stat-info">
                                        <div className="stat-value">{subject.statistics.pass_rate}%</div>
                                        <div className="stat-label">Pass Rate</div>
                                    </div>
                                </div>

                                <div className="stat-item">
                                    <div className="stat-icon">📅</div>
                                    <div className="stat-info">
                                        <div className="stat-value">{subject.statistics.avg_attendance}%</div>
                                        <div className="stat-label">Attendance</div>
                                    </div>
                                </div>
                            </div>

                            {subject.statistics.fail_count > 0 && (
                                <div className="warning-note">
                                    ⚠️ {subject.statistics.fail_count} student(s) failed this subject
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="info-box">
                <h4>💡 How Difficulty is Calculated</h4>
                <ul>
                    <li><strong>Average Grade (40%):</strong> Lower average = higher difficulty</li>
                    <li><strong>Pass Rate (30%):</strong> Lower pass rate = higher difficulty</li>
                    <li><strong>Grade Variation (20%):</strong> Higher variation = higher difficulty</li>
                    <li><strong>Attendance (10%):</strong> Lower attendance = higher difficulty</li>
                </ul>
            </div>
        </div>
    )
}

export default SubjectDifficulty
