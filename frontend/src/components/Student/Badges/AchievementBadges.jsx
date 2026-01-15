import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import './AchievementBadges.css'
import toast from 'react-hot-toast'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function AchievementBadges() {
    const { token } = useAuth()
    const [loading, setLoading] = useState(true)
    const [earnedBadges, setEarnedBadges] = useState([])
    const [unearnedBadges, setUnearnedBadges] = useState([])
    const [stats, setStats] = useState(null)

    useEffect(() => {
        fetchBadges()
    }, [])

    const fetchBadges = async () => {
        setLoading(true)
        try {
            const response = await fetch(`${API_BASE}/badges.php?action=my_badges`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()

            if (data.success) {
                setEarnedBadges(data.data.earned_badges)
                setUnearnedBadges(data.data.unearned_badges)
                setStats({
                    total_earned: data.data.total_earned,
                    total_badges: data.data.total_badges,
                    completion_percentage: data.data.completion_percentage
                })
            } else {
                toast.error(data.error || 'Failed to load badges')
            }
        } catch (err) {
            console.error('Error fetching badges:', err)
            toast.error('Error connecting to server')
        } finally {
            setLoading(false)
        }
    }

    const checkEligibility = async () => {
        try {
            const response = await fetch(`${API_BASE}/badges.php?action=check_eligibility`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()

            if (data.success && data.data.count > 0) {
                toast.success(`You earned ${data.data.count} new badge(s)!`)
                fetchBadges()
            } else {
                toast('No new badges earned yet. Keep working!', { icon: '💪' })
            }
        } catch (err) {
            toast.error('Error checking eligibility')
        }
    }

    const getCategoryColor = (category) => {
        const colors = {
            academic: '#6366f1',
            attendance: '#22c55e',
            assignments: '#f59e0b',
            engagement: '#ec4899'
        }
        return colors[category] || '#6366f1'
    }

    const groupBadgesByCategory = (badges) => {
        return badges.reduce((acc, badge) => {
            const category = badge.category || 'other'
            if (!acc[category]) acc[category] = []
            acc[category].push(badge)
            return acc
        }, {})
    }

    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading achievements...</p>
            </div>
        )
    }

    const earnedByCategory = groupBadgesByCategory(earnedBadges)
    const unearnedByCategory = groupBadgesByCategory(unearnedBadges)

    return (
        <div className="achievement-badges">
            <div className="badges-header">
                <div>
                    <h2>Achievement Badges</h2>
                    <p>Earn badges by completing challenges and reaching milestones</p>
                </div>
                <button className="btn-check" onClick={checkEligibility}>
                    🔍 Check for New Badges
                </button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="badges-stats">
                    <div className="stat-card">
                        <div className="stat-icon">🏆</div>
                        <div className="stat-info">
                            <div className="stat-value">{stats.total_earned}</div>
                            <div className="stat-label">Badges Earned</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📊</div>
                        <div className="stat-info">
                            <div className="stat-value">{stats.completion_percentage}%</div>
                            <div className="stat-label">Completion</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🎯</div>
                        <div className="stat-info">
                            <div className="stat-value">{stats.total_badges - stats.total_earned}</div>
                            <div className="stat-label">To Unlock</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            {stats && (
                <div className="progress-section">
                    <div className="progress-header">
                        <span>Overall Progress</span>
                        <span>{stats.total_earned} / {stats.total_badges}</span>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${stats.completion_percentage}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Earned Badges */}
            {earnedBadges.length > 0 && (
                <div className="badges-section">
                    <h3>🎉 Your Badges ({earnedBadges.length})</h3>
                    {Object.entries(earnedByCategory).map(([category, badges]) => (
                        <div key={category} className="category-section">
                            <h4 className="category-title" style={{ color: getCategoryColor(category) }}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                            </h4>
                            <div className="badges-grid">
                                {badges.map((badge) => (
                                    <div key={badge.code} className="badge-card earned">
                                        <div className="badge-icon" style={{ borderColor: getCategoryColor(badge.category) }}>
                                            {badge.icon}
                                        </div>
                                        <div className="badge-info">
                                            <div className="badge-name">{badge.name}</div>
                                            <div className="badge-description">{badge.description}</div>
                                            <div className="badge-earned-date">
                                                Earned: {new Date(badge.earned_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Locked Badges */}
            {unearnedBadges.length > 0 && (
                <div className="badges-section">
                    <h3>🔒 Locked Badges ({unearnedBadges.length})</h3>
                    {Object.entries(unearnedByCategory).map(([category, badges]) => (
                        <div key={category} className="category-section">
                            <h4 className="category-title" style={{ color: getCategoryColor(category) }}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                            </h4>
                            <div className="badges-grid">
                                {badges.map((badge) => (
                                    <div key={badge.code} className="badge-card locked">
                                        <div className="badge-icon locked-icon">
                                            🔒
                                        </div>
                                        <div className="badge-info">
                                            <div className="badge-name">{badge.name}</div>
                                            <div className="badge-description">{badge.description}</div>
                                            <div className="badge-criteria">
                                                <strong>How to earn:</strong> {badge.criteria}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {earnedBadges.length === 0 && unearnedBadges.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">🏆</div>
                    <p>No badges available yet</p>
                </div>
            )}
        </div>
    )
}

export default AchievementBadges
