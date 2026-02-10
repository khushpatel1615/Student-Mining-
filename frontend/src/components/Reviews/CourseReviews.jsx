import { useState, useEffect } from 'react'
import { Star, ThumbsUp, MessageCircle, TrendingUp, Award, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuth } from '../../context/AuthContext'
import { API_BASE } from '../../config';
import './CourseReviews.css'



function CourseReviews({ subjectId = null, subjectName = '' }) {
    const { token, user } = useAuth()
    const [reviews, setReviews] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [topRated, setTopRated] = useState([])
    const [newReview, setNewReview] = useState({
        overall_rating: 5, difficulty_rating: 3, workload_rating: 3,
        would_recommend: true, review_text: '', pros: '', cons: ''
    })

    useEffect(() => {
        if (subjectId) {
            fetchReviews()
        } else {
            fetchTopRated()
        }
    }, [subjectId])

    const fetchReviews = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/course_reviews.php?action=list&subject_id=${subjectId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) {
                setReviews(data.data.reviews)
                setStats(data.data.stats)
            }
        } catch (err) {
            toast.error('Failed to load reviews')
        } finally {
            setLoading(false)
        }
    }

    const fetchTopRated = async () => {
        try {
            const res = await fetch(`${API_BASE}/course_reviews.php?action=top_rated`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) setTopRated(data.data)
        } catch (err) { /* ignore */ } finally { setLoading(false) }
    }

    const submitReview = async () => {
        if (!newReview.review_text.trim()) {
            toast.error('Please write a review')
            return
        }
        try {
            const res = await fetch(`${API_BASE}/course_reviews.php`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', subject_id: subjectId, ...newReview })
            })
            const data = await res.json()
            if (data.success) {
                toast.success('Review submitted for approval!')
                setShowForm(false)
                setNewReview({ overall_rating: 5, difficulty_rating: 3, workload_rating: 3, would_recommend: true, review_text: '', pros: '', cons: '' })
            } else {
                toast.error(data.error)
            }
        } catch (err) {
            toast.error('Failed to submit review')
        }
    }

    const markHelpful = async (id) => {
        await fetch(`${API_BASE}/course_reviews.php`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'helpful', id })
        })
        fetchReviews()
    }

    const renderStars = (rating, interactive = false, onChange = null) => {
        return (
            <div className="star-rating">
                {[1, 2, 3, 4, 5].map(star => (
                    <Star
                        key={star}
                        size={interactive ? 24 : 16}
                        className={star <= rating ? 'filled' : ''}
                        onClick={() => interactive && onChange && onChange(star)}
                        style={{ cursor: interactive ? 'pointer' : 'default' }}
                    />
                ))}
            </div>
        )
    }

    if (!subjectId) {
        return (
            <div className="course-reviews">
                <div className="reviews-header">
                    <h2><Award size={24} /> Top Rated Courses</h2>
                    <p>See what students are saying about their courses</p>
                </div>
                {loading ? <div className="loading">Loading...</div> : (
                    <div className="top-rated-grid">
                        {topRated.map(course => (
                            <div key={course.id} className="top-course-card">
                                <div className="course-rank">{topRated.indexOf(course) + 1}</div>
                                <div className="course-info">
                                    <h4>{course.name}</h4>
                                    <span className="code">{course.code}</span>
                                </div>
                                <div className="course-rating">
                                    {renderStars(Math.round(course.avg_rating || 0))}
                                    <span className="rating-value">{parseFloat(course.avg_rating || 0).toFixed(1)}</span>
                                    <span className="review-count">({course.review_count} reviews)</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="course-reviews">
            <div className="reviews-header">
                <div>
                    <h2><MessageCircle size={24} /> Course Reviews</h2>
                    <p>{subjectName}</p>
                </div>
                {user.role === 'student' && (
                    <button className="btn-write" onClick={() => setShowForm(!showForm)}>
                        <Star size={18} /> Write Review
                    </button>
                )}
            </div>

            {stats && (
                <div className="stats-summary">
                    <div className="overall-rating">
                        <div className="big-rating">{parseFloat(stats.avg_rating || 0).toFixed(1)}</div>
                        {renderStars(Math.round(stats.avg_rating || 0))}
                        <span className="total-reviews">{stats.total_reviews} reviews</span>
                    </div>
                    <div className="rating-breakdown">
                        <div className="breakdown-item">
                            <span>Difficulty</span>
                            <div className="bar-container">
                                <div className="bar" style={{ width: `${(stats.avg_difficulty || 0) * 20}%`, background: '#f59e0b' }}></div>
                            </div>
                            <span>{parseFloat(stats.avg_difficulty || 0).toFixed(1)}/5</span>
                        </div>
                        <div className="breakdown-item">
                            <span>Workload</span>
                            <div className="bar-container">
                                <div className="bar" style={{ width: `${(stats.avg_workload || 0) * 20}%`, background: '#ec4899' }}></div>
                            </div>
                            <span>{parseFloat(stats.avg_workload || 0).toFixed(1)}/5</span>
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="review-form">
                    <h3>Share Your Experience</h3>
                    <div className="form-group">
                        <label>Overall Rating</label>
                        {renderStars(newReview.overall_rating, true, (v) => setNewReview({ ...newReview, overall_rating: v }))}
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Difficulty (1-Easy, 5-Hard)</label>
                            <select value={newReview.difficulty_rating} onChange={e => setNewReview({ ...newReview, difficulty_rating: +e.target.value })}>
                                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Workload (1-Light, 5-Heavy)</label>
                            <select value={newReview.workload_rating} onChange={e => setNewReview({ ...newReview, workload_rating: +e.target.value })}>
                                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Your Review</label>
                        <textarea
                            placeholder="Share your experience with this course..."
                            value={newReview.review_text}
                            onChange={e => setNewReview({ ...newReview, review_text: e.target.value })}
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Pros</label>
                            <input type="text" placeholder="What did you like?" value={newReview.pros} onChange={e => setNewReview({ ...newReview, pros: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Cons</label>
                            <input type="text" placeholder="What could be better?" value={newReview.cons} onChange={e => setNewReview({ ...newReview, cons: e.target.value })} />
                        </div>
                    </div>
                    <label className="checkbox-label">
                        <input type="checkbox" checked={newReview.would_recommend} onChange={e => setNewReview({ ...newReview, would_recommend: e.target.checked })} />
                        I would recommend this course
                    </label>
                    <div className="form-actions">
                        <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
                        <button className="btn-submit" onClick={submitReview}>Submit Review</button>
                    </div>
                </div>
            )}

            <div className="reviews-list">
                {reviews.length === 0 ? (
                    <div className="empty-state">
                        <MessageCircle size={48} />
                        <p>No reviews yet. Be the first to review!</p>
                    </div>
                ) : reviews.map(review => (
                    <div key={review.id} className="review-card">
                        <div className="review-header">
                            <div className="reviewer">
                                <div className="avatar">{review.reviewer_name?.[0]}</div>
                                <div>
                                    <span className="name">{review.reviewer_name}</span>
                                    <span className="date">{new Date(review.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            {renderStars(review.overall_rating)}
                        </div>
                        <p className="review-text">{review.review_text}</p>
                        {(review.pros || review.cons) && (
                            <div className="pros-cons">
                                {review.pros && <span className="pro">Pros: {review.pros}</span>}
                                {review.cons && <span className="con">Cons: {review.cons}</span>}
                            </div>
                        )}
                        <div className="review-footer">
                            {review.would_recommend && <span className="recommend">Recommends</span>}
                            <button className="btn-helpful" onClick={() => markHelpful(review.id)}>
                                <ThumbsUp size={14} /> Helpful ({review.helpful_count || 0})
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default CourseReviews



