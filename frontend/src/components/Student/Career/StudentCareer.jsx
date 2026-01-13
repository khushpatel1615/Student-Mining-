import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Briefcase, TrendingUp, Star, Award, ChevronRight } from 'lucide-react';
import './StudentCareer.css';

const API_BASE = 'http://localhost/StudentDataMining/backend/api';

const StudentCareer = () => {
    const { token } = useAuth();
    const [careerData, setCareerData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCareer = async () => {
            try {
                const res = await fetch(`${API_BASE}/career.php`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setCareerData(data.data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCareer();
    }, []);

    if (loading) return <div className="career-loading">Analyzing career fit...</div>;
    if (!careerData) return <div className="career-error">Unable to generate predictions.</div>;

    const { matches } = careerData;
    const topMatch = matches[0];
    const otherMatches = matches.slice(1);

    const getMatchColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-blue-600';
        return 'text-orange-500';
    };

    const getMatchBg = (score) => {
        if (score >= 80) return 'bg-green-100';
        if (score >= 60) return 'bg-blue-100';
        return 'bg-orange-100';
    };

    return (
        <div className="career-container">
            <div className="career-header">
                <div>
                    <h1>Career Predictor</h1>
                    <p>AI-driven career matching based on your skill profile.</p>
                </div>
            </div>

            {/* Hero Card: Top Match */}
            {topMatch && (
                <div className="hero-match-card">
                    <div className="hero-badge">
                        <Star size={16} fill="white" /> Top Recommendation
                    </div>
                    <div className="hero-content">
                        <div className="hero-info">
                            <h2>{topMatch.title}</h2>
                            <span className="hero-industry">{topMatch.industry}</span>
                            <p className="hero-desc">{topMatch.description}</p>

                            <div className="hero-skills">
                                <span className="skill-tag">Requires: {topMatch.top_skill_required}</span>
                            </div>
                        </div>
                        <div className="hero-score">
                            <div className="score-circle">
                                <span className="score-val">{topMatch.match_percentage}%</span>
                                <span className="score-label">Match</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Other Matches Grid */}
            <div className="career-grid">
                {otherMatches.map((match, idx) => (
                    <div key={idx} className="career-card">
                        <div className="card-top">
                            <div>
                                <h3>{match.title}</h3>
                                <span className="card-industry">{match.industry}</span>
                            </div>
                            <div className={`match-badge ${getMatchBg(match.match_percentage)} ${getMatchColor(match.match_percentage)}`}>
                                {match.match_percentage}%
                            </div>
                        </div>
                        <p className="card-desc">{match.description}</p>
                        <div className="card-footer">
                            <span className="match-bar-bg">
                                <span
                                    className={`match-bar-fill ${match.match_percentage >= 80 ? 'bg-green' : 'bg-blue'}`}
                                    style={{ width: `${match.match_percentage}%` }}
                                ></span>
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StudentCareer;
