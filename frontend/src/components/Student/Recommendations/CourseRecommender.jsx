import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { BookOpen, Star, Sparkles, ArrowRight, Bookmark } from 'lucide-react';
import './CourseRecommender.css';

const API_BASE = 'http://localhost/StudentDataMining/backend/api';

const CourseRecommender = () => {
    const { token } = useAuth();
    const [recs, setRecs] = useState([]);
    const [goal, setGoal] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecommendations();
    }, []);

    const fetchRecommendations = async () => {
        try {
            const res = await fetch(`${API_BASE}/recommendations/courses.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setRecs(data.data.recommendations);
                setGoal(data.data.career_goal);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="course-rec-container loading">
            <div className="skeleton-header"></div>
            <div className="skeleton-grid">
                <div className="skeleton-card"></div>
                <div className="skeleton-card"></div>
                <div className="skeleton-card"></div>
            </div>
        </div>
    );

    if (recs.length === 0) return null;

    return (
        <div className="course-rec-container">
            <div className="course-rec-header">
                <div className="header-left">
                    <Sparkles className="text-purple-500" size={24} />
                    <div>
                        <h3>Smart Course Picks</h3>
                        <p>Curated for your goal: <strong>{goal}</strong></p>
                    </div>
                </div>
            </div>

            <div className="course-rec-scroll">
                {recs.map((course, idx) => (
                    <div key={course.id || idx} className="course-card-glass">
                        <div className={`match-badge ${course.type}`}>
                            {course.match_score}% Match
                        </div>

                        <div className="course-content">
                            <div className="course-top">
                                <span className="course-code">{course.code}</span>
                                <span className="course-credits">{course.credits} Credits</span>
                            </div>

                            <h4>{course.name}</h4>
                            <p className="course-desc">{course.description ? course.description.substring(0, 60) + '...' : 'No description available.'}</p>

                            <div className="reason-tag">
                                <Star size={12} fill="currentColor" />
                                <span>{course.reason}</span>
                            </div>
                        </div>

                        <div className="course-actions">
                            <button className="btn-save" title="Save for later">
                                <Bookmark size={18} />
                            </button>
                            <button className="btn-view">
                                View Details <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CourseRecommender;
