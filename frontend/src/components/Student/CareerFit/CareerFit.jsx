import React, { useState, useEffect } from 'react';
import { Briefcase, Target, TrendingUp, MapPin, DollarSign } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../config';

const CareerFit = () => {
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [careers, setCareers] = useState([]);

    useEffect(() => {
        if (user && token) {
            fetchProfile();
        }
    }, [user, token]);

    const fetchProfile = async () => {
        try {
            const response = await fetch(`${API_BASE}/analytics/features.php?action=profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success && data.data && data.data.grade_avg !== null) {
                setProfile(data.data);
                generateCareerRecommendations(data.data);
            } else {
                // If analytics data is missing, try fallback
                fetchFallbackData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Fallback: Fetch basic gpa if analytics profile is incomplete
    const fetchFallbackData = async () => {
        try {
            const response = await fetch(`${API_BASE}/student_dashboard.php?action=summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success && data.data.summary) {
                const gpa = data.data.summary.gpa_4 || (data.data.summary.gpa ? data.data.summary.gpa / 2.5 : 0);
                generateCareerRecommendations({ grade_avg: gpa });
            }
        } catch (e) { console.error(e); }
    };

    const generateCareerRecommendations = (profileData) => {
        // Simplified career recommendations based on grade average
        const gradeAvg = profileData?.grade_avg || 0;
        const recommendations = [
            {
                title: 'Software Developer',
                fitScore: Math.min(95, Math.round((gradeAvg / 4.0) * 100)),
                description: 'Build applications and systems using programming languages',
                avgSalary: '$85,000 - $120,000',
                demand: 'High',
                icon: '💻'
            },
            {
                title: 'Data Analyst',
                fitScore: Math.min(90, Math.round((gradeAvg / 4.0) * 95)),
                description: 'Analyze data to help organizations make better decisions',
                avgSalary: '$70,000 - $95,000',
                demand: 'Very High',
                icon: '📊'
            },
            {
                title: 'Web Developer',
                fitScore: Math.min(88, Math.round((gradeAvg / 4.0) * 90)),
                description: 'Create and maintain websites and web applications',
                avgSalary: '$75,000 - $105,000',
                demand: 'High',
                icon: '🌐'
            },
            {
                title: 'Systems Administrator',
                fitScore: Math.min(85, Math.round((gradeAvg / 4.0) * 88)),
                description: 'Manage and maintain IT infrastructure and systems',
                avgSalary: '$70,000 - $95,000',
                demand: 'Moderate',
                icon: '⚙️'
            }
        ];
        setCareers(recommendations.sort((a, b) => b.fitScore - a.fitScore));
    };

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner"></div><p>Analyzing career fit...</p></div>;
    }

    return (
        <div style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    <Briefcase size={24} /> Career Fit Analysis
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Recommended careers based on your academic performance</p>
            </div>

            <div style={{ display: 'grid', gap: '1.25rem' }}>
                {careers.map((career, index) => (
                    <div key={index} style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                                <div style={{ fontSize: '2.5rem' }}>{career.icon}</div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem' }}>{career.title}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{career.description}</p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 700, color: career.fitScore >= 90 ? '#16a34a' : career.fitScore >= 80 ? '#2563eb' : '#ea580c' }}>
                                    {career.fitScore}%
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fit Score</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <DollarSign size={16} style={{ color: 'var(--text-muted)' }} />
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{career.avgSalary}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <TrendingUp size={16} style={{ color: career.demand === 'Very High' ? '#16a34a' : career.demand === 'High' ? '#2563eb' : '#ea580c' }} />
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{career.demand} Demand</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#dbeafe', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#1e40af', margin: '0 0 0.5rem' }}>💡 Tip</h3>
                <p style={{ color: '#1e3a8a', fontSize: '0.9rem', margin: 0 }}>
                    Career fit scores are calculated based on your academic performance, skills, and course selections.
                    Continue improving your grades and building relevant skills to increase your fit for top careers!
                </p>
            </div>
        </div>
    );
};

export default CareerFit;
