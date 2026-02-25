import React, { useState, useEffect } from 'react';
import { Briefcase, Target, TrendingUp } from 'lucide-react';

import { useAuth } from '../../../context/AuthContext';
import {
    fetchCareerProfile,
    fetchDashboardData as fetchStudentDashboardData
} from '../../../services/studentService';

const CareerFit = () => {
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [careers, setCareers] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user && token) {
            fetchProfile();
        }
    }, [user, token]);

    const fetchProfile = async () => {
        try {
            setError('');

            const [profileResult, dashboardResult] = await Promise.all([
                fetchCareerProfile(),
                fetchStudentDashboardData()
            ]);

            if (profileResult.error && dashboardResult.error) {
                throw new Error(profileResult.error || dashboardResult.error);
            }

            const profileData = profileResult.data || null;
            const subjectRows = Array.isArray(dashboardResult.data?.subjects)
                ? dashboardResult.data.subjects
                : [];

            setProfile(profileData);
            setCareers(generateCareerRecommendations(profileData, subjectRows));
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to load career fit analysis');
            setCareers([]);
        } finally {
            setLoading(false);
        }
    };

    const generateCareerRecommendations = (profileData, subjectRows = []) => {
        const riskScore = Number(profileData?.risk_score || 0);

        const normalizedSubjects = (subjectRows || [])
            .map((subjectRow) => {
                const name = subjectRow?.subject?.name || subjectRow?.subject_name || 'Academic Track';
                const courseScore = Number(subjectRow?.overall_grade || subjectRow?.final_percentage || 0);
                const attendanceScore = Number(subjectRow?.attendance?.percentage || 0);
                const fitScore = Math.max(
                    0,
                    Math.min(100, Math.round((courseScore * 0.7) + (attendanceScore * 0.2) + ((100 - riskScore) * 0.1)))
                );

                const demand = fitScore >= 85 ? 'Very High' : fitScore >= 70 ? 'High' : 'Moderate';
                const shortCode = name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 3)
                    .map((word) => word[0])
                    .join('')
                    .toUpperCase() || 'TRK';

                return {
                    title: `${name} Track`,
                    fitScore,
                    description: `Career pathways aligned with your performance in ${name}.`,
                    demand,
                    icon: shortCode,
                    courseScore: Math.round(courseScore),
                    attendanceScore: Math.round(attendanceScore)
                };
            })
            .filter((item) => item.fitScore > 0)
            .sort((a, b) => b.fitScore - a.fitScore);

        if (normalizedSubjects.length > 0) {
            return normalizedSubjects.slice(0, 4);
        }

        const baseScore = Number(profileData?.grade_avg || 0);
        if (baseScore > 0) {
            return [{
                title: 'Academic Growth Track',
                fitScore: Math.min(100, Math.round(baseScore)),
                description: 'Career readiness derived from your current academic performance.',
                demand: baseScore >= 75 ? 'High' : 'Moderate',
                icon: 'AGT',
                courseScore: Math.round(baseScore),
                attendanceScore: Number(profileData?.attendance_score || 0)
            }];
        }

        return [];
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

            {error && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontWeight: 500 }}>
                    {error}
                </div>
            )}

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
                                <Target size={16} style={{ color: 'var(--text-muted)' }} />
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Course Score: {career.courseScore}%
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <TrendingUp size={16} style={{ color: career.demand === 'Very High' ? '#16a34a' : career.demand === 'High' ? '#2563eb' : '#ea580c' }} />
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{career.demand} Demand</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Target size={16} style={{ color: 'var(--text-muted)' }} />
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Attendance: {career.attendanceScore}%
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#dbeafe', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#1e40af', margin: '0 0 0.5rem' }}>Tip</h3>
                <p style={{ color: '#1e3a8a', fontSize: '0.9rem', margin: 0 }}>
                    Career fit scores are calculated using your latest course performance, attendance, and risk profile
                    {profile?.risk_level ? ` (${profile.risk_level})` : ''}. Keep improving consistency to raise your fit scores.
                </p>
            </div>
        </div>
    );
};

export default CareerFit;
