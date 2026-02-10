import React, { useState, useEffect } from 'react';
import { Layers, TrendingUp, AlertCircle, Award } from 'lucide-react';

import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../config';

const Difficulty = () => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [grades, setGrades] = useState([]);

    useEffect(() => {
        if (token) {
            fetchDifficulty();
        }
    }, [token]);

    const fetchDifficulty = async () => {
        try {
            const response = await fetch(`${API_BASE}/grades.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setGrades(data.data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const calculateDifficulty = (grade) => {
        const gradeValue = grade?.final_grade;
        if (!gradeValue) return { level: 'Unknown', score: 0, color: '#6b7280' };

        if (gradeValue === 'A+' || gradeValue === 'A') return { level: 'Easy', score: 95, color: '#16a34a' };
        if (gradeValue === 'B+' || gradeValue === 'B') return { level: 'Moderate', score: 75, color: '#3b82f6' };
        if (gradeValue === 'C+' || gradeValue === 'C') return { level: 'Challenging', score: 55, color: '#f59e0b' };
        return { level: 'Difficult', score: 35, color: '#dc2626' };
    };

    const subjectsWithDifficulty = grades.map(grade => ({
        ...grade,
        difficulty: calculateDifficulty(grade)
    })).sort((a, b) => a.difficulty.score - b.difficulty.score);

    const difficultyStats = {
        easy: subjectsWithDifficulty.filter(s => s.difficulty.level === 'Easy').length,
        moderate: subjectsWithDifficulty.filter(s => s.difficulty.level === 'Moderate').length,
        challenging: subjectsWithDifficulty.filter(s => s.difficulty.level === 'Challenging').length,
        difficult: subjectsWithDifficulty.filter(s => s.difficulty.level === 'Difficult').length
    };

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner"></div><p>Analyzing difficulty levels...</p></div>;
    }

    return (
        <div style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    <Layers size={24} /> Subject Difficulty Analysis
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Understand which subjects are most challenging for you</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: '#dcfce7', padding: '1.25rem', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#15803d' }}>{difficultyStats.easy}</div>
                    <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 500 }}>Easy</div>
                </div>
                <div style={{ background: '#dbeafe', padding: '1.25rem', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e40af' }}>{difficultyStats.moderate}</div>
                    <div style={{ fontSize: '0.85rem', color: '#1e3a8a', fontWeight: 500 }}>Moderate</div>
                </div>
                <div style={{ background: '#fef3c7', padding: '1.25rem', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#92400e' }}>{difficultyStats.challenging}</div>
                    <div style={{ fontSize: '0.85rem', color: '#78350f', fontWeight: 500 }}>Challenging</div>
                </div>
                <div style={{ background: '#fee2e2', padding: '1.25rem', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#991b1b' }}>{difficultyStats.difficult}</div>
                    <div style={{ fontSize: '0.85rem', color: '#7f1d1d', fontWeight: 500 }}>Difficult</div>
                </div>
            </div>

            <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Subject-wise Analysis</h3>
                {subjectsWithDifficulty.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                        <Layers size={64} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                        <h3>No data available</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Difficulty analysis will appear once you have grades</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {subjectsWithDifficulty.map((subject, index) => (
                            <div key={subject.id} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{subject.subject_name}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{subject.subject_code}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: subject.difficulty.color }}>#{index + 1}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RANK</div>
                                        </div>
                                        <div style={{ padding: '0.5rem 1rem', background: subject.difficulty.color, color: 'white', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', minWidth: '100px', textAlign: 'center' }}>
                                            {subject.difficulty.level}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ position: 'relative', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${subject.difficulty.score}%`, background: subject.difficulty.color, borderRadius: '4px', transition: 'width 0.3s' }}></div>
                                </div>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Performance Score: {subject.difficulty.score}% - Grade: <span style={{ fontWeight: 600, color: subject.difficulty.color }}>{subject.final_grade || 'N/A'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                <h4 style={{ fontSize: '1rem', color: '#991b1b', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={18} /> Focus Areas
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#7f1d1d', margin: 0 }}>
                    {difficultyStats.difficult > 0
                        ? `You have ${difficultyStats.difficult} difficult subject${difficultyStats.difficult > 1 ? 's' : ''}. Consider seeking additional help or tutoring for these courses.`
                        : 'Great job! You don\'t have any particularly difficult subjects. Keep up the good work!'}
                </p>
            </div>
        </div>
    );
};

export default Difficulty;
